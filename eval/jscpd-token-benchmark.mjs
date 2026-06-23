#!/usr/bin/env node
// jscpd MCP Server: Token Benchmark
// Compares JSON vs GCF token counts on realistic code duplication data shapes.
// Data shapes based on kucherenko/jscpd MCP server responses.

import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const tokenCount = (text) => enc.encode(text).length;

// ── Data generators ──────────────────────────────────────────────────────

const LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'cpp'];
const DIRS = ['src', 'lib', 'internal', 'pkg', 'app', 'core', 'utils', 'services', 'controllers', 'models'];
const FILES = ['auth', 'handler', 'service', 'controller', 'middleware', 'validator', 'parser', 'encoder', 'decoder', 'router', 'config', 'logger', 'cache', 'store', 'client', 'server', 'worker', 'scheduler', 'queue', 'metrics'];
const EXTS = { javascript: '.js', typescript: '.ts', python: '.py', go: '.go', rust: '.rs', java: '.java', ruby: '.rb', cpp: '.cpp' };

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateFilePath(lang) {
  const dir = randomItem(DIRS);
  const file = randomItem(FILES);
  const ext = EXTS[lang] || '.ts';
  return `${dir}/${file}${ext}`;
}

function generateCodeFragment(lines) {
  const snippets = [
    'if (err != nil) {\n  return fmt.Errorf("failed: %w", err)\n}',
    'const result = await db.query(sql, params);\nif (!result.rows.length) throw new NotFoundError();',
    'for item in items:\n    if item.is_valid():\n        processed.append(transform(item))',
    'try {\n  val response = client.execute(request)\n  return response.body\n} catch (e: Exception) {\n  logger.error("Request failed", e)\n  throw e\n}',
    'func (s *Server) handleRequest(w http.ResponseWriter, r *http.Request) {\n  ctx := r.Context()\n  user, err := s.auth.Validate(ctx, r.Header.Get("Authorization"))\n  if err != nil {\n    http.Error(w, "unauthorized", 401)\n    return\n  }\n}',
  ];
  return randomItem(snippets);
}

// CheckSnippetResponse shape
function generateDuplications(count, lang) {
  const duplications = [];
  for (let i = 0; i < count; i++) {
    const startLine = randomInt(1, 500);
    const linesCount = randomInt(3, 30);
    duplications.push({
      snippetLocation: {
        startLine: randomInt(1, 50),
        endLine: randomInt(51, 80),
        startColumn: 0,
        endColumn: randomInt(40, 120),
      },
      codebaseLocation: {
        file: generateFilePath(lang),
        startLine,
        endLine: startLine + linesCount,
        startColumn: 0,
        endColumn: randomInt(40, 120),
        fragment: generateCodeFragment(linesCount),
      },
      linesCount,
    });
  }
  return {
    duplications,
    statistics: {
      totalDuplications: count,
      duplicatedLines: duplications.reduce((sum, d) => sum + d.linesCount, 0),
      totalLines: randomInt(5000, 50000),
      percentageDuplicated: parseFloat((Math.random() * 15 + 1).toFixed(2)),
    },
  };
}

// StatsResponse shape (IStatistic from @jscpd/core)
function generateStatistics(fileCount) {
  const formats = {};
  const langs = LANGUAGES.slice(0, randomInt(3, 6));
  for (const lang of langs) {
    const total = randomInt(500, 10000);
    const duplicated = randomInt(10, Math.floor(total * 0.15));
    formats[lang] = {
      total,
      duplicated,
      percentage: parseFloat((duplicated / total * 100).toFixed(2)),
      files: randomInt(5, 50),
      duplications: randomInt(2, 30),
    };
  }
  return {
    statistics: {
      total: Object.values(formats).reduce((s, f) => s + f.total, 0),
      duplicated: Object.values(formats).reduce((s, f) => s + f.duplicated, 0),
      formats,
      files: fileCount,
      clones: randomInt(10, 200),
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Benchmark ──────────────────────────────────────────────────────────

console.log('=== jscpd MCP Server: Token Benchmark ===');
console.log('Data shapes from kucherenko/jscpd MCP server responses');
console.log('Token counting: gpt-4o (o200k_base) via js-tiktoken\n');

const header = 'Data Type'.padEnd(35) + 'Size'.padEnd(8) + 'JSON'.padEnd(10) + 'GCF'.padEnd(10) + 'Savings'.padEnd(10);
console.log(header);
console.log('─'.repeat(header.length));

const results = [];

for (const count of [5, 20, 50, 100]) {
  const data = generateDuplications(count, 'typescript');
  const jsonStr = JSON.stringify(data, null, 2);
  const gcfStr = encodeGeneric(data);
  const jsonTokens = tokenCount(jsonStr);
  const gcfTokens = tokenCount(gcfStr);
  const savings = ((1 - gcfTokens / jsonTokens) * 100).toFixed(1);

  results.push({ type: 'Duplication results', count, jsonTokens, gcfTokens, savings });
  console.log(
    `Duplication results`.padEnd(35) +
    `${count}`.padEnd(8) +
    `${jsonTokens.toLocaleString()}`.padEnd(10) +
    `${gcfTokens.toLocaleString()}`.padEnd(10) +
    `${savings}%`
  );
}

for (const fileCount of [50, 200, 500]) {
  const data = generateStatistics(fileCount);
  const jsonStr = JSON.stringify(data, null, 2);
  const gcfStr = encodeGeneric(data);
  const jsonTokens = tokenCount(jsonStr);
  const gcfTokens = tokenCount(gcfStr);
  const savings = ((1 - gcfTokens / jsonTokens) * 100).toFixed(1);

  results.push({ type: 'Project statistics', count: fileCount, jsonTokens, gcfTokens, savings });
  console.log(
    `Project statistics`.padEnd(35) +
    `${fileCount} files`.padEnd(8) +
    `${jsonTokens.toLocaleString()}`.padEnd(10) +
    `${gcfTokens.toLocaleString()}`.padEnd(10) +
    `${savings}%`
  );
}

console.log('\n── Summary ──');
const totalJson = results.reduce((s, r) => s + r.jsonTokens, 0);
const totalGcf = results.reduce((s, r) => s + r.gcfTokens, 0);
console.log(`  JSON total:     ${totalJson.toLocaleString()} tokens`);
console.log(`  GCF total:      ${totalGcf.toLocaleString()} tokens`);
console.log(`  Overall savings: ${((1 - totalGcf / totalJson) * 100).toFixed(1)}%`);
console.log(`  GCF wins: ${results.filter(r => r.gcfTokens < r.jsonTokens).length}/${results.length} comparisons`);
console.log('\nBenchmark complete.');
