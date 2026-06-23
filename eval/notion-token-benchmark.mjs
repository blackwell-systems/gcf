#!/usr/bin/env node
// Notion MCP Server: Token Benchmark
// Compares JSON vs GCF token counts on realistic Notion API data shapes.
// Data shapes based on makenotion/notion-mcp-server responses.

import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const tokenCount = (text) => enc.encode(text).length;

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
function isoDate(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString(); }

const NAMES = ['Alice Chen', 'Bob Patel', 'Carol Kim', 'Dan Garcia', 'Eve Williams', 'Frank Nakamura'];
const STATUSES = ['Not started', 'In progress', 'Done', 'Blocked', 'In review'];
const PRIORITIES = ['High', 'Medium', 'Low', 'Urgent'];
const TAGS = ['engineering', 'design', 'product', 'marketing', 'ops', 'security', 'infra', 'frontend', 'backend', 'mobile'];
const TITLES = [
  'Implement OAuth2 PKCE flow', 'Redesign settings page', 'Fix memory leak in worker',
  'Add rate limiting middleware', 'Update dependency versions', 'Write API documentation',
  'Migrate to PostgreSQL 16', 'Set up CI/CD pipeline', 'Implement search indexing',
  'Add dark mode support', 'Fix timezone handling', 'Optimize database queries',
  'Add export to CSV feature', 'Implement webhook retry logic', 'Set up error monitoring',
];

function generateRichText(text) {
  return [{ type: 'text', text: { content: text, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, plain_text: text, href: null }];
}

function generatePage(daysAgo) {
  return {
    object: 'page',
    id: uuid(),
    created_time: isoDate(daysAgo + randomInt(0, 30)),
    last_edited_time: isoDate(daysAgo),
    created_by: { object: 'user', id: uuid() },
    last_edited_by: { object: 'user', id: uuid() },
    cover: null,
    icon: Math.random() > 0.5 ? { type: 'emoji', emoji: randomItem(['📋', '🚀', '🔧', '📊', '🎯']) } : null,
    parent: { type: 'database_id', database_id: uuid() },
    archived: false,
    in_trash: false,
    properties: {
      Name: { id: 'title', type: 'title', title: generateRichText(randomItem(TITLES)) },
      Status: { id: uuid().slice(0, 4), type: 'status', status: { id: uuid().slice(0, 4), name: randomItem(STATUSES), color: randomItem(['default', 'blue', 'green', 'red', 'yellow']) } },
      Priority: { id: uuid().slice(0, 4), type: 'select', select: { id: uuid().slice(0, 4), name: randomItem(PRIORITIES), color: randomItem(['red', 'orange', 'yellow', 'green']) } },
      Assignee: { id: uuid().slice(0, 4), type: 'people', people: [{ object: 'user', id: uuid(), name: randomItem(NAMES), avatar_url: `https://example.com/avatars/${randomInt(1, 50)}.png`, type: 'person', person: { email: `${randomItem(NAMES).toLowerCase().replace(' ', '.')}@example.com` } }] },
      'Due Date': { id: uuid().slice(0, 4), type: 'date', date: Math.random() > 0.3 ? { start: isoDate(-randomInt(1, 30)), end: null, time_zone: null } : null },
      Tags: { id: uuid().slice(0, 4), type: 'multi_select', multi_select: Array.from({ length: randomInt(1, 3) }, () => ({ id: uuid().slice(0, 4), name: randomItem(TAGS), color: randomItem(['default', 'blue', 'green', 'red', 'purple']) })) },
      'Story Points': { id: uuid().slice(0, 4), type: 'number', number: randomItem([1, 2, 3, 5, 8, 13, null]) },
      URL: { id: uuid().slice(0, 4), type: 'url', url: Math.random() > 0.5 ? `https://github.com/org/repo/issues/${randomInt(100, 999)}` : null },
    },
    url: `https://www.notion.so/${uuid().replace(/-/g, '')}`,
    public_url: null,
  };
}

function generateDatabaseQuery(count) {
  return {
    object: 'list',
    results: Array.from({ length: count }, (_, i) => generatePage(i)),
    next_cursor: count >= 100 ? uuid() : null,
    has_more: count >= 100,
    type: 'page_or_database',
    page_or_database: {},
  };
}

function generateSearchResults(count) {
  return {
    object: 'list',
    results: Array.from({ length: count }, (_, i) => generatePage(randomInt(0, 90))),
    next_cursor: null,
    has_more: false,
    type: 'page_or_database',
    page_or_database: {},
  };
}

// ── Benchmark ──

console.log('=== Notion MCP Server: Token Benchmark ===');
console.log('Data shapes from makenotion/notion-mcp-server (4.5K stars)');
console.log('Token counting: gpt-4o (o200k_base) via js-tiktoken\n');

const header = 'Data Type'.padEnd(35) + 'Size'.padEnd(10) + 'JSON'.padEnd(10) + 'GCF'.padEnd(10) + 'Savings';
console.log(header);
console.log('─'.repeat(header.length));

const results = [];

for (const count of [5, 10, 25, 50, 100]) {
  const data = generateDatabaseQuery(count);
  const jsonStr = JSON.stringify(data);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ type: 'Database query', count, jt, gt, savings });
  console.log(`Database query`.padEnd(35) + `${count}`.padEnd(10) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

for (const count of [5, 10, 25]) {
  const data = generateSearchResults(count);
  const jsonStr = JSON.stringify(data);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ type: 'Search results', count, jt, gt, savings });
  console.log(`Search results`.padEnd(35) + `${count}`.padEnd(10) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

console.log('\n── Summary ──');
const totalJson = results.reduce((s, r) => s + r.jt, 0);
const totalGcf = results.reduce((s, r) => s + r.gt, 0);
console.log(`  JSON total:      ${totalJson.toLocaleString()} tokens`);
console.log(`  GCF total:       ${totalGcf.toLocaleString()} tokens`);
console.log(`  Overall savings: ${((1 - totalGcf / totalJson) * 100).toFixed(1)}%`);
console.log(`  GCF wins: ${results.filter(r => r.gt < r.jt).length}/${results.length} comparisons`);
console.log('\nBenchmark complete.');
