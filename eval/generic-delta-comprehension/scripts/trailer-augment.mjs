// Augment step2 fixtures with an authoritative GCF summary trailer on each
// delta-arm turn: "##! rows=<total> <status>=<count> ...", computed by replaying
// the delta stream. This converts the count/aggregate_count questions (the only
// failing category) from "the model must tally the running table" into "the model
// reads the total the server already knows" — matching GCF's ##! summary trailer.
// The full_resend arm is left byte-identical (it already scores 100%).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

const F = ['id', 'total', 'status', 'region', 'customer'];
const SRC = 'fixtures/original', DST = 'fixtures/trailer';

function decVal(t){if(t==null)return t;if(t==='-')return null;if(t==='true')return true;if(t==='false')return false;if(t[0]==='"')return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);return t;}
function splitRow(l){const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='\\'){c+=ch+l[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}
const decRow = l => { const p = splitRow(l); const r = {}; F.forEach((f, i) => r[f] = decVal(p[i])); return r; };
const isFull = c => /## orders \[/.test(c);
const parseFull = c => c.split('\n').filter(l => l && !l.startsWith('GCF ') && !l.startsWith('##')).map(decRow);
function applyDeltaC(state, c) {
  const m = new Map(state.map(r => [r.id, { ...r }]));
  let s = null;
  for (const ln of c.split('\n')) {
    if (!ln || ln.startsWith('GCF ') || ln.startsWith('##!')) continue;
    if (ln.startsWith('## added')) { s = 'a'; continue; }
    if (ln.startsWith('## changed')) { s = 'c'; continue; }
    if (ln.startsWith('## removed')) { s = 'r'; continue; }
    if (s === 'r') m.delete(Number(decVal(ln)));
    else if (s) { const r = decRow(ln); m.set(r.id, r); }
  }
  return [...m.values()];
}

// Authoritative trailer for a given state, over a fixed status key set.
function trailer(state, statuses) {
  const counts = Object.fromEntries(statuses.map(s => [s, 0]));
  for (const r of state) if (r.status in counts) counts[r.status]++;
  const parts = statuses.map(s => `${s}=${counts[s]}`);
  return `##! rows=${state.length} ${parts.join(' ')}`;
}

const PRIMER_NOTE =
  ' Each delta ends with a summary line starting "##! " that gives the AUTHORITATIVE current' +
  ' totals after applying that delta: "##! rows=<total> <status>=<count> ...". For any' +
  ' counting question (total orders, or orders with a given status), read the number directly' +
  ' from this "##! " line rather than recounting the rows.';

mkdirSync(DST, { recursive: true });
for (const f of readdirSync(SRC).filter(f => f.endsWith('.json'))) {
  const fx = JSON.parse(readFileSync(`${SRC}/${f}`));

  // Global status key set across the initial full + every add/changed row.
  const statusSet = new Set();
  for (const turn of fx.arms.delta) {
    for (const ln of turn.content.split('\n')) {
      if (!ln || ln.startsWith('GCF ') || ln.startsWith('##')) continue;
      const r = decRow(ln);
      if (typeof r.status === 'string' && r.status) statusSet.add(r.status);
    }
  }
  const statuses = [...statusSet].sort();

  // Replay the delta arm, appending the trailer to each turn.
  let state = null;
  const newDelta = fx.arms.delta.map(turn => {
    state = isFull(turn.content) ? parseFull(turn.content) : applyDeltaC(state, turn.content);
    const content = turn.content.replace(/\n*$/, '') + '\n' + trailer(state, statuses);
    return { ...turn, content };
  });

  const out = {
    ...fx,
    primer: fx.primer.replace(/\s*$/, '') + PRIMER_NOTE,
    arms: { ...fx.arms, delta: newDelta }, // full_resend left untouched
  };
  writeFileSync(`${DST}/${f}`, JSON.stringify(out, null, 1));
  console.log(`${f}: statuses=[${statuses.join(',')}] delta turns augmented=${newDelta.length}`);
}
console.log('wrote augmented fixtures to', DST);
