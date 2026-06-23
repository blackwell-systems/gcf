#!/usr/bin/env node
// Exa MCP Server: Token Benchmark
// Compares JSON vs GCF on realistic web search result data shapes.

import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const tokenCount = (text) => enc.encode(text).length;

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }

const DOMAINS = ['github.com', 'stackoverflow.com', 'medium.com', 'dev.to', 'docs.python.org', 'developer.mozilla.org', 'rust-lang.org', 'go.dev', 'kubernetes.io', 'redis.io'];
const TITLES = [
  'How to implement rate limiting in Express.js',
  'Understanding Rust ownership and borrowing',
  'PostgreSQL performance tuning guide',
  'Building REST APIs with Go and Chi',
  'React Server Components explained',
  'Docker multi-stage builds best practices',
  'Kubernetes pod scheduling deep dive',
  'Redis caching strategies for microservices',
  'TypeScript generic constraints tutorial',
  'Python asyncio vs threading comparison',
  'GraphQL schema design patterns',
  'WebSocket authentication strategies',
  'CI/CD pipeline optimization techniques',
  'Database migration best practices',
  'Microservices communication patterns',
];
const SNIPPETS = [
  'To implement rate limiting, you can use the express-rate-limit middleware. First install it with npm install express-rate-limit, then configure it in your app...',
  'Ownership is Rust\'s most unique feature. It enables Rust to make memory safety guarantees without needing a garbage collector. The rules are: each value has a variable called its owner...',
  'PostgreSQL query optimization starts with understanding EXPLAIN ANALYZE output. The key metrics to watch are actual time, rows, and loops...',
  'The Chi router provides a lightweight, idiomatic way to build HTTP services in Go. It supports middleware, route patterns, and context propagation...',
  'Server Components allow you to render components on the server, reducing the JavaScript bundle sent to the client. They can directly access backend resources...',
];

function generateSearchResult() {
  const domain = randomItem(DOMAINS);
  return {
    id: uuid(),
    title: randomItem(TITLES),
    url: `https://${domain}/article/${randomInt(1000, 99999)}`,
    publishedDate: new Date(Date.now() - randomInt(1, 365) * 86400000).toISOString().split('T')[0],
    author: Math.random() > 0.3 ? randomItem(['John Smith', 'Sarah Connor', 'Alex Chen', 'Maria Garcia', 'James Wilson']) : undefined,
    text: randomItem(SNIPPETS) + ' ' + randomItem(SNIPPETS),
    summary: Math.random() > 0.4 ? randomItem(SNIPPETS).slice(0, 120) + '...' : undefined,
    highlights: Math.random() > 0.5 ? [randomItem(SNIPPETS).slice(0, 80)] : undefined,
    highlightScores: Math.random() > 0.5 ? [parseFloat((Math.random() * 0.5 + 0.5).toFixed(4))] : undefined,
    score: parseFloat((Math.random() * 0.5 + 0.5).toFixed(4)),
    favicon: `https://${domain}/favicon.ico`,
  };
}

function generateSearchResponse(count) {
  return {
    requestId: uuid(),
    resolvedSearchType: 'neural',
    results: Array.from({ length: count }, () => generateSearchResult()),
  };
}

console.log('=== Exa MCP Server: Token Benchmark ===');
console.log('Data shapes from exa-labs/exa-mcp-server (4.6K stars)');
console.log('Token counting: gpt-4o (o200k_base) via js-tiktoken\n');

const header = 'Data Type'.padEnd(30) + 'Size'.padEnd(8) + 'JSON'.padEnd(10) + 'GCF'.padEnd(10) + 'Savings';
console.log(header);
console.log('─'.repeat(header.length));

const results = [];
for (const count of [5, 10, 20, 50]) {
  const data = generateSearchResponse(count);
  const jsonStr = JSON.stringify(data);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ count, jt, gt, savings });
  console.log(`Search results`.padEnd(30) + `${count}`.padEnd(8) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

console.log('\n── Summary ──');
const totalJson = results.reduce((s, r) => s + r.jt, 0);
const totalGcf = results.reduce((s, r) => s + r.gt, 0);
console.log(`  JSON total:      ${totalJson.toLocaleString()} tokens`);
console.log(`  GCF total:       ${totalGcf.toLocaleString()} tokens`);
console.log(`  Overall savings: ${((1 - totalGcf / totalJson) * 100).toFixed(1)}%`);
console.log(`  GCF wins: ${results.filter(r => r.gt < r.jt).length}/${results.length}`);
console.log('\nBenchmark complete.');
