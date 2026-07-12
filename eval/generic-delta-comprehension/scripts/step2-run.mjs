// step2-run.mjs — multi-turn generic-delta comprehension eval runner.
//
// Replays each fixture as a conversation (a base table, then per-turn deltas) and,
// at each probe, asks a model to answer questions about the CURRENT table. Scores
// the model's answers against ground truth and reports accuracy per arm / question
// type / turn depth. Node builtins only, no dependencies.
//
// Two arms per fixture: `delta` (GCF delta=true, only changed rows each turn) and
// `full_resend` (the full table re-encoded every turn — the ~100% control).
//
// Usage:
//   node step2-run.mjs --self-test [--fixtures DIR]
//       Run built-in stubs (perfect / latestFull / wrong) — no API. `perfect`
//       should score 100% both arms, `wrong` 0%, `latestFull` ~100% on full_resend
//       but low on delta (proving the delta arm is a real comprehension test).
//
//   node step2-run.mjs --backend <b> [options]
//       Live run against a model backend.
//
// Backends (--backend):
//   codex       Codex CLI (local auth). --model passes -c model=...
//   claude      Claude Code CLI print mode (local auth / Max plan). --model, e.g. sonnet.
//   openrouter  OpenRouter HTTP. Needs OPENROUTER_API_KEY. --model <slug>.
//   openai      OpenAI-compatible HTTP. --api-key-env / --base-url overridable.
//   omniroute   OmniRoute gateway. --base-url required, --api-key-env.
//
// Options:
//   --fixtures DIR   fixture directory (default: step2-fixtures)
//   --outdir DIR     result directory (default: step2-results)
//   --model SLUG     model id (backend-specific)
//   --arms LIST      comma list, e.g. `delta` to skip the slow full_resend arm
//                    (default: delta,full_resend)
//   --base-url URL / --api-key-env ENV   HTTP backend overrides
//
// Env:
//   STEP2_LOGDIR DIR   if set, writes a per-probe transcript (prompt, questions,
//                      parsed answers, raw model output, and for HTTP the exact
//                      resolved model) to DIR — so any miss can be audited later.
//   GCF_ITERATIONS     (unused here; belongs to the SDK fuzz tests)
//
// Output: writes `<outdir>/<model|backend>.json` = { backend, requestedModel,
//   resolvedModels, summary, rows[] }, where each row is
//   { arm, depth, type, ok, got, want } for every probe. Also prints a summary
//   with delta vs full-resend accuracy, per-type and per-depth breakdowns.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const F=['id','total','status','region','customer'];
// ---- GCF parse ----
function decVal(t){if(t==='-')return null;if(t==='true')return true;if(t==='false')return false;if(t[0]==='"')return t.slice(1,-1).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);return t;}
function splitRow(l){const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='\\'){c+=ch+l[++i];}else if(ch==='"'){c+=ch;q=false;}else c+=ch;}else{if(ch==='"'){c+=ch;q=true;}else if(ch==='|'){o.push(c);c='';}else c+=ch;}}o.push(c);return o;}
const decRow=l=>{const p=splitRow(l);const r={};F.forEach((f,i)=>r[f]=decVal(p[i]));return r;};
const isFull=c=>/## orders \[/.test(c);
const parseFull=c=>c.split('\n').filter(l=>l&&!l.startsWith('GCF ')&&!l.startsWith('##')).map(decRow);
function applyDeltaC(state,c){const m=new Map(state.map(r=>[r.id,{...r}]));let s=null;for(const ln of c.split('\n')){if(!ln||ln.startsWith('GCF ')||ln.startsWith('##!'))continue;if(ln.startsWith('## added')){s='a';continue;}if(ln.startsWith('## changed')){s='c';continue;}if(ln.startsWith('## removed')){s='r';continue;}if(s==='r')m.delete(Number(decVal(ln)));else if(s){const r=decRow(ln);m.set(r.id,r);}}return [...m.values()];}
function answerFromState(state,q){const m=new Map(state.map(r=>[r.id,r]));const id=Number((q.q.match(/order (\d+)/)||[])[1]);
  switch(q.type){case 'changed_stale':case 'latest_of_multiple':return String(m.get(id)?.status);case 'removed_absent':case 'present_control':return m.has(id)?'yes':'no';case 'added_lookup':return String(m.get(id)?.total);case 'unchanged_persistence':return String(m.get(id)?.customer);case 'count':return String(state.length);case 'aggregate_count':{const st=q.q.match(/status (\w+)/)[1];return String(state.filter(r=>r.status===st).length);}}}
function mergeConvo(convo){const p=convo.filter(m=>m.role==='user').map(m=>m.content);let st=parseFull(p[0]);for(let i=1;i<p.length;i++)st=isFull(p[i])?parseFull(p[i]):applyDeltaC(st,p[i]);return st;}
function latestFullConvo(convo){const p=convo.filter(m=>m.role==='user').map(m=>m.content);for(let i=p.length-1;i>=0;i--)if(isFull(p[i]))return parseFull(p[i]);return parseFull(p[0]);}
// ---- prompt build / answer parse (shared by HTTP + CLI) ----
function questionBlock(qs){return 'Answer each question about the CURRENT data after applying every update received so far. '+
  'Reply with exactly one line per question, formatted "N: value" — value only, no explanation.\n'+qs.map((q,i)=>`${i+1}. ${q.q}`).join('\n');}
function buildMessages(convo,qs){return [...convo.map(m=>({role:m.role,content:m.content})),{role:'user',content:questionBlock(qs)}];}
function buildText(convo,qs){return convo.map(m=>m.role==='system'?m.content:`\n----- update -----\n${m.content}`).join('\n')+'\n\n'+questionBlock(qs);}
function parseAnswers(text,n){const a=new Array(n).fill('');for(const ln of String(text).split('\n')){const m=ln.match(/^\s*(\d+)\s*[:.)-]\s*(.+?)\s*$/);if(m){const i=+m[1]-1;if(i>=0&&i<n&&!a[i])a[i]=m[2];}}return a;}
// ---- backends -> responder(convo,questions,meta)=>Promise<answers[]> ----
// RESOLVED records the exact model string each response reports serving, so we
// capture the concrete snapshot behind a slug (e.g. what "google/gemini-2.5-flash"
// actually routed to), not just what we asked for.
const RESOLVED={counts:{},add(m){if(m)this.counts[m]=(this.counts[m]||0)+1;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function httpResponder(cfg){return async (convo,qs,meta)=>{
  const prompt=buildText(convo,qs);
  // Retry transient failures (network flakes, 429, 5xx). Exponential backoff with a long cap
  // so a SUSTAINED rate limit (e.g. under heavy concurrent load) is ridden out, not aborted.
  const MAX=8; // ~1+2+4+8+16+32+45s of waiting across retries
  const backoff=a=>Math.min(45000,1000*2**a)*(0.8+Math.random()*0.4); // exp + jitter
  let j,lastErr;
  for(let attempt=0;attempt<MAX;attempt++){
    try{
      const res=await fetch(cfg.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+(process.env[cfg.apiKeyEnv]||''),...(cfg.headers||{})},
        body:JSON.stringify({model:cfg.model,temperature:cfg.temperature??0.2,messages:buildMessages(convo,qs)})});
      const body=await res.json();
      if(!res.ok){
        if((res.status===429||res.status>=500)&&attempt<MAX-1){lastErr=new Error('HTTP '+res.status);await sleep(backoff(attempt));continue;}
        throw new Error('HTTP '+res.status+' '+JSON.stringify(body).slice(0,200));
      }
      j=body;break;
    }catch(e){lastErr=e;if(attempt<MAX-1){await sleep(backoff(attempt));continue;}throw e;}
  }
  RESOLVED.add(j.model);
  const content=j.choices?.[0]?.message?.content??'';
  const ans=parseAnswers(content,qs.length);
  if(LOGDIR&&meta){
    const name=`${sani(meta.fixture)}__${sani(meta.arm)}__t${meta.depth}.txt`;
    const body=`# fixture=${meta.fixture} arm=${meta.arm} depth=${meta.depth} requested=${cfg.model} resolved=${j.model||'?'}\n`+
      `# questions:\n${qs.map((q,i)=>`  ${i+1}. [${q.type}] ${q.q} => want=${q.answer}`).join('\n')}\n`+
      `# parsed answers: ${JSON.stringify(ans)}\n\n===== PROMPT =====\n${prompt}\n\n===== MODEL CONTENT =====\n${content}\n`;
    try{writeFileSync(`${LOGDIR}/${name}`,body);}catch(e){/* best-effort */}}
  return ans;};}
// Optional raw-transcript logging: set STEP2_LOGDIR to capture each codex call's
// prompt + raw stdout/stderr + parsed answers, so a miss can be audited later.
const LOGDIR=process.env.STEP2_LOGDIR||'';
const sani=s=>String(s).replace(/[^A-Za-z0-9._-]+/g,'_');
function codexResponder(cfg){return (convo,qs,meta)=>new Promise((resolve,reject)=>{
  const args=['exec',...(cfg.model?['-c',`model=${cfg.model}`]:[]),...(cfg.args||[]),'-'];
  const pr=spawn(cfg.cmd||'codex',args,{stdio:['pipe','pipe','pipe']});let out='',err='';
  const prompt=buildText(convo,qs);
  pr.stdout.on('data',d=>out+=d);pr.stderr.on('data',d=>err+=d);
  pr.on('close',code=>{
    if(LOGDIR&&meta){const ans=parseAnswers(out,qs.length);
      const name=`${sani(meta.fixture)}__${sani(meta.arm)}__t${meta.depth}.txt`;
      const body=`# fixture=${meta.fixture} arm=${meta.arm} depth=${meta.depth} exit=${code}\n`+
        `# questions:\n${qs.map((q,i)=>`  ${i+1}. [${q.type}] ${q.q} => want=${q.answer}`).join('\n')}\n`+
        `# parsed answers: ${JSON.stringify(ans)}\n\n===== PROMPT =====\n${prompt}\n\n===== CODEX STDOUT =====\n${out}\n\n===== CODEX STDERR =====\n${err}\n`;
      try{writeFileSync(`${LOGDIR}/${name}`,body);}catch(e){/* logging is best-effort */}}
    code===0?resolve(parseAnswers(out,qs.length)):reject(new Error('codex exit '+code+' '+err.slice(0,200)));});
  pr.stdin.write(prompt);pr.stdin.end();});}
// claude CLI backend (Claude Code print mode, --output-format json). Uses local
// Claude auth (Max plan quota, not per-call billing). Answer text is the `result`
// event's `.result`; exact model captured from modelUsage / assistant.message.model.
function claudeResponder(cfg){return (convo,qs,meta)=>new Promise((resolve,reject)=>{
  const args=['-p','--model',cfg.model||'sonnet','--output-format','json',
    '--disallowedTools','Bash Edit Write Read WebFetch WebSearch Task Glob Grep',...(cfg.args||[])];
  const pr=spawn(cfg.cmd||'claude',args,{stdio:['pipe','pipe','pipe']});let out='',err='';
  const prompt=buildText(convo,qs);
  pr.stdout.on('data',d=>out+=d);pr.stderr.on('data',d=>err+=d);
  pr.on('close',code=>{
    let content='',model='?';
    try{const arr=JSON.parse(out);
      const r=Array.isArray(arr)?arr.find(e=>e.type==='result'):arr;
      content=(r&&r.result)||'';
      const mu=r&&(r.modelUsage||r.usage);model=(mu&&Object.keys(mu)[0])||'?';
      if(model==='?'){const a=Array.isArray(arr)&&arr.find(e=>e.type==='assistant');model=(a&&a.message&&a.message.model)||'?';}
    }catch(e){content=out;}
    RESOLVED.add(model);
    const ans=parseAnswers(content,qs.length);
    if(LOGDIR&&meta){
      const name=`${sani(meta.fixture)}__${sani(meta.arm)}__t${meta.depth}.txt`;
      const body=`# fixture=${meta.fixture} arm=${meta.arm} depth=${meta.depth} exit=${code} resolved=${model}\n`+
        `# questions:\n${qs.map((q,i)=>`  ${i+1}. [${q.type}] ${q.q} => want=${q.answer}`).join('\n')}\n`+
        `# parsed answers: ${JSON.stringify(ans)}\n\n===== PROMPT =====\n${prompt}\n\n===== MODEL RESULT =====\n${content}\n\n===== STDERR =====\n${err.slice(0,2000)}\n`;
      try{writeFileSync(`${LOGDIR}/${name}`,body);}catch(e){/* best-effort */}}
    code===0?resolve(ans):reject(new Error('claude exit '+code+' '+err.slice(0,200)));});
  pr.stdin.write(prompt);pr.stdin.end();});}
const STUBS={perfect:async(c,qs)=>{const st=mergeConvo(c);return qs.map(q=>answerFromState(st,q));},
  latestFull:async(c,qs)=>{const st=latestFullConvo(c);return qs.map(q=>answerFromState(st,q));},
  wrong:async(c,qs)=>qs.map(()=>'ZZZ')};
// ---- runner + scorer ----
const norm=s=>String(s).trim().toLowerCase();
const correct=(a,t)=>{if(norm(a)===norm(t))return true;const x=Number(a),y=Number(t);return !isNaN(x)&&!isNaN(y)&&x===y;};
async function runArm(fix,arm,responder,onProbe,sink){const convo=[{role:'system',content:fix.primer}];const turns=fix.arms[arm];let ti=0;const res=[];
  for(const p of fix.probes){while(ti<turns.length&&turns[ti].turn<=p.after_turn){convo.push({role:'user',content:turns[ti].content});ti++;}
    const ans=await responder(convo,p.questions,{fixture:fix.scenario,arm,depth:p.depth});p.questions.forEach((q,i)=>{const row={arm,depth:p.depth,type:q.type,ok:correct(ans[i],q.answer),got:ans[i],want:q.answer};res.push(row);sink&&sink.push(row);});onProbe&&onProbe();}
  return res;}
function report(rows,label){const d=rows.filter(r=>r.arm==='delta'),f=rows.filter(r=>r.arm==='full_resend');const acc=x=>x.length?(100*x.filter(r=>r.ok).length/x.length):0;
  console.log(`\n### ${label}: delta ${acc(d).toFixed(1)}% | full-resend ${acc(f).toFixed(1)}% | gap ${(acc(f)-acc(d)).toFixed(1)}pp`);
  const byT={};for(const r of d){(byT[r.type]=byT[r.type]||[0,0])[0]+=r.ok?1:0;byT[r.type][1]++;}
  console.log('  delta by type: '+Object.entries(byT).map(([t,[c,n]])=>`${t}=${(100*c/n).toFixed(0)}%`).join(' '));
  const byD={};for(const r of d){(byD[r.depth]=byD[r.depth]||[0,0])[0]+=r.ok?1:0;byD[r.depth][1]++;}
  console.log('  delta by depth: '+Object.entries(byD).map(([d,[c,n]])=>`t${d}=${(100*c/n).toFixed(0)}%`).join(' '));
  // Re-anchor mitigation: show each delta_reN arm overall and in the 41-50 drift zone, vs delta and full.
  const reArms=[...new Set(rows.map(r=>r.arm).filter(a=>a.startsWith('delta_re')))].sort();
  if(reArms.length){
    const deep=x=>x.filter(r=>r.depth>=41);
    const line=(name,rws)=>`${name} ${acc(rws).toFixed(1)}%/deep ${acc(deep(rws)).toFixed(1)}%`;
    console.log('  mitigation (overall/deep41-50): '+[line('delta',d),...reArms.map(a=>line(a,rows.filter(r=>r.arm===a))),line('full',f)].join(' | '));
    console.log('  deep gap vs full: '+[['delta',d],...reArms.map(a=>[a,rows.filter(r=>r.arm===a)])].map(([nm,rws])=>`${nm} ${(acc(deep(rws))-acc(deep(f))).toFixed(1)}pp`).join(' | '));
  }
  const perArm={};for(const a of [...new Set(rows.map(r=>r.arm))])perArm[a]=acc(rows.filter(r=>r.arm===a));
  return {acc_delta:acc(d),acc_full:acc(f),gap:acc(f)-acc(d),perArm};}
// ---- CLI ----
const args=Object.fromEntries(process.argv.slice(2).map((a,i,arr)=>a.startsWith('--')?[a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:true]:null).filter(Boolean));
const FIXDIR=(typeof args.fixtures==='string'&&args.fixtures)||'step2-fixtures';
const OUTDIR=(typeof args.outdir==='string'&&args.outdir)||'step2-results';
if(LOGDIR)mkdirSync(LOGDIR,{recursive:true});
const FIX=readdirSync(FIXDIR).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(FIXDIR+'/'+f)));
// --- re-anchor synthesis (mitigation experiment) ---
// `--reanchor 15` (or a csv `10,15,20`) builds extra delta arms `delta_reN` that proactively send
// a FULL payload every N turns (the protocol's "full" outcome on a schedule) instead of a delta,
// to test whether periodic re-anchoring erases the deep-turn drift. Ground truth is arm-independent
// (the true current state at each depth), so a re-anchored arm scores against the SAME answers; it
// only restates current state in-context every N turns. Anchor turns take the full_resend content
// for that turn; all other turns keep the normal delta. Turn 1 is already the full base.
const REANCHOR=(typeof args.reanchor==='string'&&args.reanchor?args.reanchor.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>n>=2):[]);
for(const fx of FIX){
  if(!fx.arms||!fx.arms.delta||!fx.arms.full_resend)continue;
  const fByTurn=new Map(fx.arms.full_resend.map(t=>[t.turn,t.content]));
  for(const N of REANCHOR){
    fx.arms['delta_re'+N]=fx.arms.delta.map(t=>{
      const anchor=t.turn>1&&t.turn%N===0&&fByTurn.has(t.turn);
      return {turn:t.turn,role:t.role,content:anchor?fByTurn.get(t.turn):t.content,_anchor:!!anchor};
    });
  }
}
if(args['self-test']){
  // unit: parse
  const pa=parseAnswers('1: shipped\n2. no\n3) 5\ngarbage\n4 - Cust7827',5);
  console.log('parseAnswers unit:',JSON.stringify(pa),pa[0]==='shipped'&&pa[1]==='no'&&pa[2]==='5'&&pa[3]==='Cust7827'?'✓':'✗');
  // unit: buildMessages shape
  const bm=buildMessages([{role:'system',content:'S'},{role:'user',content:'P'}],[{q:'Q1'},{q:'Q2'}]);
  console.log('buildMessages unit:',bm.length===3&&bm[0].role==='system'&&bm[2].content.includes('1. Q1')?'✓':'✗');
  for(const [name,resp] of Object.entries(STUBS)){let all=[];for(const fx of FIX)for(const arm of ['delta','full_resend'])all=all.concat(await runArm(fx,arm,resp));report(all,`stub='${name}'`);}
  process.exit(0);
}
// live backend
let responder,label;
const b=args.backend;
if(b==='codex'){responder=codexResponder({cmd:'codex',model:args.model,args:['--skip-git-repo-check','--sandbox','read-only']});label=`codex model=${args.model||'default'}`;}
else if(b==='claude'){responder=claudeResponder({cmd:'claude',model:args.model||'sonnet'});label=`claude model=${args.model||'sonnet'}`;}
else if(b==='openai'||b==='openrouter'||b==='omniroute'){
  const presets={openrouter:{baseUrl:'https://openrouter.ai/api/v1',apiKeyEnv:'OPENROUTER_API_KEY'},omniroute:{baseUrl:args['base-url'],apiKeyEnv:args['api-key-env']||'OMNIROUTE_API_KEY'},openai:{baseUrl:args['base-url']||'https://api.openai.com/v1',apiKeyEnv:args['api-key-env']||'OPENAI_API_KEY'}};
  const cfg={...presets[b],model:args.model,...(args['base-url']?{baseUrl:args['base-url']}:{})};
  responder=httpResponder(cfg);label=`${b} ${cfg.baseUrl} model=${cfg.model}`;
} else {console.error('usage: --backend <codex|openrouter|omniroute|openai> --model <m> [--base-url <url>] [--api-key-env <ENV>]  OR  --self-test');process.exit(1);}
// --arms limits which arms run (e.g. "delta" to skip the slow/unneeded full_resend baseline).
// When --reanchor is set (and --arms not given explicitly), run the baseline drift arm (delta),
// the re-anchored mitigation arm(s), and the ceiling (full_resend) together at matched depths.
const ARMS=(typeof args.arms==='string'&&args.arms?args.arms.split(','):
  REANCHOR.length?['delta',...REANCHOR.map(n=>'delta_re'+n),'full_resend']:['delta','full_resend']);
let done=0,tot=FIX.reduce((a,f)=>a+f.probes.length*ARMS.length,0);
// `all` accumulates incrementally (streamed from runArm) so a mid-run crash still has
// every scored probe up to the failure. A terminal error (e.g. HTTP/2 session death after
// retries exhaust) writes PARTIAL results instead of losing the whole run.
let all=[];let crashed=null;
try{
  for(const fx of FIX)for(const arm of ARMS)await runArm(fx,arm,responder,()=>process.stderr.write(`\r${++done}/${tot} probes`),all);
}catch(e){crashed=e;process.stderr.write(`\n[run crashed at ${done}/${tot}; writing PARTIAL results] ${(e&&e.message||e)}\n`);}
const summary=report(all,label);
if(Object.keys(RESOLVED.counts).length)console.log('resolved models served: '+JSON.stringify(RESOLVED.counts));
const outfile=`${OUTDIR}/${(args.model||b).replace(/\W+/g,'_')}.json`;
writeFileSync(outfile,JSON.stringify({backend:b,requestedModel:args.model,resolvedModels:RESOLVED.counts,summary,rows:all,partial:!!crashed,probesDone:done,probesTotal:tot},null,1));
console.log('\nwrote '+outfile+(crashed?' (PARTIAL — rerun to complete)':''));
if(crashed)process.exitCode=1;
