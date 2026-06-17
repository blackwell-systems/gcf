import { encode, decode } from '@toon-format/toon';

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateValue(rng, depth = 0) {
  const r = rng();

  if (depth > 3) {
    return generateScalar(rng);
  }

  if (r < 0.15) return null;
  if (r < 0.25) return generateScalar(rng);
  if (r < 0.55) return generateArray(rng, depth);
  return generateObject(rng, depth);
}

function generateScalar(rng) {
  const r = rng();
  if (r < 0.15) return null;
  if (r < 0.25) return true;
  if (r < 0.35) return false;
  if (r < 0.55) return generateNumber(rng);
  return generateString(rng);
}

function generateNumber(rng) {
  const r = rng();
  if (r < 0.3) return Math.floor(rng() * 1000);
  if (r < 0.5) return -Math.floor(rng() * 1000);
  if (r < 0.7) return Math.round(rng() * 1000 * 100) / 100;
  if (r < 0.85) return 0;
  return Math.round(rng() * 1e9);
}

function generateString(rng) {
  const r = rng();
  if (r < 0.05) return '';
  if (r < 0.1) return 'true';    // boolean-like string
  if (r < 0.15) return 'false';
  if (r < 0.2) return '42';      // numeric string
  // Targeted edge cases for format boundary testing
  const edgeCases = [
    '-', '""', 'null', 'undefined', 'true', 'false', 'NaN', 'Infinity',
    '0', '-0', '42', '-1', '3.14',
    '', ' ', '  ',
    // TOON structural characters
    'hello,world', 'a,b,c', ',', ',,',
    'line1\nline2', '\n', '\n\n',
    'tab\there', '\t',
    'has"quote', '"', '""', '"hello"',
    'back\\slash', '\\', '\\n', '\\t',
    '  spaces  ', ' leading', 'trailing ',
    // Bracket attacks (TOON uses [] for arrays)
    '[1,2,3]', '[]', '[', ']', '[[]]', '[0]', '[?]',
    'val[0]', 'key[1]:value', 'a[b]c', 'x[10]',
    'name[3]: a,b,c',  // looks like TOON inline array
    'test[0]:', '[100]',
    // Brace attacks
    '{"a":1}', '{}', '{', '}', '{fields}', '{a,b,c}',
    // Colon attacks (TOON key-value separator)
    'key: value', 'a: b', ':', '::', 'http://example.com',
    // Indentation attacks
    '  indented', '    deep', '\tTabbed',
    // Unicode
    'café', '日本語', '🎯', 'Ñ', 'über', '中文测试',
    'emoji 🔥 here', '∑∫∂', 'مرحبا',
    // Multi-line
    'line1\nline2\nline3',
    'paragraph\n\nbreak',
    // TOON header-like strings
    'tool: example', 'symbols[3]{name,kind}:',
    'edges[1]{source,target,type}:',
    // Numeric strings that could confuse parsers
    '1e10', '1.0e-5', '+42', '0x1F', '0b101', '0o777',
    'Infinity', '-Infinity', 'NaN',
    // Whitespace variants
    '\r\n', '\r', '\v', '\f',
    // Empty-ish
    'null', 'nil', 'none', 'None', 'NULL', 'NIL',
    // Quoting edge cases
    "'single'", '`backtick`', "it's", "they're",
    // Long strings
    'a'.repeat(100), 'x'.repeat(1000),
    // Repeated delimiters
    '|||', '===', '###', '---',
    // Mixed structural chars
    'a[1],b{2}:c', '{key}[0]: val, val2',
  ];

  if (r < 0.40) {
    return edgeCases[Math.floor(rng() * edgeCases.length)];
  }

  // Random strings with dangerous characters
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 _-.!@#,;:[]{}()\'"\\/<>|+=~`\n\t';
  const len = Math.floor(rng() * 30) + 1;
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(rng() * chars.length)];
  }
  return s;
}

function generateKey(rng) {
  const keys = [
    'id','name','value','status','type','count','active','score','kind','data',
    'email','total','price','qty','flag','mode','level','tag','role','src',
    // Keys that might confuse parsers
    'tool','symbols','edges','fields','length','key','null','true','false',
    '0','items','rows','type_id','has-dash','has.dot','has_under',
  ];
  return keys[Math.floor(rng() * keys.length)];
}

function generateObject(rng, depth) {
  const obj = {};
  const numKeys = Math.floor(rng() * 5) + 1;
  for (let i = 0; i < numKeys; i++) {
    const key = generateKey(rng) + (i > 0 ? i : '');
    obj[key] = generateValue(rng, depth + 1);
  }
  return obj;
}

function generateArray(rng, depth) {
  const len = Math.floor(rng() * 6);
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(generateValue(rng, depth + 1));
  }
  return arr;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k, i) => k === keysB[i] && deepEqual(a[k], b[k]));
  }

  // Number comparison with float tolerance
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return a === b;
  }

  return a === b;
}

function describeFailure(original, decoded) {
  if (typeof original !== typeof decoded) {
    return `type mismatch: ${typeof original} vs ${typeof decoded}`;
  }
  if (original === null && decoded !== null) return `null became ${JSON.stringify(decoded)}`;
  if (original !== null && decoded === null) return `${JSON.stringify(original)} became null`;
  return `value mismatch: ${JSON.stringify(original).slice(0, 100)} vs ${JSON.stringify(decoded).slice(0, 100)}`;
}

// Main fuzz loop
const NUM_TESTS = parseInt(process.argv[2] || '100000');
const START_SEED = parseInt(process.argv[3] || '0');

let pass = 0;
let fail = 0;
let encodeErrors = 0;
let decodeErrors = 0;
const failures = [];

const startTime = Date.now();

for (let seed = START_SEED; seed < START_SEED + NUM_TESTS; seed++) {
  const rng = mulberry32(seed);
  const value = generateValue(rng);

  let encoded;
  try {
    encoded = encode(value);
  } catch (e) {
    encodeErrors++;
    if (encodeErrors <= 10) {
      failures.push({ seed, phase: 'encode', error: e.message, input: JSON.stringify(value).slice(0, 200) });
    }
    continue;
  }

  let decoded;
  try {
    decoded = decode(encoded);
  } catch (e) {
    decodeErrors++;
    if (decodeErrors <= 10) {
      failures.push({ seed, phase: 'decode', error: e.message, input: JSON.stringify(value).slice(0, 200), encoded: encoded.slice(0, 200) });
    }
    continue;
  }

  if (deepEqual(value, decoded)) {
    pass++;
  } else {
    fail++;
    if (fail <= 20) {
      failures.push({
        seed,
        phase: 'mismatch',
        detail: describeFailure(value, decoded),
        input: JSON.stringify(value).slice(0, 300),
        decoded: JSON.stringify(decoded).slice(0, 300),
        encoded: encoded.slice(0, 300),
      });
    }
  }

  if ((seed - START_SEED) % 10000 === 0 && seed > START_SEED) {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = Math.round((seed - START_SEED) / elapsed);
    process.stderr.write(`\r${seed - START_SEED}/${NUM_TESTS} (${rate}/s) pass=${pass} fail=${fail} encErr=${encodeErrors} decErr=${decodeErrors}`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n\n=== TOON Fuzz Results ===`);
console.log(`Tests: ${NUM_TESTS}`);
console.log(`Seeds: ${START_SEED} to ${START_SEED + NUM_TESTS - 1}`);
console.log(`Time: ${elapsed}s`);
console.log(`Pass: ${pass}`);
console.log(`Fail: ${fail}`);
console.log(`Encode errors: ${encodeErrors}`);
console.log(`Decode errors: ${decodeErrors}`);
console.log(`Success rate: ${((pass / NUM_TESTS) * 100).toFixed(2)}%`);

if (failures.length > 0) {
  // Classify failures
  const categories = {};
  for (const f of failures) {
    const cat = f.error ? f.error.split(':')[0].trim() : f.phase;
    categories[cat] = (categories[cat] || 0) + 1;
  }

  console.log(`\n=== Failure Categories ===`);
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\n=== Sample Failures (first ${Math.min(failures.length, 10)}) ===`);
  for (const f of failures.slice(0, 10)) {
    console.log(`\nSeed ${f.seed} [${f.phase}]:`);
    if (f.error) console.log(`  Error: ${f.error}`);
    if (f.detail) console.log(`  Detail: ${f.detail}`);
    console.log(`  Input: ${f.input}`);
    if (f.encoded) console.log(`  Encoded: ${f.encoded}`);
    if (f.decoded) console.log(`  Decoded: ${f.decoded}`);
  }
}
