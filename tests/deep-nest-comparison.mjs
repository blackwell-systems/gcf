/**
 * Isolated comparison: GCF vs TOON on deeply nested config data.
 *
 * Root cause of TOON's advantage: primitive array encoding.
 * TOON: scopes[3]: read,write,admin (1 line)
 * GCF:  ## scopes [3]\n@0 read\n@1 write\n@2 admin (4 lines)
 *
 * This test varies the number of primitive arrays to isolate
 * the crossover point and quantify the gap.
 *
 * Run: command node tests/deep-nest-comparison.mjs
 */

import { encodeGeneric } from '/Users/dayna.blackwell/code/gcf-typescript/dist/generic.js';
import { encode as toonEncode } from '/Users/dayna.blackwell/code/gcf/docs/node_modules/@toon-format/toon/dist/index.mjs';

// Generate a deeply nested object with configurable depth and keys per level
function generateNested(depth, keysPerLevel, leafKeys = 3) {
  if (depth === 0) {
    // Leaf: object with multiple primitive keys
    const leaf = {};
    for (let i = 0; i < leafKeys; i++) {
      const keys = ['host', 'port', 'timeout', 'retries', 'enabled', 'mode', 'path', 'name'];
      const vals = ['db.example.com', 5432, 30000, 3, true, 'production', '/var/data', 'primary'];
      leaf[keys[i % keys.length]] = vals[i % vals.length];
    }
    return leaf;
  }

  const obj = {};
  const levelNames = [
    ['data', 'config', 'settings', 'options', 'params'],
    ['metadata', 'context', 'environment', 'runtime', 'state'],
    ['database', 'cache', 'queue', 'storage', 'network'],
    ['primary', 'secondary', 'fallback', 'readonly', 'writer'],
    ['connection', 'pool', 'cluster', 'replica', 'shard'],
    ['internal', 'external', 'public', 'private', 'admin'],
    ['core', 'edge', 'proxy', 'gateway', 'service'],
  ];

  const names = levelNames[depth % levelNames.length];
  for (let i = 0; i < keysPerLevel; i++) {
    obj[names[i % names.length]] = generateNested(depth - 1, keysPerLevel, leafKeys);
  }
  return obj;
}

function byteLen(s) {
  return Buffer.byteLength(s, 'utf8');
}

console.log('=== GCF vs TOON: Deeply Nested Config Comparison ===\n');

// Test matrix: vary depth and keys per level
const results = [];

for (const depth of [1, 2, 3, 4, 5, 6]) {
  for (const keysPerLevel of [1, 2, 3]) {
    const data = generateNested(depth, keysPerLevel);

    const gcfOutput = encodeGeneric(data);
    const toonOutput = toonEncode(data);
    const jsonOutput = JSON.stringify(data);

    const gcfBytes = byteLen(gcfOutput);
    const toonBytes = byteLen(toonOutput);
    const jsonBytes = byteLen(jsonOutput);

    const winner = gcfBytes < toonBytes ? 'GCF' : gcfBytes > toonBytes ? 'TOON' : 'TIE';
    const diff = Math.abs(gcfBytes - toonBytes);
    const pct = ((Math.max(gcfBytes, toonBytes) - Math.min(gcfBytes, toonBytes)) / Math.max(gcfBytes, toonBytes) * 100).toFixed(1);

    results.push({ depth, keysPerLevel, gcfBytes, toonBytes, jsonBytes, winner, diff, pct });
  }
}

// Print table
console.log('| Depth | Keys/Level | GCF (bytes) | TOON (bytes) | JSON (bytes) | Winner | Diff | % |');
console.log('|-------|-----------|-------------|-------------|-------------|--------|------|---|');
for (const r of results) {
  console.log(`| ${r.depth} | ${r.keysPerLevel} | ${r.gcfBytes} | ${r.toonBytes} | ${r.jsonBytes} | ${r.winner} | ${r.diff} | ${r.pct}% |`);
}

console.log('\n=== Key Findings ===\n');

const toonWins = results.filter(r => r.winner === 'TOON');
const gcfWins = results.filter(r => r.winner === 'GCF');

console.log(`GCF wins: ${gcfWins.length}/${results.length} configurations`);
console.log(`TOON wins: ${toonWins.length}/${results.length} configurations`);

if (toonWins.length > 0) {
  const maxToonAdvantage = Math.max(...toonWins.map(r => r.diff));
  const avgToonAdvantage = Math.round(toonWins.reduce((a, r) => a + r.diff, 0) / toonWins.length);
  console.log(`\nTOON's max advantage: ${maxToonAdvantage} bytes`);
  console.log(`TOON's avg advantage: ${avgToonAdvantage} bytes`);
  console.log(`TOON wins at: depth ${[...new Set(toonWins.map(r => r.depth))].join(', ')} with keys/level ${[...new Set(toonWins.map(r => r.keysPerLevel))].join(', ')}`);
}

if (gcfWins.length > 0) {
  const maxGcfAdvantage = Math.max(...gcfWins.map(r => r.diff));
  const avgGcfAdvantage = Math.round(gcfWins.reduce((a, r) => a + r.diff, 0) / gcfWins.length);
  console.log(`\nGCF's max advantage: ${maxGcfAdvantage} bytes`);
  console.log(`GCF's avg advantage: ${avgGcfAdvantage} bytes`);
}

// Show actual output for the smallest case where TOON wins
if (toonWins.length > 0) {
  const smallest = toonWins.reduce((a, b) => a.gcfBytes < b.gcfBytes ? a : b);
  const data = generateNested(smallest.depth, smallest.keysPerLevel);
  console.log(`\n=== Example: depth=${smallest.depth}, keys=${smallest.keysPerLevel} (TOON wins by ${smallest.diff} bytes) ===\n`);
  console.log('--- GCF ---');
  console.log(encodeGeneric(data));
  console.log('--- TOON ---');
  console.log(toonEncode(data));
}

// ===== TEST 2: Isolate primitive arrays (the real root cause) =====
console.log('\n\n=== TEST 2: Primitive Array Count (Root Cause) ===\n');
console.log('TOON encodes primitive arrays inline: scopes[3]: read,write,admin');
console.log('GCF expands them vertically: ## scopes [3] + @0 read + @1 write + @2 admin\n');

const arrayResults = [];

for (const numArrays of [0, 2, 4, 8, 12, 20]) {
  const data = {
    name: 'my-service',
    version: '2.1.0',
    environment: 'production',
  };

  // Add nested object (always present)
  data.database = { host: 'db.example.com', port: 5432, pool_size: 10 };

  // Add primitive arrays
  const arrayNames = ['scopes', 'regions', 'tags', 'features', 'roles', 'endpoints',
                      'origins', 'methods', 'headers', 'domains', 'ports', 'protocols',
                      'ciphers', 'namespaces', 'topics', 'queues', 'buckets', 'indexes',
                      'replicas', 'partitions'];
  const arrayValues = ['read', 'write', 'admin', 'us-east-1', 'eu-west-1', 'ap-south-1'];

  for (let i = 0; i < numArrays; i++) {
    data[arrayNames[i]] = arrayValues.slice(0, 3);
  }

  const gcfOutput = encodeGeneric(data);
  const toonOutput = toonEncode(data);
  const jsonOutput = JSON.stringify(data);

  const gcfBytes = byteLen(gcfOutput);
  const toonBytes = byteLen(toonOutput);
  const jsonBytes = byteLen(jsonOutput);

  const winner = gcfBytes < toonBytes ? 'GCF' : gcfBytes > toonBytes ? 'TOON' : 'TIE';
  const diff = gcfBytes - toonBytes;

  arrayResults.push({ numArrays, gcfBytes, toonBytes, jsonBytes, winner, diff });
}

console.log('| Prim Arrays | GCF (bytes) | TOON (bytes) | JSON (bytes) | Winner | GCF-TOON |');
console.log('|-------------|-------------|-------------|-------------|--------|----------|');
for (const r of arrayResults) {
  const sign = r.diff > 0 ? '+' : '';
  console.log(`| ${r.numArrays} | ${r.gcfBytes} | ${r.toonBytes} | ${r.jsonBytes} | ${r.winner} | ${sign}${r.diff} |`);
}

// Show the crossover example
const zeroArrays = arrayResults[0];
const twelveArrays = arrayResults.find(r => r.numArrays === 12);
console.log(`\n0 arrays: GCF ${zeroArrays.diff > 0 ? 'loses' : 'wins'} by ${Math.abs(zeroArrays.diff)} bytes`);
console.log(`12 arrays: GCF ${twelveArrays.diff > 0 ? 'loses' : 'wins'} by ${Math.abs(twelveArrays.diff)} bytes`);
console.log(`\nPer-array cost: GCF adds ~${Math.round((twelveArrays.diff - zeroArrays.diff) / 12)} bytes per primitive array vs TOON`);

// Show what 12 arrays looks like in both formats
const showData = { name: 'svc', tags: ['read', 'write', 'admin'] };
console.log('\n=== Primitive array encoding comparison ===\n');
console.log('--- GCF ---');
console.log(encodeGeneric(showData));
console.log('--- TOON ---');
console.log(toonEncode(showData));
console.log('--- JSON ---');
console.log(JSON.stringify(showData));
