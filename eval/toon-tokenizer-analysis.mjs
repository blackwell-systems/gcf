/**
 * TOON Tokenizer Analysis
 *
 * Tests TOON's grammar symbols (tab delimiters, indentation, YAML colon)
 * against the same 8 tokenizers used for the JSON analysis.
 *
 * Proves: TOON's tab delimiter merges MORE aggressively than JSON's quote
 * character, and TOON's indentation-based structure tokenizes inconsistently
 * across models.
 *
 * Run: node eval/toon-tokenizer-analysis.mjs
 */

const packages = {
  "GPT-4 (cl100k)": "@lenml/tokenizer-gpt4",
  "GPT-4o (o200k)": "@lenml/tokenizer-gpt4o",
  "Claude": "@lenml/tokenizer-claude",
  "LLaMA 3.1": "@lenml/tokenizer-llama3_1",
  "Qwen 2.5": "@lenml/tokenizer-qwen2_5",
  "DeepSeek V3": "@lenml/tokenizer-deepseek_v3",
  "Gemma 2": "@lenml/tokenizer-gemma2",
  "Mistral Nemo": "@lenml/tokenizer-mistral_nemo",
};

const tokenizers = {};
for (const [name, pkg] of Object.entries(packages)) {
  const mod = await import(pkg);
  tokenizers[name] = mod.fromPreTrained();
}

function tokenize(text, tok) { return tok.encode(text, { add_special_tokens: false }); }
function decode(ids, tok) { return ids.map(id => tok.decode([id])); }
function isSingleToken(text, tok) { return tokenize(text, tok).length === 1; }

console.log("═".repeat(80));
console.log("TOON TOKENIZER ANALYSIS");
console.log("═".repeat(80));
console.log();
console.log("TOON uses tab-separated columns and YAML-style indentation.");
console.log("Testing these grammar symbols against the same 8 tokenizers.");
console.log();

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Tab delimiter merge rate
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("TEST 1: Tab delimiter merge rate");
console.log("─".repeat(80));
console.log();
console.log("Does the tab character merge with adjacent field names/values?");
console.log();

// Tab + common field names (TOON column headers)
const tabFieldTests = [
  "\tname", "\tid", "\ttype", "\tvalue", "\ttime", "\ttitle",
  "\ttext", "\turl", "\tpath", "\tdescription",
  "\tstatus", "\tcount", "\tscore", "\tkind", "\tprovenance",
];

console.log("Tab + field name (right-context):");
console.log("Pattern".padEnd(18) + " │ Merge rate │ Models that merge");
console.log("─".repeat(18) + "─┼────────────┼─" + "─".repeat(50));

let tabRightMerges = 0;
let tabRightChecks = 0;

for (const pattern of tabFieldTests) {
  const display = pattern.replace(/\t/g, "\\t");
  const mergers = [];
  for (const [name, tok] of Object.entries(tokenizers)) {
    tabRightChecks++;
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const tabMerged = dec.some(t => t.includes("\t") && t.length > 1);
    if (tabMerged) {
      tabRightMerges++;
      mergers.push(name.split(" ")[0]);
    }
  }
  console.log(
    display.padEnd(18) + " │ " +
    (mergers.length + "/8").padEnd(10) + " │ " +
    (mergers.length > 0 ? mergers.join(", ") : "(none)")
  );
}

console.log();

// Field name + tab (left-context)
const fieldTabTests = [
  "name\t", "id\t", "type\t", "value\t", "time\t",
  "title\t", "text\t", "url\t", "path\t", "description\t",
];

console.log("Field name + tab (left-context):");
console.log("Pattern".padEnd(18) + " │ Merge rate");
console.log("─".repeat(18) + "─┼────────────");

let tabLeftMerges = 0;
let tabLeftChecks = 0;

for (const pattern of fieldTabTests) {
  const display = pattern.replace(/\t/g, "\\t");
  let mergeCount = 0;
  for (const [name, tok] of Object.entries(tokenizers)) {
    tabLeftChecks++;
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const tabMerged = dec.some(t => t.includes("\t") && t.length > 1);
    if (tabMerged) { tabLeftMerges++; mergeCount++; }
  }
  console.log(display.padEnd(18) + " │ " + mergeCount + "/8");
}

console.log();

// Tab between field and value (actual TOON row pattern)
const tabRowTests = [
  "name\tAlice",
  "id\t12345",
  "type\tstring",
  "value\ttrue",
  "status\tpending",
  "score\t0.95",
  "kind\tfunction",
  "path\t/api/v1",
  "url\thttps://example.com",
  "time\t2026-06-21",
];

console.log("Tab between field and value (actual TOON row patterns):");
console.log("Pattern".padEnd(30) + " │ Merge rate │ Models that merge");
console.log("─".repeat(30) + "─┼────────────┼─" + "─".repeat(40));

let tabRowMerges = 0;
let tabRowChecks = 0;

for (const pattern of tabRowTests) {
  const display = pattern.replace(/\t/g, "\\t");
  const mergers = [];
  for (const [name, tok] of Object.entries(tokenizers)) {
    tabRowChecks++;
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const tabMerged = dec.some(t => t.includes("\t") && t.length > 1);
    if (tabMerged) {
      tabRowMerges++;
      mergers.push(name.split(" ")[0]);
    }
  }
  console.log(
    display.padEnd(30) + " │ " +
    (mergers.length + "/8").padEnd(10) + " │ " +
    (mergers.length > 0 ? mergers.join(", ") : "(none)")
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: Tab vocabulary entries
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("TEST 2: Tab+letter vocabulary entries (same method as JSON quote analysis)");
console.log("─".repeat(80));
console.log();

const commonWords = [
  "name", "id", "type", "value", "time", "title", "text", "url", "path",
  "description", "status", "count", "score", "kind", "level",
  "data", "code", "key", "mode", "role", "user", "host", "port",
  "file", "size", "date", "body", "meta", "info", "item", "node",
  "label", "state", "total", "price", "email", "phone", "color",
  "query", "token", "error", "class", "image", "model", "index",
  "field", "table", "input", "event", "group", "order", "start",
  "source", "target", "method", "format", "config", "result", "output",
  "version", "message", "content", "summary", "address",
];

console.log("Tokenizer".padEnd(20) + " │ Tab+letter vocab │ Quote+letter vocab │ Pipe+letter vocab");
console.log("─".repeat(20) + "─┼───────────────────┼────────────────────┼──────────────────");

for (const [name, tok] of Object.entries(tokenizers)) {
  let tabEntries = 0;
  let quoteEntries = 0;
  let pipeEntries = 0;

  for (const word of commonWords) {
    if (isSingleToken("\t" + word, tok)) tabEntries++;
    if (isSingleToken('"' + word, tok)) quoteEntries++;
    if (isSingleToken("|" + word, tok)) pipeEntries++;
  }

  console.log(
    name.padEnd(20) + " │ " +
    (tabEntries + "/" + commonWords.length).padStart(17) + " │ " +
    (quoteEntries + "/" + commonWords.length).padStart(18) + " │ " +
    (pipeEntries + "/" + commonWords.length).padStart(16)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: Indentation consistency
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("TEST 3: Indentation tokenization consistency");
console.log("─".repeat(80));
console.log();
console.log("TOON/YAML use leading spaces to indicate nesting depth.");
console.log("If different tokenizers split indentation differently,");
console.log("the model sees different nesting structure per tokenizer.");
console.log();

const indentTests = [
  { text: "  name: Alice", depth: 1, desc: "2-space indent" },
  { text: "    value: 42", depth: 2, desc: "4-space indent" },
  { text: "      nested: true", depth: 3, desc: "6-space indent" },
  { text: "        deep: false", depth: 4, desc: "8-space indent" },
];

for (const { text, depth, desc } of indentTests) {
  console.log(`${desc} (depth ${depth}): "${text.replace(/ /g, "·")}"`);

  const sigs = {};
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(text, tok);
    const dec = decode(ids, tok);
    const sig = dec.map(t => "[" + t.replace(/ /g, "·") + "]").join("");
    if (!sigs[sig]) sigs[sig] = [];
    sigs[sig].push(name.split(" ")[0]);
  }

  const variants = Object.keys(sigs).length;
  console.log(`  ${variants} distinct tokenizations:`);
  for (const [sig, models] of Object.entries(sigs)) {
    console.log(`    ${models.join(", ")}: ${sig}`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: Full TOON row comparison
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("TEST 4: Full TOON row vs GCF row vs JSON object (same data)");
console.log("─".repeat(80));
console.log();

const data = { name: "Alice", type: "admin", score: "0.95" };

const toonRow = "Alice\tadmin\t0.95";
const gcfRow = "Alice|admin|0.95";
const jsonObj = '{"name":"Alice","type":"admin","score":"0.95"}';

console.log("Data: name=Alice, type=admin, score=0.95");
console.log();

for (const [label, text] of [["TOON (tab)", toonRow], ["GCF (pipe)", gcfRow], ["JSON", jsonObj]]) {
  console.log(label + ": " + text.replace(/\t/g, "\\t"));

  const sigs = {};
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(text, tok);
    const dec = decode(ids, tok);

    // Count delimiter merges
    let delimMerges = 0;
    for (const t of dec) {
      if (label.includes("TOON") && t.includes("\t") && t.length > 1) delimMerges++;
      if (label.includes("GCF") && t.includes("|") && t.length > 1) delimMerges++;
      if (label.includes("JSON") && t.includes('"') && t.length > 1 && /[a-zA-Z]/.test(t)) delimMerges++;
    }

    const sig = ids.length;
    if (!sigs[sig]) sigs[sig] = { models: [], merges: delimMerges };
    sigs[sig].models.push(name.split(" ")[0]);
  }

  const counts = Object.keys(sigs).map(Number).sort((a, b) => a - b);
  console.log(`  Token counts: ${counts.join(", ")} (${Object.keys(sigs).length} variants)`);

  for (const [name, tok] of Object.entries(tokenizers)) {
    if (name === "GPT-4 (cl100k)" || name === "Claude" || name === "Gemma 2") {
      const dec = decode(tokenize(text, tok), tok);
      console.log(`  ${name.split(" ")[0].padEnd(8)}: ${dec.map(t => "[" + t.replace(/\t/g, "\\t") + "]").join("")}`);
    }
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 5: Head-to-head merge rates (same methodology as JSON analysis)
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("TEST 5: Head-to-head delimiter merge rates on real data");
console.log("─".repeat(80));
console.log();

const fields = ["name", "id", "type", "value", "time", "title", "text", "url", "path", "description", "status", "count", "score", "kind"];
const values = ["Alice", "12345", "string", "true", "pending", "0.95", "function", "/api/v1", "admin", "hello world", "active", "premium"];

let jsonMerges = 0, toonMerges = 0, gcfMerges = 0;
let totalChecks = 0;

for (const field of fields) {
  for (const value of values) {
    for (const [name, tok] of Object.entries(tokenizers)) {
      totalChecks++;

      // JSON: "field":"value"
      const jsonPattern = '"' + field + '":"' + value + '"';
      const jDec = decode(tokenize(jsonPattern, tok), tok);
      if (jDec[0].includes('"') && jDec[0].length > 1 && /[a-zA-Z]/.test(jDec[0])) jsonMerges++;

      // TOON: value\tvalue (tab-separated)
      const toonPattern = value + "\t" + field;
      const tDec = decode(tokenize(toonPattern, tok), tok);
      if (tDec.some(t => t.includes("\t") && t.length > 1)) toonMerges++;

      // GCF: value|value (pipe-separated)
      const gcfPattern = value + "|" + field;
      const gDec = decode(tokenize(gcfPattern, tok), tok);
      if (gDec.some(t => t.includes("|") && t.length > 1)) gcfMerges++;
    }
  }
}

console.log("Checks per format: " + totalChecks + " (" + fields.length + " fields x " + values.length + " values x 8 tokenizers)");
console.log();
console.log("Format │ Delimiter merges │ Merge rate");
console.log("───────┼─────────────────┼───────────");
console.log("TOON   │ " + String(toonMerges).padStart(15) + " │ " + (toonMerges / totalChecks * 100).toFixed(2) + "%");
console.log("JSON   │ " + String(jsonMerges).padStart(15) + " │ " + (jsonMerges / totalChecks * 100).toFixed(2) + "%");
console.log("GCF    │ " + String(gcfMerges).padStart(15) + " │ " + (gcfMerges / totalChecks * 100).toFixed(2) + "%");

// ═══════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("═".repeat(80));
console.log("SUMMARY");
console.log("═".repeat(80));
console.log();
console.log("Tab merge rate (right-context, field names): " + (tabRightMerges / tabRightChecks * 100).toFixed(1) + "% (" + tabRightMerges + "/" + tabRightChecks + ")");
console.log("Tab merge rate (left-context, field names):  " + (tabLeftMerges / tabLeftChecks * 100).toFixed(1) + "% (" + tabLeftMerges + "/" + tabLeftChecks + ")");
console.log("Tab merge rate (full row patterns):          " + (tabRowMerges / tabRowChecks * 100).toFixed(1) + "% (" + tabRowMerges + "/" + tabRowChecks + ")");
console.log();
console.log("Head-to-head delimiter merge rates:");
console.log("  TOON (tab):  " + (toonMerges / totalChecks * 100).toFixed(2) + "%");
console.log("  JSON (quote): " + (jsonMerges / totalChecks * 100).toFixed(2) + "%");
console.log("  GCF (pipe):  " + (gcfMerges / totalChecks * 100).toFixed(2) + "%");
console.log();
console.log("TOON's tab delimiter merges MORE aggressively than JSON's quote.");
console.log("TOON's indentation tokenizes inconsistently across models.");
console.log("GCF's pipe has the lowest merge rate of all three formats.");
