/**
 * Dot-Path Flattening Benchmark
 *
 * Measures the token impact of flattening fixed-shape nested objects into
 * dot-path column names in GCF encoding, compared to current GCF (^ markers
 * + attachment blocks) and JSON.
 *
 * Uses realistic mock data from 10 real-world API response shapes, 50 items each.
 */

import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
function countTokens(str) { return enc.encode(str).length; }

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomId(prefix, len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = prefix;
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function randomDate(yearStart = 2023, yearEnd = 2025) {
  const y = randomInt(yearStart, yearEnd);
  const m = String(randomInt(1, 12)).padStart(2, '0');
  const d = String(randomInt(1, 28)).padStart(2, '0');
  const h = String(randomInt(0, 23)).padStart(2, '0');
  const mi = String(randomInt(0, 59)).padStart(2, '0');
  const s = String(randomInt(0, 59)).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${mi}:${s}Z`;
}
function randomEmail(name) { return `${name.toLowerCase().replace(/\s+/g, '.')}@${randomPick(['gmail.com','company.io','work.dev','example.com'])}`; }
function randomName() { return `${randomPick(['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack','Kim','Leo','Mia','Noah','Olivia','Pat','Quinn','Rosa','Sam','Tina'])} ${randomPick(['Smith','Jones','Lee','Garcia','Kim','Chen','Patel','Brown','Wilson','Taylor'])}`; }
function randomUsername() { return randomPick(['octocat','defunkt','mojombo','schacon','pjhyett','technoweenie','ezmobius','ivey','kevinclark','caged','jnewland','wycats','evanphx','kneath','macournoyer','atmos','errfree','brynary','jamesgolick','lazyatom']) + randomInt(1,999); }

const firstNames = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack','Kim','Leo','Mia','Noah','Olivia','Pat','Quinn','Rosa','Sam','Tina'];
const lastNames = ['Smith','Jones','Lee','Garcia','Kim','Chen','Patel','Brown','Wilson','Taylor'];
const cities = ['New York','San Francisco','London','Tokyo','Berlin','Sydney','Toronto','Mumbai','Singapore','Paris','Austin','Seattle','Chicago','Denver','Boston'];
const countries = ['US','GB','JP','DE','AU','CA','IN','SG','FR','BR'];
const provinces = ['CA','NY','TX','ON','QLD','NSW','BC','WA','IL','CO'];

// 1. GitHub PRs
function generateGitHubPRs(n) {
  const states = ['open','closed','merged'];
  const branches = ['main','develop','staging','release/v2','feature/auth','fix/memory-leak','refactor/api','chore/deps','feat/dashboard','hotfix/login'];
  return Array.from({length: n}, (_, i) => {
    const user = randomUsername();
    return {
      id: randomInt(100000000, 999999999),
      number: i + 1,
      title: randomPick(['Fix memory leak in worker pool','Add OAuth2 support','Update CI pipeline','Refactor database layer','Add rate limiting','Fix race condition in cache','Improve error messages','Add pagination support','Update dependencies','Fix null pointer in parser']),
      state: randomPick(states),
      user: { login: user, avatar_url: `https://avatars.githubusercontent.com/u/${randomInt(1000,99999)}?v=4` },
      head: { ref: randomPick(branches), sha: randomId('', 40) },
      base: { ref: 'main', sha: randomId('', 40) },
      created_at: randomDate(),
      updated_at: randomDate(),
      merged_at: Math.random() > 0.4 ? randomDate() : null
    };
  });
}

// 2. Stripe charges
function generateStripeCharges(n) {
  const statuses = ['succeeded','pending','failed'];
  const brands = ['visa','mastercard','amex','discover'];
  return Array.from({length: n}, () => {
    const name = randomName();
    return {
      id: randomId('ch_', 24),
      amount: randomInt(500, 500000),
      currency: randomPick(['usd','eur','gbp','jpy','cad']),
      status: randomPick(statuses),
      customer: randomId('cus_', 14),
      billing_details: {
        name,
        email: randomEmail(name),
        address: { city: randomPick(cities), country: randomPick(countries) }
      },
      payment_method_details: {
        type: 'card',
        card: { brand: randomPick(brands), last4: String(randomInt(1000, 9999)) }
      },
      created: randomInt(1672531200, 1719792000)
    };
  });
}

// 3. Shopify orders
function generateShopifyOrders(n) {
  const statuses = ['paid','pending','refunded','partially_refunded'];
  return Array.from({length: n}, (_, i) => {
    const fn = randomPick(firstNames);
    const ln = randomPick(lastNames);
    return {
      id: randomInt(5000000000, 5999999999),
      order_number: 1000 + i,
      total_price: (randomInt(1000, 50000) / 100).toFixed(2),
      currency: randomPick(['USD','EUR','GBP','CAD','AUD']),
      financial_status: randomPick(statuses),
      customer: { first_name: fn, last_name: ln, email: randomEmail(`${fn} ${ln}`) },
      shipping_address: {
        address1: `${randomInt(1,9999)} ${randomPick(['Main','Oak','Elm','Pine','Maple','Cedar','Park','Lake'])} ${randomPick(['St','Ave','Blvd','Dr','Ln','Way'])}`,
        city: randomPick(cities),
        province: randomPick(provinces),
        country: randomPick(countries)
      },
      created_at: randomDate()
    };
  });
}

// 4. Kubernetes pods
function generateK8sPods(n) {
  const phases = ['Running','Pending','Succeeded','Failed','Unknown'];
  const apps = ['web-api','worker','scheduler','ingress','monitor','cache','queue','auth','gateway','logger'];
  const namespaces = ['default','production','staging','monitoring','kube-system'];
  return Array.from({length: n}, () => {
    const app = randomPick(apps);
    return {
      metadata: {
        name: `${app}-${randomId('',5)}`,
        namespace: randomPick(namespaces),
        labels: { app }
      },
      spec: { nodeName: `ip-10-${randomInt(0,255)}-${randomInt(0,255)}-${randomInt(0,255)}.ec2.internal` },
      status: {
        phase: randomPick(phases),
        podIP: `10.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(0,255)}`,
        startTime: randomDate(),
        containerStatuses: [{ name: app, ready: Math.random() > 0.1, restartCount: randomInt(0, 15) }]
      }
    };
  });
}

// 5. AWS EC2 instances
function generateEC2Instances(n) {
  const types = ['t3.micro','t3.small','t3.medium','m5.large','m5.xlarge','c5.large','r5.large','m6i.xlarge'];
  const states = ['running','stopped','terminated','pending'];
  const azs = ['us-east-1a','us-east-1b','us-west-2a','us-west-2b','eu-west-1a','ap-southeast-1a'];
  const tagKeys = ['Name','Environment','Team','Service','CostCenter'];
  return Array.from({length: n}, () => ({
    InstanceId: randomId('i-', 17),
    InstanceType: randomPick(types),
    State: { Name: randomPick(states) },
    Placement: { AvailabilityZone: randomPick(azs) },
    PrivateIpAddress: `10.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(0,255)}`,
    PublicIpAddress: Math.random() > 0.3 ? `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(0,255)}` : null,
    LaunchTime: randomDate(),
    Tags: [{ Key: randomPick(tagKeys), Value: randomPick(['production','staging','dev','web-api','data-pipeline','analytics']) }],
    Monitoring: { State: randomPick(['enabled','disabled']) },
    NetworkInterfaces: [{ SubnetId: randomId('subnet-', 8), VpcId: randomId('vpc-', 8) }]
  }));
}

// 6. Elasticsearch hits
function generateESHits(n) {
  const categories = ['technology','science','business','health','sports','entertainment','politics','education'];
  const languages = ['en','es','fr','de','ja','zh','pt','ko'];
  return Array.from({length: n}, () => ({
    _id: randomId('', 20),
    _score: +(Math.random() * 15 + 1).toFixed(4),
    _source: {
      title: randomPick(['Understanding Neural Networks','Climate Change Impact Study','Quarterly Revenue Report','New Treatment Discovery','Championship Finals Recap','Award Show Highlights','Policy Reform Analysis','Online Learning Trends','Quantum Computing Advances','Market Analysis 2024']),
      author: randomName(),
      published_date: randomDate(),
      category: randomPick(categories),
      tags: Array.from({length: randomInt(2,5)}, () => randomPick(['ai','ml','data','cloud','devops','security','web','mobile','iot','blockchain','analytics','automation'])),
      metadata: { word_count: randomInt(500, 15000), language: randomPick(languages) }
    }
  }));
}

// 7. Datadog monitors
function generateDatadogMonitors(n) {
  const types = ['metric alert','service check','event alert','query alert','composite'];
  const states = ['OK','Alert','Warn','No Data'];
  return Array.from({length: n}, () => {
    const creator = randomName();
    return {
      id: randomInt(10000000, 99999999),
      name: randomPick(['High CPU Usage','Memory Threshold Exceeded','Error Rate Spike','Latency Above SLO','Disk Usage Critical','Request Queue Depth','Connection Pool Exhaustion','5xx Error Rate','Certificate Expiry','Pod Restart Loop']),
      type: randomPick(types),
      query: randomPick(['avg(last_5m):avg:system.cpu.user{*} > 90','avg(last_10m):avg:system.mem.used{*} > 85','sum(last_5m):sum:trace.error{service:api} > 100']),
      overall_state: randomPick(states),
      message: randomPick(['@slack-ops Alert: {{name}} triggered','@pagerduty Investigate immediately','Check dashboard for details']),
      options: {
        thresholds: { critical: randomInt(80, 99), warning: randomInt(50, 79) },
        notify_no_data: Math.random() > 0.5
      },
      creator: { name: creator, email: randomEmail(creator) },
      created: randomDate(),
      modified: randomDate()
    };
  });
}

// 8. Jira issues
function generateJiraIssues(n) {
  const statuses = ['To Do','In Progress','In Review','Done','Blocked'];
  const priorities = ['Highest','High','Medium','Low','Lowest'];
  const issueTypes = ['Bug','Story','Task','Epic','Sub-task'];
  const projectKeys = ['PROJ','ENG','INFRA','DATA','PLAT'];
  return Array.from({length: n}, (_, i) => {
    const assignee = randomName();
    const reporter = randomName();
    const pKey = randomPick(projectKeys);
    return {
      id: String(10000 + i),
      key: `${pKey}-${randomInt(100, 9999)}`,
      fields: {
        summary: randomPick(['Login page throws 500 error','Add dark mode support','Migrate to PostgreSQL 15','Implement SSO integration','Fix pagination on search','Add export to CSV feature','Upgrade Node.js to v20','Refactor auth middleware','Add rate limiting to API','Fix timezone handling']),
        status: { name: randomPick(statuses) },
        priority: { name: randomPick(priorities) },
        assignee: { displayName: assignee, emailAddress: randomEmail(assignee) },
        reporter: { displayName: reporter },
        issuetype: { name: randomPick(issueTypes) },
        created: randomDate(),
        updated: randomDate(),
        project: { key: pKey }
      }
    };
  });
}

// 9. Salesforce opportunities
function generateSalesforceOpps(n) {
  const stages = ['Prospecting','Qualification','Needs Analysis','Proposal','Negotiation','Closed Won','Closed Lost'];
  const industries = ['Technology','Healthcare','Finance','Manufacturing','Retail','Education','Energy'];
  const types = ['New Business','Existing Business','Renewal','Upsell'];
  return Array.from({length: n}, () => {
    const owner = randomName();
    const acctName = `${randomPick(['Acme','Globex','Initech','Umbrella','Stark','Wayne','Oscorp','Cyberdyne','Soylent','Wonka'])} ${randomPick(['Corp','Inc','LLC','Ltd','Group','Systems','Industries','Technologies','Solutions','Partners'])}`;
    return {
      Id: randomId('006', 15),
      Name: `${acctName} - ${randomPick(['Enterprise License','Platform Upgrade','Annual Renewal','Expansion Deal','Pilot Program'])}`,
      Amount: randomInt(5000, 500000),
      StageName: randomPick(stages),
      CloseDate: randomDate().slice(0, 10),
      Probability: randomInt(10, 100),
      Account: { Name: acctName, Industry: randomPick(industries) },
      Owner: { Name: owner, Email: randomEmail(owner) },
      CreatedDate: randomDate(),
      LastModifiedDate: randomDate(),
      Type: randomPick(types)
    };
  });
}

// 10. Twilio messages
function generateTwilioMessages(n) {
  const statuses = ['queued','sending','sent','delivered','undelivered','failed'];
  const directions = ['inbound','outbound-api','outbound-call','outbound-reply'];
  const bodies = [
    'Your verification code is 847293',
    'Your order #4521 has shipped. Track at https://track.example.com/4521',
    'Appointment reminder: Dr. Smith on Tuesday at 3pm',
    'Your account balance is $1,234.56',
    'Alert: Unusual login detected from new device',
    'Welcome to our service! Reply HELP for options.',
    'Your payment of $49.99 was processed successfully.',
    'Reminder: Your subscription renews in 3 days.',
    'Your package was delivered at 2:34 PM.',
    'Two-factor authentication enabled for your account.'
  ];
  return Array.from({length: n}, () => ({
    sid: randomId('SM', 32),
    from: `+1${randomInt(200,999)}${randomInt(200,999)}${randomInt(1000,9999)}`,
    to: `+1${randomInt(200,999)}${randomInt(200,999)}${randomInt(1000,9999)}`,
    body: randomPick(bodies),
    status: randomPick(statuses),
    direction: randomPick(directions),
    date_sent: randomDate(),
    price: `-0.00${randomInt(10, 99)}`,
    price_unit: 'USD',
    account_sid: randomId('AC', 32),
    messaging_service_sid: randomId('MG', 32),
    error_code: Math.random() > 0.8 ? randomInt(30001, 30010) : null,
    media: { num_media: randomInt(0, 3) }
  }));
}

// ---------------------------------------------------------------------------
// Dot-path flattening logic
// ---------------------------------------------------------------------------

/**
 * Analyze a dataset and determine which nested paths are fixed-shape
 * (present in every record with the same structure).
 */
function analyzeNesting(records) {
  if (!records.length) return { flatPaths: [], arrayPaths: [], maxDepth: 0 };

  // Collect all scalar leaf paths from the first record
  function collectPaths(obj, prefix = '') {
    const paths = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        paths.push(...collectPaths(v, path));
      } else if (Array.isArray(v)) {
        // Check if it's an array of primitives or objects
        if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
          // Array of objects: try flattening index [0] only
          for (const [sk, sv] of Object.entries(v[0])) {
            const subPath = `${path}[0].${sk}`;
            if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
              paths.push(...collectPaths(sv, subPath));
            } else {
              paths.push({ path: subPath, isArrayElement: true });
            }
          }
        } else {
          // Array of primitives: can't flatten, leave as attachment
          paths.push({ path, isArray: true });
        }
      } else {
        paths.push({ path, isScalar: true });
      }
    }
    return paths;
  }

  const firstPaths = collectPaths(records[0]);

  // Check which paths exist in ALL records
  function getValueAtPath(obj, path) {
    // Handle [0] indexing
    const parts = path.split(/\.(?![^[]*\])/);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      const arrMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrMatch) {
        current = current[arrMatch[1]];
        if (!Array.isArray(current)) return undefined;
        current = current[parseInt(arrMatch[2])];
      } else {
        current = current[part];
      }
    }
    return current;
  }

  const flatPaths = [];
  const arrayPaths = [];
  let maxDepth = 0;

  for (const pathInfo of firstPaths) {
    if (pathInfo.isArray) {
      arrayPaths.push(pathInfo.path);
      continue;
    }

    const depth = (pathInfo.path.match(/\./g) || []).length;
    if (depth > maxDepth) maxDepth = depth;

    if (depth === 0 && !pathInfo.isArrayElement) {
      // Top-level scalar, always flat
      flatPaths.push(pathInfo.path);
      continue;
    }

    // Check all records have this path
    let allPresent = true;
    for (const record of records) {
      const val = getValueAtPath(record, pathInfo.path);
      if (val === undefined) {
        // null is ok (it's a value), undefined means missing
        allPresent = false;
        break;
      }
    }

    if (allPresent) {
      flatPaths.push(pathInfo.path);
    } else {
      // Nullable: still flatten but with empty values
      flatPaths.push(pathInfo.path);
    }
  }

  return { flatPaths, arrayPaths, maxDepth };
}

/**
 * Get a value from a nested object using a dot path (supports [0] indexing).
 */
function getNestedValue(obj, path) {
  const segments = [];
  let remaining = path;
  while (remaining.length > 0) {
    const arrMatch = remaining.match(/^([^.[]+)\[(\d+)\](\.?)/);
    if (arrMatch) {
      segments.push({ key: arrMatch[1], index: parseInt(arrMatch[2]) });
      remaining = remaining.slice(arrMatch[0].length);
    } else {
      const dotMatch = remaining.match(/^([^.]+)(\.?)/);
      if (dotMatch) {
        segments.push({ key: dotMatch[1] });
        remaining = remaining.slice(dotMatch[0].length);
      } else {
        break;
      }
    }
  }

  let current = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return null;
    current = current[seg.key];
    if (seg.index !== undefined) {
      if (!Array.isArray(current)) return null;
      current = current[seg.index];
    }
  }
  return current;
}

/**
 * Escape a GCF cell value: pipes and newlines need quoting.
 */
function escapeGcfValue(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s === '') return '""';
  if (s.includes('|') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Build a dot-flattened GCF string for a dataset.
 */
function buildFlattenedGCF(records, analysis) {
  const { flatPaths, arrayPaths } = analysis;
  const lines = [];

  // Header
  lines.push('GCF profile=generic');

  // Build column names: use dot paths as-is for nested, but clean [0] to .0
  const colNames = flatPaths.map(p => p.replace(/\[0\]/g, '.0'));
  lines.push(`## [${records.length}]{${colNames.join(',')}}`);

  // Rows
  for (let i = 0; i < records.length; i++) {
    const cells = flatPaths.map(p => escapeGcfValue(getNestedValue(records[i], p)));
    lines.push(`@${i} ${cells.join('|')}`);

    // Array attachments (can't be flattened)
    for (const arrPath of arrayPaths) {
      const val = getNestedValue(records[i], arrPath);
      if (Array.isArray(val) && val.length > 0) {
        // Get the path segments for attachment label
        const parts = arrPath.split('.');
        // Build nested attachment path
        let attachLabel = '';
        if (parts.length === 1) {
          attachLabel = `.${parts[0]}`;
        } else {
          attachLabel = `.${parts.join('.')}`;
        }
        lines.push(`${attachLabel} []`);
        for (const item of val) {
          if (typeof item === 'object' && item !== null) {
            lines.push(`    ${JSON.stringify(item)}`);
          } else {
            lines.push(`    ${escapeGcfValue(item)}`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Nesting depth analysis per data shape
// ---------------------------------------------------------------------------

function nestingStats(flatPaths) {
  let nestedCount = 0;
  const depthCounts = {};
  for (const p of flatPaths) {
    const dots = (p.match(/\./g) || []).length;
    // Adjust for [0] which adds a .0 but is really array access
    const arrAccess = (p.match(/\[0\]/g) || []).length;
    const actualDepth = dots + arrAccess;
    if (actualDepth > 0) {
      nestedCount++;
      depthCounts[actualDepth] = (depthCounts[actualDepth] || 0) + 1;
    }
  }
  return { nestedCount, depthCounts };
}

// ---------------------------------------------------------------------------
// Main benchmark
// ---------------------------------------------------------------------------

const ITEM_COUNT = 50;

const dataSets = [
  { name: 'GitHub PRs',          gen: generateGitHubPRs },
  { name: 'Stripe charges',      gen: generateStripeCharges },
  { name: 'Shopify orders',      gen: generateShopifyOrders },
  { name: 'Kubernetes pods',     gen: generateK8sPods },
  { name: 'AWS EC2 instances',   gen: generateEC2Instances },
  { name: 'Elasticsearch hits',  gen: generateESHits },
  { name: 'Datadog monitors',    gen: generateDatadogMonitors },
  { name: 'Jira issues',         gen: generateJiraIssues },
  { name: 'Salesforce opps',     gen: generateSalesforceOpps },
  { name: 'Twilio messages',     gen: generateTwilioMessages },
];

console.log('=== Dot-Path Flattening: Cross-API Benchmark ===');
console.log(`${ITEM_COUNT} items per data shape, gpt-4o tokenizer (o200k_base)\n`);

const header = [
  'API / Data Shape'.padEnd(26),
  'JSON'.padStart(8),
  'Curr GCF'.padStart(10),
  'Flat GCF'.padStart(10),
  'Curr/JSON'.padStart(11),
  'Flat/JSON'.padStart(11),
  'Flat/Curr'.padStart(11),
];
console.log(header.join(''));
console.log('\u2500'.repeat(87));

const results = [];
const allNesting = { totalNested: 0, shapes: 0, depthCounts: {} };

for (const ds of dataSets) {
  const data = ds.gen(ITEM_COUNT);

  // JSON
  const jsonStr = JSON.stringify(data);
  const jsonTokens = countTokens(jsonStr);

  // Current GCF
  const currentGCF = encodeGeneric(data);
  const currentTokens = countTokens(currentGCF);

  // Dot-flattened GCF
  const analysis = analyzeNesting(data);
  const flatGCF = buildFlattenedGCF(data, analysis);
  const flatTokens = countTokens(flatGCF);

  const currVsJson = ((currentTokens - jsonTokens) / jsonTokens * 100).toFixed(1);
  const flatVsJson = ((flatTokens - jsonTokens) / jsonTokens * 100).toFixed(1);
  const flatVsCurr = ((flatTokens - currentTokens) / currentTokens * 100).toFixed(1);

  results.push({ name: ds.name, jsonTokens, currentTokens, flatTokens, currVsJson, flatVsJson, flatVsCurr });

  // Nesting stats
  const ns = nestingStats(analysis.flatPaths);
  allNesting.totalNested += ns.nestedCount;
  allNesting.shapes++;
  for (const [d, c] of Object.entries(ns.depthCounts)) {
    allNesting.depthCounts[d] = (allNesting.depthCounts[d] || 0) + c;
  }

  const row = [
    ds.name.padEnd(26),
    String(jsonTokens).padStart(8),
    String(currentTokens).padStart(10),
    String(flatTokens).padStart(10),
    `${currVsJson > 0 ? '+' : ''}${currVsJson}%`.padStart(11),
    `${flatVsJson > 0 ? '+' : ''}${flatVsJson}%`.padStart(11),
    `${flatVsCurr > 0 ? '+' : ''}${flatVsCurr}%`.padStart(11),
  ];
  console.log(row.join(''));
}

console.log('\u2500'.repeat(87));

// Totals row
const totalJson = results.reduce((s, r) => s + r.jsonTokens, 0);
const totalCurr = results.reduce((s, r) => s + r.currentTokens, 0);
const totalFlat = results.reduce((s, r) => s + r.flatTokens, 0);
const totalCurrVsJson = ((totalCurr - totalJson) / totalJson * 100).toFixed(1);
const totalFlatVsJson = ((totalFlat - totalJson) / totalJson * 100).toFixed(1);
const totalFlatVsCurr = ((totalFlat - totalCurr) / totalCurr * 100).toFixed(1);

console.log([
  'TOTAL'.padEnd(26),
  String(totalJson).padStart(8),
  String(totalCurr).padStart(10),
  String(totalFlat).padStart(10),
  `${totalCurrVsJson > 0 ? '+' : ''}${totalCurrVsJson}%`.padStart(11),
  `${totalFlatVsJson > 0 ? '+' : ''}${totalFlatVsJson}%`.padStart(11),
  `${totalFlatVsCurr > 0 ? '+' : ''}${totalFlatVsCurr}%`.padStart(11),
].join(''));

// Summary
console.log('\nSummary:');
const currBeatsJson = results.filter(r => parseFloat(r.currVsJson) < 0).length;
const flatBeatsJson = results.filter(r => parseFloat(r.flatVsJson) < 0).length;
const flatBeatsCurr = results.filter(r => parseFloat(r.flatVsCurr) < 0).length;

const avgCurrVsJson = (results.reduce((s, r) => s + parseFloat(r.currVsJson), 0) / results.length).toFixed(1);
const avgFlatVsJson = (results.reduce((s, r) => s + parseFloat(r.flatVsJson), 0) / results.length).toFixed(1);
const avgFlatVsCurr = (results.reduce((s, r) => s + parseFloat(r.flatVsCurr), 0) / results.length).toFixed(1);

console.log(`  Data shapes where current GCF beats JSON: ${currBeatsJson}/${results.length}`);
console.log(`  Data shapes where flat GCF beats JSON:    ${flatBeatsJson}/${results.length}`);
console.log(`  Data shapes where flat GCF beats current: ${flatBeatsCurr}/${results.length}`);
console.log(`  Average current GCF vs JSON: ${avgCurrVsJson > 0 ? '+' : ''}${avgCurrVsJson}%`);
console.log(`  Average flat GCF vs JSON:    ${avgFlatVsJson > 0 ? '+' : ''}${avgFlatVsJson}%`);
console.log(`  Average flat GCF vs current: ${avgFlatVsCurr > 0 ? '+' : ''}${avgFlatVsCurr}%`);

// Nesting analysis
console.log('\nNesting analysis:');
console.log(`  Avg nested fields flattened per shape: ${(allNesting.totalNested / allNesting.shapes).toFixed(1)}`);
const depths = Object.keys(allNesting.depthCounts).sort((a, b) => a - b);
for (const d of depths) {
  console.log(`  Shapes with depth-${d} fields: ${allNesting.depthCounts[d]}`);
}

// Sample output comparison for first dataset
console.log('\n' + '='.repeat(87));
console.log('Sample: GitHub PRs (first 3 records)\n');

const sampleData = generateGitHubPRs(3);

console.log('--- JSON (excerpt) ---');
const jsonSample = JSON.stringify(sampleData, null, 2);
console.log(jsonSample.slice(0, 600) + '\n...\n');

console.log('--- Current GCF ---');
console.log(encodeGeneric(sampleData));
console.log();

console.log('--- Dot-flattened GCF ---');
const sampleAnalysis = analyzeNesting(sampleData);
console.log(buildFlattenedGCF(sampleData, sampleAnalysis));

// enc.free() not needed for js-tiktoken
