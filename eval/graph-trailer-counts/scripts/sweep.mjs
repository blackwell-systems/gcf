// sweep.mjs — parallel, resumable model-sweep driver for the graph trailer-counts eval.
// Runs run.mjs once per (model x repeat), writing results -> results/sweep/<model>/run<k>/
// and transcripts -> logs/sweep/<model>/run<k>/. Mirrors the delta eval's sweep driver.
//
// Controlled, resumable, one model at a time by default (opt in to parallel with --conc):
//   node scripts/sweep.mjs --model <slug>                    # ONE model (all repeats), then stop
//   node scripts/sweep.mjs --model a,b,c --conc 3            # a chosen LIST, 3 in parallel
//   node scripts/sweep.mjs --model <slug> --repeats 3
//   node scripts/sweep.mjs --all --conc 4                    # every model in MODELS (opt-in fan-out)
//   node scripts/sweep.mjs --model <slug> --dry-run          # show what WOULD run, spend nothing
//   node scripts/sweep.mjs --backend claude --model sonnet   # CLI backend instead of openrouter
//   node scripts/sweep.mjs --backend codex  --model gpt-5.5-codex
//
// Resume: a run is "done" iff its result JSON exists in results/sweep/<model>/run<k>/.
// Completed runs are skipped; re-invoke to continue. --force re-runs completed ones.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));

// OpenRouter slugs spanning the ability range. Per-group count aids are expected to help
// MOST on mid/open-tier models and large graphs; frontier models are near ceiling on
// counting and mostly guard against a regression on the control questions.
const MODELS=[
  // mid / open (effect expected largest)
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-3.3-70b-instruct',
  'mistralai/ministral-8b-2512',
  'mistralai/mistral-small-3.2-24b-instruct',
  'qwen/qwen-2.5-72b-instruct',
  'deepseek/deepseek-chat',
  'google/gemini-2.5-flash-lite',
  // frontier (ceiling / regression guard)
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-5.5',
];

const argv=process.argv.slice(2);
const getFlag=n=>argv.includes(`--${n}`);
const getVal=n=>{const i=argv.indexOf(`--${n}`);return i>=0?argv[i+1]:undefined;};
const one=getVal('model'), all=getFlag('all'), dryRun=getFlag('dry-run'), force=getFlag('force');
const REPEATS=parseInt(getVal('repeats')||'3',10);
const CONC=parseInt(getVal('conc')||'1',10);        // sequential by default; opt in to parallel
const BACKEND=getVal('backend')||'openrouter';

if(!one&&!all){
  console.error('Refusing to run without a target. Use --model <slug[,slug2,...]> or --all.');
  console.error('Known models:\n  '+MODELS.join('\n  '));
  process.exit(2);
}
const targets=one?one.split(',').map(s=>s.trim()).filter(Boolean):MODELS;

const sani=s=>s.replace(/[/:]/g,'_');
const isDone=(S,k)=>{const dir=`results/sweep/${S}/run${k}`;return existsSync(dir)&&readdirSync(dir).some(f=>f.endsWith('.json'));};

const tasks=[]; let skipped=0;
for(const m of targets){const S=sani(m);for(let k=1;k<=REPEATS;k++){if(!force&&isDone(S,k)){skipped++;continue;}tasks.push({m,S,k});}}

console.log(`backend=${BACKEND}  targets: ${targets.length} model(s) x ${REPEATS} repeats  conc=${CONC}`);
console.log(`resume: ${skipped} already-complete run(s) skipped; ${tasks.length} to run`);
if(dryRun){console.log('--dry-run: would run these (no spend):');for(const t of tasks)console.log(`  ${t.m} run${t.k}`);process.exit(0);}
if(!tasks.length){console.log('nothing to do (all complete).');process.exit(0);}

function runOne({m,S,k}){return new Promise(res=>{
  const out=`results/sweep/${S}/run${k}`, log=`logs/sweep/${S}/run${k}`;
  mkdirSync(out,{recursive:true});mkdirSync(log,{recursive:true});
  const t0=process.hrtime.bigint();
  const pr=spawn(process.execPath,
    ['scripts/run.mjs','--backend',BACKEND,'--model',m,'--fixtures','fixtures','--outdir',out],
    {env:{...process.env,EVAL_LOGDIR:log},stdio:'ignore'});
  pr.on('close',code=>{const secs=Number(process.hrtime.bigint()-t0)/1e9;
    console.log(`  ${code===0?'ok  ':'FAIL'} ${m} run${k} (${secs.toFixed(0)}s)`);res();});
});}

let i=0,active=0,done=0;
await new Promise(resolve=>{const pump=()=>{
  if(i>=tasks.length&&active===0)return resolve();
  while(active<CONC&&i<tasks.length){active++;runOne(tasks[i++]).then(()=>{active--;done++;pump();});}
};pump();});
console.log(`DONE: ${done}/${tasks.length} runs (${skipped} skipped as already complete)`);
