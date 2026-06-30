#!/usr/bin/env node
// Microsoft 365 MCP Server: Token Benchmark
// Compares JSON vs TOON vs GCF token counts on realistic Microsoft Graph API data shapes.
// Data shapes based on Softeria/ms-365-mcp-server endpoints.

import { encode as toonEncode } from '@toon-format/toon';
import { encodeGeneric } from '@blackwell-systems/gcf';
import { encodingForModel } from 'js-tiktoken';

const enc = encodingForModel('gpt-4o');
const tokenCount = (text) => enc.encode(text).length;

// ── Realistic data generators ──────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Cameron', 'Reese', 'Dakota', 'Skyler', 'Rowan', 'Finley', 'Emerson',
  'Parker', 'Hayden', 'Sage', 'Blake', 'Drew', 'Kai', 'Logan', 'Peyton',
  'Kendall', 'Sawyer', 'Elliot', 'Jamie', 'River', 'Harley', 'Remi',
  'Adrian', 'Charlie', 'Eden', 'Frankie', 'Jesse', 'Lane', 'Milan', 'Nico',
  'Phoenix', 'Robin', 'Shiloh', 'Tatum', 'Val', 'Winter', 'Zion',
];

const LAST_NAMES = [
  'Chen', 'Patel', 'Garcia', 'Kim', 'Williams', 'Nakamura', 'Singh',
  'Johansson', 'Mueller', 'Santos', 'Thompson', 'Okafor', 'Dubois',
  'Petrov', 'Andersen', 'Kowalski', 'Yamamoto', 'Martinez', 'Olsen',
  'Fernandez', 'Novak', 'Ito', 'Larsson', 'Gupta', 'Ali', 'Brown',
  'Reeves', 'Costa', 'Ortiz', 'Lindgren', 'Voss', 'Tanaka', 'Eriksson',
];

const DOMAINS = [
  'contoso.com', 'fabrikam.com', 'northwindtraders.com', 'adventure-works.com',
  'woodgrovebank.com', 'litwareinc.com', 'tailspintoys.com', 'proseware.com',
];

const EMAIL_SUBJECTS = [
  'Q3 Budget Review: Updated Projections',
  'Re: Project Falcon Timeline Update',
  'Weekly Team Standup Notes',
  'Action Required: Approve PO #4821',
  'FYI: New Compliance Guidelines',
  'Meeting Reschedule: Strategy Session',
  'Quarterly Business Review Deck',
  'Re: Customer Escalation - Acme Corp',
  'IT Maintenance Window: Saturday 2am-6am',
  'Invitation: All-Hands Town Hall',
  'Updated: Travel Policy Changes',
  'Re: Re: Vendor Contract Renewal',
  'Reminder: Performance Reviews Due Friday',
  'Lunch & Learn: AI in the Workplace',
  'FW: Partner Integration Proposal',
  'Re: Office Relocation Plan',
  'Urgent: Security Patch Required',
  'Draft: Annual Report Section 3',
  'Re: Hiring Update - Senior Engineer',
  'Out of Office: June 23-27',
  'Sprint 14 Retrospective Notes',
  'Re: API Rate Limiting Discussion',
  'Benefits Enrollment Reminder',
  'Re: Data Migration Plan v2',
  'Feedback Request: New Dashboard',
];

const BODY_PREVIEWS = [
  'Hi team, please review the updated budget projections for Q3. The revised numbers reflect the new headcount plan and',
  'Following up on our discussion yesterday, I wanted to share the updated timeline for Project Falcon. Key milestones',
  'Thanks for joining the standup. Here are the action items: 1) Alex to finalize the API spec by Thursday 2) Morgan',
  'Please approve the attached purchase order for the new monitoring tools. We need this processed before end of month',
  'As discussed in the leadership meeting, we are rolling out new compliance guidelines effective July 1. All team leads',
  'Due to a conflict with the exec review, I am moving our strategy session to Thursday at 2pm. Same conference room.',
  'Attached is the QBR deck for your review. Please add your section slides by Wednesday EOD. The customer meeting is',
  'I wanted to flag this escalation from Acme Corp. Their integration has been failing intermittently since the last',
  'Reminder that we have a scheduled maintenance window this Saturday from 2am to 6am EST. All non-critical services',
  'Please join us for the quarterly all-hands on Friday at 3pm. We will be covering H2 goals, team updates, and the',
  'The updated travel policy is now available on the intranet. Key changes include the new per-diem rates and the',
  'After reviewing the terms, I think we should push back on the auto-renewal clause. Can we schedule a call with legal',
  'Just a reminder that all performance reviews are due by end of day Friday. Please complete both self-assessments and',
  'Join us for a lunch and learn session on how AI is transforming workplace productivity. Featuring a demo of our new',
  'Forwarding this for your review. The partner team has put together a solid proposal for the integration. I think we',
];

const FILE_NAMES = [
  'Q3-Budget-Projections.xlsx', 'Project-Falcon-Timeline.pptx', 'Meeting-Notes-2026-06-15.docx',
  'Architecture-Diagram-v2.png', 'API-Specification.pdf', 'Customer-Data-Export.csv',
  'Sprint-14-Retro.docx', 'Annual-Report-Draft.docx', 'Vendor-Contracts', 'Marketing-Assets',
  'Design-Mockups', 'Training-Materials', 'Onboarding-Guide.pdf', 'Release-Notes-v3.1.md',
  'Performance-Dashboard.pbix', 'Team-Photo-Offsite.jpg', 'Invoice-April-2026.pdf',
  'Compliance-Checklist.xlsx', 'Brand-Guidelines.pdf', 'Demo-Recording-2026-06.mp4',
  'Expense-Report-Q2.xlsx', 'Org-Chart-2026.vsdx', 'Product-Roadmap-H2.pptx',
  'Security-Audit-Report.pdf', 'Data-Migration-Plan.docx',
];

const MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'application/pdf', 'text/csv', 'image/jpeg', 'video/mp4',
  'text/markdown', 'application/vnd.ms-powerbi.report',
];

const JOB_TITLES = [
  'Senior Software Engineer', 'Product Manager', 'UX Designer', 'Data Analyst',
  'Engineering Manager', 'Solutions Architect', 'DevOps Engineer', 'QA Lead',
  'Technical Writer', 'Program Manager', 'Staff Engineer', 'Cloud Architect',
  'Security Engineer', 'Frontend Developer', 'Backend Developer', 'ML Engineer',
  'VP of Engineering', 'Director of Product', 'Scrum Master', 'IT Administrator',
];

const COMPANIES = [
  'Contoso Ltd', 'Fabrikam Inc', 'Northwind Traders', 'Adventure Works',
  'Woodgrove Bank', 'Litware Inc', 'Tailspin Toys', 'Proseware Corp',
  'Datum Corporation', 'Trey Research', 'Alpine Ski House', 'Bellows College',
];

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Finance',
  'Human Resources', 'IT', 'Legal', 'Operations', 'Customer Success', 'Security',
];

const TASK_TITLES = [
  'Update API documentation for v3 endpoints',
  'Review and merge PR #482',
  'Set up staging environment for load tests',
  'Investigate intermittent timeout errors',
  'Create onboarding checklist for new hires',
  'Design database migration strategy',
  'Write unit tests for payment module',
  'Configure CI/CD pipeline for new service',
  'Prepare demo for stakeholder review',
  'Audit third-party dependencies',
  'Implement rate limiting middleware',
  'Update Terraform configs for new region',
  'Draft technical spec for caching layer',
  'Fix pagination bug in search results',
  'Coordinate with vendor on SLA terms',
  'Set up monitoring dashboards',
  'Refactor authentication flow',
  'Plan sprint 15 backlog',
  'Update runbook for incident response',
  'Benchmark query performance',
];

const CHAT_MESSAGES = [
  'Hey, did you see the updated design mockups? I think the new nav looks much cleaner.',
  'Just pushed the fix for the timeout issue. Can you pull and test when you get a chance?',
  'The staging deploy finished. Everything looks green. Should we proceed with the load test?',
  'Heads up: the API rate limits are changing next week. I updated the docs with the new thresholds.',
  'Great work on the demo yesterday! The client was really impressed with the dashboard improvements.',
  'Can someone review my PR? It is the caching layer refactor. Should be straightforward.',
  'I am going to be out Thursday and Friday. Jordan is covering for me on the on-call rotation.',
  'The new monitoring alerts are live. We should see much faster detection of memory leaks now.',
  'Quick question: are we using the v2 or v3 API for the partner integration? Need to update my branch.',
  'Meeting notes from the architecture review are in the shared drive. Key decision: we are going with event sourcing.',
  'FYI the CI pipeline is broken on main. Looks like a flaky test. I am looking into it.',
  'Does anyone have the credentials for the sandbox environment? I need to test the OAuth flow.',
  'The performance benchmarks are in. We got a 40% improvement on the hot path after the refactor.',
  'Reminder: code freeze starts tomorrow at 5pm. Please get your PRs merged before then.',
  'I just finished the security audit. Found a few minor issues, nothing critical. Report is in the channel.',
];

const CALENDAR_LOCATIONS = [
  'Conference Room A (Building 1)', 'Zoom Meeting', 'Teams Meeting',
  'Board Room (Floor 12)', 'Cafeteria Meeting Space', 'Conference Room B (Building 2)',
  'External: Client Office', 'Room 305 (Training Center)', 'Virtual - WebEx',
  'Huddle Space 4A', 'Executive Briefing Center', 'Outdoor Patio (Weather Permitting)',
];

// ── Helpers ────────────────────────────────────────────────────────────────

let _seed = 42;
function seededRandom() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed & 0x7fffffff) / 0x7fffffff;
}

function pick(arr) { return arr[Math.floor(seededRandom() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => seededRandom() - 0.5);
  return shuffled.slice(0, n);
}

function graphId() {
  const hex = '0123456789abcdef';
  const segs = [8, 4, 4, 4, 12];
  return 'AAMkAGI' + segs.map(n => {
    let s = '';
    for (let i = 0; i < n; i++) s += hex[Math.floor(seededRandom() * 16)];
    return s;
  }).join('-');
}

function randomDate(year = 2026, monthStart = 1, monthEnd = 6) {
  const month = monthStart + Math.floor(seededRandom() * (monthEnd - monthStart + 1));
  const day = 1 + Math.floor(seededRandom() * 28);
  const hour = 8 + Math.floor(seededRandom() * 10);
  const min = Math.floor(seededRandom() * 4) * 15;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.0000000Z`;
}

function person() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const domain = pick(DOMAINS);
  return { name: `${first} ${last}`, address: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}` };
}

function phoneNumber() {
  const area = 200 + Math.floor(seededRandom() * 800);
  const ex = 200 + Math.floor(seededRandom() * 800);
  const num = 1000 + Math.floor(seededRandom() * 9000);
  return `+1 (${area}) ${ex}-${num}`;
}

// ── Data generators ────────────────────────────────────────────────────────

function generateEmails(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const p = person();
    items.push({
      id: graphId(),
      subject: pick(EMAIL_SUBJECTS),
      from: { emailAddress: { name: p.name, address: p.address } },
      receivedDateTime: randomDate(),
      isRead: seededRandom() > 0.3,
      hasAttachments: seededRandom() > 0.7,
      bodyPreview: pick(BODY_PREVIEWS),
      importance: seededRandom() > 0.85 ? 'high' : 'normal',
      categories: seededRandom() > 0.6 ? pickN(['Blue Category', 'Red Category', 'Green Category', 'Yellow Category', 'Purple Category'], 1 + Math.floor(seededRandom() * 2)) : [],
    });
  }
  return items;
}

function generateCalendarEvents(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const org = person();
    const startDate = randomDate();
    const endDate = startDate.replace(/T(\d{2})/, (_, h) => `T${String(Math.min(23, parseInt(h) + 1)).padStart(2, '0')}`);
    const numAttendees = 1 + Math.floor(seededRandom() * 5);
    const attendees = [];
    for (let a = 0; a < numAttendees; a++) {
      const ap = person();
      attendees.push({
        emailAddress: { name: ap.name, address: ap.address },
        type: seededRandom() > 0.3 ? 'required' : 'optional',
      });
    }
    items.push({
      id: graphId(),
      subject: pick([
        'Sprint Planning', 'Design Review', '1:1 with Manager', 'Team Standup',
        'Architecture Discussion', 'Customer Demo', 'Budget Review', 'Retrospective',
        'Interview: Senior Engineer', 'Product Sync', 'All-Hands Meeting', 'Tech Talk',
        'Incident Review', 'Planning Poker', 'Stakeholder Update', 'Offsite Planning',
      ]),
      start: { dateTime: startDate, timeZone: 'Pacific Standard Time' },
      end: { dateTime: endDate, timeZone: 'Pacific Standard Time' },
      organizer: { emailAddress: { name: org.name, address: org.address } },
      location: { displayName: pick(CALENDAR_LOCATIONS) },
      isAllDay: seededRandom() > 0.9,
      showAs: pick(['busy', 'busy', 'busy', 'free', 'tentative']),
      attendees,
    });
  }
  return items;
}

function generateFiles(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const fname = pick(FILE_NAMES);
    const isFolder = !fname.includes('.');
    const item = {
      id: graphId(),
      name: fname,
      size: isFolder ? undefined : (1024 + Math.floor(seededRandom() * 10000000)),
      lastModifiedDateTime: randomDate(),
      createdDateTime: randomDate(2025, 1, 12),
      webUrl: `https://${pick(DOMAINS).split('.')[0]}.sharepoint.com/sites/team/Shared%20Documents/${encodeURIComponent(fname)}`,
      parentReference: { path: '/drive/root:/Documents' + (seededRandom() > 0.5 ? '/Projects' : '') },
    };
    if (isFolder) {
      item.folder = { childCount: Math.floor(seededRandom() * 25) };
    } else {
      item.file = { mimeType: pick(MIME_TYPES) };
    }
    items.push(item);
  }
  return items;
}

function generateContacts(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const p = person();
    const [first, last] = p.name.split(' ');
    const numEmails = 1 + Math.floor(seededRandom() * 2);
    const emailAddresses = [];
    for (let e = 0; e < numEmails; e++) {
      const domain = pick(DOMAINS);
      emailAddresses.push({
        name: e === 0 ? `${first.toLowerCase()}.${last.toLowerCase()}@${domain}` : `${first.toLowerCase()}@${pick(DOMAINS)}`,
        address: e === 0 ? `${first.toLowerCase()}.${last.toLowerCase()}@${domain}` : `${first.toLowerCase()}@${pick(DOMAINS)}`,
      });
    }
    items.push({
      id: graphId(),
      displayName: p.name,
      givenName: first,
      surname: last,
      emailAddresses,
      businessPhones: seededRandom() > 0.3 ? [phoneNumber()] : [],
      jobTitle: pick(JOB_TITLES),
      companyName: pick(COMPANIES),
      department: pick(DEPARTMENTS),
    });
  }
  return items;
}

function generatePlannerTasks(count) {
  const items = [];
  const planId = graphId();
  const bucketIds = [graphId(), graphId(), graphId()];
  for (let i = 0; i < count; i++) {
    const assignee = person();
    items.push({
      id: graphId(),
      title: pick(TASK_TITLES),
      percentComplete: pick([0, 0, 0, 50, 100]),
      priority: pick([1, 3, 5, 5, 5, 9]),
      dueDateTime: seededRandom() > 0.2 ? randomDate() : null,
      createdDateTime: randomDate(2026, 1, 5),
      assignedTo: { userId: graphId(), displayName: assignee.name },
      bucketId: pick(bucketIds),
      planId,
      orderHint: `8${String(Math.floor(seededRandom() * 100000000)).padStart(8, '0')}5741`,
    });
  }
  return items;
}

function generateChatMessages(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const sender = person();
    items.push({
      id: graphId(),
      messageType: 'message',
      createdDateTime: randomDate(),
      from: { user: { displayName: sender.name } },
      body: {
        contentType: 'text',
        content: pick(CHAT_MESSAGES),
      },
      importance: seededRandom() > 0.9 ? 'high' : 'normal',
      attachments: seededRandom() > 0.85 ? [{
        id: graphId(),
        contentType: 'reference',
        name: pick(FILE_NAMES.filter(f => f.includes('.'))),
        contentUrl: `https://${pick(DOMAINS).split('.')[0]}.sharepoint.com/sites/team/Shared%20Documents/${encodeURIComponent(pick(FILE_NAMES))}`,
      }] : [],
    });
  }
  return items;
}

// ── Benchmark ──────────────────────────────────────────────────────────────

const SIZES = [10, 50, 200];

const DATA_TYPES = [
  { name: 'Email messages', gen: generateEmails },
  { name: 'Calendar events', gen: generateCalendarEvents },
  { name: 'OneDrive files', gen: generateFiles },
  { name: 'Contacts', gen: generateContacts },
  { name: 'Planner tasks', gen: generatePlannerTasks },
  { name: 'Chat messages', gen: generateChatMessages },
];

function formatNum(n) {
  return n.toLocaleString('en-US');
}

function pct(value, baseline) {
  return ((value - baseline) / baseline * 100).toFixed(1);
}

console.log('=== Microsoft 365 MCP Server: Token Benchmark ===');
console.log('Data shapes from Softeria/ms-365-mcp-server (787 stars, 116K npm/month)');
console.log('Token counting: gpt-4o (o200k_base) via js-tiktoken');
console.log('');

const header = 'Data Type'.padEnd(20) + 'Size'.padStart(6) +
  'JSON'.padStart(10) + 'TOON'.padStart(10) + 'GCF'.padStart(10) +
  'TOON%'.padStart(10) + 'GCF%'.padStart(10) + 'GCF vs TOON'.padStart(14);
const sep = '\u2500'.repeat(header.length);

console.log(header);
console.log(sep);

let totalJson = 0, totalToon = 0, totalGcf = 0;
let allRows = [];

for (const dt of DATA_TYPES) {
  for (const size of SIZES) {
    // Reset seed for reproducibility per combination
    _seed = 42 + size * 100 + DATA_TYPES.indexOf(dt) * 10000;
    const data = dt.gen(size);

    const jsonStr = JSON.stringify(data);
    const toonStr = toonEncode(data);
    const gcfStr = encodeGeneric(data);

    const jsonTokens = tokenCount(jsonStr);
    const toonTokens = tokenCount(toonStr);
    const gcfTokens = tokenCount(gcfStr);

    totalJson += jsonTokens;
    totalToon += toonTokens;
    totalGcf += gcfTokens;

    const toonPct = pct(toonTokens, jsonTokens);
    const gcfPct = pct(gcfTokens, jsonTokens);
    const gcfVsToon = pct(gcfTokens, toonTokens);

    allRows.push({ name: dt.name, size, jsonTokens, toonTokens, gcfTokens, toonPct, gcfPct, gcfVsToon });

    const row = dt.name.padEnd(20) +
      String(size).padStart(6) +
      formatNum(jsonTokens).padStart(10) +
      formatNum(toonTokens).padStart(10) +
      formatNum(gcfTokens).padStart(10) +
      `${toonPct}%`.padStart(10) +
      `${gcfPct}%`.padStart(10) +
      `${gcfVsToon}%`.padStart(14);
    console.log(row);
  }
}

console.log(sep);
console.log('');

// Per-type summaries
console.log('Per-type summary (200-item rows):');
console.log(sep);
for (const dt of DATA_TYPES) {
  const row = allRows.find(r => r.name === dt.name && r.size === 200);
  if (row) {
    const vsToon = -parseFloat(row.gcfVsToon);
    const vsJson = -parseFloat(row.gcfPct);
    const toonLabel = vsToon >= 0 ? `saves ${vsToon.toFixed(1)}%` : `costs ${(-vsToon).toFixed(1)}% more`;
    const jsonLabel = vsJson >= 0 ? `saves ${vsJson.toFixed(1)}%` : `costs ${(-vsJson).toFixed(1)}% more`;
    console.log(`  ${dt.name.padEnd(20)} ${toonLabel} vs TOON, ${jsonLabel} vs JSON`);
  }
}
console.log('');

// Overall summary
const avgToonSavings = allRows.reduce((s, r) => s + parseFloat(r.toonPct), 0) / allRows.length;
const avgGcfSavings = allRows.reduce((s, r) => s + parseFloat(r.gcfPct), 0) / allRows.length;
const avgGcfVsToon = allRows.reduce((s, r) => s + parseFloat(r.gcfVsToon), 0) / allRows.length;

console.log('Summary:');
console.log(`  JSON baseline:          ${formatNum(totalJson)} total tokens`);
console.log(`  TOON total:             ${formatNum(totalToon)} tokens (${avgToonSavings > 0 ? '+' : ''}${avgToonSavings.toFixed(1)}% vs JSON)`);
console.log(`  GCF total:              ${formatNum(totalGcf)} tokens (${avgGcfSavings.toFixed(1)}% vs JSON)`);
console.log(`  GCF savings vs TOON:    avg ${(-avgGcfVsToon).toFixed(1)}% fewer tokens`);
console.log('');
if (avgToonSavings > 0) {
  console.log('  NOTE: TOON increases token count vs JSON on these data shapes.');
  console.log('  TOON\'s YAML-based indentation encoding adds whitespace tokens');
  console.log('  that exceed the savings from removing JSON syntax characters.');
  console.log('');
}

// Win/loss
let gcfWins = 0, toonWins = 0, ties = 0;
for (const r of allRows) {
  if (r.gcfTokens < r.toonTokens) gcfWins++;
  else if (r.gcfTokens > r.toonTokens) toonWins++;
  else ties++;
}
console.log(`  GCF wins: ${gcfWins}/${allRows.length} comparisons (ties: ${ties}, TOON wins: ${toonWins})`);
console.log('');

// Scaling analysis
console.log('Scaling analysis (token savings % at increasing size):');
console.log(sep);
for (const dt of DATA_TYPES) {
  const rows = allRows.filter(r => r.name === dt.name);
  const savings = rows.map(r => `${r.size}: ${r.gcfVsToon}%`).join('  |  ');
  console.log(`  ${dt.name.padEnd(20)} ${savings}`);
}
console.log('');
console.log('Benchmark complete.');
