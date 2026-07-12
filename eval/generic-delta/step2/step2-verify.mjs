import { readFileSync, readdirSync } from 'node:fs';
import crypto from 'node:crypto';
const F=['id','total','status','region','customer'];
function decVal(t){if(t==='-')return null;if(t==='true')return true;if(t==='false')return false;if(t[0]==='"')return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);return t;}
function splitRow(line){const o=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='\\'){c+=ch+line[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}
const decRow=l=>{const p=splitRow(l);const r={};F.forEach((f,i)=>r[f]=decVal(p[i]));return r;};
function parseFull(content){const lines=content.split('\n').filter(l=>l&&!l.startsWith('GCF ')&&!l.startsWith('## '));return lines.map(decRow);}
function applyDeltaContent(state,content){const m=new Map(state.map(r=>[r.id,{...r}]));const ls=content.split('\n');let s=null;
  for(const ln of ls){if(ln.startsWith('GCF '))continue;if(ln.startsWith('## added')){s='a';continue;}if(ln.startsWith('## changed')){s='c';continue;}if(ln.startsWith('## removed')){s='r';continue;}
    if(s==='r')m.delete(Number(decVal(ln)));else if(s){const r=decRow(ln);m.set(r.id,r);}}return [...m.values()];}
const H=rows=>crypto.createHash('sha256').update(rows.map(r=>F.map(f=>`${f}=${JSON.stringify(r[f])}`).join('\t')).sort().join('\n')).digest('hex');

let armMismatch=0,answerMismatch=0,answersChecked=0,statesChecked=0;
for(const fn of readdirSync('step2-fixtures').filter(f=>f.endsWith('.json'))){
  const fix=JSON.parse(readFileSync('step2-fixtures/'+fn));
  // reconstruct delta-arm state at each turn, compare to full-resend arm
  let state=parseFull(fix.arms.delta[0].content);
  const fullStates=[parseFull(fix.arms.full_resend[0].content)];
  for(let i=1;i<fix.arms.delta.length;i++){state=applyDeltaContent(state,fix.arms.delta[i].content);fullStates.push(parseFull(fix.arms.full_resend[i].content));
    statesChecked++; if(H(state)!==H(fullStates[i]))armMismatch++;}
  // re-derive each stored answer from the reconstructed state at that depth
  // rebuild states-by-turn via delta chain
  let st=parseFull(fix.arms.delta[0].content); const byTurn=[st];
  for(let i=1;i<fix.arms.delta.length;i++){st=applyDeltaContent(st,fix.arms.delta[i].content);byTurn.push(st);}
  for(const p of fix.probes){const cur=byTurn[p.depth];const m=new Map(cur.map(r=>[r.id,r]));
    for(const q of p.questions){answersChecked++;let truth;
      const mId=q.q.match(/order (\d+)/);const id=mId?Number(mId[1]):null;
      if(q.type==='changed_stale'||q.type==='latest_of_multiple')truth=String(m.get(id)?.status);
      else if(q.type==='removed_absent')truth=m.has(id)?'yes':'no';
      else if(q.type==='present_control')truth=m.has(id)?'yes':'no';
      else if(q.type==='added_lookup')truth=String(m.get(id)?.total);
      else if(q.type==='unchanged_persistence')truth=String(m.get(id)?.customer);
      else if(q.type==='count')truth=String(cur.length);
      else if(q.type==='aggregate_count'){const st=q.q.match(/status (\w+)/)[1];truth=String(cur.filter(r=>r.status===st).length);}
      if(String(truth)!==String(q.answer))answerMismatch++;
    }}
}
console.log('FIXTURE VERIFICATION');
console.log(`  delta-arm reconstructs full-resend state: ${statesChecked-armMismatch}/${statesChecked} turns match (content-hash)`);
console.log(`  stored answers re-derivable from reconstructed state: ${answersChecked-answerMismatch}/${answersChecked}`);
console.log(armMismatch||answerMismatch?'  *** INCONSISTENCY FOUND ***':'  ✓ fixtures internally consistent — ground truth is correct');
