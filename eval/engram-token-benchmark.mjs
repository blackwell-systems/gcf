#!/usr/bin/env node
// Engram MCP Server: Token Benchmark
// Compares JSON vs GCF token counts on realistic agent memory data shapes.
// Data shapes based on Gentleman-Programming/engram store types.

import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const tokenCount = (text) => enc.encode(text).length;

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
function isoDate(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString(); }

const TYPES = ['decision', 'preference', 'technical', 'pattern', 'architecture', 'workflow', 'debugging', 'config'];
const SCOPES = ['project', 'global', 'session'];
const PROJECTS = ['api-gateway', 'frontend-app', 'data-pipeline', 'auth-service', 'mobile-app', 'infra', 'shared-libs'];
const TOOLS = ['read_file', 'write_file', 'run_command', 'search', 'git_diff', 'lint', null];
const TITLES = [
  'Prefer composition over inheritance in service layer',
  'Use zod for runtime validation at API boundaries',
  'Redis cache TTL should be 5 minutes for session data',
  'Always run migrations in a transaction',
  'Use structured logging with correlation IDs',
  'Prefer early returns over nested conditionals',
  'Rate limiting uses token bucket algorithm',
  'Database connection pool size set to 20',
  'Error responses follow RFC 7807 problem detail format',
  'Feature flags stored in LaunchDarkly, not env vars',
  'GraphQL subscriptions use Redis pub/sub',
  'CI runs lint before tests to fail fast',
  'Use playwright for e2e, vitest for unit',
  'API versioning via URL path not headers',
  'Terraform state in S3 with DynamoDB locking',
];
const CONTENTS = [
  'The service layer uses composition: each service receives its dependencies via constructor injection. This avoids deep inheritance hierarchies and makes testing straightforward with mock implementations.',
  'All API request/response types have a corresponding zod schema. Validation happens at the handler level before any business logic. This catches malformed input early and provides clear error messages.',
  'Session data in Redis uses a 5-minute TTL with sliding expiration. This balances freshness with read performance. Longer-lived data (user preferences) goes to PostgreSQL.',
  'Database migrations run inside a transaction so partial failures roll back cleanly. The migration runner wraps each file in BEGIN/COMMIT and aborts on any error.',
  'Every log entry includes a request_id correlation field. This traces a single request across all services. The middleware generates the ID and attaches it to the context.',
];

function generateObservation(id, sessionId, daysAgo) {
  const obs = {
    id,
    sync_id: uuid(),
    session_id: sessionId,
    type: randomItem(TYPES),
    title: randomItem(TITLES),
    content: randomItem(CONTENTS),
    scope: randomItem(SCOPES),
    revision_count: randomInt(0, 5),
    duplicate_count: randomInt(0, 3),
    created_at: isoDate(daysAgo),
    updated_at: isoDate(daysAgo - randomInt(0, 2)),
  };
  if (Math.random() > 0.4) obs.tool_name = randomItem(TOOLS.filter(Boolean));
  if (Math.random() > 0.3) obs.project = randomItem(PROJECTS);
  if (Math.random() > 0.5) obs.topic_key = `${obs.type}/${obs.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
  if (Math.random() > 0.6) obs.last_seen_at = isoDate(randomInt(0, 5));
  if (Math.random() > 0.7) obs.review_after = isoDate(-randomInt(1, 30));
  return obs;
}

function generateSearchResults(count) {
  const sessionId = uuid();
  return {
    results: Array.from({ length: count }, (_, i) => ({
      ...generateObservation(i + 1, sessionId, randomInt(1, 90)),
      rank: parseFloat((Math.random() * 10).toFixed(4)),
    })),
    query: 'authentication token validation',
    project: randomItem(PROJECTS),
    total_results: count,
  };
}

function generateSessionList(count) {
  return {
    sessions: Array.from({ length: count }, (_, i) => ({
      id: uuid(),
      project: randomItem(PROJECTS),
      started_at: isoDate(i * 2 + randomInt(0, 3)),
      ended_at: Math.random() > 0.2 ? isoDate(i * 2) : undefined,
      summary: Math.random() > 0.3 ? `Worked on ${randomItem(['API endpoints', 'database schema', 'auth flow', 'CI pipeline', 'error handling', 'caching layer'])}` : undefined,
      observation_count: randomInt(3, 25),
    })),
    total_sessions: count,
    project: randomItem(PROJECTS),
  };
}

function generateTimeline(count) {
  const sessionId = uuid();
  const focusObs = generateObservation(1, sessionId, 5);
  return {
    focus: focusObs,
    before: Array.from({ length: Math.floor(count / 2) }, (_, i) => ({
      ...generateObservation(i + 2, sessionId, 5 + i),
      is_focus: false,
    })),
    after: Array.from({ length: Math.ceil(count / 2) }, (_, i) => ({
      ...generateObservation(i + 100, sessionId, 4 - i),
      is_focus: false,
    })),
  };
}

// ── Benchmark ──────────────────────────────────────────────────────────

console.log('=== Engram MCP Server: Token Benchmark ===');
console.log('Data shapes from Gentleman-Programming/engram (4.6K stars)');
console.log('Token counting: gpt-4o (o200k_base) via js-tiktoken\n');

const header = 'Data Type'.padEnd(35) + 'Size'.padEnd(10) + 'JSON'.padEnd(10) + 'GCF'.padEnd(10) + 'Savings';
console.log(header);
console.log('─'.repeat(header.length));

const results = [];

for (const count of [5, 10, 25, 50]) {
  const data = generateSearchResults(count);
  const jsonStr = JSON.stringify(data, null, 2);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ type: 'Search results', count, jt, gt, savings });
  console.log(`Search results`.padEnd(35) + `${count}`.padEnd(10) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

for (const count of [10, 25, 50]) {
  const data = generateSessionList(count);
  const jsonStr = JSON.stringify(data, null, 2);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ type: 'Session list', count, jt, gt, savings });
  console.log(`Session list`.padEnd(35) + `${count}`.padEnd(10) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

for (const count of [10, 20]) {
  const data = generateTimeline(count);
  const jsonStr = JSON.stringify(data, null, 2);
  const gcfStr = encodeGeneric(data);
  const jt = tokenCount(jsonStr);
  const gt = tokenCount(gcfStr);
  const savings = ((1 - gt / jt) * 100).toFixed(1);
  results.push({ type: 'Timeline', count, jt, gt, savings });
  console.log(`Timeline`.padEnd(35) + `${count}`.padEnd(10) + `${jt.toLocaleString()}`.padEnd(10) + `${gt.toLocaleString()}`.padEnd(10) + `${savings}%`);
}

console.log('\n── Summary ──');
const totalJson = results.reduce((s, r) => s + r.jt, 0);
const totalGcf = results.reduce((s, r) => s + r.gt, 0);
console.log(`  JSON total:      ${totalJson.toLocaleString()} tokens`);
console.log(`  GCF total:       ${totalGcf.toLocaleString()} tokens`);
console.log(`  Overall savings: ${((1 - totalGcf / totalJson) * 100).toFixed(1)}%`);
console.log(`  GCF wins: ${results.filter(r => r.gt < r.jt).length}/${results.length} comparisons`);
console.log('\nBenchmark complete.');
