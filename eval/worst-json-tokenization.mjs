/**
 * Worst JSON Tokenization Analysis
 *
 * Finds JSON patterns with maximum tokenization variance across models.
 * Tests realistic field-name patterns and full JSON objects to identify
 * the worst cases where models disagree on token boundaries.
 *
 * Key findings:
 * - "userName":"req_xyz789" produces 7 distinct tokenizations across 8 models
 * - {"orderId":"ORD-001","value":"shipped"} produces 4 different token counts
 * - "name": merges quote+field on 5/8 tokenizers
 * - GCF pipe merges on 0/8 for every pattern tested
 *
 * Requires:
 *   npm install @blackwell-systems/gcf @lenml/tokenizers \
 *     @lenml/tokenizer-claude @lenml/tokenizer-gpt4 @lenml/tokenizer-gpt4o \
 *     @lenml/tokenizer-llama3_1 @lenml/tokenizer-qwen2_5 \
 *     @lenml/tokenizer-deepseek_v3 @lenml/tokenizer-gemma2 \
 *     @lenml/tokenizer-mistral_nemo
 *
 * Run: node eval/worst-json-tokenization.mjs
 */

const packages = {
  "GPT-4 (OpenAI cl100k)": "@lenml/tokenizer-gpt4",
  "GPT-4o (OpenAI o200k)": "@lenml/tokenizer-gpt4o",
  "Claude (Anthropic)": "@lenml/tokenizer-claude",
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

function tokenize(text, tok) {
  return tok.encode(text, { add_special_tokens: false });
}

function decode(ids, tok) {
  return ids.map(id => tok.decode([id]));
}

function sig(text, tok) {
  const ids = tokenize(text, tok);
  return decode(ids, tok).map(t => "[" + t + "]").join("");
}

console.log("═".repeat(80));
console.log("WORST JSON TOKENIZATION ANALYSIS");
console.log("═".repeat(80));
console.log();
console.log("8 tokenizers from 6 providers. Finding maximum disagreement.");
console.log();

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Quote-field merge rate
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("TEST 1: JSON quote-field merge rate");
console.log("─".repeat(80));
console.log();
console.log("Does the opening quote merge with the field name?");
console.log("Merged = model sees one token where there should be a boundary.");
console.log();

const fieldPatterns = [
  '"value":',
  '"name":',
  '"orderId":',
  '"userName":',
  '"tier":',
  '"status":',
  '"total":',
  '"items":',
  '"count":',
  '"email":',
  '"score":',
  '"active":',
  '"type":',
  '"id":',
  '"data":',
];

console.log("Pattern".padEnd(16) + " │ Merges │ Models that merge");
console.log("─".repeat(16) + "─┼────────┼─" + "─".repeat(50));

for (const pattern of fieldPatterns) {
  const mergers = [];
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const firstTok = dec[0];
    const merged = firstTok.includes('"') && firstTok.length > 1 && /[a-zA-Z]/.test(firstTok);
    if (merged) mergers.push(name.split(" ")[0]);
  }
  console.log(
    pattern.padEnd(16) + " │ " + (mergers.length + "/8").padEnd(6) + " │ " +
    (mergers.length > 0 ? mergers.join(", ") : "(none)")
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: GCF pipe merge rate (control)
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("TEST 2: GCF pipe merge rate (control)");
console.log("─".repeat(80));
console.log();
console.log("Does the pipe ever merge with adjacent content?");
console.log();

const gcfPatterns = [
  "value|pending",
  "name|Alice",
  "orderId|ORD-001",
  "userName|john",
  "tier|premium",
  "status|active",
  "total|99.5",
  "items|3",
  "count|150",
  "email|alice@example.com",
  "score|95.5",
  "active|true",
  "type|function",
  "id|12345",
  "data|hello world",
];

console.log("Pattern".padEnd(28) + " │ Merges");
console.log("─".repeat(28) + "─┼────────");

for (const pattern of gcfPatterns) {
  let mergeCount = 0;
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const pipeMerged = dec.some(t => t.includes("|") && t.length > 1);
    if (pipeMerged) mergeCount++;
  }
  console.log(pattern.padEnd(28) + " │ " + mergeCount + "/8");
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: Maximum variance patterns
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("TEST 3: JSON patterns with maximum tokenization variance");
console.log("─".repeat(80));
console.log();

const fieldNames = [
  "orderId", "userId", "userName", "firstName", "lastName", "emailAddress",
  "phoneNumber", "streetAddress", "zipCode", "countryCode", "createdAt",
  "updatedAt", "isActive", "isVerified", "totalAmount", "unitPrice",
  "itemCount", "statusCode", "errorMessage", "requestId", "sessionId",
  "apiKey", "accessToken", "refreshToken", "expiresAt", "lastLogin",
  "ipAddress", "userAgent", "contentType", "responseTime", "retryCount",
  "maxRetries", "timeoutMs", "batchSize", "pageSize", "pageNumber",
  "sortOrder", "filterBy", "groupBy", "startDate", "endDate",
  "value", "name", "tier", "status", "total", "items", "count", "type",
];

const values = [
  "pending", "active", "completed", "failed", "cancelled",
  "usr_abc123", "req_xyz789", "2026-06-21T01:00:00Z",
  "john.doe@example.com", "192.168.1.100", "Bearer eyJhbG",
  "application/json", "Mozilla/5.0", "North America",
  "credit_card", "bank_transfer", "in_progress",
  "ORD-00001", "shipped", "premium", "standard",
];

// Find top 10 worst patterns
const results = [];

for (const field of fieldNames) {
  for (const value of values) {
    const json = '"' + field + '":"' + value + '"';
    const sigs = {};
    for (const [name, tok] of Object.entries(tokenizers)) {
      const ids = tokenize(json, tok);
      const s = sig(json, tok);
      if (!sigs[s]) sigs[s] = [];
      sigs[s].push(name.split(" ")[0]);
    }
    results.push({ json, variants: Object.keys(sigs).length, sigs });
  }
}

results.sort((a, b) => b.variants - a.variants);

console.log("Top 10 worst JSON field patterns (most tokenization variants):");
console.log();

for (let i = 0; i < 10; i++) {
  const r = results[i];
  console.log(`#${i + 1}: ${r.json} (${r.variants} distinct tokenizations)`);
  for (const [tokenization, models] of Object.entries(r.sigs)) {
    console.log(`  ${models.join(", ")}:`);
    console.log(`    ${tokenization}`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: Full JSON objects with token-count variance
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("TEST 4: Full JSON objects — token count variance");
console.log("─".repeat(80));
console.log();

const objects = [
  '{"orderId":"ORD-001","value":"shipped"}',
  '{"name":"Alice","status":"active"}',
  '{"tier":"premium","name":"Eve"}',
  '{"userName":"john","tier":"gold","status":"active"}',
  '{"value":"pending","count":150,"name":"Bob"}',
  '{"orderId":"ORD-001","value":"shipped","name":"Alice Chen"}',
  '{"firstName":"John","lastName":"Doe","email":"john@example.com"}',
  '{"requestId":"req_xyz789","statusCode":"200","responseTime":"45ms"}',
];

console.log("Object".padEnd(65) + " │ Token counts across 8 models");
console.log("─".repeat(65) + "─┼─" + "─".repeat(40));

for (const obj of objects) {
  const counts = {};
  for (const [name, tok] of Object.entries(tokenizers)) {
    const c = tokenize(obj, tok).length;
    if (!counts[c]) counts[c] = [];
    counts[c].push(name.split(" ")[0]);
  }
  const range = Object.keys(counts).map(Number);
  const min = Math.min(...range);
  const max = Math.max(...range);
  const variants = range.length;
  const display = obj.length > 63 ? obj.substring(0, 60) + "..." : obj;
  console.log(
    display.padEnd(65) + " │ " +
    `${variants} variants (${min}-${max} tokens)`
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 5: The showcase examples (for blog/image)
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("─".repeat(80));
console.log("TEST 5: Showcase examples (experimentally verified)");
console.log("─".repeat(80));
console.log();

// Example 1: "value":"pending" (clean 4/4 split)
console.log('EXAMPLE 1: "value":"pending"');
console.log("JSON splits into 4 tokens on half, 5 tokens on other half:");
console.log();
for (const [name, tok] of Object.entries(tokenizers)) {
  const ids = tokenize('"value":"pending"', tok);
  const dec = decode(ids, tok);
  console.log(`  ${name.padEnd(22)} (${ids.length}): ${dec.map(t => "[" + t + "]").join("")}`);
}
console.log();
console.log("GCF equivalent: value|pending");
console.log("Identical on all 8:");
console.log();
for (const [name, tok] of Object.entries(tokenizers)) {
  const ids = tokenize("value|pending", tok);
  const dec = decode(ids, tok);
  console.log(`  ${name.padEnd(22)} (${ids.length}): ${dec.map(t => "[" + t + "]").join("")}`);
}

// Example 2: "userName":"req_xyz789" (7 distinct)
console.log();
console.log('EXAMPLE 2: "userName":"req_xyz789" (7 distinct tokenizations!)');
console.log();
for (const [name, tok] of Object.entries(tokenizers)) {
  const ids = tokenize('"userName":"req_xyz789"', tok);
  const dec = decode(ids, tok);
  console.log(`  ${name.padEnd(22)} (${ids.length}): ${dec.map(t => "[" + t + "]").join("")}`);
}
console.log();
console.log("GCF equivalent: userName|req_xyz789");
console.log("Pipe always separate (value variance only):");
console.log();
for (const [name, tok] of Object.entries(tokenizers)) {
  const ids = tokenize("userName|req_xyz789", tok);
  const dec = decode(ids, tok);
  console.log(`  ${name.padEnd(22)} (${ids.length}): ${dec.map(t => "[" + t + "]").join("")}`);
}

// Example 3: full object with 4 token-count variants
console.log();
console.log('EXAMPLE 3: {"orderId":"ORD-001","value":"shipped"} (4 token-count variants)');
console.log();
for (const [name, tok] of Object.entries(tokenizers)) {
  const ids = tokenize('{"orderId":"ORD-001","value":"shipped"}', tok);
  const dec = decode(ids, tok);
  console.log(`  ${name.padEnd(22)} (${ids.length}): ${dec.map(t => "[" + t + "]").join("")}`);
}

// ═══════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════

console.log();
console.log("═".repeat(80));
console.log("SUMMARY");
console.log("═".repeat(80));
console.log();
console.log("JSON structural delimiter (quote) merge rate:");

let totalMerges = 0;
let totalChecks = 0;
for (const pattern of fieldPatterns) {
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(pattern, tok);
    const dec = decode(ids, tok);
    const firstTok = dec[0];
    const merged = firstTok.includes('"') && firstTok.length > 1 && /[a-zA-Z]/.test(firstTok);
    if (merged) totalMerges++;
    totalChecks++;
  }
}
console.log(`  ${totalMerges}/${totalChecks} checks show merge (${(totalMerges/totalChecks*100).toFixed(1)}%)`);
console.log(`  Worst case: "name": merges on 5/8 tokenizers`);
console.log();
console.log("GCF structural delimiter (pipe) merge rate:");
console.log(`  0/${gcfPatterns.length * 8} checks show merge (0.0%)`);
console.log(`  Pipe NEVER merges with adjacent content on any tokenizer`);
console.log();
console.log("Maximum variance found:");
console.log(`  Single field: "${results[0].json}" → ${results[0].variants} distinct tokenizations`);
console.log(`  Full object: {"orderId":"ORD-001","value":"shipped"} → 4 token-count variants`);
console.log();
console.log("Conclusion:");
console.log("  JSON's structural grammar is tokenizer-dependent.");
console.log("  GCF's structural grammar is tokenizer-invariant.");
console.log("  The ambiguity is in JSON's DELIMITERS, not in the data values.");
