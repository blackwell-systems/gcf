// gen.mjs — fixture generator for the graph streaming-trailer counts comprehension eval.
//
// Question under test: does the graph `##! summary` trailer's PER-GROUP counts
// (`counts=2,1,3` for targets/related/edges) measurably help counting-task
// comprehension over the totals alone, and is a LABELED form better than the
// shipped POSITIONAL one? (SPEC §8.4; ROADMAP "Streaming trailer, per-group counts".)
//
// Four arms, identical graph, differing ONLY in the trailer the model is given
// (and a matching one-paragraph primer describing that trailer honestly):
//   none        no `##! summary` trailer at all (model must count lines itself)
//   totals      `##! summary symbols=N edges=M`
//   positional  `##! summary symbols=N edges=M counts=2,1,3`  (shipped form)
//   labeled     `##! summary symbols=N edges=M counts=targets:2,related:1,edges:3`
//
// Contrasts that decide it: totals-none (does a trailer help at all),
// positional-totals (do per-group counts add over totals), labeled-positional
// (is a labeled aid better than positional). Node builtins only, no deps.
//
// Usage: node scripts/gen.mjs   (writes fixtures/*.json, run from the eval dir)
import { writeFileSync, mkdirSync } from 'node:fs';

// deterministic PRNG (mulberry32) — same family as the delta eval, so runs are reproducible.
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

const KIND=['fn','type','method','iface','var','const','class','field'];
const PROV=['lsp_resolved','ast_inferred','structural','rwr'];
const ETYPE=['calls','imports','implements','references'];
const GROUPS=['targets','related','extended']; // distance 0,1,2

// A symbol line matches the real streaming encoder: "@ID KIND QNAME SCORE(2dp) PROV".
// QNAME has no whitespace (graph-profile constraint).
const symLine=(id,s)=>`@${id} ${s.kind} ${s.qname} ${s.score.toFixed(2)} ${s.prov}`;

function scenario(seed,sizes){
  const rng=mul(seed);
  // sizes = [nTargets, nRelated, nExtended]; ids are assigned sequentially in group order.
  const groups={targets:[],related:[],extended:[]};
  const all=[]; let id=0;
  GROUPS.forEach((g,gi)=>{
    for(let k=0;k<sizes[gi];k++){
      const s={kind:KIND[(rng()*KIND.length)|0],
        qname:`pkg${(rng()*40)|0}.${['Auth','Server','Config','Router','Store','Cache','Client','Model'][(rng()*8)|0]}${id}`,
        score:Math.round((0.30+rng()*0.69)*100)/100, prov:PROV[(rng()*PROV.length)|0]};
      groups[g].push({id,s}); all.push({id,s,group:g}); id++;
    }
  });
  const N=all.length;
  // edges: ~0.8*N directed edges between existing ids (target<source). No self-loops.
  const m=Math.max(1,Math.round(N*0.8));
  const edges=[];
  for(let k=0;k<m;k++){
    let t=(rng()*N)|0, s=(rng()*N)|0; if(s===t)s=(s+1)%N;
    edges.push({t,s,type:ETYPE[(rng()*ETYPE.length)|0]});
  }
  return {groups,all,N,edges};
}

const BASE_PRIMER=`You are reading a code-graph context encoded in GCF (graph profile). Format:
- A header line beginning "GCF profile=graph".
- Distance-group sections in order of relevance: "## targets" (most relevant), then "## related", then "## extended". Each section header is followed by that group's symbol lines.
- A symbol line is "@ID KIND QUALIFIED_NAME SCORE PROVENANCE", space-separated. KIND is an abbreviation (fn=function, type, method, iface=interface, var, const, class, field). Each symbol has a unique integer @ID.
- An edges section "## edges [?]" is followed by edge lines "@TARGET<@SOURCE TYPE"; the "<" points to the target symbol.
Answer each question about this graph. Reply with only the requested value, no explanation.`;

const TRAILER_PRIMER={
  none:'',
  totals:'\n- A final trailer line "##! summary symbols=N edges=M" reports the total symbol and edge counts.',
  positional:'\n- A final trailer line "##! summary symbols=N edges=M counts=A,B,C,..." reports the totals plus a comma-separated per-group count list in section order (targets, then related, then extended, then the edge count last).',
  labeled:'\n- A final trailer line "##! summary symbols=N edges=M counts=targets:A,related:B,extended:C,edges:D" reports the totals plus a labeled per-group count for each section.',
};

function trailer(scn,arm){
  const N=scn.N, M=scn.edges.length;
  const present=GROUPS.filter(g=>scn.groups[g].length);
  if(arm==='none')return null;
  if(arm==='totals')return `##! summary symbols=${N} edges=${M}`;
  if(arm==='positional'){
    const c=[...present.map(g=>scn.groups[g].length),M];
    return `##! summary symbols=${N} edges=${M} counts=${c.join(',')}`;
  }
  if(arm==='labeled'){
    const c=[...present.map(g=>`${g}:${scn.groups[g].length}`),`edges:${M}`];
    return `##! summary symbols=${N} edges=${M} counts=${c.join(',')}`;
  }
}

function payload(scn,arm){
  const L=['GCF profile=graph tool=context_for_task budget=5000'];
  for(const g of GROUPS){ if(!scn.groups[g].length)continue; L.push(`## ${g}`); for(const {id,s} of scn.groups[g])L.push(symLine(id,s)); }
  L.push('## edges [?]');
  for(const e of scn.edges)L.push(`@${e.t}<@${e.s} ${e.type}`);
  const tr=trailer(scn,arm); if(tr)L.push(tr);
  return L.join('\n');
}

// ---- questions with programmatic ground truth ----
function questions(scn,seed){
  const rng=mul(seed*31+7); const Q=[]; const pick=arr=>arr[(rng()*arr.length)|0];
  const sz=g=>scn.groups[g].length;
  // per-group counts (the aid arms should help most): ask each non-empty group.
  for(const g of GROUPS) if(sz(g)) Q.push({type:'per_group_count',q:`How many symbols are in the ${g} group?`,answer:String(sz(g))});
  // group arithmetic over the breakdown
  if(sz('targets')&&sz('related')) Q.push({type:'group_diff',q:`How many more symbols are in the targets group than the related group?`,answer:String(sz('targets')-sz('related'))});
  if(sz('targets')&&sz('related')) Q.push({type:'group_sum',q:`How many symbols are in the targets and related groups combined?`,answer:String(sz('targets')+sz('related'))});
  // totals (totals arms should help)
  Q.push({type:'total_symbols',q:`How many symbols are there in total?`,answer:String(scn.N)});
  Q.push({type:'total_edges',q:`How many edges are there in total?`,answer:String(scn.edges.length)});
  // controls (must NOT regress with the aid): random symbol lookups, answerable only from the lines.
  const controls=3;
  for(let k=0;k<controls;k++){
    const sym=pick(scn.all);
    const kind=k%3;
    if(kind===0)Q.push({type:'control_qname',q:`What is the qualified name of symbol @${sym.id}?`,answer:sym.s.qname});
    else if(kind===1)Q.push({type:'control_kind',q:`What is the KIND abbreviation of symbol @${sym.id}?`,answer:sym.s.kind});
    else Q.push({type:'control_score',q:`What is the score of symbol @${sym.id}?`,answer:sym.s.score.toFixed(2)});
  }
  return Q;
}

// ---- build fixtures ----
const SIZES=[
  {tier:'small', sizes:[8,5,2]},    // N=15
  {tier:'medium',sizes:[50,35,15]}, // N=100
  {tier:'large', sizes:[250,170,80]}, // N=500
];
const SEEDS=[1,2]; // two graphs per size tier for coverage
const ARMS=['none','totals','positional','labeled'];

mkdirSync('fixtures',{recursive:true});
let totalQ=0; const summary=[];
for(const {tier,sizes} of SIZES){
  for(const seed of SEEDS){
    const scn=scenario(seed,sizes);
    const qs=questions(scn,seed); totalQ+=qs.length;
    const arms={};
    for(const a of ARMS)arms[a]={primer:BASE_PRIMER+TRAILER_PRIMER[a],payload:payload(scn,a)};
    // self-consistency: symbols= equals the sum of the per-group entries; counts line well-formed.
    const posCounts=trailer(scn,'positional').match(/counts=([\d,]+)/)[1].split(',').map(Number);
    const okSum=posCounts.slice(0,-1).reduce((x,y)=>x+y,0)===scn.N && posCounts[posCounts.length-1]===scn.edges.length;
    const name=`${tier}_s${seed}`;
    writeFileSync(`fixtures/${name}.json`,JSON.stringify({
      scenario:name, config:{tier,sizes,seed,N:scn.N,edges:scn.edges.length,
        groups:{targets:sizes[0],related:sizes[1],extended:sizes[2]}},
      arms, questions:qs},null,1));
    summary.push({name,N:scn.N,edges:scn.edges.length,questions:qs.length,okSum,
      chars:Object.fromEntries(ARMS.map(a=>[a,arms[a].payload.length]))});
  }
}
console.log('FIXTURES WRITTEN (fixtures/):');
for(const s of summary)console.log(`  ${s.name}: N=${s.N} edges=${s.edges} questions=${s.questions} consistency=${s.okSum?'ok':'FAIL'} | trailer-cost none->pos = +${s.chars.positional-s.chars.none} chars`);
console.log(`\ntotal questions/fixture-set: ${totalQ}  (x4 arms x models)`);
// readable sample
const sample=JSON.parse((await import('node:fs')).readFileSync('fixtures/small_s1.json'));
console.log('\n=== SAMPLE small_s1 ===');
console.log('--- positional arm payload ---\n'+sample.arms.positional.payload);
console.log('\n--- questions + ground truth ---');
sample.questions.forEach(q=>console.log(`  [${q.type}] ${q.q} => ${q.answer}`));
