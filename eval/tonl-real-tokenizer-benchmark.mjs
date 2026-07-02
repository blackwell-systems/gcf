#!/usr/bin/env node
/**
 * TONL vs GCF vs JSON: Real tokenizer benchmark
 *
 * Uses tiktoken (actual BPE tokenizers: o200k_base, cl100k_base)
 * instead of TONL's fabricated regex-based "estimateTokens" function.
 *
 * Tests all TONL benchmark fixtures from github.com/tonl-dev/tonl
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { encoding_for_model } = require('tiktoken');

import { readFileSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Real tokenizers
const o200k = encoding_for_model('gpt-4o');   // GPT-4o, GPT-5 family
const cl100k = encoding_for_model('gpt-4');    // GPT-4, Claude-adjacent

// Import TONL encoder
const tonlPath = resolve(__dirname, '../../tonl-benchmark/dist/index.js');
const tonl = await import(tonlPath);
const { encodeTONL, encodeSmart } = tonl;

// Import GCF encoder
let encodeGeneric;
try {
  const gcfPath = resolve(__dirname, '../../gcf-typescript/dist/index.js');
  const gcf = await import(gcfPath);
  encodeGeneric = gcf.encodeGeneric || gcf.encode_generic;
} catch (e) {
  try {
    const gcf = await import('@blackwell-systems/gcf');
    encodeGeneric = gcf.encodeGeneric || gcf.encode_generic;
  } catch (e2) {
    console.warn('GCF encoder not found, will skip GCF column');
    encodeGeneric = null;
  }
}

// TONL's fixtures
const tonlFixtureDir = resolve(__dirname, '../../tonl-benchmark/bench/fixtures');
const fixtures = [
  `${tonlFixtureDir}/sample-users.json`,
  `${tonlFixtureDir}/nested-project.json`,
  `${tonlFixtureDir}/sample.json`,
  `${tonlFixtureDir}/northwind.json`,
  `${tonlFixtureDir}/ecommerce-products.json`,
  `${tonlFixtureDir}/api-response.json`,
  `${tonlFixtureDir}/complex-nested.json`,
  `${tonlFixtureDir}/configuration.json`,
  `${tonlFixtureDir}/large-dataset.json`,
];

function countTokens(text, tokenizer) {
  return tokenizer.encode(text).length;
}

function runBenchmark(tokenizer, tokenizerName) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`REAL TOKENIZER: ${tokenizerName}`);
  console.log(`${'='.repeat(100)}\n`);

  const header = [
    'Fixture'.padEnd(25),
    'JSON'.padStart(8),
    'TONL'.padStart(8),
    'TONL Smt'.padStart(8),
    'GCF'.padStart(8),
    'TONL vs JSON'.padStart(14),
    'GCF vs JSON'.padStart(13),
    'GCF vs TONL'.padStart(13),
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  let totalJson = 0, totalTonl = 0, totalTonlSmart = 0, totalGcf = 0;
  let validFixtures = 0;

  for (const fixturePath of fixtures) {
    const fullPath = resolve(fixturePath);
    let content;
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch (e) {
      continue;
    }

    const data = JSON.parse(content);
    const name = basename(fixturePath, '.json');

    // JSON: minified (fair comparison, no pretty-printing)
    const jsonStr = JSON.stringify(data);
    const jsonTokens = countTokens(jsonStr, tokenizer);

    // TONL standard
    let tonlStr, tonlTokens;
    try {
      tonlStr = encodeTONL(data);
      tonlTokens = countTokens(tonlStr, tokenizer);
    } catch (e) {
      tonlStr = null;
      tonlTokens = null;
    }

    // TONL Smart
    let tonlSmartStr, tonlSmartTokens;
    try {
      tonlSmartStr = encodeSmart(data);
      tonlSmartTokens = countTokens(tonlSmartStr, tokenizer);
    } catch (e) {
      tonlSmartStr = null;
      tonlSmartTokens = null;
    }

    // GCF
    let gcfStr, gcfTokens;
    try {
      gcfStr = encodeGeneric(data);
      gcfTokens = countTokens(gcfStr, tokenizer);
    } catch (e) {
      gcfStr = null;
      gcfTokens = null;
    }

    const tonlSaving = tonlTokens ? `${((1 - tonlTokens / jsonTokens) * 100).toFixed(1)}%` : 'ERR';
    const gcfSaving = gcfTokens ? `${((1 - gcfTokens / jsonTokens) * 100).toFixed(1)}%` : 'ERR';
    const gcfVsTonl = (gcfTokens && tonlTokens) ? `${((1 - gcfTokens / tonlTokens) * 100).toFixed(1)}%` : 'ERR';

    console.log([
      name.padEnd(25),
      jsonTokens.toString().padStart(8),
      (tonlTokens?.toString() || 'ERR').padStart(8),
      (tonlSmartTokens?.toString() || 'ERR').padStart(8),
      (gcfTokens?.toString() || 'ERR').padStart(8),
      tonlSaving.padStart(14),
      gcfSaving.padStart(13),
      gcfVsTonl.padStart(13),
    ].join('  '));

    totalJson += jsonTokens;
    if (tonlTokens) totalTonl += tonlTokens;
    if (tonlSmartTokens) totalTonlSmart += tonlSmartTokens;
    if (gcfTokens) totalGcf += gcfTokens;
    validFixtures++;
  }

  console.log('-'.repeat(header.length));
  console.log([
    'TOTAL'.padEnd(25),
    totalJson.toString().padStart(8),
    totalTonl.toString().padStart(8),
    totalTonlSmart.toString().padStart(8),
    totalGcf.toString().padStart(8),
    `${((1 - totalTonl / totalJson) * 100).toFixed(1)}%`.padStart(14),
    `${((1 - totalGcf / totalJson) * 100).toFixed(1)}%`.padStart(13),
    `${((1 - totalGcf / totalTonl) * 100).toFixed(1)}%`.padStart(13),
  ].join('  '));

  console.log(`\nSummary:`);
  console.log(`  TONL vs JSON:      ${((1 - totalTonl / totalJson) * 100).toFixed(1)}% fewer tokens (real)`);
  console.log(`  TONL Smart vs JSON: ${((1 - totalTonlSmart / totalJson) * 100).toFixed(1)}% fewer tokens (real)`);
  console.log(`  GCF vs JSON:       ${((1 - totalGcf / totalJson) * 100).toFixed(1)}% fewer tokens (real)`);
  console.log(`  GCF vs TONL:       ${((1 - totalGcf / totalTonl) * 100).toFixed(1)}% fewer tokens`);
  console.log(`  GCF vs TONL Smart: ${((1 - totalGcf / totalTonlSmart) * 100).toFixed(1)}% fewer tokens`);
  console.log(`\n  TONL claims: "45% fewer tokens than JSON" (measured with fake regex estimator)`);
  console.log(`  TONL actual: ${((1 - totalTonl / totalJson) * 100).toFixed(1)}% fewer tokens (real ${tokenizerName} tokenizer)`);
}

// Also run TONL's own estimator for comparison
async function runFakeEstimator() {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`TONL's BUILT-IN "estimateTokens" (regex heuristic, NOT a real tokenizer)`);
  console.log(`${'='.repeat(100)}\n`);

  // Import their estimator
  const metricsPath = resolve(__dirname, '../../tonl-benchmark/dist/utils/metrics.js');

  const { estimateTokens } = await import(metricsPath);

  const header = [
    'Fixture'.padEnd(25),
    'JSON(fake)'.padStart(10),
    'TONL(fake)'.padStart(10),
    'TONL claim'.padStart(12),
    'JSON(real)'.padStart(10),
    'TONL(real)'.padStart(10),
    'TONL actual'.padStart(12),
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const fixturePath of fixtures) {
    const fullPath = resolve(fixturePath);
    let content;
    try { content = readFileSync(fullPath, 'utf8'); } catch { continue; }

    const data = JSON.parse(content);
    const name = basename(fixturePath, '.json');
    const jsonStr = JSON.stringify(data);

    let tonlStr;
    try { tonlStr = encodeTONL(data); } catch { continue; }

    // Fake (TONL's estimator)
    const fakeJsonTokens = estimateTokens(jsonStr, 'gpt-5');
    const fakeTonlTokens = estimateTokens(tonlStr, 'gpt-5');
    const fakeSaving = `${((1 - fakeTonlTokens / fakeJsonTokens) * 100).toFixed(1)}%`;

    // Real (tiktoken o200k)
    const realJsonTokens = countTokens(jsonStr, o200k);
    const realTonlTokens = countTokens(tonlStr, o200k);
    const realSaving = `${((1 - realTonlTokens / realJsonTokens) * 100).toFixed(1)}%`;

    console.log([
      name.padEnd(25),
      fakeJsonTokens.toString().padStart(10),
      fakeTonlTokens.toString().padStart(10),
      fakeSaving.padStart(12),
      realJsonTokens.toString().padStart(10),
      realTonlTokens.toString().padStart(10),
      realSaving.padStart(12),
    ].join('  '));
  }

  console.log(`\n  "gpt-5 tokenizer" = regex heuristics + hardcoded TONL discount`);
  console.log(`  Real tokenizer = tiktoken o200k_base (actual BPE vocabulary)`);

  o200k.free();
  cl100k.free();
}

// Run
console.log('TONL Real Tokenizer Benchmark');
console.log('Using tiktoken (actual BPE) instead of TONL\'s fabricated estimateTokens()');
console.log(`Date: ${new Date().toISOString().split('T')[0]}`);

runBenchmark(o200k, 'o200k_base (GPT-4o / GPT-5 family)');
runBenchmark(cl100k, 'cl100k_base (GPT-4 / GPT-4 Turbo)');
await runFakeEstimator();
