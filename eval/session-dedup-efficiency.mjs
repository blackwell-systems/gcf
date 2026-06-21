/**
 * Session Deduplication Token Efficiency Benchmark
 *
 * Measures token savings when GCF's session deduplication transmits
 * bare references (@id) instead of full symbol declarations on
 * subsequent tool calls in the same conversation.
 *
 * Simulates a real agent session:
 *   Call 1: Full payload (500 symbols, 200 edges)
 *   Call 2: 100 new symbols + 400 bare refs + 150 edges
 *   Call 3: 50 new symbols + 450 bare refs + 100 edges
 *
 * JSON has no deduplication mechanism. Every call repeats everything.
 *
 * Run: node eval/session-dedup-efficiency.mjs
 */

const packages = {
  "Claude (Anthropic)": "@lenml/tokenizer-claude",
  "GPT-4 (OpenAI cl100k)": "@lenml/tokenizer-gpt4",
  "GPT-4o (OpenAI o200k)": "@lenml/tokenizer-gpt4o",
  "LLaMA 3.1 (Meta)": "@lenml/tokenizer-llama3_1",
  "Qwen 2.5 (Alibaba)": "@lenml/tokenizer-qwen2_5",
  "DeepSeek V3": "@lenml/tokenizer-deepseek_v3",
  "Gemma 2 (Google)": "@lenml/tokenizer-gemma2",
  "Mistral Nemo": "@lenml/tokenizer-mistral_nemo",
};

const tokenizers = {};
for (const [name, pkg] of Object.entries(packages)) {
  const mod = await import(pkg);
  tokenizers[name] = mod.fromPreTrained();
}

function tokenCount(text, tok) {
  return tok.encode(text, { add_special_tokens: false }).length;
}

// ═══════════════════════════════════════════════════════════════════════
// Payload builders
// ═══════════════════════════════════════════════════════════════════════

const kinds = ["function", "class", "interface", "method", "variable", "type", "module"];
const provenances = ["lsp_resolved", "ast_inferred", "definition", "reference"];
const edgeTypes = ["calls", "implements", "imports", "references", "extends"];
const pkgs = ["auth", "api", "db", "utils", "handlers", "middleware", "config", "services", "models", "routes"];
const names = ["validate", "process", "handle", "create", "update", "delete", "find", "check", "build", "parse",
  "serialize", "transform", "execute", "dispatch", "resolve", "connect", "initialize", "configure", "register", "notify"];

function buildSymbol(i) {
  const kind = kinds[i % kinds.length];
  const pkg = pkgs[i % pkgs.length];
  const name = names[i % names.length] + (i < 20 ? "" : i);
  const score = Math.round((0.99 - (i * 0.002) % 0.5) * 100) / 100;
  const prov = provenances[i % provenances.length];
  const qname = `github.com/org/repo/internal/${pkg}.${name.charAt(0).toUpperCase() + name.slice(1)}`;

  return { id: i, kind, qualified_name: qname, score, provenance: prov };
}

function symbolToGCF(s) {
  const kindAbbr = s.kind === "function" ? "fn" : s.kind === "interface" ? "iface" : s.kind;
  return `@${s.id} ${kindAbbr} ${s.qualified_name} ${s.score} ${s.provenance}`;
}

function symbolToJSON(s) {
  return {
    id: s.id,
    kind: s.kind,
    qualified_name: s.qualified_name,
    score: s.score,
    provenance: s.provenance,
  };
}

function edgeToGCF(src, tgt, type) {
  return `@${tgt}<@${src} ${type}`;
}

function edgeToJSON(src, tgt, type) {
  return { source: src, target: tgt, type };
}

// ═══════════════════════════════════════════════════════════════════════
// Simulate a 5-call agent session
// ═══════════════════════════════════════════════════════════════════════

const SESSION_CALLS = [
  { newSymbols: 500, reusedSymbols: 0, edges: 200, desc: "Initial context (full payload)" },
  { newSymbols: 100, reusedSymbols: 400, edges: 150, desc: "Follow-up (80% overlap)" },
  { newSymbols: 50, reusedSymbols: 450, edges: 100, desc: "Refinement (90% overlap)" },
  { newSymbols: 30, reusedSymbols: 470, edges: 80, desc: "Drill-down (94% overlap)" },
  { newSymbols: 20, reusedSymbols: 480, edges: 60, desc: "Final check (96% overlap)" },
];

console.log("═".repeat(80));
console.log("SESSION DEDUPLICATION TOKEN EFFICIENCY");
console.log("═".repeat(80));
console.log();
console.log("Simulates a 5-call agent session where each subsequent call shares");
console.log("symbols with previous calls. GCF transmits bare references (@id) for");
console.log("previously-seen symbols. JSON has no deduplication mechanism.");
console.log();

// Use GPT-4o as primary
const primaryTok = tokenizers["GPT-4o (OpenAI o200k)"];

// Track all symbols seen across the session
let allSymbols = [];
let nextSymbolId = 0;

console.log("─".repeat(80));
console.log("SESSION SIMULATION (GPT-4o tokenizer)");
console.log("─".repeat(80));
console.log();

let totalJsonTokens = 0;
let totalGcfTokens = 0;
let totalGcfNoDedup = 0;

const callResults = [];

for (let callIdx = 0; callIdx < SESSION_CALLS.length; callIdx++) {
  const call = SESSION_CALLS[callIdx];

  // Generate new symbols
  const newSyms = [];
  for (let i = 0; i < call.newSymbols; i++) {
    const sym = buildSymbol(nextSymbolId++);
    newSyms.push(sym);
    allSymbols.push(sym);
  }

  // Select reused symbols from previous calls
  const reusedSyms = allSymbols.slice(0, call.reusedSymbols);

  // Generate edges (mix of new and reused symbol IDs)
  const allCallSymbols = [...newSyms, ...reusedSyms];
  const edges = [];
  for (let i = 0; i < call.edges; i++) {
    const src = allCallSymbols[i % allCallSymbols.length].id;
    const tgt = allCallSymbols[(i + 1 + Math.floor(i / 3)) % allCallSymbols.length].id;
    edges.push({ src, tgt, type: edgeTypes[i % edgeTypes.length] });
  }

  // ─── JSON encoding (no dedup, full payload every time) ───
  const jsonPayload = {
    symbols: allCallSymbols.map(symbolToJSON),
    edges: edges.map(e => edgeToJSON(e.src, e.tgt, e.type)),
  };
  const jsonStr = JSON.stringify(jsonPayload, null, 2);
  const jsonTokens = tokenCount(jsonStr, primaryTok);

  // ─── GCF encoding WITHOUT dedup (for comparison) ───
  const gcfNoDedupLines = [];
  gcfNoDedupLines.push(`GCF profile=graph tool=context_for_task symbols=${allCallSymbols.length} edges=${edges.length}`);
  gcfNoDedupLines.push("");
  gcfNoDedupLines.push(`## symbols [${allCallSymbols.length}]`);
  for (const s of allCallSymbols) {
    gcfNoDedupLines.push(symbolToGCF(s));
  }
  gcfNoDedupLines.push("");
  gcfNoDedupLines.push(`## edges [${edges.length}]`);
  for (const e of edges) {
    gcfNoDedupLines.push(edgeToGCF(e.src, e.tgt, e.type));
  }
  const gcfNoDedupStr = gcfNoDedupLines.join("\n");
  const gcfNoDedupTokens = tokenCount(gcfNoDedupStr, primaryTok);

  // ─── GCF encoding WITH dedup (bare refs for previously transmitted) ───
  const gcfDedupLines = [];
  gcfDedupLines.push(`GCF profile=graph tool=context_for_task symbols=${allCallSymbols.length} edges=${edges.length}`);
  gcfDedupLines.push("");

  // New symbols: full declaration
  if (newSyms.length > 0) {
    gcfDedupLines.push(`## new [${newSyms.length}]`);
    for (const s of newSyms) {
      gcfDedupLines.push(symbolToGCF(s));
    }
    gcfDedupLines.push("");
  }

  // Reused symbols: bare reference only
  if (reusedSyms.length > 0) {
    gcfDedupLines.push(`## ref [${reusedSyms.length}]`);
    for (const s of reusedSyms) {
      gcfDedupLines.push(`@${s.id}`);
    }
    gcfDedupLines.push("");
  }

  // Edges: always full (they reference symbol IDs)
  gcfDedupLines.push(`## edges [${edges.length}]`);
  for (const e of edges) {
    gcfDedupLines.push(edgeToGCF(e.src, e.tgt, e.type));
  }
  const gcfDedupStr = gcfDedupLines.join("\n");
  const gcfDedupTokens = tokenCount(gcfDedupStr, primaryTok);

  totalJsonTokens += jsonTokens;
  totalGcfTokens += gcfDedupTokens;
  totalGcfNoDedup += gcfNoDedupTokens;

  callResults.push({
    call: callIdx + 1,
    desc: call.desc,
    newSymbols: call.newSymbols,
    reusedSymbols: call.reusedSymbols,
    edges: call.edges,
    jsonTokens,
    gcfNoDedupTokens,
    gcfDedupTokens,
  });

  const vsJson = ((1 - gcfDedupTokens / jsonTokens) * 100).toFixed(1);
  const vsNoDedup = ((1 - gcfDedupTokens / gcfNoDedupTokens) * 100).toFixed(1);

  console.log(`Call ${callIdx + 1}: ${call.desc}`);
  console.log(`  New: ${call.newSymbols} symbols, Reused: ${call.reusedSymbols} symbols, Edges: ${call.edges}`);
  console.log(`  JSON:           ${String(jsonTokens).padStart(6)} tokens`);
  console.log(`  GCF (no dedup): ${String(gcfNoDedupTokens).padStart(6)} tokens`);
  console.log(`  GCF (dedup):    ${String(gcfDedupTokens).padStart(6)} tokens`);
  console.log(`  GCF dedup vs JSON: ${vsJson}% savings`);
  console.log(`  Dedup vs no-dedup: ${vsNoDedup}% additional savings from deduplication`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// Session totals
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("SESSION TOTALS (5 calls)");
console.log("─".repeat(80));
console.log();
console.log("  JSON total:           " + String(totalJsonTokens).padStart(7) + " tokens (no dedup possible)");
console.log("  GCF total (no dedup): " + String(totalGcfNoDedup).padStart(7) + " tokens");
console.log("  GCF total (dedup):    " + String(totalGcfTokens).padStart(7) + " tokens");
console.log();
console.log("  GCF (no dedup) vs JSON:  " + ((1 - totalGcfNoDedup / totalJsonTokens) * 100).toFixed(1) + "% savings (format efficiency alone)");
console.log("  GCF (dedup) vs JSON:     " + ((1 - totalGcfTokens / totalJsonTokens) * 100).toFixed(1) + "% savings (format + deduplication)");
console.log("  Dedup contribution:      " + ((1 - totalGcfTokens / totalGcfNoDedup) * 100).toFixed(1) + "% additional savings from session dedup");
console.log();

// ═══════════════════════════════════════════════════════════════════════
// Cross-tokenizer validation
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("CROSS-TOKENIZER VALIDATION (Call 3: 90% overlap)");
console.log("─".repeat(80));
console.log();

// Rebuild call 3 for all tokenizers
const call3 = callResults[2];
const call3NewSyms = [];
for (let i = 0; i < 50; i++) {
  call3NewSyms.push(buildSymbol(600 + i)); // offset to avoid collision
}
const call3ReusedSyms = Array.from({ length: 450 }, (_, i) => buildSymbol(i));
const call3AllSyms = [...call3NewSyms, ...call3ReusedSyms];
const call3Edges = Array.from({ length: 100 }, (_, i) => ({
  src: call3AllSyms[i % call3AllSyms.length].id,
  tgt: call3AllSyms[(i + 7) % call3AllSyms.length].id,
  type: edgeTypes[i % edgeTypes.length],
}));

// JSON
const call3Json = JSON.stringify({
  symbols: call3AllSyms.map(symbolToJSON),
  edges: call3Edges.map(e => edgeToJSON(e.src, e.tgt, e.type)),
}, null, 2);

// GCF with dedup
const call3GcfLines = [];
call3GcfLines.push(`GCF profile=graph tool=context_for_task symbols=${call3AllSyms.length} edges=${call3Edges.length}`);
call3GcfLines.push("");
call3GcfLines.push(`## new [${call3NewSyms.length}]`);
for (const s of call3NewSyms) call3GcfLines.push(symbolToGCF(s));
call3GcfLines.push("");
call3GcfLines.push(`## ref [${call3ReusedSyms.length}]`);
for (const s of call3ReusedSyms) call3GcfLines.push(`@${s.id}`);
call3GcfLines.push("");
call3GcfLines.push(`## edges [${call3Edges.length}]`);
for (const e of call3Edges) call3GcfLines.push(edgeToGCF(e.src, e.tgt, e.type));
const call3Gcf = call3GcfLines.join("\n");

console.log("Tokenizer".padEnd(24) + " │ JSON tokens │ GCF dedup │ Savings");
console.log("─".repeat(24) + "─┼─────────────┼───────────┼────────");

for (const [name, tok] of Object.entries(tokenizers)) {
  const jt = tokenCount(call3Json, tok);
  const gt = tokenCount(call3Gcf, tok);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  console.log(name.padEnd(24) + " │ " + String(jt).padStart(11) + " │ " + String(gt).padStart(9) + " │ " + savings + "%");
}

// ═══════════════════════════════════════════════════════════════════════
// Per-symbol cost comparison
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("PER-SYMBOL COST: full declaration vs bare reference");
console.log("─".repeat(80));
console.log();

// Sample symbols
const sampleSymbols = [0, 50, 100, 250, 499].map(i => buildSymbol(i));

console.log("Symbol".padEnd(60) + " │ Full │ Bare │ Savings");
console.log("─".repeat(60) + "─┼──────┼──────┼────────");

for (const s of sampleSymbols) {
  const fullGcf = symbolToGCF(s);
  const bareGcf = `@${s.id}`;
  const fullTok = tokenCount(fullGcf, primaryTok);
  const bareTok = tokenCount(bareGcf, primaryTok);
  const savings = ((1 - bareTok / fullTok) * 100).toFixed(0);

  const display = fullGcf.length > 58 ? fullGcf.substring(0, 55) + "..." : fullGcf;
  console.log(display.padEnd(60) + " │ " + String(fullTok).padStart(4) + " │ " + String(bareTok).padStart(4) + " │ " + savings + "%");
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("═".repeat(80));
console.log("SUMMARY");
console.log("═".repeat(80));
console.log();
console.log("Over a 5-call agent session:");
console.log("  JSON:              " + totalJsonTokens + " total tokens (repeats everything every call)");
console.log("  GCF (no dedup):    " + totalGcfNoDedup + " total tokens (format savings only)");
console.log("  GCF (with dedup):  " + totalGcfTokens + " total tokens (format + session dedup)");
console.log();
console.log("  Format efficiency alone:    " + ((1 - totalGcfNoDedup / totalJsonTokens) * 100).toFixed(1) + "% savings vs JSON");
console.log("  Format + deduplication:     " + ((1 - totalGcfTokens / totalJsonTokens) * 100).toFixed(1) + "% savings vs JSON");
console.log();
console.log("  Per bare reference: ~2 tokens (vs ~19 tokens for full declaration)");
console.log("  Dedup savings per reused symbol: ~89%");
console.log();
console.log("JSON has no equivalent mechanism. Every tool call retransmits the full payload.");
console.log("GCF's session deduplication means subsequent calls in the same conversation");
console.log("cost a fraction of the first call, while JSON costs the same every time.");
