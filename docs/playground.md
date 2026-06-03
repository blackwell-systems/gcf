# Playground

::: info Coming Soon
An interactive playground for encoding/decoding GCF in the browser is planned.
:::

In the meantime, try it locally:

## Python (quickest)

```bash
pip install gcf-py
python -c "
from gcf import encode, Payload, Symbol, Edge

p = Payload(
    tool='context_for_task',
    token_budget=5000,
    tokens_used=420,
    symbols=[
        Symbol(qualified_name='pkg.Auth', kind='function', score=0.78, provenance='lsp', distance=0),
        Symbol(qualified_name='pkg.Server', kind='type', score=0.54, provenance='ast', distance=1),
    ],
    edges=[Edge(source='pkg.Server', target='pkg.Auth', edge_type='calls')],
)
print(encode(p))
"
```

## Node

```bash
npx @blackwell-systems/gcf encode '{"tool":"test","symbols":[{"qualifiedName":"pkg.Foo","kind":"function","score":0.9,"provenance":"lsp","distance":0}],"edges":[],"tokenBudget":1000,"tokensUsed":100}'
```

## Go

```bash
go run github.com/blackwell-systems/gcf-go/cmd/gcf@latest encode input.json
```
