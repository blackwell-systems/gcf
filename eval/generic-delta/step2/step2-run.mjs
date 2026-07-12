import { readFileSync, readdirSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
mkdirSync('step2-results',{recursive:true});
const RESULTS='step2-results/results.jsonl';
const F=['id','total','status','region','customer'];
// ---- GCF parse ----
function decVal(t){if(t==='-')return null;if(t==='true')return true;if(t==='false')return false;if(t[0]==='"')return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);return t;}
function splitRow(l){const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='\\'){c+=ch+l[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}
const decRow=l=>{const p=splitRow(l);const r={};F.forEach((f,i)=>r[f]=decVal(p[i]));return r;};
const isFull=c=>/## orders \[/.test(c);
const parseFull=c=>c.split('\n').filter(l=>l&&!l.startsWith('GCF ')&&!l.startsWith('## ')).map(decRow);
function applyDeltaC(state,c){const m=new Map(state.map(r=>[r.id,{...r}]));let s=null;for(const ln of c.split('\n')){if(ln.startsWith('GCF '))continue;if(ln.startsWith('## added')){s='a';continue;}if(ln.startsWith('## changed')){s='c';continue;}if(ln.startsWith('## removed')){s='r';continue;}if(s==='r')m.delete(Number(decVal(ln)));else if(s){const r=decRow(ln);m.set(r.id,r);}}return [...m.values()];}
function answerFromState(state,q){const m=new Map(state.map(r=>[r.id,r]));const id=Number((q.q.match(/order (\d+)/)||[])[1]);switch(q.type){case 'changed_stale':case 'latest_of_multiple':return String(m.get(id)?.status);case 'removed_absent':case 'present_control':return m.has(id)?'yes':'no';case 'added_lookup':return String(m.get(id)?.total);case 'unchanged_persistence':return String(m.get(id)?.customer);case 'count':return String(state.length);case 'aggregate_count':{const st=q.q.match(/status (\w+)/)[1];return String(state.filter(r=>r.status===st).length);}}}
const mergeConvo=c=>{const p=c.filter(m=>m.role==='user').map(m=>m.content);let st=parseFull(p[0]);for(let i=1;i<p.length;i++)st=isFull(p[i])?parseFull(p[i]):applyDeltaC(st,p[i]);return st;};
const latestFullConvo=c=>{const p=c.filter(m=>m.role==='user').map(m=>m.content);for(let i=p.length-1;i>=0;i--)if(isFull(p[i]))return parseFull(p[i]);return parseFull(p[0]);};
// ---- prompt build / parse ----
const qBlock=qs=>'Answer each question about the CURRENT data after applying every update received so far. Reply with exactly one line per question, formatted "N: value" — value only, no explanation.\n'+qs.map((q,i)=>`${i+1}. ${q.q}`).join('\n');
const buildMessages=(c,qs)=>[...c.map(m=>({role:m.role,content:m.content})),{role:'user',content:qBlock(qs)}];
const buildText=(c,qs)=>c.map(m=>m.role==='system'?m.content:`\n----- update -----\n${m.content}`).join('\n')+'\n\n'+qBlock(qs);
function parseAnswers(text,n){const a=new Array(n).fill('');for(const ln of String(text).split('\n')){const m=ln.match(/^\s*(\d+)\s*[:.)-]\s*(.+?)\s*$/);if(m){const i=+m[1]-1;if(i>=0&&i<n&&!a[i])a[i]=m[2];}}return a;}
// ---- backends ----
const RETRYABLE_STATUS=new Set([408,409,425,429,500,502,503,504,520,522,524,529]);
function httpResponder(cfg){return async(c,qs)=>{let res;
  try{res=await fetch(cfg.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',signal:AbortSignal.timeout(cfg.timeoutMs??90000),headers:{'Content-Type':'application/json','Authorization':'Bearer '+(process.env[cfg.apiKeyEnv]||''),...(cfg.headers||{})},body:JSON.stringify({model:cfg.model,temperature:cfg.temperature??0.2,messages:buildMessages(c,qs)})});}
  catch(err){throw new ApiError('network/timeout: '+(err.name||err.message),{retryable:true});}   // ECONNRESET, DNS, AbortError...
  if(!res.ok){const body=await res.text().catch(()=>'');const ra=res.headers.get('retry-after');
    throw new ApiError('HTTP '+res.status+' '+body.slice(0,140),{retryable:RETRYABLE_STATUS.has(res.status),retryAfter:ra?parseFloat(ra):null});}
  const j=await res.json().catch(()=>({}));return parseAnswers(j.choices?.[0]?.message?.content??'',qs.length);};}
function codexResponder(cfg){return (c,qs)=>new Promise((resolve,reject)=>{const args=['exec',...(cfg.model?['-c',`model=${cfg.model}`]:[]),'-'];const pr=spawn('codex',args,{stdio:['pipe','pipe','pipe']});let out='',err='',killed=false;
  const to=setTimeout(()=>{killed=true;pr.kill('SIGKILL');},cfg.timeoutMs??180000);
  pr.stdout.on('data',d=>out+=d);pr.stderr.on('data',d=>err+=d);
  pr.on('error',e=>{clearTimeout(to);reject(new ApiError('spawn codex: '+e.message,{retryable:false}));});
  pr.on('close',code=>{clearTimeout(to);if(killed)return reject(new ApiError('codex timeout',{retryable:true}));
    code===0?resolve(parseAnswers(out,qs.length)):reject(new ApiError('codex exit '+code+' '+err.slice(0,140),{retryable:true}));});
  pr.stdin.write(buildText(c,qs));pr.stdin.end();});}
// flaky test stub: throws retryable errors probabilistically, to prove recovery
let _flakyN=0; STUB_FLAKY=async(c,qs)=>{ if(Math.random()<0.4){ _flakyN++; throw new ApiError('simulated 429 overload',{retryable:true,retryAfter:0.05}); } return qs.map(q=>answerFromState(mergeConvo(c),q)); };
var STUB_FLAKY;const STUB={flaky:(...a)=>STUB_FLAKY(...a),perfect:async(c,qs)=>qs.map(q=>answerFromState(mergeConvo(c),q)),latestFull:async(c,qs)=>qs.map(q=>answerFromState(latestFullConvo(c),q)),wrong:async(c,qs)=>qs.map(()=>'ZZZ')};
// ---- scoring/persistence ----
const norm=s=>String(s).trim().toLowerCase();
const correct=(a,t)=>{if(norm(a)===norm(t))return true;const x=Number(a),y=Number(t);return !isNaN(x)&&!isNaN(y)&&x===y;};
const loadDone=()=>{const d=new Set();if(existsSync(RESULTS))for(const ln of readFileSync(RESULTS,'utf8').split('\n')){if(!ln)continue;try{const r=JSON.parse(ln);if(r.done)d.add(r.key);}catch{}}return d;};
const append=recs=>appendFileSync(RESULTS,recs.map(r=>JSON.stringify(r)).join('\n')+'\n');
class ApiError extends Error{constructor(m,{retryable=false,retryAfter=null}={}){super(m);this.retryable=retryable;this.retryAfter=retryAfter;}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function retry(fn,{max=6,base=1500,cap=60000}={}){let e;for(let i=0;i<=max;i++){try{return await fn();}catch(err){e=err;
  if(err&&err.retryable===false){throw err;}                 // fail fast: auth / bad request / model-not-found
  if(i===max)break;
  const wait=err&&err.retryAfter!=null? Math.min(err.retryAfter*1000,cap) : Math.min(base*2**i,cap)*(0.7+Math.random()*0.6);
  process.stderr.write(`\n  retry ${i+1}/${max} in ${(wait/1000).toFixed(1)}s (${String(err&&err.message||err).slice(0,90)})`);
  await sleep(wait);}}throw e;}
// ---- CLI ----
const args=Object.fromEntries(process.argv.slice(2).map((a,i,arr)=>a.startsWith('--')?[a.slice(2),arr[i+1]&&!String(arr[i+1]).startsWith('--')?arr[i+1]:true]:null).filter(Boolean));
const FIX=readdirSync('step2-fixtures').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('step2-fixtures/'+f)));
function report(rows,label){const d=rows.filter(r=>r.arm==='delta'),f=rows.filter(r=>r.arm==='full_resend');const acc=x=>x.length?100*x.filter(r=>r.ok).length/x.length:0;
  console.log(`\n### ${label}: delta ${acc(d).toFixed(1)}% (n=${d.length}) | full-resend ${acc(f).toFixed(1)}% (n=${f.length}) | gap ${(acc(f)-acc(d)).toFixed(1)}pp`);
  const g=(rows,k)=>{const m={};for(const r of rows){(m[r[k]]=m[r[k]]||[0,0])[0]+=r.ok?1:0;m[r[k]][1]++;}return m;};
  if(d.length){console.log('  delta by type: '+Object.entries(g(d,'type')).map(([t,[c,n]])=>`${t}=${(100*c/n).toFixed(0)}%`).join(' '));
    console.log('  delta by depth: '+Object.entries(g(d,'depth')).sort((a,b)=>a[0]-b[0]).map(([dp,[c,n]])=>`t${dp}=${(100*c/n).toFixed(0)}%`).join(' '));}
  return {acc_delta:acc(d),acc_full:acc(f),gap:acc(f)-acc(d)};}

if(args['self-test']){const pa=parseAnswers('1: shipped\n2. no\n3) 5\n4 - Cust7827',5);console.log('parseAnswers unit:',JSON.stringify(pa),pa[0]==='shipped'&&pa[2]==='5'?'✓':'✗');
  for(const[n,r] of Object.entries(STUB)){if(n==='flaky')continue;let all=[];for(const fx of FIX)for(const arm of ['delta','full_resend']){const convo=[{role:'system',content:fx.primer}];let ti=0;for(const p of fx.probes){while(ti<fx.arms[arm].length&&fx.arms[arm][ti].turn<=p.after_turn){convo.push({role:'user',content:fx.arms[arm][ti].content});ti++;}const ans=await r(convo,p.questions);p.questions.forEach((q,i)=>all.push({arm,depth:p.depth,type:q.type,ok:correct(ans[i],q.answer)}));}}report(all,`stub='${n}'`);}process.exit(0);}

if(args.aggregate){const rows=existsSync(RESULTS)?readFileSync(RESULTS,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(r=>r&&!r.done&&r.ok!==undefined):[];
  const models=[...new Set(rows.map(r=>`${r.backend}:${r.model}`))];if(!models.length){console.log('no results yet in '+RESULTS);process.exit(0);}
  const accs=[];for(const m of models){accs.push(report(rows.filter(r=>`${r.backend}:${r.model}`===m),m));}
  const avg=k=>accs.reduce((a,s)=>a+s[k],0)/accs.length;
  console.log(`\n=== AVERAGE OF MODEL AVERAGES (${models.length} models) ===  delta ${avg('acc_delta').toFixed(1)}% | full ${avg('acc_full').toFixed(1)}% | gap ${avg('gap').toFixed(1)}pp`);process.exit(0);}

// ---- live/stub incremental run ----
const b=args.backend; let responder,model=args.model||'';
if(b==='stub'){responder=STUB[model]||STUB.perfect;}
else if(b==='codex'){responder=codexResponder({model});}
else if(['openai','openrouter','omniroute'].includes(b)){const pre={openrouter:{baseUrl:'https://openrouter.ai/api/v1',apiKeyEnv:'OPENROUTER_API_KEY'},omniroute:{baseUrl:args['base-url'],apiKeyEnv:args['api-key-env']||'OMNIROUTE_API_KEY'},openai:{baseUrl:args['base-url']||'https://api.openai.com/v1',apiKeyEnv:args['api-key-env']||'OPENAI_API_KEY'}};responder=httpResponder({...pre[b],model,...(args['base-url']?{baseUrl:args['base-url']}:{})});}
else{console.error('usage: --backend <stub|codex|openrouter|omniroute|openai> --model <m> [--base-url u] [--api-key-env ENV]\n  [--runs N] [--fixture NAME] [--arms delta,full_resend] [--max-depth D] [--retries R] [--fresh]\n  --aggregate  |  --self-test');process.exit(1);}
const runs=+args.runs||1, retries=+args['max-retries']||+args.retries||6, maxDepth=args['max-depth']?+args['max-depth']:Infinity;
const armsList=(args.arms?String(args.arms).split(','):['delta','full_resend']);
const done = args.fresh? new Set() : loadDone();
let ran=0,skipped=0,errored=0;
for(let run=1;run<=runs;run++)for(const fx of FIX){ if(args.fixture&&fx.scenario!==args.fixture)continue;
  for(const arm of armsList){ const convo=[{role:'system',content:fx.primer}];let ti=0;
    for(const p of fx.probes){ while(ti<fx.arms[arm].length&&fx.arms[arm][ti].turn<=p.after_turn){convo.push({role:'user',content:fx.arms[arm][ti].content});ti++;}
      if(p.depth>maxDepth)break;
      const key=`${b}|${model}|${run}|${fx.scenario}|${arm}|${p.depth}`;
      if(done.has(key)){skipped++;continue;}
      try{ const ans=await retry(()=>responder([...convo],p.questions),{max:retries});
        const recs=p.questions.map((q,i)=>({backend:b,model,run,fixture:fx.scenario,arm,depth:p.depth,type:q.type,qi:i,ok:correct(ans[i],q.answer),got:ans[i],want:q.answer}));
        recs.push({done:true,key}); append(recs); ran++;
        process.stderr.write(`\r  ran ${ran} skip ${skipped} err ${errored}   (${key})            `);
      }catch(err){ append([{backend:b,model,run,fixture:fx.scenario,arm,depth:p.depth,error:String(err).slice(0,200)}]); errored++;
        process.stderr.write(`\n  ERROR ${key}: ${String(err).slice(0,120)}\n`); }
    }}}
console.log(`\ndone: ${ran} probes run, ${skipped} skipped (resume), ${errored} errored. results -> ${RESULTS}`);
console.log('aggregate with:  node step2-run.mjs --aggregate');
