/**
 * Cross-API Dot-Path Flattening Benchmark
 *
 * Uses the real forked encoder prototype (encode-flat-prototype.mjs)
 * against 10 real-world API response shapes with nested objects.
 *
 * Compares: JSON vs TOON vs Current GCF vs Flat GCF (prototype)
 */

import { encodeGenericFlat, encodeGenericOriginal } from './encode-flat-prototype.mjs';
import { encode as toonEncode } from '@toon-format/toon';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const count = (s) => enc.encode(s).length;

// ── Seeded RNG for reproducibility ───────────────────────────────────────

let _seed = 42;
function sr() { _seed = (_seed * 16807) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; }
function pick(a) { return a[Math.floor(sr() * a.length)]; }
function rint(min, max) { return min + Math.floor(sr() * (max - min + 1)); }
function rid(pfx, len = 8) { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = pfx; for (let i = 0; i < len; i++) s += c[Math.floor(sr() * c.length)]; return s; }
function rdate(ys = 2024, ye = 2026) { return `${rint(ys, ye)}-${String(rint(1,12)).padStart(2,'0')}-${String(rint(1,28)).padStart(2,'0')}T${String(rint(0,23)).padStart(2,'0')}:${String(rint(0,59)).padStart(2,'0')}:${String(rint(0,59)).padStart(2,'0')}Z`; }
function rname() { return `${pick(['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack','Kim','Leo','Mia','Noah','Olivia','Pat','Quinn','Rosa','Sam','Tina'])} ${pick(['Smith','Jones','Lee','Garcia','Kim','Chen','Patel','Brown','Wilson','Taylor'])}`; }
function remail(n) { return `${n.toLowerCase().replace(/\s+/g, '.')}@${pick(['gmail.com','company.io','work.dev','example.com'])}`; }
function ruser() { return pick(['octocat','defunkt','mojombo','schacon','pjhyett','technoweenie','ezmobius','kneath','macournoyer','atmos']) + rint(1, 999); }

const cities = ['New York','San Francisco','London','Tokyo','Berlin','Sydney','Toronto','Mumbai','Singapore','Paris','Austin','Seattle','Chicago','Denver','Boston'];
const countries = ['US','GB','JP','DE','AU','CA','IN','SG','FR','BR'];

// ── 10 API data generators ───────────────────────────────────────────────

// 1. GitHub PRs (2-level nesting: user.login, head.ref, base.ref)
function genGitHubPRs(n) {
  return Array.from({length: n}, (_, i) => {
    const u = ruser();
    return {
      id: rint(100000000, 999999999), number: i + 1,
      title: pick(['Fix memory leak in worker pool','Add OAuth2 support','Update CI pipeline','Refactor database layer','Add rate limiting','Fix race condition','Improve error messages','Add pagination support','Update dependencies','Fix null pointer']),
      state: pick(['open','closed','merged']),
      user: { login: u, avatar_url: `https://avatars.githubusercontent.com/u/${rint(1000,99999)}?v=4` },
      head: { ref: pick(['main','develop','feature/auth','fix/memory-leak','refactor/api','feat/dashboard']), sha: rid('', 40) },
      base: { ref: 'main', sha: rid('', 40) },
      created_at: rdate(), updated_at: rdate(), merged_at: sr() > 0.4 ? rdate() : null,
    };
  });
}

// 2. Stripe charges (3-level: billing_details.address.city, payment_method_details.card.brand)
function genStripeCharges(n) {
  return Array.from({length: n}, () => {
    const nm = rname();
    return {
      id: rid('ch_', 24), amount: rint(500, 500000), currency: pick(['usd','eur','gbp','jpy','cad']),
      status: pick(['succeeded','pending','failed']), customer: rid('cus_', 14),
      billing_details: { name: nm, email: remail(nm), address: { city: pick(cities), country: pick(countries) } },
      payment_method_details: { type: 'card', card: { brand: pick(['visa','mastercard','amex','discover']), last4: String(rint(1000, 9999)) } },
      created: rint(1672531200, 1719792000),
    };
  });
}

// 3. Shopify orders (2-level: customer.first_name, shipping_address.city)
function genShopifyOrders(n) {
  return Array.from({length: n}, (_, i) => {
    const fn = pick(['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack']);
    const ln = pick(['Smith','Jones','Lee','Garcia','Kim','Chen','Patel','Brown','Wilson','Taylor']);
    return {
      id: rint(5000000000, 5999999999), order_number: 1000 + i,
      total_price: (rint(1000, 50000) / 100).toFixed(2), currency: pick(['USD','EUR','GBP','CAD','AUD']),
      financial_status: pick(['paid','pending','refunded','partially_refunded']),
      customer: { first_name: fn, last_name: ln, email: remail(`${fn} ${ln}`) },
      shipping_address: { address1: `${rint(1,9999)} ${pick(['Main','Oak','Elm','Pine','Maple'])} ${pick(['St','Ave','Blvd','Dr','Ln'])}`, city: pick(cities), province: pick(['CA','NY','TX','ON','QLD']), country: pick(countries) },
      created_at: rdate(),
    };
  });
}

// 4. Kubernetes pods (3-level: metadata.labels.app, status.containerStatuses is array, tricky)
function genK8sPods(n) {
  const apps = ['web-api','worker','scheduler','ingress','monitor','cache','queue','auth','gateway','logger'];
  return Array.from({length: n}, () => {
    const app = pick(apps);
    return {
      metadata: { name: `${app}-${rid('',5)}`, namespace: pick(['default','production','staging','monitoring','kube-system']), labels: { app } },
      spec: { nodeName: `ip-10-${rint(0,255)}-${rint(0,255)}-${rint(0,255)}.ec2.internal` },
      status: { phase: pick(['Running','Pending','Succeeded','Failed']), podIP: `10.${rint(0,255)}.${rint(0,255)}.${rint(0,255)}`, startTime: rdate() },
    };
  });
}

// 5. AWS EC2 instances (2-level: State.Name, Placement.AvailabilityZone, Monitoring.State)
function genEC2(n) {
  return Array.from({length: n}, () => ({
    InstanceId: rid('i-', 17), InstanceType: pick(['t3.micro','t3.small','m5.large','m5.xlarge','c5.large','r5.large']),
    State: { Name: pick(['running','stopped','terminated','pending']) },
    Placement: { AvailabilityZone: pick(['us-east-1a','us-east-1b','us-west-2a','eu-west-1a']) },
    PrivateIpAddress: `10.${rint(0,255)}.${rint(0,255)}.${rint(0,255)}`,
    PublicIpAddress: sr() > 0.3 ? `${rint(1,255)}.${rint(0,255)}.${rint(0,255)}.${rint(0,255)}` : null,
    LaunchTime: rdate(),
    Monitoring: { State: pick(['enabled','disabled']) },
  }));
}

// 6. Elasticsearch hits (2-level: _source.title, _source.metadata.word_count = 3-level)
function genESHits(n) {
  return Array.from({length: n}, () => ({
    _id: rid('', 20), _score: +(sr() * 15 + 1).toFixed(4),
    _source: {
      title: pick(['Understanding Neural Networks','Climate Change Study','Revenue Report','New Treatment Discovery','Championship Recap','Policy Reform Analysis','Online Learning Trends','Quantum Computing','Market Analysis 2024','AI Ethics Framework']),
      author: rname(), published_date: rdate(), category: pick(['technology','science','business','health','sports']),
      metadata: { word_count: rint(500, 15000), language: pick(['en','es','fr','de','ja']) },
    },
  }));
}

// 7. Datadog monitors (2-level: options.thresholds.critical = 3-level, creator.name)
function genDatadogMonitors(n) {
  return Array.from({length: n}, () => {
    const cr = rname();
    return {
      id: rint(10000000, 99999999),
      name: pick(['High CPU Usage','Memory Threshold','Error Rate Spike','Latency Above SLO','Disk Usage Critical','Request Queue Depth','5xx Error Rate','Certificate Expiry','Pod Restart Loop','Connection Pool']),
      type: pick(['metric alert','service check','event alert','query alert']),
      query: pick(['avg(last_5m):avg:system.cpu.user{*} > 90','avg(last_10m):avg:system.mem.used{*} > 85','sum(last_5m):sum:trace.error{service:api} > 100']),
      overall_state: pick(['OK','Alert','Warn','No Data']),
      message: pick(['@slack-ops Alert','@pagerduty Investigate','Check dashboard']),
      options: { thresholds: { critical: rint(80, 99), warning: rint(50, 79) }, notify_no_data: sr() > 0.5 },
      creator: { name: cr, email: remail(cr) },
      created: rdate(), modified: rdate(),
    };
  });
}

// 8. Jira issues (3-level: fields.status.name, fields.assignee.displayName)
function genJiraIssues(n) {
  const pkeys = ['PROJ','ENG','INFRA','DATA','PLAT'];
  return Array.from({length: n}, (_, i) => {
    const assignee = rname(); const reporter = rname(); const pk = pick(pkeys);
    return {
      id: String(10000 + i), key: `${pk}-${rint(100, 9999)}`,
      fields: {
        summary: pick(['Login 500 error','Add dark mode','Migrate to PG15','Implement SSO','Fix pagination','Add CSV export','Upgrade Node v20','Refactor auth','Add rate limiting','Fix timezones']),
        status: { name: pick(['To Do','In Progress','In Review','Done','Blocked']) },
        priority: { name: pick(['Highest','High','Medium','Low','Lowest']) },
        assignee: { displayName: assignee, emailAddress: remail(assignee) },
        reporter: { displayName: reporter },
        issuetype: { name: pick(['Bug','Story','Task','Epic','Sub-task']) },
        created: rdate(), updated: rdate(), project: { key: pk },
      },
    };
  });
}

// 9. Salesforce opportunities (2-level: Account.Name, Owner.Email)
function genSalesforceOpps(n) {
  return Array.from({length: n}, () => {
    const owner = rname();
    const acct = `${pick(['Acme','Globex','Initech','Umbrella','Stark','Wayne','Oscorp','Cyberdyne'])} ${pick(['Corp','Inc','LLC','Ltd','Group','Systems'])}`;
    return {
      Id: rid('006', 15), Name: `${acct} - ${pick(['Enterprise License','Platform Upgrade','Annual Renewal','Expansion Deal'])}`,
      Amount: rint(5000, 500000), StageName: pick(['Prospecting','Qualification','Proposal','Negotiation','Closed Won','Closed Lost']),
      CloseDate: rdate().slice(0, 10), Probability: rint(10, 100),
      Account: { Name: acct, Industry: pick(['Technology','Healthcare','Finance','Manufacturing','Retail']) },
      Owner: { Name: owner, Email: remail(owner) },
      CreatedDate: rdate(), LastModifiedDate: rdate(), Type: pick(['New Business','Renewal','Upsell']),
    };
  });
}

// 10. Twilio messages (1-level: media.num_media)
function genTwilioMessages(n) {
  return Array.from({length: n}, () => ({
    sid: rid('SM', 32), from: `+1${rint(200,999)}${rint(200,999)}${rint(1000,9999)}`, to: `+1${rint(200,999)}${rint(200,999)}${rint(1000,9999)}`,
    body: pick(['Your verification code is 847293','Your order has shipped','Appointment reminder: Tuesday 3pm','Account balance: $1,234.56','Alert: Unusual login detected','Welcome! Reply HELP for options','Payment of $49.99 processed','Subscription renews in 3 days','Package delivered at 2:34 PM','2FA enabled for your account']),
    status: pick(['queued','sending','sent','delivered','undelivered','failed']),
    direction: pick(['inbound','outbound-api','outbound-reply']),
    date_sent: rdate(), price: `-0.00${rint(10, 99)}`, price_unit: 'USD',
    account_sid: rid('AC', 32), messaging_service_sid: rid('MG', 32),
    error_code: sr() > 0.8 ? rint(30001, 30010) : null,
    media: { num_media: rint(0, 3) },
  }));
}

// ── Benchmark ────────────────────────────────────────────────────────────

const N = 50;

const APIs = [
  { name: 'GitHub PRs', gen: genGitHubPRs, nesting: '2-level (user, head, base)' },
  { name: 'Stripe charges', gen: genStripeCharges, nesting: '3-level (billing.address, payment.card)' },
  { name: 'Shopify orders', gen: genShopifyOrders, nesting: '2-level (customer, shipping_address)' },
  { name: 'Kubernetes pods', gen: genK8sPods, nesting: '3-level (metadata.labels, spec, status)' },
  { name: 'AWS EC2', gen: genEC2, nesting: '2-level (State, Placement, Monitoring)' },
  { name: 'Elasticsearch', gen: genESHits, nesting: '3-level (_source.metadata.word_count)' },
  { name: 'Datadog monitors', gen: genDatadogMonitors, nesting: '3-level (options.thresholds, creator)' },
  { name: 'Jira issues', gen: genJiraIssues, nesting: '3-level (fields.status, fields.assignee)' },
  { name: 'Salesforce opps', gen: genSalesforceOpps, nesting: '2-level (Account, Owner)' },
  { name: 'Twilio messages', gen: genTwilioMessages, nesting: '1-level (media)' },
];

function pct(v, base) { return ((v - base) / base * 100).toFixed(1); }
function fmt(n) { return n.toLocaleString('en-US'); }

console.log('=== Cross-API Benchmark: Nested Object Flattening Prototype ===');
console.log(`${N} items per shape, gpt-4o tokenizer (o200k_base)`);
console.log('Encoder: forked from gcf-typescript/src/generic.ts (identical quoting/escaping)');
console.log('');

const hdr = 'API'.padEnd(20) + 'JSON'.padStart(8) + 'TOON'.padStart(8) + 'Curr'.padStart(8) + 'Flat'.padStart(8) + 'TOON/J'.padStart(9) + 'Curr/J'.padStart(9) + 'Flat/J'.padStart(9) + 'Flat/C'.padStart(9);
console.log(hdr);
console.log('─'.repeat(hdr.length));

let tJ = 0, tT = 0, tC = 0, tF = 0;
const rows = [];

for (const api of APIs) {
  _seed = 42 + APIs.indexOf(api) * 10000;
  const data = api.gen(N);

  const jt = count(JSON.stringify(data));
  const tt = count(toonEncode(data));
  const ct = count(encodeGenericOriginal(data));
  const ft = count(encodeGenericFlat(data));

  tJ += jt; tT += tt; tC += ct; tF += ft;
  rows.push({ name: api.name, nesting: api.nesting, jt, tt, ct, ft });

  console.log(
    api.name.padEnd(20) +
    fmt(jt).padStart(8) + fmt(tt).padStart(8) + fmt(ct).padStart(8) + fmt(ft).padStart(8) +
    (pct(tt, jt) + '%').padStart(9) + (pct(ct, jt) + '%').padStart(9) + (pct(ft, jt) + '%').padStart(9) + (pct(ft, ct) + '%').padStart(9)
  );
}

console.log('─'.repeat(hdr.length));
console.log(
  'TOTAL'.padEnd(20) +
  fmt(tJ).padStart(8) + fmt(tT).padStart(8) + fmt(tC).padStart(8) + fmt(tF).padStart(8) +
  (pct(tT, tJ) + '%').padStart(9) + (pct(tC, tJ) + '%').padStart(9) + (pct(tF, tJ) + '%').padStart(9) + (pct(tF, tC) + '%').padStart(9)
);

console.log('');
console.log('=== Summary ===');

let fWinsJ = 0, fWinsT = 0, fWinsC = 0;
for (const r of rows) { if (r.ft < r.jt) fWinsJ++; if (r.ft < r.tt) fWinsT++; if (r.ft < r.ct) fWinsC++; }

console.log(`  Flat GCF wins vs JSON:    ${fWinsJ}/${rows.length}`);
console.log(`  Flat GCF wins vs TOON:    ${fWinsT}/${rows.length}`);
console.log(`  Flat GCF wins vs Current: ${fWinsC}/${rows.length}`);
console.log('');
console.log(`  Total JSON:    ${fmt(tJ)} tokens`);
console.log(`  Total TOON:    ${fmt(tT)} tokens (${pct(tT, tJ)}% vs JSON)`);
console.log(`  Total Current: ${fmt(tC)} tokens (${pct(tC, tJ)}% vs JSON)`);
console.log(`  Total Flat:    ${fmt(tF)} tokens (${pct(tF, tJ)}% vs JSON)`);
console.log(`  Flat vs TOON:  ${pct(tF, tT)}%`);
console.log(`  Flat vs Curr:  ${pct(tF, tC)}%`);

console.log('');
console.log('=== Per-API Detail ===');
for (const r of rows) {
  const flatVsJ = -parseFloat(pct(r.ft, r.jt));
  const flatVsC = -parseFloat(pct(r.ft, r.ct));
  const flatVsT = -parseFloat(pct(r.ft, r.tt));
  console.log(`  ${r.name.padEnd(20)} ${r.nesting.padEnd(45)} Flat saves ${flatVsJ.toFixed(1)}% vs JSON, ${flatVsT.toFixed(1)}% vs TOON, ${flatVsC.toFixed(1)}% vs Curr`);
}
