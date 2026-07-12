// analyze.mjs — analyze the trailer-counts sweep with the same trust gates as the delta
// eval: comp-only per-question accuracy per arm (crediting format-misses where the right
// value is present but mis-parsed), blank-rate exclusion (a provider returning empty content
// is a non-response artifact, not a comprehension measurement), and per-model mean +/- SD.
// Reports the decision contrasts on PER-GROUP counting accuracy (the questions the aid targets):
//   totals - none          does a trailer help at all
//   positional - totals    do per-group counts add over the totals
//   labeled - positional    is a labeled aid better than the shipped positional form
// broken out by size tier (the effect should grow with graph size). Reads logs/sweep/.
// Run from the eval dir: node scripts/analyze.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const norm=s=>String(s).trim().toLowerCase();
const numEq=(a,b)=>{const x=Number(a),y=Number(b);return !isNaN(x)&&!isNaN(y)&&x===y;};
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};

const ARMS=['none','totals','positional','labeled'];
const PERGROUP=new Set(['per_group_count','group_diff','group_sum']);
const TIER=s=>s.startsWith('small')?'small':s.startsWith('medium')?'medium':s.startsWith('large')?'large':'?';

// comp-only per-question accuracy for one run's log dir, per arm and per size tier, + blank/fmt.
function scoreRun(dir){
  const A={}; for(const a of ARMS)A[a]={perGroup:{ok:0,n:0},bySize:{},blank:0,fmt:0,n:0};
  for(const f of readdirSync(dir).filter(f=>f.endsWith('.txt'))){
    const t=readFileSync(`${dir}/${f}`,'utf8');
    const arm=(t.match(/arm=(\w+)/)||[])[1]; if(!A[arm])continue;
    const scen=(t.match(/scenario=(\S+)/)||[])[1]||''; const tier=TIER(scen);
    const qs=[...t.matchAll(/^\s+(\d+)\. \[(\w+)\] .+? => want=(.+)$/gm)].map(m=>({i:+m[1],type:m[2],want:m[3]}));
    const parsed=JSON.parse((t.match(/# parsed answers: (\[.*\])/)||[])[1]||'[]');
    const content=(t.split(/===== MODEL (?:CONTENT|RESULT) =====/)[1]||'').toLowerCase();
    A[arm].bySize[tier]=A[arm].bySize[tier]||{ok:0,n:0};
    for(const x of qs){
      const got=parsed[x.i-1];
      const blank=(got===''||got==null); if(blank)A[arm].blank++; A[arm].n++;
      const ok=norm(got)===norm(x.want)||numEq(got,x.want);
      const credit=ok||(!blank&&content.includes(norm(x.want))); // right value present, mis-parsed
      if(!ok&&credit)A[arm].fmt++;
      if(PERGROUP.has(x.type)){A[arm].perGroup.n++;if(credit)A[arm].perGroup.ok++;
        A[arm].bySize[tier].n++;if(credit)A[arm].bySize[tier].ok++;}
    }
  }
  const pg=a=>a.perGroup.n?100*a.perGroup.ok/a.perGroup.n:null;
  const bySize=a=>Object.fromEntries(Object.entries(a.bySize).map(([k,v])=>[k,v.n?100*v.ok/v.n:null]));
  const out={blank:0,n:0};
  for(const a of ARMS){out[a]={pg:pg(A[a]),bySize:bySize(A[a])};out.blank+=A[a].blank;out.n+=A[a].n;}
  out.blankRate=out.n?100*out.blank/out.n:0;
  return out;
}

const SWEEP='logs/sweep';
if(!existsSync(SWEEP)){console.error('no logs/sweep yet — run the sweep first');process.exit(1);}
const BLANK_MAX=5; // >=5% blank answers => non-response artifact, excluded from the trend
const rows=[];
for(const model of readdirSync(SWEEP).sort()){
  const runs=readdirSync(`${SWEEP}/${model}`).filter(d=>d.startsWith('run'));
  const per=runs.map(r=>scoreRun(`${SWEEP}/${model}/${r}`)).filter(x=>x.none.pg!=null);
  if(!per.length)continue;
  const blankRate=mean(per.map(x=>x.blankRate));
  const pgArm=a=>mean(per.map(x=>x[a].pg).filter(v=>v!=null));
  const gap=(a,b)=>pgArm(a)-pgArm(b);
  const sizeGap=(a,b,tier)=>{const va=per.map(x=>x[a].bySize[tier]).filter(v=>v!=null),vb=per.map(x=>x[b].bySize[tier]).filter(v=>v!=null);return va.length&&vb.length?mean(va)-mean(vb):null;};
  rows.push({model,runs:per.length,blankRate,
    none:pgArm('none'),totals:pgArm('totals'),positional:pgArm('positional'),labeled:pgArm('labeled'),
    g_tn:gap('totals','none'),g_pt:gap('positional','totals'),g_lp:gap('labeled','positional'),
    g_pt_SD:sd(per.map(x=>(x.positional.pg??0)-(x.totals.pg??0))),
    bySizePT:{small:sizeGap('positional','totals','small'),medium:sizeGap('positional','totals','medium'),large:sizeGap('positional','totals','large')},
  });
}
rows.sort((a,b)=>a.none-b.none); // weakest counters (lowest no-trailer per-group accuracy) first

console.log('# Per-group counting accuracy by arm, and decision contrasts (comp-only, blank-gated).');
console.log('# Positive positional-totals => per-group counts help beyond totals; labeled-positional => labels help.\n');
console.log('model'.padEnd(40)+'runs  none totals  pos  lbl  | tot-none pos-tot(+/-SD) lbl-pos | blank%  trust');
for(const r of rows){
  const excl=r.blankRate>=BLANK_MAX;
  const f=x=>(x==null?'  -':x.toFixed(0).padStart(4));
  console.log(r.model.padEnd(40)+String(r.runs).padEnd(6)+
    f(r.none)+f(r.totals)+f(r.positional)+f(r.labeled)+'  | '+
    `${r.g_tn>=0?'+':''}${r.g_tn.toFixed(0)}`.padStart(7)+'  '+
    `${r.g_pt>=0?'+':''}${r.g_pt.toFixed(1)}+/-${r.g_pt_SD.toFixed(1)}`.padStart(11)+'  '+
    `${r.g_lp>=0?'+':''}${r.g_lp.toFixed(0)}`.padStart(6)+' | '+
    r.blankRate.toFixed(0).padStart(4)+'   '+(excl?'EXCL-blanks':'ok'));
}
const clean=rows.filter(r=>r.blankRate<BLANK_MAX);
if(clean.length){
  console.log('\n# CLEAN aggregate (blank-artifact points excluded):');
  const agg=(k)=>mean(clean.map(r=>r[k]));
  console.log(`  positional-totals per-group: ${agg('g_pt')>=0?'+':''}${agg('g_pt').toFixed(1)}pp mean across ${clean.length} models`);
  console.log(`  labeled-positional per-group: ${agg('g_lp')>=0?'+':''}${agg('g_lp').toFixed(1)}pp`);
  console.log(`  totals-none per-group:        ${agg('g_tn')>=0?'+':''}${agg('g_tn').toFixed(1)}pp`);
  const sizeMean=t=>mean(clean.map(r=>r.bySizePT[t]).filter(v=>v!=null));
  console.log(`  positional-totals by size:    small ${sizeMean('small').toFixed(1)}pp | medium ${sizeMean('medium').toFixed(1)}pp | large ${sizeMean('large').toFixed(1)}pp  (effect should grow with size)`);
}
const excluded=rows.filter(r=>r.blankRate>=BLANK_MAX);
if(excluded.length)console.log('\nEXCLUDED (blank artifact): '+excluded.map(r=>`${r.model} (${r.blankRate.toFixed(0)}% blank)`).join(', '));
