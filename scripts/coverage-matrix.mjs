#!/usr/bin/env node
// Spec -> fixture coverage matrix for GCF conformance.
//
// Mechanically cross-references the shared conformance fixtures
// (tests/conformance/**.json) against two normative surfaces of SPEC.md:
//   1. the Section 16.5 decoder strict-mode taxonomy (every MUST-reject condition), and
//   2. the set of conformance operations (every operation MUST have >= 1 fixture).
//
// It regenerates tests/conformance/COVERAGE.md and exits non-zero if any REQUIRED
// cell is uncovered and not explicitly allow-listed in KNOWN_GAPS below. That makes
// this a ratchet: a newly-uncovered condition fails the build; closing a known gap
// means adding the fixture and deleting its allow-list entry.
//
// Zero dependencies (node builtins only). Run: node scripts/coverage-matrix.mjs
// (add --check to only verify without rewriting the doc).

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const FIXTURE_DIR = join(REPO, 'tests', 'conformance');
const OUT = join(FIXTURE_DIR, 'COVERAGE.md');
const CHECK_ONLY = process.argv.includes('--check');

// --- SPEC Section 16.5 decoder strict-mode taxonomy -------------------------
// key = the canonical `expectedError` value an error fixture declares.
const TAXONOMY = [
  ['Header', 'missing_header', 'First line does not begin with GCF'],
  ['Header', 'missing_profile', 'Header has no profile= field'],
  ['Header', 'unknown_profile', 'profile value is not generic or graph'],
  ['Header', 'malformed_header_field', 'Key-value pair missing ='],
  ['Header', 'duplicate_header_field', 'Same header key appears more than once'],
  ['Scalar', 'unterminated_quote', 'Quoted string missing closing "'],
  ['Scalar', 'invalid_escape', 'Escape sequence not in the defined set'],
  ['Scalar', 'trailing_characters', 'Characters after closing quote of a quoted scalar'],
  ['Scalar', 'invalid_missing', '~ token outside a tabular row cell'],
  ['Scalar', 'invalid_attachment_marker', '^ or ^{fields} outside a row cell, or malformed inline decl'],
  ['Scalar', 'invalid_surrogate', 'Literal/isolated/malformed surrogate'],
  ['Scalar', 'invalid_utf8', 'Malformed UTF-8 byte sequence'],
  ['Structural', 'duplicate_key', 'Same key twice in the same object scope'],
  ['Structural', 'duplicate_field_name', 'Same field name twice in a tabular field declaration'],
  ['Structural', 'row_width_mismatch', 'Pipe-separated values do not match field count'],
  ['Structural', 'count_mismatch', 'Number of data items does not match declared [count]'],
  ['Structural', 'invalid_count', '[count] is not 0, a no-leading-zero decimal, or ?'],
  ['Structural', 'tab_indentation', 'Leading whitespace contains tab characters'],
  ['Structural', 'invalid_indent', 'Indentation increases by more than one level'],
  ['Structural', 'invalid_item_id', 'Expanded/tabular row ID != its zero-based item index'],
  ['Structural', 'orphan_attachment', '.field without a parent @N row and matching bare ^ cell'],
  ['Structural', 'orphan_inline_attachment', 'Positional inline body has no eligible attachment-marker cell'],
  ['Structural', 'missing_attachment', 'Attachment-marker cell has no matching body'],
  ['Structural', 'duplicate_attachment', 'More than one attachment targets the same field in one row'],
  ['Structural', 'inline_width_mismatch', 'Positional inline body value count != its declared inline schema'],
  ['Graph', 'invalid_node_line', 'Symbol line does not have exactly 5 positional fields'],
  ['Graph', 'invalid_symbol_id', '@ prefix followed by non-integer'],
  ['Graph', 'invalid_score', 'Score does not match the score grammar'],
  ['Graph', 'invalid_edge_syntax', 'Edge line missing < separator'],
  ['Graph', 'unknown_edge_reference', 'Edge references a symbol ID not declared earlier'],
  ['Graph', 'malformed_delta', 'Delta uses an unknown section or an invalid line form'],
];

// Conditions with no covering error fixture today, with the reason and resolution.
// Deleting an entry here without adding a covering fixture will fail the build.
const KNOWN_GAPS = {};

// Operations that MUST have at least one fixture (every conformance capability).
const REQUIRED_OPERATIONS = [
  'encode', 'decode', 'error', 'roundtrip',
  'graph-stream-encode',
  'generic-pack-root', 'generic-delta', 'generic-delta-verify',
  'generic-delta-decode', 'generic-delta-session',
  'pack-root', 'delta', 'delta-verify', 'session',
];

// --- Encoder output invariants (SPEC 16.1/16.2) -----------------------------
// Scanned over every fixture's `expected` output; any violation is a hard failure.
const GRAPH_NODE_RE = /^@\d+ \S+ \S+ (-?\d+\.\d+) /;
function scanInvariants(fixtures) {
  const trailingWs = [], badScore = [], crlf = [];
  for (const f of fixtures) {
    if (f.expected == null) continue;
    for (const ln of f.expected.split('\n')) {
      if (/[ \t]$/.test(ln)) trailingWs.push(`${f.rel}: ${JSON.stringify(ln)}`);
      if (ln.includes('\r')) crlf.push(f.rel);
      const m = GRAPH_NODE_RE.exec(ln);
      if (m && !/^-?\d+\.\d\d$/.test(m[1])) badScore.push(`${f.rel}: ${ln}`);
    }
  }
  return [
    { key: 'no-trailing-whitespace', desc: 'No line ends with a space or tab (16.1/16.2)', bad: trailingWs },
    { key: 'graph-score-2-decimals', desc: 'Graph node scores have exactly 2 decimals (16.1)', bad: badScore },
    { key: 'lf-line-endings', desc: 'No CR in expected output; LF endings only (16.1)', bad: crlf },
  ];
}

// --- SPEC 16.1-16.4 requirement -> coverage checklist -----------------------
// Each requirement maps to a coverage source: 'invariant' (a scan above),
// 'property' (verified out-of-band by the SDK property/round-trip suites, not by
// a single fixture), or {dir}/{op} fixture directories/operations that exercise
// it. A requirement whose {dir}/{op} source resolves to ZERO fixtures fails the build.
const CHECKLIST = [
  // 16.1 Encoder conformance (graph profile)
  ['16.1', 'UTF-8 / LF endings / no trailing whitespace', 'invariant'],
  ['16.1', 'Scores emitted with exactly 2 decimal places', 'invariant'],
  ['16.1', 'Header begins GCF profile=graph (tool optional)', { dir: 'graph-encode' }],
  ['16.1', 'Sequential IDs from 0; stable session-scoped IDs', { dir: 'graph-session' }],
  ['16.1', 'Kind abbreviations, edges section header, edges between declared IDs', { dir: 'graph-encode' }],
  ['16.1', 'Symbol/edge ordering; deterministic output (incl. distance_N trailer)', 'property'],
  // 16.2 Encoder conformance (generic profile)
  ['16.2', 'Header begins GCF profile=generic', { dir: 'scalar' }],
  ['16.2', 'Scalar grammar + encoder quoting; numbers/bool/null unquoted', { dir: 'numbers' }],
  ['16.2', 'Key grammar; quote invalid bare keys; reject duplicate keys', { dir: 'keys' }],
  ['16.2', 'Tabular: pipe separator, positional rows, field union, - / ~', { dir: 'arrays' }],
  ['16.2', 'Inline object schemas; shared array schema reuse', { dir: 'inline-schema' }],
  ['16.2', 'Attachments (^ / ^{fields} / .field); @{id} on nested rows', { dir: 'attachments' }],
  ['16.2', 'Nested object flattening (> path columns, v3.2)', { dir: 'flatten' }],
  ['16.2', 'Root scalar (=value) and root array (## [N])', { dir: 'roots' }],
  ['16.2', 'Two-space indentation per nesting level', { dir: 'containers' }],
  // 16.3 Decoder conformance (graph profile)
  ['16.3', 'Parse header/nodes/edges; kind expansion + unknown passthrough', { dir: 'graph-decode' }],
  ['16.3', 'Accept ? deferred count; summary metadata; counts positional|labeled', { dir: 'streaming-v2' }],
  ['16.3', 'Reject edges referencing undeclared symbol IDs', { op: 'error' }],
  // 16.4 Decoder conformance (generic profile)
  ['16.4', 'Scalar grammar + full JSON string escapes; reject malformed UTF-8', { dir: 'decode' }],
  ['16.4', 'Interpret - (null), ~ (absent), ^ / ^{fields} attachments', { dir: 'inline-schema' }],
  ['16.4', 'Keys bare+quoted; tabular headers; row-width validation', { dir: 'keys' }],
  ['16.4', 'Whitespace/indentation handling', { dir: 'whitespace' }],
  ['16.4', 'Count validation at every level', { op: 'error' }],
  ['16.4', 'Round-trip invariant decode(encode(v)) == v', 'property'],
];

// --- Load fixtures ----------------------------------------------------------
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.json')) acc.push(p);
  }
  return acc;
}

const files = walk(FIXTURE_DIR).sort();
const fixtures = files.map((p) => {
  const rel = relative(FIXTURE_DIR, p);
  let data = {};
  try { data = JSON.parse(readFileSync(p, 'utf8')); } catch { /* reported below */ }
  return {
    rel,
    dir: rel.split('/')[0],
    operation: data.operation || '(none)',
    expectedError: data.expectedError || '',
    expected: typeof data.expected === 'string' ? data.expected : null,
  };
});

// --- Tallies ----------------------------------------------------------------
const byOperation = new Map();
const byDir = new Map();
const errorFixturesByKey = new Map(); // expectedError -> [rel]
for (const f of fixtures) {
  byOperation.set(f.operation, (byOperation.get(f.operation) || 0) + 1);
  byDir.set(f.dir, (byDir.get(f.dir) || 0) + 1);
  if (f.operation === 'error' && f.expectedError) {
    if (!errorFixturesByKey.has(f.expectedError)) errorFixturesByKey.set(f.expectedError, []);
    errorFixturesByKey.get(f.expectedError).push(f.rel);
  }
}

// --- Coverage analysis ------------------------------------------------------
const taxonomyRows = TAXONOMY.map(([category, key, condition]) => {
  const covering = errorFixturesByKey.get(key) || [];
  const covered = covering.length > 0;
  const known = Object.prototype.hasOwnProperty.call(KNOWN_GAPS, key);
  return { category, key, condition, covered, covering, known };
});

const hardGaps = taxonomyRows.filter((r) => !r.covered && !r.known);
const knownGaps = taxonomyRows.filter((r) => !r.covered && r.known);
const missingOps = REQUIRED_OPERATIONS.filter((op) => !(byOperation.get(op) > 0));
const staleAllowlist = Object.keys(KNOWN_GAPS).filter(
  (key) => (errorFixturesByKey.get(key) || []).length > 0
);
const coveredCount = taxonomyRows.filter((r) => r.covered).length;

// Encoder-output invariant scan (16.1/16.2).
const invariants = scanInvariants(fixtures);
const invariantViolations = invariants.filter((i) => i.bad.length > 0);

// 16.1-16.4 requirement checklist coverage.
const checklistRows = CHECKLIST.map(([section, req, src]) => {
  let status, note;
  if (src === 'invariant') { status = 'invariant'; note = 'mechanical scan below'; }
  else if (src === 'property') { status = 'property'; note = 'SDK property / round-trip suites'; }
  else if (src.dir) { const n = byDir.get(src.dir) || 0; status = n > 0 ? 'covered' : 'GAP'; note = `\`${src.dir}/\` (${n})`; }
  else if (src.op) { const n = byOperation.get(src.op) || 0; status = n > 0 ? 'covered' : 'GAP'; note = `op \`${src.op}\` (${n})`; }
  return { section, req, status, note };
});
const checklistGaps = checklistRows.filter((r) => r.status === 'GAP');

// --- Generate COVERAGE.md ---------------------------------------------------
function md() {
  const L = [];
  L.push('# Conformance coverage matrix');
  L.push('');
  L.push('> Generated by `scripts/coverage-matrix.mjs`. Do not edit by hand; run the script to regenerate.');
  L.push('> Maps the shared conformance fixtures to the SPEC.md Section 16.5 decoder strict-mode');
  L.push('> taxonomy and the set of conformance operations, and flags uncovered normative conditions.');
  L.push('');
  L.push('## Summary');
  L.push('');
  L.push(`- Fixtures: **${fixtures.length}** across ${byDir.size} directories, ${byOperation.size} operations`);
  L.push(`- Section 16.5 conditions covered: **${coveredCount}/${TAXONOMY.length}**`);
  L.push(`- Uncovered (known gaps, tracked below): **${knownGaps.length}**`);
  L.push(`- Uncovered (unexpected, fails the build): **${hardGaps.length}**`);
  L.push(`- Required operations missing: **${missingOps.length}**`);
  L.push(`- Section 16.1-16.4 checklist gaps: **${checklistGaps.length}**`);
  L.push(`- Encoder-invariant violations: **${invariantViolations.length}**`);
  L.push('');
  L.push('## Section 16.5 decoder strict-mode taxonomy');
  L.push('');
  L.push('| Category | Condition | `expectedError` | Status | Fixtures / note |');
  L.push('|---|---|---|---|---|');
  for (const r of taxonomyRows) {
    let status, note;
    if (r.covered) {
      status = 'covered';
      note = r.covering.map((c) => `\`${c}\``).join(', ');
    } else if (r.known) {
      status = 'KNOWN GAP';
      note = KNOWN_GAPS[r.key];
    } else {
      status = 'UNCOVERED';
      note = '(no fixture)';
    }
    L.push(`| ${r.category} | ${r.condition} | \`${r.key}\` | ${status} | ${note} |`);
  }
  L.push('');
  L.push('## Operation coverage');
  L.push('');
  L.push('| Operation | Fixtures | Required |');
  L.push('|---|---|---|');
  const allOps = [...new Set([...REQUIRED_OPERATIONS, ...byOperation.keys()])].sort();
  for (const op of allOps) {
    const n = byOperation.get(op) || 0;
    const req = REQUIRED_OPERATIONS.includes(op) ? 'yes' : '';
    const flag = REQUIRED_OPERATIONS.includes(op) && n === 0 ? ' MISSING' : '';
    L.push(`| \`${op}\` | ${n}${flag} | ${req} |`);
  }
  L.push('');
  L.push('## Section 16.1-16.4 encoder / decoder-accept checklist');
  L.push('');
  L.push('| Section | Requirement | Coverage | Source |');
  L.push('|---|---|---|---|');
  for (const r of checklistRows) L.push(`| ${r.section} | ${r.req} | ${r.status} | ${r.note} |`);
  L.push('');
  L.push('_`invariant` = mechanical scan below; `property` = verified by the SDK property / round-trip suites (not a single fixture)._');
  L.push('');
  L.push('## Encoder output invariants (16.1/16.2)');
  L.push('');
  L.push('Scanned over every fixture `expected` output; a violation fails the build.');
  L.push('');
  L.push('| Invariant | Violations |');
  L.push('|---|---|');
  for (const i of invariants) L.push(`| ${i.desc} | ${i.bad.length === 0 ? 'none' : i.bad.length} |`);
  L.push('');
  L.push('## Fixtures by directory');
  L.push('');
  L.push('| Directory | Fixtures |');
  L.push('|---|---|');
  for (const dir of [...byDir.keys()].sort()) L.push(`| \`${dir}\` | ${byDir.get(dir)} |`);
  L.push('');
  if (knownGaps.length) {
    L.push('## Known gaps (tracked)');
    L.push('');
    for (const r of knownGaps) L.push(`- **${r.key}** — ${KNOWN_GAPS[r.key]}`);
    L.push('');
  }
  return L.join('\n') + '\n';
}

// --- Report + gate ----------------------------------------------------------
const doc = md();
if (!CHECK_ONLY) {
  writeFileSync(OUT, doc);
  console.log(`wrote ${relative(REPO, OUT)}`);
}

console.log(`\nSection 16.5 coverage: ${coveredCount}/${TAXONOMY.length}  (known gaps: ${knownGaps.length})`);
console.log(`Section 16.1-16.4 checklist: ${checklistRows.length - checklistGaps.length}/${checklistRows.length} covered`);
if (knownGaps.length) {
  console.log('Known gaps:');
  for (const r of knownGaps) console.log(`  - ${r.key}`);
}

let failed = false;
if (checklistGaps.length) {
  failed = true;
  console.error('\nFAIL: Section 16.1-16.4 requirements whose exercising fixtures are missing:');
  for (const r of checklistGaps) console.error(`  - [${r.section}] ${r.req} (${r.note})`);
}
for (const i of invariantViolations) {
  failed = true;
  console.error(`\nFAIL: encoder invariant '${i.key}' violated in ${i.bad.length} place(s):`);
  for (const b of i.bad.slice(0, 10)) console.error(`  - ${b}`);
}
if (hardGaps.length) {
  failed = true;
  console.error('\nFAIL: uncovered Section 16.5 conditions with no allow-list entry:');
  for (const r of hardGaps) console.error(`  - ${r.key} (${r.condition})`);
}
if (missingOps.length) {
  failed = true;
  console.error('\nFAIL: required operations with no fixture:');
  for (const op of missingOps) console.error(`  - ${op}`);
}
if (staleAllowlist.length) {
  failed = true;
  console.error('\nFAIL: KNOWN_GAPS entries that are now covered (delete them to tighten the ratchet):');
  for (const key of staleAllowlist) console.error(`  - ${key}`);
}

if (failed) process.exit(1);
console.log('\nOK: every required condition and operation is covered or tracked.');
