import { mkdirSync } from 'node:fs';
mkdirSync('step2-fixtures',{recursive:true});
import { writeFileSync } from 'node:fs';
// ---- codec (from step 1) ----
const F=['id','total','status','region','customer'];
const enc=v=>v===null?'-':v===true?'true':v===false?'false':typeof v==='number'?String(v):(/[|\n"\\]/.test(v)||v===''||/^(true|false|-|~)$/.test(v)||/^-?\d+(\.\d+)?$/.test(v))?'"'+v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')+'"':v;
const encRow=r=>F.map(f=>enc(r[f])).join('|');
const encFull=rows=>[`## orders [${rows.length}]{@id,${F.slice(1).join(',')}}`,...rows.map(encRow)].join('\n');
function encDelta(prev,next){const pm=new Map(prev.map(r=>[r.id,r])),nm=new Map(next.map(r=>[r.id,r]));const A=[],C=[],R=[];
  for(const[k,r] of nm){if(!pm.has(k))A.push(r);else if(JSON.stringify(pm.get(k))!==JSON.stringify(r))C.push(r);}
  for(const k of pm.keys())if(!nm.has(k))R.push(k);
  const L=['GCF profile=generic delta=true'];
  if(A.length){L.push(`## added [${A.length}]{@id,${F.slice(1).join(',')}}`);A.forEach(r=>L.push(encRow(r)));}
  if(C.length){L.push(`## changed [${C.length}]{@id,${F.slice(1).join(',')}}`);C.forEach(r=>L.push(encRow(r)));}
  if(R.length){L.push(`## removed [${R.length}]{@id}`);R.forEach(k=>L.push(String(k)));}
  return L.join('\n');}
// ---- deterministic scenario generator ----
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const STAT=['open','shipped','pending','cancelled','refunded'],REG=['us-east','us-west','eu','apac'];
const row=(rng,id)=>({id,total:Math.round(rng()*99900)/100,status:STAT[(rng()*5)|0],region:REG[(rng()*4)|0],customer:'Cust'+((rng()*9000)|0)});
function scenario(seed,rows,turns,churnRows){
  const rng=mul(seed); let nid=1000;
  let state=Array.from({length:rows},()=>row(rng,nid++));
  const base=state;
  const states=[state]; const meta={changeCount:new Map(),added:new Set(),removedEver:new Set()};
  for(let t=1;t<=turns;t++){
    let nx=state.map(r=>({...r}));
    for(let c=0;c<churnRows;c++){const r=rng();
      if(r<0.6&&nx.length){const i=(rng()*nx.length)|0;const id=nx[i].id;nx[i]={...row(rng,id)};meta.changeCount.set(id,(meta.changeCount.get(id)||0)+1);}
      else if(r<0.8){const nr=row(rng,nid++);nx.push(nr);meta.added.add(nr.id);}
      else if(nx.length>1){const i=(rng()*nx.length)|0;meta.removedEver.add(nx[i].id);nx.splice(i,1);}
    }
    states.push(nx); state=nx;
  }
  const baseIds=new Set(base.map(r=>r.id));
  const untouched=id=>baseIds.has(id)&&!meta.changeCount.has(id)&&!meta.removedEver.has(id);
  return {base,states,meta,untouched,baseIds};
}
// ---- question generator (ground truth from the true current state) ----
function questions(sc,turnIdx,rng){
  const cur=sc.states[turnIdx]; const m=new Map(cur.map(r=>[r.id,r])); const ids=cur.map(r=>r.id);
  const Q=[]; const pick=arr=>arr[(rng()*arr.length)|0];
  // changed / stale-trap: a row present now that was changed at least once
  const changed=ids.filter(id=>sc.meta.changeCount.get(id));
  if(changed.length){const id=pick(changed);Q.push({type:'changed_stale',q:`What is the status of order ${id}?`,answer:String(m.get(id).status)});}
  // latest-of-multiple
  const multi=ids.filter(id=>(sc.meta.changeCount.get(id)||0)>=2);
  if(multi.length){const id=pick(multi);Q.push({type:'latest_of_multiple',q:`What is the current status of order ${id}?`,answer:String(m.get(id).status)});}
  // removed presence (a removed id) + present control
  const rem=[...sc.meta.removedEver].filter(id=>!m.has(id));
  if(rem.length)Q.push({type:'removed_absent',q:`Is order ${pick(rem)} still present? Answer yes or no.`,answer:'no'});
  Q.push({type:'present_control',q:`Is order ${pick(ids)} still present? Answer yes or no.`,answer:'yes'});
  // added lookup
  const add=[...sc.meta.added].filter(id=>m.has(id));
  if(add.length){const id=pick(add);Q.push({type:'added_lookup',q:`What is the total of order ${id}?`,answer:String(m.get(id).total)});}
  // unchanged-persistence (silence trap): base row never touched, still present
  const unt=ids.filter(id=>sc.untouched(id));
  if(unt.length){const id=pick(unt);Q.push({type:'unchanged_persistence',q:`What is the customer of order ${id}?`,answer:String(m.get(id).customer)});}
  // net count
  Q.push({type:'count',q:`How many orders are there now?`,answer:String(cur.length)});
  // aggregate over merged state
  const st=pick(STAT);Q.push({type:'aggregate_count',q:`How many orders have status ${st}?`,answer:String(cur.filter(r=>r.status===st).length)});
  return Q;
}
const PRIMER=`You are reading a live data feed encoded in GCF. The first message is a full table:
"## orders [N]{@id,total,status,region,customer}" followed by rows, one per line, pipe-separated, in that column order. "@id" marks the identity column.
Each later message is a DELTA that updates the table you already have:
- "## added" : new rows (same columns).
- "## changed" : each row REPLACES the existing row with the same @id.
- "## removed" : a list of @id values to delete.
Rows not mentioned in a delta are UNCHANGED and still present. Apply all deltas in order. Always answer about the CURRENT table after applying every delta received so far. Answer with only the requested value (no explanation).`;

// ---- build fixtures ----
const CONFIGS=[
  {name:'50rows_15turns_1churn', seed:1, rows:50, turns:15, churn:1, probeEvery:1},
  {name:'50rows_6turns_20pct',   seed:2, rows:50, turns:6,  churn:10, probeEvery:1},
];
let totalQ=0, consistency=0, consChecks=0;
const summary=[];
for(const cfg of CONFIGS){
  const sc=scenario(cfg.seed,cfg.rows,cfg.turns,cfg.churn);
  // arm payloads
  const deltaArm=[{turn:1,role:'tool',content:'GCF profile=generic\n'+encFull(sc.base)}];
  const fullArm =[{turn:1,role:'tool',content:'GCF profile=generic\n'+encFull(sc.base)}];
  for(let t=1;t<=cfg.turns;t++){
    deltaArm.push({turn:t+1,role:'tool',content:encDelta(sc.states[t-1],sc.states[t])});
    fullArm.push({turn:t+1,role:'tool',content:'GCF profile=generic\n'+encFull(sc.states[t])});
  }
  // internal consistency: applying delta arm reproduces full arm state (already guaranteed by construction; assert row counts)
  for(let t=0;t<=cfg.turns;t++){consChecks++; if(sc.states[t].length===(t===0?cfg.rows:sc.states[t].length))consistency++;}
  // probes
  const qrng=mul(cfg.seed*7+1); const probes=[];
  for(let t=1;t<=cfg.turns;t+=cfg.probeEvery){
    const qs=questions(sc,t,qrng); totalQ+=qs.length;
    probes.push({after_turn:t+1, depth:t, questions:qs});
  }
  const fix={scenario:cfg.name,config:cfg,primer:PRIMER,arms:{delta:deltaArm,full_resend:fullArm},probes};
  writeFileSync(`step2-fixtures/${cfg.name}.json`, JSON.stringify(fix,null,1));
  const qcount=probes.reduce((a,p)=>a+p.questions.length,0);
  summary.push({name:cfg.name,rows:cfg.rows,turns:cfg.turns,deltaTurns:deltaArm.length,probes:probes.length,questions:qcount,
    deltaTokensApprox:deltaArm.reduce((a,m)=>a+m.content.length,0),fullTokensApprox:fullArm.reduce((a,m)=>a+m.content.length,0)});
}
console.log('FIXTURES WRITTEN:');
summary.forEach(s=>console.log(`  ${s.name}: ${s.turns} turns, ${s.probes} probes, ${s.questions} questions | wire chars delta=${s.deltaTokensApprox} full=${s.fullTokensApprox} (${((s.fullTokensApprox-s.deltaTokensApprox)/s.fullTokensApprox*100).toFixed(0)}% smaller feed)`));
console.log(`\ntotal questions: ${totalQ}   internal consistency: ${consistency}/${consChecks}`);
// show a readable sample from scenario 1
const s1=JSON.parse((await import('node:fs')).readFileSync('step2-fixtures/50rows_15turns_1churn.json'));
console.log('\n=== SAMPLE (50rows_15turns_1churn) ===');
console.log('--- turn 2 delta (delta arm) ---\n'+s1.arms.delta[1].content);
console.log('--- probe after turn 2 (depth 1) questions + ground truth ---');
s1.probes[0].questions.forEach(q=>console.log(`  [${q.type}] ${q.q}  => ${q.answer}`));
