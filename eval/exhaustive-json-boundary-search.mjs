/**
 * Exhaustive JSON Boundary Merge Search
 *
 * Systematically finds the worst-case JSON tokenization by testing
 * every combination of common field names, value types, and nesting
 * patterns against all 8 tokenizers.
 *
 * Scores patterns by:
 * 1. Number of hidden grammar/payload boundaries (grammar symbols fused with content)
 * 2. Number of distinct tokenizations across models
 * 3. Number of multi-grammar merges (multiple grammar symbols in one token)
 *
 * Run: node eval/exhaustive-json-boundary-search.mjs
 */

const packages = {
  "GPT-4": "@lenml/tokenizer-gpt4",
  "GPT-4o": "@lenml/tokenizer-gpt4o",
  "Claude": "@lenml/tokenizer-claude",
  "LLaMA": "@lenml/tokenizer-llama3_1",
  "Qwen": "@lenml/tokenizer-qwen2_5",
  "DeepSeek": "@lenml/tokenizer-deepseek_v3",
  "Gemma": "@lenml/tokenizer-gemma2",
  "Mistral": "@lenml/tokenizer-mistral_nemo",
};

const tokenizers = {};
for (const [name, pkg] of Object.entries(packages)) {
  const mod = await import(pkg);
  tokenizers[name] = mod.fromPreTrained();
}

function decode(ids, tok) { return ids.map(id => tok.decode([id])); }
function tokenize(text, tok) { return tok.encode(text, { add_special_tokens: false }); }

// Grammar symbols in JSON
const GRAMMAR_CHARS = new Set(['"', ':', ',', '{', '}', '[', ']']);

function countHiddenBoundaries(text, tok) {
  const ids = tokenize(text, tok);
  const dec = decode(ids, tok);
  let hidden = 0;
  let multiGrammar = 0;

  for (const t of dec) {
    if (t.length <= 1) continue;

    // Count grammar chars in this token
    let grammarCount = 0;
    let payloadCount = 0;
    for (const ch of t) {
      if (GRAMMAR_CHARS.has(ch)) grammarCount++;
      else payloadCount++;
    }

    // Hidden boundary: token contains BOTH grammar and payload chars
    if (grammarCount > 0 && payloadCount > 0) hidden++;

    // Multi-grammar: token contains 2+ different grammar symbols
    const uniqueGrammar = new Set([...t].filter(ch => GRAMMAR_CHARS.has(ch)));
    if (uniqueGrammar.size >= 2) multiGrammar++;
  }

  return { hidden, multiGrammar };
}

console.log("═".repeat(80));
console.log("EXHAUSTIVE JSON BOUNDARY MERGE SEARCH");
console.log("═".repeat(80));
console.log();
console.log("Testing every combination systematically to find maximum boundary hiding.");
console.log("Grammar symbols: \" : , { } [ ]");
console.log("Hidden boundary = grammar symbol fused with payload in same token.");
console.log("Multi-grammar merge = 2+ grammar symbols in one token.");
console.log();

// ═══════════════════════════════════════════════════════════════════════
// CATEGORY 1: Field names (short common names that might fuse with quote)
// ═══════════════════════════════════════════════════════════════════════

const fieldNames = [
  // 1-2 char (most likely to merge completely)
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "id", "to", "in", "on", "at", "by", "of", "is", "no", "up", "ok",
  // 3-4 char common
  "url", "src", "ref", "key", "val", "num", "str", "err", "msg", "log",
  "max", "min", "len", "idx", "pos", "col", "row", "tag", "cmd", "arg",
  "name", "type", "kind", "mode", "code", "text", "body", "data", "meta",
  "info", "item", "node", "path", "base", "root", "from", "role", "user",
  "host", "port", "file", "line", "size", "time", "date",
  // 5-8 char common (camelCase)
  "value", "label", "title", "count", "total", "score", "level", "state",
  "email", "phone", "price", "width", "depth", "color", "style",
  "orderId", "userId", "apiKey", "srcDir", "outDir", "tmpDir",
  "firstName", "lastName", "userName", "typeName", "nodeName",
  "startDate", "endDate", "createdAt", "updatedAt",
  // snake_case
  "user_id", "api_key", "created_at", "updated_at", "file_path",
  "status_code", "error_message", "request_id", "session_id",
];

// ═══════════════════════════════════════════════════════════════════════
// CATEGORY 2: Values (types that might trigger grammar merges)
// ═══════════════════════════════════════════════════════════════════════

const valueTypes = [
  // URLs and paths (slashes after quotes)
  "/", "/api", "/api/v1", "/api/v1/users", "/home/user/.config",
  "http://localhost", "http://example.com/api",
  "https://api.example.com/v2/users",
  "../config.json", "./src/index.ts", "~/Documents",
  // Git/GitHub refs
  "org/repo", "org/repo#123", "git@github.com:org/repo.git",
  "refs/heads/main", "HEAD~3",
  // Quoted-ish strings
  "it's", "don't", "they're",
  // Numbers after quotes
  "123", "0", "1", "42", "3.14", "-1", "+5",
  // Booleans/null (common JSON values)
  "true", "false", "null", "undefined", "NaN", "Infinity",
  // Common identifiers
  "node_modules", "package-lock.json", "tsconfig.json",
  "index.ts", "main.go", "app.py",
  // Auth tokens
  "Bearer abc123", "sk-abc123def456", "api_key_production_v2",
  // MIME types
  "application/json", "text/html", "image/png",
  // Locale/encoding
  "en-US", "utf-8", "ISO-8859-1", "ISO-8601",
  // CSS/selectors
  ".class-name", "#element-id", "div > span",
  // Brackets in values (common in code)
  "fn()", "arr[0]", "map[key]", "obj.prop",
  // Empty and whitespace
  "", " ", "  ",
  // Single chars
  "a", "0", "/", ".", "-", "_", "@", "#",
];

// ═══════════════════════════════════════════════════════════════════════
// CATEGORY 3: Full patterns to test
// ═══════════════════════════════════════════════════════════════════════

const results = [];
let tested = 0;

console.log("Testing single-field patterns...");

// Single field patterns: "field":"value"
for (const f of fieldNames) {
  for (const v of valueTypes) {
    const pattern = '"' + f + '":"' + v + '"';
    const sigs = {};
    let totalHidden = 0;
    let totalMulti = 0;

    for (const [name, tok] of Object.entries(tokenizers)) {
      const ids = tokenize(pattern, tok);
      const dec = decode(ids, tok);
      const s = dec.map(t => "[" + t + "]").join("");
      if (!sigs[s]) sigs[s] = [];
      sigs[s].push(name);

      const { hidden, multiGrammar } = countHiddenBoundaries(pattern, tok);
      totalHidden += hidden;
      totalMulti += multiGrammar;
    }

    results.push({
      pattern,
      variants: Object.keys(sigs).length,
      hiddenBoundaries: totalHidden,
      multiGrammarMerges: totalMulti,
      sigs,
    });
    tested++;
  }
}

console.log(`  Tested ${tested} single-field patterns.`);

// Multi-field objects
console.log("Testing multi-field patterns...");

const multiPatterns = [];
// Generate objects with 2-3 fields using worst-case field names
const worstFields = ["name", "value", "id", "type", "url", "src", "ref", "path"];
const worstValues = ["/api/v1", "org/repo#123", "sk-abc123", "node_modules", "ISO-8601", "true", "123"];

for (let i = 0; i < worstFields.length - 1; i++) {
  for (let j = i + 1; j < worstFields.length; j++) {
    for (const v1 of worstValues.slice(0, 4)) {
      for (const v2 of worstValues.slice(0, 4)) {
        const pattern = '{"' + worstFields[i] + '":"' + v1 + '","' + worstFields[j] + '":"' + v2 + '"}';
        const sigs = {};
        let totalHidden = 0;
        let totalMulti = 0;

        for (const [name, tok] of Object.entries(tokenizers)) {
          const ids = tokenize(pattern, tok);
          const dec = decode(ids, tok);
          const s = dec.map(t => "[" + t + "]").join("");
          if (!sigs[s]) sigs[s] = [];
          sigs[s].push(name);

          const { hidden, multiGrammar } = countHiddenBoundaries(pattern, tok);
          totalHidden += hidden;
          totalMulti += multiGrammar;
        }

        results.push({
          pattern,
          variants: Object.keys(sigs).length,
          hiddenBoundaries: totalHidden,
          multiGrammarMerges: totalMulti,
          sigs,
        });
        tested++;
      }
    }
  }
}

console.log(`  Tested ${tested} total patterns.`);
console.log();

// ═══════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════

// Sort by composite score: hidden boundaries + multi-grammar + variants
results.sort((a, b) => {
  const scoreA = a.hiddenBoundaries * 3 + a.multiGrammarMerges * 5 + a.variants;
  const scoreB = b.hiddenBoundaries * 3 + b.multiGrammarMerges * 5 + b.variants;
  return scoreB - scoreA;
});

console.log("─".repeat(80));
console.log("TOP 20 WORST JSON PATTERNS (composite score: hidden boundaries + multi-grammar)");
console.log("─".repeat(80));
console.log();

for (let i = 0; i < 20; i++) {
  const r = results[i];
  const score = r.hiddenBoundaries * 3 + r.multiGrammarMerges * 5 + r.variants;
  console.log(`#${String(i + 1).padStart(2)}: ${r.pattern}`);
  console.log(`    Score: ${score} | Variants: ${r.variants} | Hidden boundaries: ${r.hiddenBoundaries} | Multi-grammar merges: ${r.multiGrammarMerges}`);
  for (const [tokenization, models] of Object.entries(r.sigs)) {
    console.log(`    ${models.join(", ")}: ${tokenization}`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-GRAMMAR SHOWCASE
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("MULTI-GRAMMAR MERGES (tokens containing 2+ grammar symbols)");
console.log("─".repeat(80));
console.log();
console.log("These are tokens where multiple JSON grammar characters fuse together,");
console.log("potentially with payload content. The model sees one token where");
console.log("there should be multiple structural operations.");
console.log();

// Find all unique multi-grammar tokens across all results
const multiGrammarTokens = new Map(); // token -> {pattern, models}

for (const r of results.slice(0, 100)) {
  for (const [name, tok] of Object.entries(tokenizers)) {
    const ids = tokenize(r.pattern, tok);
    const dec = decode(ids, tok);
    for (const t of dec) {
      const uniqueGrammar = new Set([...t].filter(ch => GRAMMAR_CHARS.has(ch)));
      if (uniqueGrammar.size >= 2 && t.length > 2) {
        if (!multiGrammarTokens.has(t)) {
          multiGrammarTokens.set(t, { patterns: new Set(), models: new Set() });
        }
        multiGrammarTokens.get(t).patterns.add(r.pattern);
        multiGrammarTokens.get(t).models.add(name);
      }
    }
  }
}

// Sort by number of grammar chars in token
const sorted = [...multiGrammarTokens.entries()].sort((a, b) => {
  const gramA = new Set([...a[0]].filter(ch => GRAMMAR_CHARS.has(ch))).size;
  const gramB = new Set([...b[0]].filter(ch => GRAMMAR_CHARS.has(ch))).size;
  return gramB - gramA || b[0].length - a[0].length;
});

for (const [token, info] of sorted.slice(0, 15)) {
  const grammarInToken = [...token].filter(ch => GRAMMAR_CHARS.has(ch));
  const payloadInToken = [...token].filter(ch => !GRAMMAR_CHARS.has(ch));
  console.log(`Token: "${token}"`);
  console.log(`  Grammar chars: ${grammarInToken.map(c => "'" + c + "'").join(", ")}`);
  console.log(`  Payload chars: ${payloadInToken.length > 0 ? payloadInToken.join("") : "(none)"}`);
  console.log(`  Models: ${[...info.models].join(", ")}`);
  console.log(`  Example pattern: ${[...info.patterns][0]}`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════

console.log("─".repeat(80));
console.log("STATISTICS");
console.log("─".repeat(80));
console.log();
console.log(`Total patterns tested: ${tested}`);
console.log(`Patterns with hidden boundaries: ${results.filter(r => r.hiddenBoundaries > 0).length} (${(results.filter(r => r.hiddenBoundaries > 0).length / tested * 100).toFixed(1)}%)`);
console.log(`Patterns with multi-grammar merges: ${results.filter(r => r.multiGrammarMerges > 0).length} (${(results.filter(r => r.multiGrammarMerges > 0).length / tested * 100).toFixed(1)}%)`);
console.log(`Patterns with 2+ variants: ${results.filter(r => r.variants >= 2).length} (${(results.filter(r => r.variants >= 2).length / tested * 100).toFixed(1)}%)`);
console.log(`Patterns with 4+ variants: ${results.filter(r => r.variants >= 4).length} (${(results.filter(r => r.variants >= 4).length / tested * 100).toFixed(1)}%)`);
console.log(`Max variants found: ${Math.max(...results.map(r => r.variants))}`);
console.log(`Max hidden boundaries: ${Math.max(...results.map(r => r.hiddenBoundaries))}`);
console.log(`Max multi-grammar merges: ${Math.max(...results.map(r => r.multiGrammarMerges))}`);
