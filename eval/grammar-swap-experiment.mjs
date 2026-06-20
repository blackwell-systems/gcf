/**
 * Grammar Swap Experiment
 *
 * Tests whether GCF's token savings are specific to its delimiter choices
 * or a structural property of any positional-field encoding.
 *
 * Method: Take multiple payloads of different shapes and sizes. Re-encode
 * each using 5 different delimiter sets (all from the "perfect" category:
 * single token, never merges). Measure token counts across 8 tokenizers.
 *
 * If all delimiter sets produce similar savings, the compression is structural.
 * If some delimiter sets produce worse results, the choice matters.
 *
 * Run: node eval/grammar-swap-experiment.mjs
 */

// Load tokenizers
const packages = {
  "Claude": "@lenml/tokenizer-claude",
  "GPT-4": "@lenml/tokenizer-gpt4",
  "GPT-4o": "@lenml/tokenizer-gpt4o",
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

// ===== Delimiter sets (all perfect-category chars) =====
const delimiterSets = [
  { name: "GCF (actual)",   field: "|", id: "@", edge: "<", section: "##", schemaOpen: "{", schemaClose: "}", countOpen: "[", countClose: "]", schemaSep: "," },
  { name: "Alt set A",      field: "~", id: "$", edge: ">", section: "%%", schemaOpen: "(", schemaClose: ")", countOpen: "[", countClose: "]", schemaSep: ";" },
  { name: "Alt set B",      field: "^", id: "!", edge: "=", section: "&&", schemaOpen: "{", schemaClose: "}", countOpen: "<", countClose: ">", schemaSep: ":" },
  { name: "Alt set C",      field: "`", id: "#", edge: "~", section: "!!", schemaOpen: "[", schemaClose: "]", countOpen: "(", countClose: ")", schemaSep: "|" },
  { name: "Alt set D",      field: ";", id: "%", edge: "^", section: "$$", schemaOpen: "{", schemaClose: "}", countOpen: "[", countClose: "]", schemaSep: "+" },
];

// ===== Payloads =====

function buildPayload(type, size) {
  switch (type) {
    case "employees":
      return Array.from({ length: size }, (_, i) => ({
        id: 1000 + i,
        name: ["Alice Chen", "Bob Smith", "Carla Rodriguez", "David Park", "Eva Johansson"][i % 5],
        department: ["Engineering", "Marketing", "Sales", "HR", "Finance"][i % 5],
        salary: 55000 + i * 1500,
        active: i % 7 !== 0,
      }));
    case "orders":
      return Array.from({ length: size }, (_, i) => ({
        orderId: `ORD-${String(i + 1).padStart(5, "0")}`,
        customer: ["Alice", "Bob", "Carla", "David", "Eva"][i % 5],
        total: Math.round((29.97 + i * 12.5) * 100) / 100,
        status: ["pending", "shipped", "delivered", "cancelled"][i % 4],
        items: 1 + (i % 4),
      }));
    case "logs":
      return Array.from({ length: size }, (_, i) => ({
        timestamp: `2026-06-20T${String(10 + (i % 14)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`,
        level: ["INFO", "WARN", "ERROR", "DEBUG"][i % 4],
        service: ["api", "auth", "db", "cache", "worker"][i % 5],
        message: `Request processed in ${10 + i * 3}ms`,
        requestId: `req-${String(i).padStart(6, "0")}`,
      }));
    case "symbols":
      return Array.from({ length: size }, (_, i) => ({
        id: i,
        kind: ["function", "class", "interface", "method", "variable"][i % 5],
        name: ["validate", "process", "handle", "create", "update"][i % 5] + (i < 5 ? "" : i),
        path: `src/${["auth", "api", "db", "utils", "handlers"][i % 5]}/core.py`,
        line: 10 + i * 15,
        score: Math.round((0.99 - (i * 0.01) % 0.5) * 100) / 100,
      }));
    case "mixed":
      return {
        metadata: { version: "1.0", generated: "2026-06-20", count: size },
        records: Array.from({ length: size }, (_, i) => ({
          id: `REC-${i}`,
          type: ["A", "B", "C"][i % 3],
          value: 100 + i * 7.5,
          tags: ["alpha", "beta", "gamma"][i % 3],
          nested: { x: i, y: i * 2 },
        })),
      };
  }
}

// ===== Encode with a delimiter set =====

function encodeWithDelimiters(data, delims) {
  if (!Array.isArray(data)) {
    // Handle nested object (mixed payload)
    return encodeObject(data, delims, 0);
  }
  return encodeArray(data, delims);
}

function encodeArray(arr, delims) {
  if (arr.length === 0) return "";
  const keys = Object.keys(arr[0]);
  const header = `${delims.section} data ${delims.countOpen}${arr.length}${delims.countClose}${delims.schemaOpen}${keys.join(delims.schemaSep)}${delims.schemaClose}`;
  const rows = arr.map(obj => keys.map(k => String(obj[k])).join(delims.field));
  return header + "\n" + rows.join("\n");
}

function encodeObject(obj, delims, depth) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      lines.push(encodeArray(value, delims));
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const subKeys = Object.keys(value);
      lines.push(`${key}=${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}=${String(value)}`);
    }
  }
  return lines.join("\n");
}

// ===== Run experiment =====

const payloadTypes = ["employees", "orders", "logs", "symbols", "mixed"];
const sizes = [10, 50, 100, 500];

console.log("=".repeat(90));
console.log("GRAMMAR SWAP EXPERIMENT");
console.log("5 delimiter sets x 5 payload types x 4 sizes x 8 tokenizers = 800 measurements");
console.log("=".repeat(90));
console.log("");

// Collect all results
const results = [];

for (const type of payloadTypes) {
  for (const size of sizes) {
    const data = buildPayload(type, size);
    const jsonStr = JSON.stringify(data, null, 2);

    const row = { type, size, json: {} };

    // Token count JSON across all tokenizers
    for (const [tokName, tok] of Object.entries(tokenizers)) {
      row.json[tokName] = tok.encode(jsonStr).length;
    }

    // Token count each delimiter set across all tokenizers
    for (const delims of delimiterSets) {
      const encoded = encodeWithDelimiters(data, delims);
      row[delims.name] = {};
      for (const [tokName, tok] of Object.entries(tokenizers)) {
        row[delims.name][tokName] = tok.encode(encoded).length;
      }
    }

    results.push(row);
  }
}

// ===== Report: savings by delimiter set =====

console.log("--- Average savings vs JSON by delimiter set (across all tokenizers) ---");
console.log("");
console.log("Delimiter set".padEnd(20) + sizes.map(s => String(s).padStart(8)).join("") + "    Overall");
console.log("-".repeat(65));

for (const delims of delimiterSets) {
  const perSize = {};
  let totalDelim = 0;
  let totalJson = 0;

  for (const size of sizes) {
    let delimSum = 0;
    let jsonSum = 0;
    for (const row of results.filter(r => r.size === size)) {
      for (const tokName of Object.keys(tokenizers)) {
        delimSum += row[delims.name][tokName];
        jsonSum += row.json[tokName];
      }
    }
    perSize[size] = ((1 - delimSum / jsonSum) * 100).toFixed(1);
    totalDelim += delimSum;
    totalJson += jsonSum;
  }

  const overall = ((1 - totalDelim / totalJson) * 100).toFixed(1);
  console.log(
    delims.name.padEnd(20) +
    sizes.map(s => (perSize[s] + "%").padStart(8)).join("") +
    ("  " + overall + "%").padStart(10)
  );
}

// ===== Report: variance across delimiter sets =====

console.log("");
console.log("--- Savings variance across delimiter sets (should be near zero) ---");
console.log("");

for (const type of payloadTypes) {
  for (const size of sizes) {
    const row = results.find(r => r.type === type && r.size === size);
    const savings = [];

    for (const delims of delimiterSets) {
      let delimTotal = 0;
      let jsonTotal = 0;
      for (const tokName of Object.keys(tokenizers)) {
        delimTotal += row[delims.name][tokName];
        jsonTotal += row.json[tokName];
      }
      savings.push((1 - delimTotal / jsonTotal) * 100);
    }

    const min = Math.min(...savings).toFixed(1);
    const max = Math.max(...savings).toFixed(1);
    const spread = (Math.max(...savings) - Math.min(...savings)).toFixed(1);

    if (parseFloat(spread) > 3.0) {
      console.log(`${type} (${size}): ${min}%-${max}% (${spread}pp spread) ← notable`);
    }
  }
}

console.log("");

// ===== Report: per-tokenizer consistency =====

console.log("--- Per-tokenizer: do different delimiter sets produce different savings? ---");
console.log("");
console.log("Tokenizer".padEnd(18) + delimiterSets.map(d => d.name.substring(0, 10).padStart(12)).join(""));
console.log("-".repeat(78));

for (const [tokName, tok] of Object.entries(tokenizers)) {
  const savingsPerSet = [];
  for (const delims of delimiterSets) {
    let delimTotal = 0;
    let jsonTotal = 0;
    for (const row of results) {
      delimTotal += row[delims.name][tokName];
      jsonTotal += row.json[tokName];
    }
    savingsPerSet.push(((1 - delimTotal / jsonTotal) * 100).toFixed(1) + "%");
  }
  console.log(tokName.padEnd(18) + savingsPerSet.map(s => s.padStart(12)).join(""));
}

console.log("");
console.log("=".repeat(90));
console.log("CONCLUSION");
console.log("=".repeat(90));
console.log("");
console.log("If all delimiter sets show similar savings, GCF's compression is structural");
console.log("(positional fields, keys declared once) not delimiter-specific.");
console.log("If some sets diverge, delimiter choice affects efficiency.");
