const KEY = process.env.OPENROUTER_API_KEY;
const PAYLOAD = `GCF profile=graph tool=blast_radius symbols=6 edges=4
## targets
@0 method github.com/acme/api/pkg/server.Server.HandleLogin 0.95 lsp_resolved pkg/server/login.go 120 1
@1 fn github.com/acme/api/pkg/auth.ValidateToken 0.88 lsp_resolved pkg/auth/token.go 44 6
## related
@2 fn github.com/acme/api/pkg/auth.hashPassword 0.72 lsp_resolved pkg/auth/hash.go 18 6
@3 iface github.com/acme/api/pkg/auth.TokenStore 0.60 ast_inferred pkg/auth/store.go 9 6
## extended
@4 fn github.com/acme/api/pkg/cache.Invalidate 0.51 lsp_resolved pkg/cache/invalidate.go 77 1
@5 type github.com/acme/api/pkg/model.Session 0.40 ast_inferred pkg/model/session.go 12 6
## edges [4]
@1<@0 calls
@2<@0 calls
@3<@1 references
@4<@3 references`;

const Q = [
  { n:"calls_direct", q:"Which functions does Server.HandleLogin call directly? List them.",
    ok:r=>/validatetoken/i.test(r)&&/hashpassword/i.test(r) },
  { n:"pos_validate", q:"What source file and line is ValidateToken defined at?",
    ok:r=>/token\.go/i.test(r)&&/\b44\b/.test(r) },
  { n:"direction", q:"Does ValidateToken call HandleLogin? Answer yes or no, one line.",
    ok:r=>{const l=r.toLowerCase();return (l.trimStart().startsWith("no")||l.includes("does not")||l.includes("doesn't"))&&!l.trimStart().startsWith("yes");} },
  { n:"unlinked", q:"Which single symbol has no edges connecting it to any other symbol?",
    ok:r=>/session/i.test(r) },
  { n:"tokenstore_ref", q:"What does the TokenStore interface reference?",
    ok:r=>/invalidate/i.test(r) },
  { n:"pos_hashpw", q:"What file and line would you edit to change hashPassword?",
    ok:r=>/hash\.go/i.test(r)&&/\b18\b/.test(r) },
];

const MODELS = ["openai/gpt-4o-mini","google/gemini-2.5-flash-lite","qwen/qwen-2.5-7b-instruct","meta-llama/llama-3.1-8b-instruct"];

async function call(model, prompt){
  for(let a=0;a<4;a++){
    try{
      const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+KEY},
        body:JSON.stringify({model,temperature:0.2,max_tokens:150,
          messages:[{role:"user",content:prompt}]})});
      if(res.status===429||res.status===503){await new Promise(r=>setTimeout(r,3000*(a+1)));continue;}
      const j=await res.json();
      if(j.error) return "ERR:"+j.error.message;
      return j.choices?.[0]?.message?.content ?? "EMPTY";
    }catch(e){ if(a===3) return "ERR:"+e.message; await new Promise(r=>setTimeout(r,2000*(a+1))); }
  }
  return "ERR:retries";
}

for(const m of MODELS){
  let correct=0, total=0;
  const lines=[];
  for(const q of Q){
    const prompt=`Here is a code context payload:\n\n${PAYLOAD}\n\nQuestion: ${q.q}\nAnswer concisely.`;
    const r=await call(m,prompt);
    const good = !r.startsWith("ERR:") && q.ok(r);
    total++; if(good)correct++;
    lines.push(`  ${good?"PASS":"FAIL"} ${q.n.padEnd(14)} ${JSON.stringify(r.slice(0,70))}`);
  }
  console.log(`\n### ${m}  ${correct}/${total}`);
  lines.forEach(l=>console.log(l));
}
console.log("\nDONE");
