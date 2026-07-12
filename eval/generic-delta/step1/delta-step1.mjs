import crypto from 'node:crypto';
import { encode as cl100k } from 'gpt-tokenizer/encoding/cl100k_base';
import { encode as o200k } from 'gpt-tokenizer/encoding/o200k_base';
import pkg from '@anthropic-ai/tokenizer';
const { countTokens: anthropic } = pkg;
const TOKS = { cl100k:s=>cl100k(s).length, anthropic:s=>anthropic(s), o200k:s=>o200k(s).length };

// ---------- scalar encode/decode (minimal GCF-faithful) ----------
function encVal(v){
  if(v===null) return '-';
  if(v===true) return 'true'; if(v===false) return 'false';
  if(typeof v==='number') return String(v);
  const s=String(v);
  if(s===''||/[|\n"\\]/.test(s)||/^(true|false|-|~)$/.test(s)||/^-?\d+(\.\d+)?$/.test(s))
    return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')+'"';
  return s;
}
function decVal(t){
  if(t==='-') return null;
  if(t==='true') return true; if(t==='false') return false;
  if(t[0]==='"') return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');
  if(/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}
function splitRow(line){const o=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];
  if(q){if(ch==='\\'){c+=ch+line[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}
  else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}

// ---------- reference encoders ----------
function encodeRow(row,fields){return fields.map(f=>encVal(row[f])).join('|');}
function decodeRow(line,fields){const p=splitRow(line);const r={};fields.forEach((f,i)=>r[f]=decVal(p[i]));return r;}
function encodeFull(rows,key,fields){
  const hdr=`## rows [${rows.length}]{@${key},${fields.filter(f=>f!==key).join(',')}}`;
  return [hdr,...rows.map(r=>encodeRow(r,[key,...fields.filter(f=>f!==key)]))].join('\n');
}
function packRoot(rows,key){
  const recs=rows.map(r=>Object.keys(r).sort().map(k=>`${k}=${JSON.stringify(r[k])}`).join('\t')).sort();
  return 'sha256:'+crypto.createHash('sha256').update(recs.join('\n')).digest('hex');
}
function encodeDelta(prev,next,key,fields){
  const F=[key,...fields.filter(f=>f!==key)];
  const pm=new Map(prev.map(r=>[String(r[key]),r])), nm=new Map(next.map(r=>[String(r[key]),r]));
  const added=[],changed=[],removed=[];
  for(const [k,r] of nm){ if(!pm.has(k)) added.push(r); else if(JSON.stringify(pm.get(k))!==JSON.stringify(r)) changed.push(r); }
  for(const k of pm.keys()) if(!nm.has(k)) removed.push(pm.get(k)[key]);
  const L=[`GCF profile=generic delta=true base_root=${packRoot(prev,key)} new_root=${packRoot(next,key)}`];
  if(added.length){L.push(`## added [${added.length}]{@${key},${F.slice(1).join(',')}}`);added.forEach(r=>L.push(encodeRow(r,F)));}
  if(changed.length){L.push(`## changed [${changed.length}]{@${key},${F.slice(1).join(',')}}`);changed.forEach(r=>L.push(encodeRow(r,F)));}
  if(removed.length){L.push(`## removed [${removed.length}]{@${key}}`);removed.forEach(k=>L.push(encVal(k)));}
  return L.join('\n');
}
function applyDelta(prev,wire,key,fields){
  const F=[key,...fields.filter(f=>f!==key)];
  const m=new Map(prev.map(r=>[String(r[key]),{...r}]));
  const lines=wire.split('\n'); let sec=null;
  for(let i=1;i<lines.length;i++){const ln=lines[i];
    if(ln.startsWith('## added')){sec='a';continue;} if(ln.startsWith('## changed')){sec='c';continue;} if(ln.startsWith('## removed')){sec='r';continue;}
    if(sec==='r'){ m.delete(String(decVal(ln))); }
    else { const r=decodeRow(ln,F); m.set(String(r[key]),r); }
  }
  return [...m.values()];
}

// ---------- fuzz: losslessness of apply(prev,delta)==next ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const STAT=['open','shipped','pending','cancelled','refunded'], REG=['us-east','us-west','eu','apac'];
function genRow(rng,id){const specials=['a|b','line\n2','true','123','','q"x'];return {
  id, total:Math.round(rng()*99900)/100, status:STAT[(rng()*5)|0], region:REG[(rng()*4)|0],
  customer: rng()<0.15? specials[(rng()*specials.length)|0] : 'Cust '+((rng()*9000)|0),
  flag: rng()<0.5, note: rng()<0.2? null : 'n'+((rng()*100)|0) };}
const FIELDS=['id','total','status','region','customer','flag','note'];
function sameSet(a,b,key){const am=new Map(a.map(r=>[String(r[key]),r])),bm=new Map(b.map(r=>[String(r[key]),r]));
  if(am.size!==bm.size)return false; for(const[k,r] of am){const o=bm.get(k); if(!o||JSON.stringify(Object.keys(r).sort().map(x=>[x,r[x]]))!==JSON.stringify(Object.keys(o).sort().map(x=>[x,o[x]])))return false;}return true;}

let fails=0, roots=0, N=200000, turns=4;
for(let seed=0;seed<N;seed++){
  const rng=mulberry32(seed); let nextId=1;
  let state=Array.from({length:5+((rng()*20)|0)},()=>genRow(rng,nextId++));
  for(let t=0;t<turns;t++){
    let next=state.map(r=>({...r}));
    const ops=1+((rng()*4)|0);
    for(let o=0;o<ops;o++){const r=rng();
      if(r<0.4&&next.length) next[(rng()*next.length)|0]=genRow(rng,next[(rng()*next.length)|0].id); // change
      else if(r<0.7) next.push(genRow(rng,nextId++)); // add
      else if(next.length>1) next.splice((rng()*next.length)|0,1); // remove
    }
    const delta=encodeDelta(state,next,'id',FIELDS);
    const applied=applyDelta(state,delta,'id',FIELDS);
    if(!sameSet(applied,next,'id')) fails++;
    if(packRoot(applied,'id')!==packRoot(next,'id')) roots++;
    state=next;
  }
}
console.log(`FUZZ (losslessness): ${N} sessions x ${turns} turns = ${N*turns} delta round-trips`);
console.log(`  apply(prev,delta)===next : ${N*turns-fails}/${N*turns} lossless   (${fails} failures)`);
console.log(`  packRoot(applied)===new_root : ${N*turns-roots}/${N*turns} match   (${roots} mismatches)\n`);

// ---------- multi-turn token benchmark ----------
function baseOrders(n){const rng=mulberry32(42);return Array.from({length:n},(_,i)=>genRow(rng,10000+i));}
function churn(state,frac){const rng=mulberry32(state.length+Math.round(frac*1000)+state[0].total);
  let next=state.map(r=>({...r})); const k=Math.max(1,Math.round(state.length*frac));
  for(let i=0;i<k;i++){const r=rng();
    if(r<0.6) next[(rng()*next.length)|0]={...next[(rng()*next.length)|0],status:STAT[(rng()*5)|0],total:Math.round(rng()*99900)/100};
    else if(r<0.8) next.push(genRow(rng,20000+i+(rng()*9999|0)));
    else next.splice((rng()*next.length)|0,1);}
  return next;}
console.log('MULTI-TURN TOKEN BENCHMARK  (500-row base, 6-turn session, cl100k)');
console.log('churn/turn'.padEnd(11),'JSON full-resend','GCF full-resend','GCF+delta','GCF+delta vs JSON');
for(const frac of [0.01,0.05,0.20]){
  let state=baseOrders(500);
  let jSum=0,gfSum=0,gdSum=0;
  for(let t=0;t<6;t++){
    const jFull=TOKS.cl100k(JSON.stringify(state));
    const gFull=TOKS.cl100k(encodeFull(state,'id',FIELDS));
    jSum+=jFull; gfSum+=gFull;
    gdSum += (t===0)? gFull : TOKS.cl100k(encodeDelta(prevState,state,'id',FIELDS));
    var prevState=state;
    state=churn(state,frac);
  }
  const pct=(a,b)=>((a-b)/a*100).toFixed(1)+'%';
  console.log((`${(frac*100)}%`).padEnd(11),String(jSum).padStart(16),String(gfSum).padStart(15),String(gdSum).padStart(9),pct(jSum,gdSum).padStart(18));
}
console.log('\n(cumulative tokens over the 6-call session; churn = fraction of the 500 rows that change per turn)');

// ---- diagnostic: find first true mismatch (strict, undefined-aware) ----
function strictEqRow(a,b){const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();
  if(ka.length!==kb.length||!ka.every((k,i)=>k===kb[i]))return false;
  return ka.every(k=>Object.is(a[k],b[k])||JSON.stringify(a[k])===JSON.stringify(b[k]));}
for(let seed=0;seed<200000;seed++){
  const rng=mulberry32(seed);let nid=1;let st=Array.from({length:5+((rng()*20)|0)},()=>genRow(rng,nid++));
  for(let t=0;t<4;t++){let nx=st.map(r=>({...r}));const ops=1+((rng()*4)|0);
    for(let o=0;o<ops;o++){const r=rng();
      if(r<0.4&&nx.length)nx[(rng()*nx.length)|0]=genRow(rng,nx[(rng()*nx.length)|0].id);
      else if(r<0.7)nx.push(genRow(rng,nid++)); else if(nx.length>1)nx.splice((rng()*nx.length)|0,1);}
    const ap=applyDelta(st,encodeDelta(st,nx,'id',FIELDS),'id',FIELDS);
    const am=new Map(ap.map(r=>[String(r.id),r])),nm=new Map(nx.map(r=>[String(r.id),r]));
    let bad=false;
    for(const[k,r] of nm){const o=am.get(k);if(!o||!strictEqRow(r,o)){bad=true;
      const diff=Object.keys(r).filter(f=>JSON.stringify(r[f])!==JSON.stringify(o?.[f]));
      console.log(`MISMATCH seed=${seed} id=${k} diff-fields=${diff}`);
      diff.forEach(f=>console.log(`   ${f}: next=${JSON.stringify(r[f])} (${typeof r[f]})  applied=${JSON.stringify(o?.[f])} (${typeof o?.[f]})`));
      console.log('   wire row was:', encodeRow(r,['id',...FIELDS.filter(x=>x!=='id')]));
      break;}}
    if(bad){process.exit(0);} st=nx;}
}
console.log('no strict mismatch found');
