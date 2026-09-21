const KEY = process.env.OPENROUTER_API_KEY;
const NODES = `GCF profile=graph tool=blast_radius symbols=6 edges=4
## targets
@0 method github.com/acme/api/pkg/server.Server.HandleLogin 0.95 lsp_resolved pkg/server/login.go 120 1
@1 fn github.com/acme/api/pkg/auth.ValidateToken 0.88 lsp_resolved pkg/auth/token.go 44 6
## related
@2 fn github.com/acme/api/pkg/auth.hashPassword 0.72 lsp_resolved pkg/auth/hash.go 18 6
@3 iface github.com/acme/api/pkg/auth.TokenStore 0.60 ast_inferred pkg/auth/store.go 9 6
## extended
@4 fn github.com/acme/api/pkg/cache.Invalidate 0.51 lsp_resolved pkg/cache/invalidate.go 77 1
@5 type github.com/acme/api/pkg/model.Session 0.40 ast_inferred pkg/model/session.go 12 6`;
const EDGES = {
  "A target<source": `## edges [4]\n@1<@0 calls\n@2<@0 calls\n@3<@1 references\n@4<@3 references`,
  "B source>target": `## edges [4]\n@0>@1 calls\n@0>@2 calls\n@1>@3 references\n@3>@4 references`,
  "C natural SVO":   `## edges [4]\n@0 calls @1\n@0 calls @2\n@1 references @3\n@3 references @4`,
};
const Q = [
  { n:"calls_direct", q:"Which functions does Server.HandleLogin call directly? List them.",
    ok:r=>/validatetoken/i.test(r)&&/hashpassword/i.test(r) },
  { n:"direction", q:"Does ValidateToken call HandleLogin? Answer yes or no, one line.",
    ok:r=>{const l=r.toLowerCase().trimStart();return (l.startsWith("no")||l.includes("does not")||l.includes("doesn't"))&&!l.startsWith("yes");} },
  { n:"ts_references", q:"What does the TokenStore interface reference? Name the single symbol.",
    ok:r=>/invalidate/i.test(r)&&!/validate\s*token|validatetoken/i.test(r) },
  { n:"ts_ref_by", q:"Which symbol references the TokenStore interface? Name the single symbol.",
    ok:r=>/validatetoken|validate token/i.test(r)&&!/invalidate/i.test(r) },
];
const MODELS = ["openai/gpt-4o-mini","google/gemini-2.5-flash-lite","qwen/qwen-2.5-7b-instruct","meta-llama/llama-3.1-8b-instruct"];
const RUNS=3;
async function call(model, prompt){
  for(let a=0;a<5;a++){
    try{
      const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+KEY},
        body:JSON.stringify({model,temperature:0.2,max_tokens:120,messages:[{role:"user",content:prompt}]})});
      if(res.status===429||res.status===503){await new Promise(r=>setTimeout(r,3000*(a+1)));continue;}
      const j=await res.json(); if(j.error) return "ERR:"+j.error.message;
      return j.choices?.[0]?.message?.content ?? "EMPTY";
    }catch(e){ if(a===4) return "ERR:"+e.message; await new Promise(r=>setTimeout(r,2000*(a+1))); }
  }
  return "ERR:retries";
}
const syntaxTotals={};
for(const [sName,eBlock] of Object.entries(EDGES)){
  const payload=NODES+"\n"+eBlock; let sc=0,st=0;
  console.log(`\n### ${sName}`);
  for(const m of MODELS){
    const passByQ={}; for(const q of Q) passByQ[q.n]=0;
    let mc=0,mt=0;
    for(const q of Q){
      for(let run=0;run<RUNS;run++){
        const prompt=`Here is a code context payload:\n\n${payload}\n\nQuestion: ${q.q}\nAnswer concisely.`;
        const r=await call(m,prompt);
        const good=!r.startsWith("ERR:")&&q.ok(r);
        if(good){passByQ[q.n]++;mc++;sc++;} mt++;st++;
      }
    }
    console.log(`  ${m.padEnd(38)} ${mc}/${mt}  [${Q.map(q=>q.n+":"+passByQ[q.n]+"/"+RUNS).join(" ")}]`);
  }
  syntaxTotals[sName]={sc,st};
}
console.log("\n=== SUMMARY (3 runs/cell) ===");
for(const [s,{sc,st}] of Object.entries(syntaxTotals)) console.log(`${s.padEnd(18)} ${sc}/${st} (${(100*sc/st).toFixed(0)}%)`);
console.log("DONE");
