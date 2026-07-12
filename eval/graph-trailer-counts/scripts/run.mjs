// run.mjs — single-model runner for the graph streaming-trailer counts eval.
//
// For each fixture and each arm (none / totals / positional / labeled) it sends the
// arm's primer (system) + graph payload (user), asks the fixture's questions in one
// turn, parses "N: value" answers, and scores against programmatic ground truth.
// Reports per-arm accuracy and the decision contrasts (per-group counting especially).
// Node builtins only, no dependencies. Backend layer mirrors the delta eval's runner.
//
// Usage:
//   node run.mjs --self-test [--fixtures DIR]
//       Built-in stubs (perfect / aidReader / wrong) — no API. `perfect` -> 100% every
//       arm; `aidReader` (reads the trailer, cannot count lines) -> high per-group
//       counting on positional/labeled, low on none/totals, controls ~100% everywhere
//       (proves the counting questions actually depend on the aid and the arms differ);
//       `wrong` -> 0%.
//
//   node run.mjs --backend <b> --model <m> [options]     Live run.
//
// Backends (--backend): codex (CLI) | claude (CLI) | openrouter | openai | omniroute (HTTP).
// Options: --fixtures DIR (default fixtures) | --outdir DIR (default results) |
//          --arms LIST (default none,totals,positional,labeled) | --base-url | --api-key-env
// Env: EVAL_LOGDIR DIR  -> per-probe transcript (prompt, questions, parsed answers, raw
//      output, resolved model) so any miss can be audited later.
// Output: <outdir>/<model|backend>.json = { backend, requestedModel, resolvedModels,
//   summary, rows[] }, rows = { arm, scenario, tier, type, ok, got, want }.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ARMS_ALL=['none','totals','positional','labeled'];
const COUNTING=new Set(['per_group_count','group_diff','group_sum','total_symbols','total_edges']);
const PERGROUP=new Set(['per_group_count','group_diff','group_sum']);

// ---- prompt build / answer parse (shared by HTTP + CLI) ----
function questionBlock(qs){return 'Answer each question about the graph above. '+
  'Reply with exactly one line per question, formatted "N: value" — value only, no explanation.\n'+qs.map((q,i)=>`${i+1}. ${q.q}`).join('\n');}
function buildMessages(convo,qs){return [...convo.map(m=>({role:m.role,content:m.content})),{role:'user',content:questionBlock(qs)}];}
function buildText(convo,qs){return convo.map(m=>m.role==='system'?m.content:`\n----- graph -----\n${m.content}`).join('\n')+'\n\n'+questionBlock(qs);}
function parseAnswers(text,n){const a=new Array(n).fill('');for(const ln of String(text).split('\n')){const m=ln.match(/^\s*(\d+)\s*[:.)-]\s*(.+?)\s*$/);if(m){const i=+m[1]-1;if(i>=0&&i<n&&!a[i])a[i]=m[2];}}return a;}

// ---- backends -> responder(convo, questions, meta) => Promise<answers[]> ----
// RESOLVED captures the exact model each response reports serving (OpenRouter routing
// transparency): what a slug actually routed to, not just what we asked for.
const RESOLVED={counts:{},add(m){if(m)this.counts[m]=(this.counts[m]||0)+1;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOGDIR=process.env.EVAL_LOGDIR||'';
const sani=s=>String(s).replace(/[^A-Za-z0-9._-]+/g,'_');
function writeLog(meta,cfgModel,resolved,qs,ans,prompt,rawLabel,raw,extra){
  if(!LOGDIR||!meta)return;
  const name=`${sani(meta.scenario)}__${sani(meta.arm)}.txt`;
  const body=`# scenario=${meta.scenario} arm=${meta.arm} requested=${cfgModel} resolved=${resolved}\n`+
    `# questions:\n${qs.map((q,i)=>`  ${i+1}. [${q.type}] ${q.q} => want=${q.answer}`).join('\n')}\n`+
    `# parsed answers: ${JSON.stringify(ans)}\n\n===== PROMPT =====\n${prompt}\n\n===== ${rawLabel} =====\n${raw}\n${extra||''}`;
  try{writeFileSync(`${LOGDIR}/${name}`,body);}catch(e){/* best-effort */}
}

function httpResponder(cfg){return async (convo,qs,meta)=>{
  const prompt=buildText(convo,qs);
  // Retry transient failures (network flakes, 429, 5xx). Exponential backoff + jitter with a
  // long cap so a SUSTAINED rate limit under concurrent load is ridden out, not aborted.
  const MAX=8; const backoff=a=>Math.min(45000,1000*2**a)*(0.8+Math.random()*0.4);
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
  writeLog(meta,cfg.model,j.model||'?',qs,ans,prompt,'MODEL CONTENT',content);
  return ans;};}

function codexResponder(cfg){return (convo,qs,meta)=>new Promise((resolve,reject)=>{
  const args=['exec',...(cfg.model?['-c',`model=${cfg.model}`]:[]),...(cfg.args||[]),'-'];
  const pr=spawn(cfg.cmd||'codex',args,{stdio:['pipe','pipe','pipe']});let out='',err='';
  const prompt=buildText(convo,qs);
  pr.stdout.on('data',d=>out+=d);pr.stderr.on('data',d=>err+=d);
  pr.on('close',code=>{
    const ans=parseAnswers(out,qs.length);
    writeLog(meta,cfg.model,`exit=${code}`,qs,ans,prompt,'CODEX STDOUT',out,`\n===== CODEX STDERR =====\n${err.slice(0,2000)}\n`);
    code===0?resolve(ans):reject(new Error('codex exit '+code+' '+err.slice(0,200)));});
  pr.stdin.write(prompt);pr.stdin.end();});}

function claudeResponder(cfg){return (convo,qs,meta)=>new Promise((resolve,reject)=>{
  const args=['-p','--model',cfg.model||'sonnet','--output-format','json',
    '--disallowedTools','Bash Edit Write Read WebFetch WebSearch Task Glob Grep',...(cfg.args||[])];
  const pr=spawn(cfg.cmd||'claude',args,{stdio:['pipe','pipe','pipe']});let out='',err='';
  const prompt=buildText(convo,qs);
  pr.stdout.on('data',d=>out+=d);pr.stderr.on('data',d=>err+=d);
  pr.on('close',code=>{
    let content='',model='?';
    try{const arr=JSON.parse(out);const r=Array.isArray(arr)?arr.find(e=>e.type==='result'):arr;
      content=(r&&r.result)||'';const mu=r&&(r.modelUsage||r.usage);model=(mu&&Object.keys(mu)[0])||'?';
      if(model==='?'){const a=Array.isArray(arr)&&arr.find(e=>e.type==='assistant');model=(a&&a.message&&a.message.model)||'?';}
    }catch(e){content=out;}
    RESOLVED.add(model);
    const ans=parseAnswers(content,qs.length);
    writeLog(meta,cfg.model,model,qs,ans,prompt,'MODEL RESULT',content,`\n===== STDERR =====\n${err.slice(0,2000)}\n`);
    code===0?resolve(ans):reject(new Error('claude exit '+code+' '+err.slice(0,200)));});
  pr.stdin.write(prompt);pr.stdin.end();});}

// ---- self-test stubs ----
// aidReader simulates a model that reads the trailer but cannot reliably tally lines:
// counting answers come ONLY from a present trailer, controls are read from the lines.
function parseTrailer(payload){
  const line=payload.split('\n').find(l=>l.startsWith('##! summary'));
  if(!line)return null;
  const sym=+(line.match(/symbols=(\d+)/)||[])[1];
  const edg=+(line.match(/edges=(\d+)/)||[])[1];
  const cm=line.match(/counts=([^\s]+)/);
  let groups=null;
  if(cm){const parts=cm[1].split(',');
    if(/:/.test(cm[1])){groups={};for(const p of parts){const[k,v]=p.split(':');groups[k]=+v;}}
    else{const names=['targets','related','extended'];groups={};parts.slice(0,-1).forEach((v,i)=>groups[names[i]]=+v);groups.edges=+parts[parts.length-1];}}
  return {sym,edg,groups};
}
function symFromPayload(payload,id){
  const l=payload.split('\n').find(l=>l.startsWith(`@${id} `)&&!l.includes('<'));
  if(!l)return null;const[_,kind,qname,score]=l.split(' ');return {kind,qname,score};
}
const STUBS={
  perfect:async(convo,qs)=>qs.map(q=>q.answer),
  wrong:async(convo,qs)=>qs.map(()=>'ZZZ'),
  aidReader:async(convo,qs)=>{const payload=convo[convo.length-1].content;const tr=parseTrailer(payload);
    return qs.map(q=>{
      if(!COUNTING.has(q.type)){const s=symFromPayload(payload,(q.q.match(/@(\d+)/)||[])[1]);
        if(!s)return 'ZZZ'; if(q.type==='control_qname')return s.qname; if(q.type==='control_kind')return s.kind; return s.score;}
      if(!tr)return 'ZZZ'; // no trailer: this reader cannot count
      if(q.type==='total_symbols')return String(tr.sym);
      if(q.type==='total_edges')return String(tr.edg);
      if(!tr.groups)return 'ZZZ'; // totals-only arm: no per-group info
      const g=(q.q.match(/(targets|related|extended) group/)||[])[1];
      if(q.type==='per_group_count')return String(tr.groups[g]);
      if(q.type==='group_diff')return String(tr.groups.targets-tr.groups.related);
      if(q.type==='group_sum')return String(tr.groups.targets+tr.groups.related);
      return 'ZZZ';});},
};

// ---- runner + scorer ----
const norm=s=>String(s).trim().toLowerCase();
const correct=(a,t)=>{if(norm(a)===norm(t))return true;const x=Number(a),y=Number(t);return !isNaN(x)&&!isNaN(y)&&x===y;};
async function runArm(fix,arm,responder,onProbe,sink){
  const a=fix.arms[arm]; if(!a)return [];
  const convo=[{role:'system',content:a.primer},{role:'user',content:a.payload}];
  const ans=await responder(convo,fix.questions,{scenario:fix.scenario,arm});
  const res=[];
  fix.questions.forEach((q,i)=>{const row={arm,scenario:fix.scenario,tier:fix.config.tier,type:q.type,
    ok:correct(ans[i],q.answer),got:ans[i],want:q.answer};res.push(row);sink&&sink.push(row);});
  onProbe&&onProbe();return res;
}
const acc=x=>x.length?100*x.filter(r=>r.ok).length/x.length:0;
function report(rows,label){
  const arms=[...new Set(rows.map(r=>r.arm))];
  const per=Object.fromEntries(arms.map(a=>[a,rows.filter(r=>r.arm===a)]));
  console.log(`\n### ${label}`);
  const cat=(rs,pred)=>acc(rs.filter(r=>pred(r.type)));
  for(const a of arms){const rs=per[a]||[];
    console.log(`  ${a.padEnd(11)} all=${acc(rs).toFixed(1)}%  counting=${cat(rs,t=>COUNTING.has(t)).toFixed(1)}%  per-group=${cat(rs,t=>PERGROUP.has(t)).toFixed(1)}%  control=${cat(rs,t=>!COUNTING.has(t)).toFixed(1)}%`);}
  // decision contrasts (per-group counting accuracy)
  const pg=a=>cat(per[a]||[],t=>PERGROUP.has(t));
  const has=a=>per[a]&&per[a].length;
  const line=(nm,x,y)=>has(x)&&has(y)?`${nm} ${(pg(x)-pg(y)>=0?'+':'')}${(pg(x)-pg(y)).toFixed(1)}pp`:'';
  console.log('  per-group contrasts: '+[line('totals-none','totals','none'),line('positional-totals','positional','totals'),line('labeled-positional','labeled','positional')].filter(Boolean).join(' | '));
  // by size tier (effect should grow with graph size)
  const tiers=[...new Set(rows.map(r=>r.tier))];
  for(const a of arms){const byT=tiers.map(t=>`${t}=${cat(per[a].filter(r=>r.tier===t),x=>PERGROUP.has(x)).toFixed(0)}%`).join(' ');
    if(has(a))console.log(`  ${a.padEnd(11)} per-group by size: ${byT}`);}
  return {perArm:Object.fromEntries(arms.map(a=>[a,{all:acc(per[a]),counting:cat(per[a],t=>COUNTING.has(t)),perGroup:pg(a),control:cat(per[a],t=>!COUNTING.has(t))}]))};
}

// ---- CLI ----
const args=Object.fromEntries(process.argv.slice(2).map((a,i,arr)=>a.startsWith('--')?[a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:true]:null).filter(Boolean));
const FIXDIR=(typeof args.fixtures==='string'&&args.fixtures)||'fixtures';
const OUTDIR=(typeof args.outdir==='string'&&args.outdir)||'results';
if(LOGDIR)mkdirSync(LOGDIR,{recursive:true});
mkdirSync(OUTDIR,{recursive:true});
const FIX=readdirSync(FIXDIR).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(FIXDIR+'/'+f)));
const ARMS=(typeof args.arms==='string'&&args.arms?args.arms.split(','):ARMS_ALL);

if(args['self-test']){
  const pa=parseAnswers('1: fn\n2. Cust7\n3) 5\ngarbage\n4 - 0.42',5);
  console.log('parseAnswers unit:',JSON.stringify(pa),pa[0]==='fn'&&pa[1]==='Cust7'&&pa[2]==='5'&&pa[3]==='0.42'?'✓':'✗');
  for(const [name,resp] of Object.entries(STUBS)){let all=[];for(const fx of FIX)for(const arm of ARMS)all=all.concat(await runArm(fx,arm,resp));report(all,`stub='${name}'`);}
  process.exit(0);
}

let responder,label; const b=args.backend;
if(b==='codex'){responder=codexResponder({cmd:'codex',model:args.model,args:['--skip-git-repo-check','--sandbox','read-only']});label=`codex model=${args.model||'default'}`;}
else if(b==='claude'){responder=claudeResponder({cmd:'claude',model:args.model||'sonnet'});label=`claude model=${args.model||'sonnet'}`;}
else if(b==='openai'||b==='openrouter'||b==='omniroute'){
  const presets={openrouter:{baseUrl:'https://openrouter.ai/api/v1',apiKeyEnv:'OPENROUTER_API_KEY'},omniroute:{baseUrl:args['base-url'],apiKeyEnv:args['api-key-env']||'OMNIROUTE_API_KEY'},openai:{baseUrl:args['base-url']||'https://api.openai.com/v1',apiKeyEnv:args['api-key-env']||'OPENAI_API_KEY'}};
  const cfg={...presets[b],model:args.model,...(args['base-url']?{baseUrl:args['base-url']}:{})};
  responder=httpResponder(cfg);label=`${b} ${cfg.baseUrl} model=${cfg.model}`;
} else {console.error('usage: --backend <codex|claude|openrouter|omniroute|openai> --model <m> [--arms ...] OR --self-test');process.exit(1);}

let done=0,tot=FIX.length*ARMS.length;
// `all` accumulates incrementally so a mid-run crash still has every scored probe up to the
// failure; a terminal error (e.g. HTTP session death after retries exhaust) writes PARTIAL.
let all=[],crashed=null;
try{for(const fx of FIX)for(const arm of ARMS)await runArm(fx,arm,responder,()=>process.stderr.write(`\r${++done}/${tot} (arm probes)`),all);}
catch(e){crashed=e;process.stderr.write(`\n[run crashed at ${done}/${tot}; writing PARTIAL] ${(e&&e.message||e)}\n`);}
const summary=report(all,label);
if(Object.keys(RESOLVED.counts).length)console.log('resolved models served: '+JSON.stringify(RESOLVED.counts));
const outfile=`${OUTDIR}/${(args.model||b).replace(/\W+/g,'_')}.json`;
writeFileSync(outfile,JSON.stringify({backend:b,requestedModel:args.model,resolvedModels:RESOLVED.counts,summary,rows:all,partial:!!crashed,probesDone:done,probesTotal:tot},null,1));
console.log('\nwrote '+outfile+(crashed?' (PARTIAL — rerun to complete)':''));
if(crashed)process.exitCode=1;
