/**
 * Graph Profile Token Efficiency Benchmark
 *
 * Measures GCF vs JSON vs TOON token counts for graph-structured data
 * (code intelligence payloads) across all 8 tokenizers at multiple scales.
 *
 * This is the data shape where GCF's advanced features (symbol IDs, edge
 * encoding, section headers, distance grouping) provide maximum savings.
 *
 * Run: node eval/graph-token-efficiency.mjs
 */

import { encode } from "@blackwell-systems/gcf";

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
// Payload generator: code intelligence graph
// ═══════════════════════════════════════════════════════════════════════

function buildGraphPayload(numSymbols, numEdges) {
  const kinds = ["function", "class", "interface", "method", "variable", "type", "module"];
  const provenances = ["lsp_resolved", "ast_inferred", "definition", "reference"];
  const edgeTypes = ["calls", "implements", "imports", "references", "extends"];
  const pkgs = ["auth", "api", "db", "utils", "handlers", "middleware", "config", "services", "models", "routes"];
  const names = ["validate", "process", "handle", "create", "update", "delete", "find", "check", "build", "parse",
    "serialize", "transform", "execute", "dispatch", "resolve", "connect", "initialize", "configure", "register", "notify"];

  // Assign distance groups
  const targets = Math.floor(numSymbols * 0.3);
  const related = Math.floor(numSymbols * 0.4);
  const extended = numSymbols - targets - related;

  const symbols = [];
  for (let i = 0; i < numSymbols; i++) {
    const kind = kinds[i % kinds.length];
    const pkg = pkgs[i % pkgs.length];
    const name = names[i % names.length] + (i < 20 ? "" : i);
    const score = Math.round((0.99 - (i * 0.002) % 0.5) * 100) / 100;
    const prov = provenances[i % provenances.length];
    const distance = i < targets ? 0 : i < targets + related ? 1 : 2;

    symbols.push({
      id: i,
      kind,
      qualified_name: `github.com/org/repo/internal/${pkg}.${name.charAt(0).toUpperCase() + name.slice(1)}`,
      score,
      provenance: prov,
      distance,
    });
  }

  const edges = [];
  for (let i = 0; i < numEdges; i++) {
    const src = i % numSymbols;
    const tgt = (i + 1 + Math.floor(i / 3)) % numSymbols;
    edges.push({
      source: src,
      target: tgt,
      type: edgeTypes[i % edgeTypes.length],
    });
  }

  return { symbols, edges };
}

// ═══════════════════════════════════════════════════════════════════════
// Encode to each format
// ═══════════════════════════════════════════════════════════════════════

function toJSON(payload) {
  return JSON.stringify(payload, null, 2);
}

function toCompactJSON(payload) {
  return JSON.stringify(payload);
}

function toGCF(payload) {
  // Build GCF graph format
  const { symbols, edges } = payload;

  // Group by distance
  const targets = symbols.filter(s => s.distance === 0);
  const related = symbols.filter(s => s.distance === 1);
  const extended = symbols.filter(s => s.distance === 2);

  let lines = [];
  lines.push(`GCF profile=graph tool=context_for_task symbols=${symbols.length} edges=${edges.length}`);
  lines.push("");

  // Targets section
  lines.push(`## targets [${targets.length}]`);
  for (const s of targets) {
    lines.push(`@${s.id} ${s.kind.substring(0, s.kind === "function" ? 2 : s.kind === "interface" ? 5 : s.kind.length)} ${s.qualified_name} ${s.score} ${s.provenance}`);
  }
  lines.push("");

  // Related section
  lines.push(`## related [${related.length}]`);
  for (const s of related) {
    lines.push(`@${s.id} ${s.kind.substring(0, s.kind === "function" ? 2 : s.kind === "interface" ? 5 : s.kind.length)} ${s.qualified_name} ${s.score} ${s.provenance}`);
  }
  lines.push("");

  // Extended section
  lines.push(`## extended [${extended.length}]`);
  for (const s of extended) {
    lines.push(`@${s.id} ${s.kind.substring(0, s.kind === "function" ? 2 : s.kind === "interface" ? 5 : s.kind.length)} ${s.qualified_name} ${s.score} ${s.provenance}`);
  }
  lines.push("");

  // Edges
  lines.push(`## edges [${edges.length}]`);
  for (const e of edges) {
    lines.push(`@${e.target}<@${e.source} ${e.type}`);
  }

  return lines.join("\n");
}

function toTOON(payload) {
  // TOON: flat table with all fields as columns
  const { symbols, edges } = payload;

  let lines = [];
  lines.push("id\tkind\tqualified_name\tscore\tprovenance\tdistance");
  for (const s of symbols) {
    lines.push(`${s.id}\t${s.kind}\t${s.qualified_name}\t${s.score}\t${s.provenance}\t${s.distance}`);
  }
  lines.push("");
  lines.push("source\ttarget\ttype");
  for (const e of edges) {
    lines.push(`${e.source}\t${e.target}\t${e.type}`);
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Run benchmark
// ═══════════════════════════════════════════════════════════════════════

console.log("═".repeat(80));
console.log("GRAPH PROFILE TOKEN EFFICIENCY BENCHMARK");
console.log("═".repeat(80));
console.log();
console.log("Code intelligence payloads (symbols + edges) at multiple scales.");
console.log("Measures GCF graph profile vs JSON (pretty + compact) vs TOON-style tabular.");
console.log();

const scales = [
  { symbols: 10, edges: 5 },
  { symbols: 50, edges: 25 },
  { symbols: 100, edges: 50 },
  { symbols: 200, edges: 100 },
  { symbols: 500, edges: 200 },
];

// Use GPT-4o as primary tokenizer for the main table
const primaryTok = tokenizers["GPT-4o (OpenAI o200k)"];

console.log("─".repeat(80));
console.log("TOKEN COUNTS BY SCALE (GPT-4o tokenizer)");
console.log("─".repeat(80));
console.log();
console.log("Symbols │ Edges │ JSON (pretty) │ JSON (compact) │  TOON  │   GCF  │ GCF vs Pretty │ GCF vs Compact │ GCF vs TOON");
console.log("────────┼───────┼───────────────┼────────────────┼────────┼────────┼───────────────┼────────────────┼────────────");

for (const { symbols, edges } of scales) {
  const payload = buildGraphPayload(symbols, edges);

  const jsonPretty = toJSON(payload);
  const jsonCompact = toCompactJSON(payload);
  const gcf = toGCF(payload);
  const toon = toTOON(payload);

  const jpTok = tokenCount(jsonPretty, primaryTok);
  const jcTok = tokenCount(jsonCompact, primaryTok);
  const gcfTok = tokenCount(gcf, primaryTok);
  const toonTok = tokenCount(toon, primaryTok);

  const vsPretty = ((1 - gcfTok / jpTok) * 100).toFixed(1);
  const vsCompact = ((1 - gcfTok / jcTok) * 100).toFixed(1);
  const vsToon = ((1 - gcfTok / toonTok) * 100).toFixed(1);

  console.log(
    String(symbols).padStart(7) + " │ " +
    String(edges).padStart(5) + " │ " +
    String(jpTok).padStart(13) + " │ " +
    String(jcTok).padStart(14) + " │ " +
    String(toonTok).padStart(6) + " │ " +
    String(gcfTok).padStart(6) + " │ " +
    (vsPretty + "%").padStart(13) + " │ " +
    (vsCompact + "%").padStart(14) + " │ " +
    (vsToon + "%").padStart(10)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Cross-tokenizer validation at 500 symbols
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("CROSS-TOKENIZER VALIDATION (500 symbols, 200 edges)");
console.log("─".repeat(80));
console.log();

const payload500 = buildGraphPayload(500, 200);
const jsonPretty500 = toJSON(payload500);
const jsonCompact500 = toCompactJSON(payload500);
const gcf500 = toGCF(payload500);
const toon500 = toTOON(payload500);

console.log("Tokenizer".padEnd(24) + " │ JSON pretty │ JSON compact │  TOON  │   GCF  │ GCF vs Pretty │ GCF vs Compact");
console.log("─".repeat(24) + "─┼─────────────┼──────────────┼────────┼────────┼───────────────┼───────────────");

for (const [name, tok] of Object.entries(tokenizers)) {
  const jp = tokenCount(jsonPretty500, tok);
  const jc = tokenCount(jsonCompact500, tok);
  const g = tokenCount(gcf500, tok);
  const t = tokenCount(toon500, tok);

  const vsPretty = ((1 - g / jp) * 100).toFixed(1);
  const vsCompact = ((1 - g / jc) * 100).toFixed(1);

  console.log(
    name.padEnd(24) + " │ " +
    String(jp).padStart(11) + " │ " +
    String(jc).padStart(12) + " │ " +
    String(t).padStart(6) + " │ " +
    String(g).padStart(6) + " │ " +
    (vsPretty + "%").padStart(13) + " │ " +
    (vsCompact + "%").padStart(13)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Where the savings come from
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("WHERE THE SAVINGS COME FROM (500 symbols, 200 edges)");
console.log("─".repeat(80));
console.log();

const gcfLines = gcf500.split("\n");
const headerLines = gcfLines.filter(l => l.startsWith("GCF ") || l.startsWith("##") || l === "");
const symbolLines = gcfLines.filter(l => l.startsWith("@") && !l.includes("<"));
const edgeLines = gcfLines.filter(l => l.includes("<@"));

const headerTokens = tokenCount(headerLines.join("\n"), primaryTok);
const symbolTokens = tokenCount(symbolLines.join("\n"), primaryTok);
const edgeTokens = tokenCount(edgeLines.join("\n"), primaryTok);
const totalGcf = tokenCount(gcf500, primaryTok);

console.log("GCF token breakdown:");
console.log("  Headers (profile, sections):  " + headerTokens + " tokens (" + (headerTokens/totalGcf*100).toFixed(1) + "%)");
console.log("  Symbol rows (@id kind qn sc): " + symbolTokens + " tokens (" + (symbolTokens/totalGcf*100).toFixed(1) + "%)");
console.log("  Edge rows (@tgt<@src type):   " + edgeTokens + " tokens (" + (edgeTokens/totalGcf*100).toFixed(1) + "%)");
console.log("  Total:                        " + totalGcf + " tokens");
console.log();

// JSON breakdown
const jsonObj = JSON.parse(jsonCompact500);
const symbolsJsonOnly = JSON.stringify(jsonObj.symbols, null, 2);
const edgesJsonOnly = JSON.stringify(jsonObj.edges, null, 2);
const symbolsJsonTokens = tokenCount(symbolsJsonOnly, primaryTok);
const edgesJsonTokens = tokenCount(edgesJsonOnly, primaryTok);
const totalJsonPretty = tokenCount(jsonPretty500, primaryTok);

console.log("JSON (pretty) token breakdown:");
console.log("  Symbols array:                " + symbolsJsonTokens + " tokens (" + (symbolsJsonTokens/totalJsonPretty*100).toFixed(1) + "%)");
console.log("  Edges array:                  " + edgesJsonTokens + " tokens (" + (edgesJsonTokens/totalJsonPretty*100).toFixed(1) + "%)");
console.log("  Total:                        " + totalJsonPretty + " tokens");
console.log();

console.log("Per-symbol cost:");
console.log("  JSON (pretty): " + (symbolsJsonTokens / 500).toFixed(1) + " tokens/symbol");
console.log("  GCF:           " + (symbolTokens / 500).toFixed(1) + " tokens/symbol");
console.log("  Savings:       " + ((1 - (symbolTokens/500) / (symbolsJsonTokens/500)) * 100).toFixed(1) + "% fewer tokens per symbol");
console.log();
console.log("Per-edge cost:");
console.log("  JSON (pretty): " + (edgesJsonTokens / 200).toFixed(1) + " tokens/edge");
console.log("  GCF:           " + (edgeTokens / 200).toFixed(1) + " tokens/edge");
console.log("  Savings:       " + ((1 - (edgeTokens/200) / (edgesJsonTokens/200)) * 100).toFixed(1) + "% fewer tokens per edge");

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("═".repeat(80));
console.log("SUMMARY");
console.log("═".repeat(80));
console.log();

const finalGcf = tokenCount(gcf500, primaryTok);
const finalJP = tokenCount(jsonPretty500, primaryTok);
const finalJC = tokenCount(jsonCompact500, primaryTok);
const finalToon = tokenCount(toon500, primaryTok);

console.log("At 500 symbols + 200 edges (GPT-4o tokenizer):");
console.log("  JSON (pretty):  " + finalJP + " tokens");
console.log("  JSON (compact): " + finalJC + " tokens");
console.log("  TOON (tabular): " + finalToon + " tokens");
console.log("  GCF (graph):    " + finalGcf + " tokens");
console.log();
console.log("  GCF vs JSON pretty:  " + ((1 - finalGcf/finalJP)*100).toFixed(1) + "% savings");
console.log("  GCF vs JSON compact: " + ((1 - finalGcf/finalJC)*100).toFixed(1) + "% savings");
console.log("  GCF vs TOON:         " + ((1 - finalGcf/finalToon)*100).toFixed(1) + "% savings");
console.log();
console.log("GCF's graph profile achieves the highest savings on code intelligence data");
console.log("because it eliminates per-symbol field repetition AND uses compact edge encoding");
console.log("(@target<@source type vs full JSON objects with 3 fields each).");
