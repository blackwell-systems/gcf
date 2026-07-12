import crypto from 'node:crypto';
function encVal(v){if(v===null)return '-';if(v===true)return 'true';if(v===false)return 'false';if(typeof v==='number')return String(v);const s=String(v);if(s===''||/[|\n"\\]/.test(s)||/^(true|false|-|~)$/.test(s)||/^-?\d+(\.\d+)?$/.test(s))return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')+'"';return s;}
function decVal(t){if(t==='-')return null;if(t==='true')return true;if(t==='false')return false;if(t[0]==='"')return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);return t;}
function splitRow(line){const o=[];let c='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='\\'){c+=ch+line[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}
const F=['id','total','status','region','customer','flag','note'];
const encRow=r=>F.map(f=>encVal(r[f])).join('|');
const decRow=l=>{const p=splitRow(l);const r={};F.forEach((f,i)=>r[f]=decVal(p[i]));return r;};
function encodeDelta(prev,next){const pm=new Map(prev.map(r=>[String(r.id),r])),nm=new Map(next.map(r=>[String(r.id),r]));const A=[],C=[],R=[];for(const[k,r] of nm){if(!pm.has(k))A.push(r);else if(JSON.stringify(pm.get(k))!==JSON.stringify(r))C.push(r);}for(const k of pm.keys())if(!nm.has(k))R.push(pm.get(k).id);const L=['H'];if(A.length){L.push('## added');A.forEach(r=>L.push(encRow(r)));}if(C.length){L.push('## changed');C.forEach(r=>L.push(encRow(r)));}if(R.length){L.push('## removed');R.forEach(k=>L.push(encVal(k)));}return L.join('\n');}
function applyDelta(prev,wire){const m=new Map(prev.map(r=>[String(r.id),{...r}]));const ls=wire.split('\n');let s=null;for(let i=1;i<ls.length;i++){const ln=ls[i];if(ln.startsWith('## added')){s='a';continue;}if(ln.startsWith('## changed')){s='c';continue;}if(ln.startsWith('## removed')){s='r';continue;}if(s==='r')m.delete(String(decVal(ln)));else{const r=decRow(ln);m.set(String(r.id),r);}}return [...m.values()];}
function contentHash(rows){return crypto.createHash('sha256').update(rows.map(r=>F.map(f=>`${f}=${JSON.stringify(r[f])}`).join('\t')).sort().join('\n')).digest('hex');}
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const STAT=['open','shipped','pending','cancelled','refunded'],REG=['us-east','us-west','eu','apac'],SP=['a|b','line\n2','true','123','','q"x'];
const genRow=(rng,id)=>({id,total:Math.round(rng()*99900)/100,status:STAT[(rng()*5)|0],region:REG[(rng()*4)|0],customer:rng()<0.15?SP[(rng()*SP.length)|0]:'Cust '+((rng()*9000)|0),flag:rng()<0.5,note:rng()<0.2?null:'n'+((rng()*100)|0)});
let fails=0,dupCaught=0,N=200000,turns=4;
for(let seed=0;seed<N;seed++){const rng=mul(seed);let nid=1;let st=Array.from({length:5+((rng()*20)|0)},()=>genRow(rng,nid++));
 for(let t=0;t<turns;t++){let nx=st.map(r=>({...r}));const ops=1+((rng()*4)|0);
   for(let o=0;o<ops;o++){const r=rng();
     if(r<0.4&&nx.length){const i=(rng()*nx.length)|0;nx[i]=genRow(rng,nx[i].id);}   // FIXED: single index
     else if(r<0.7)nx.push(genRow(rng,nid++));
     else if(nx.length>1)nx.splice((rng()*nx.length)|0,1);}
   // invariant: keys unique (contract). If harness ever breaks it, skip (encoder would reject)
   if(new Set(nx.map(r=>r.id)).size!==nx.length){dupCaught++;st=nx;continue;}
   const applied=applyDelta(st,encodeDelta(st,nx));
   if(contentHash(applied)!==contentHash(nx)) fails++;   // CONTENT comparator (source of truth)
   st=nx;}}
console.log(`FUZZ v2 (content-hash comparator, unique-key contract): ${N} sessions x ${turns} turns`);
console.log(`  apply(prev,delta) content-identical to next : ${N*turns-fails-dupCaught}/${N*turns-dupCaught} valid round-trips  (${fails} failures)`);
console.log(`  duplicate-key inputs skipped (invalid contract): ${dupCaught}`);
