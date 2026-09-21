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

// edges: 0 calls 1, 0 calls 2, 1 references 3, 3 references 4
const EDGES = {
  "A target<source": `## edges [4]\n@1<@0 calls\n@2<@0 calls\n@3<@1 references\n@4<@3 references`,
  "B source>target": `## edges [4]\n@0>@1 calls\n@0>@2 calls\n@1>@3 references\n@3>@4 references`,
  "C natural SVO":   `## edges [4]\n@0 calls @1\n@0 calls @2\n@1 references @3\n@3 references @4`,
};

const Q = [
  { n:"calls_direct", q:"Which functions does Server.HandleLogin call directly? List them.",
    ok:r=>/validatetoken/i.test(r)&&/hashpassword/i.test(r) },
  { n:"direction",    q:"Does ValidateToken call HandleLogin? Answer yes or no, one line.",
    ok:r=>{const l=r.toLowerCase().trimStart();return (l.startsWith("no")||l.includes("does not")||l.includes("doesn't"))&&!l.startsWith("yes");} },
  { n:"ts_references", q:"What does the TokenStore interface reference? Name the single symbol.",
    ok:r=>/invalidate/i.test(r)&&!/validate\s*token|validatetoken/i.test(r) },
  { n:"ts_referenced_by", q:"Which symbol references the TokenStore interface? Name the single symbol.",
    ok:r=>/validatetoken|validate token/i.test(r)&&!/invalidate/i.test(r) },
];

const MODELS = ["openai/gpt-4o-mini","google/gemini-2.5-flash-lite","qwen/qwen-2.5-7b-instruct","meta-llama/llama-3.1-8b-instruct"];

async function call(model, prompt){
  for(let a=0;a<4;a++){
    try{
      const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+KEY},
        body:JSON.stringify({model,temperature:0.2,max_tokens:120,messages:[{role:"user",content:prompt}]})});
      if(res.status===429||res.status===503){await new Promise(r=>setTimeout(r,3000*(a+1)));continue;}
      const j=await res.json();
      if(j.error) return "ERR:"+j.error.message;
      return j.choices?.[0]?.message?.content ?? "EMPTY";
    }catch(e){ if(a===3) return "ERR:"+e.message; await new Promise(r=>setTimeout(r,2000*(a+1))); }
  }
  return "ERR:retries";
}

const grid = {}; // syntax -> model -> {correct,total, shared:{ref,by}}
for(const [sName,eBlock] of Object.entries(EDGES)){
  grid[sName]={};
  const payload = NODES+"\n"+eBlock;
  for(const m of MODELS){
    let correct=0,total=0; const detail=[];
    for(const q of Q){
      const prompt=`Here is a code context payload:\n\n${payload}\n\nQuestion: ${q.q}\nAnswer concisely.`;
      const r=await call(m,prompt);
      const good=!r.startsWith("ERR:")&&q.ok(r);
      total++; if(good)correct++;
      detail.push(`${q.n}:${good?"P":"F"}`);
    }
    grid[sName][m]={correct,total,detail};
    console.log(`[${sName}] ${m}: ${correct}/${total}  (${detail.join(" ")})`);
  }
}
console.log("\n=== SUMMARY (accuracy by edge syntax) ===");
for(const [sName,byModel] of Object.entries(grid)){
  let c=0,t=0; for(const m of MODELS){c+=byModel[m].correct;t+=byModel[m].total;}
  console.log(`${sName.padEnd(18)} ${c}/${t} (${(100*c/t).toFixed(0)}%)`);
}
console.log("DONE");
