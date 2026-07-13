# Delta Encoding

When a tool is queried twice and the context pack changed only slightly between queries, retransmitting the full payload wastes tokens on content the LLM already has. Delta encoding sends only what changed.

## The protocol

The consumer (LLM) sends back the `pack_root` from a prior response. The server compares it to the current result and returns one of three outcomes:

```
Consumer sends: pack_root=a1b2c3d4

Server checks:
  1. Same root?     → "unchanged pack_root=a1b2c3d4 symbols=N" (zero cost)
  2. Known prior?   → Delta payload (only added/removed)
  3. Unknown prior? → Full payload (fallback)
```

## Delta format

```
GCF profile=graph tool=context_for_task delta=true base_root=a1b2c3 new_root=d4e5f6 tokens=30 savings=81%
## removed
fn github.com/org/repo/pkg.OldHandler
method github.com/org/repo/pkg.Server.Deprecated
## added
@0 fn github.com/org/repo/pkg.NewHandler 0.85 rwr 0
@1 fn github.com/org/repo/pkg.UpdatedAuth 0.79 lsp_resolved 1
## edges_removed
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.OldHandler calls
## edges_added
github.com/org/repo/pkg.Router -> github.com/org/repo/pkg.NewHandler calls
```

### Sections

| Section | Content | Format |
|---------|---------|--------|
| `## removed` | Symbols in prior pack but not current | Short refs: `{kind} {qname}` |
| `## added` | Symbols in current pack but not prior | Full node lines plus a trailing distance: `@{id} {kind} {qname} {score} {prov} {distance}` |
| `## edges_removed` | Edges in prior but not current | `{source} -> {target} {type}` |
| `## edges_added` | Edges in current but not prior | `{source} -> {target} {type}` |

Removed symbols use short references (kind + qualified name only) because the consumer already has the full declaration from the prior response. Added symbols use full declarations, including the trailing distance, because they're new: the flat `## added` section has no distance-group headers, so the distance travels on the line itself, which the consumer needs to reconstruct the new snapshot and verify `new_root` (see pack_root below).

## When to use delta

Delta encoding is most effective when:
- The user edits a file and re-queries (a few symbols shift in/out of relevance)
- Time passes and recency scores change (some symbols promote, others demote)
- A dependency is added/removed (edge topology shifts slightly)

Rule of thumb: if the delta is less than 60% of the full payload size, use delta. Otherwise, retransmit in full (the overhead of tracking the diff isn't worth it).

## Implementation

::: code-group

```python [Python]
from gcf import encode_delta, DeltaPayload, Symbol, Edge

delta = DeltaPayload(
    tool="context_for_task",
    base_root="a1b2c3",
    new_root="d4e5f6",
    removed=[
        Symbol(qualified_name="pkg.OldFunc", kind="function"),
    ],
    added=[
        Symbol(qualified_name="pkg.NewFunc", kind="function", score=0.85, provenance="rwr"),
    ],
    removed_edges=[
        Edge(source="pkg.Router", target="pkg.OldFunc", edge_type="calls"),
    ],
    added_edges=[
        Edge(source="pkg.Router", target="pkg.NewFunc", edge_type="calls"),
    ],
    delta_tokens=30,
    full_tokens=200,
)

print(encode_delta(delta))
```

```typescript [TypeScript]
import { encodeDelta, type DeltaPayload } from '@blackwell-systems/gcf';

const delta: DeltaPayload = {
  tool: 'context_for_task',
  baseRoot: 'a1b2c3',
  newRoot: 'd4e5f6',
  removed: [{ qualifiedName: 'pkg.OldFunc', kind: 'function', score: 0, provenance: '', distance: 0 }],
  added: [{ qualifiedName: 'pkg.NewFunc', kind: 'function', score: 0.85, provenance: 'rwr', distance: 0 }],
  removedEdges: [{ source: 'pkg.Router', target: 'pkg.OldFunc', edgeType: 'calls' }],
  addedEdges: [{ source: 'pkg.Router', target: 'pkg.NewFunc', edgeType: 'calls' }],
  deltaTokens: 30,
  fullTokens: 200,
};

console.log(encodeDelta(delta));
```

```go [Go]
delta := &gcf.DeltaPayload{
    Tool:     "context_for_task",
    BaseRoot: "a1b2c3",
    NewRoot:  "d4e5f6",
    Removed:  []gcf.Symbol{{QualifiedName: "pkg.OldFunc", Kind: "function"}},
    Added:    []gcf.Symbol{{QualifiedName: "pkg.NewFunc", Kind: "function", Score: 0.85, Provenance: "rwr"}},
    RemovedEdges: []gcf.Edge{{Source: "pkg.Router", Target: "pkg.OldFunc", EdgeType: "calls"}},
    AddedEdges:   []gcf.Edge{{Source: "pkg.Router", Target: "pkg.NewFunc", EdgeType: "calls"}},
    DeltaTokens: 30,
    FullTokens:  200,
}

fmt.Println(gcf.EncodeDelta(delta))
```

:::

**Output:**

```
GCF profile=graph tool=context_for_task delta=true base_root=a1b2c3 new_root=d4e5f6 tokens=30 savings=85%
## removed
fn pkg.OldFunc
## added
@0 fn pkg.NewFunc 0.85 rwr 0
## edges_removed
pkg.Router -> pkg.OldFunc calls
## edges_added
pkg.Router -> pkg.NewFunc calls
```

## pack_root: how it works

The `pack_root` is a content-addressed hash (SHA-256) of the packed context. It's computed from the sorted set of symbol qualified names and edge tuples. Two identical context packs always produce the same hash regardless of when they were generated.

This means:
- If the user hasn't changed anything and re-queries, the root is unchanged (outcome 1: zero cost)
- If one file was edited, a few symbols shift, and the root changes slightly (outcome 2: delta)
- If the user switched branches entirely, the root is unrecognizable (outcome 3: full retransmit)

## Verifying a delta

A delta is self-verifying. Its header carries `base_root` (the snapshot the delta applies to) and `new_root` (the snapshot it produces). A consumer applies the delta to its copy of the base, recomputes the `pack_root` of the result, and checks it against `new_root`:

- The recomputed root equals `new_root`: the delta applied cleanly, and both sides now hold the same snapshot.
- It does not: the consumer rejects the delta with `root_mismatch` and requests a full payload.

A removal of a symbol that is not present, or an addition of one that already exists, is rejected as `delta_invalid` before the root is computed. Because `pack_root` hashes each symbol's distance, the graph delta's `## added` lines carry a trailing distance field so the consumer can reconstruct the new snapshot exactly (SPEC Section 10.1, 10.4). Each SDK exposes this as `decodeDelta` plus `verifyDelta` for the graph profile, and `verifyGenericDelta` for the generic profile.

## Generic profile delta (v3.3)

Delta is not graph-only. The generic profile supports the same keyed diff over any tabular set (SPEC Section 10a). One column is the identity key (`@id` in the field declaration, `key=id` in the header), and the delta carries `## added` / `## changed` / `## removed` sections:

```
GCF profile=generic delta=true base_root=sha256:aaa9f2... new_root=sha256:bbb4c7... key=id
## added [1]{@id,total,status}
1004|75.00|pending
## changed [1]{@id,total,status}
1002|29.99|shipped
## removed [1]{@id}
1001
```

`## changed` replaces the whole row by identity (no field-level patch); `## removed` carries identity values only. Set semantics apply: row order is not significant, so carry an explicit rank field if order matters. All six SDKs expose this through `encodeGenericFull` / `diffGenericSets` / `encodeGenericDelta` / `verifyGenericDelta`, plus a `GenericDeltaSession` producer helper that re-anchors on a tunable cadence. See the [API reference](/reference/api-go#generic-delta-v3-3) and [cheatsheet](/reference/cheatsheet#delta-encoding-keyed-diff-v3-3).

## Measured savings

Benchmarked on GPT-4o tokenizer against a 100-symbol base topology:

![Delta topology savings](/charts/delta-topology-savings.png)

| Change size | Full encode | Session | Delta | Delta savings |
|-------------|------------|---------|-------|---------------|
| 1 device | 2,327 | 1,100 | 110 | **95.3%** |
| 2 devices | 2,326 | 1,112 | 139 | **94.0%** |
| 5 devices | 2,325 | 1,148 | 267 | **88.5%** |
| 10 devices | 2,327 | 1,213 | 501 | **78.5%** |
| 20 devices | 2,329 | 1,340 | 920 | **60.5%** |

For small topology changes (1-5 devices), delta achieves 88-95% savings vs full re-encode.

## Combining with session dedup

Delta and session dedup are orthogonal. An MCP server uses `encode_with_session` for the full payload on each call (bare refs for known symbols), and `encode_delta` when the topology changed slightly since the last call (only added/removed symbols). The session tracks cumulative state; the delta handles per-call diffs.

### Combined savings (measured)

On a 10-call session with 500 symbols (GPT-4o tokenizer):

| Encoding layer | Total tokens (10 calls) | Savings vs JSON |
|----------------|------------------------|-----------------|
| JSON | 308,285 | baseline |
| GCF format alone | 104,455 | 66.1% |
| + Session dedup | 49,211 | 84.0% |
| + Delta | **17,379** | **94.4%** |

Three layers compose: format savings, session dedup, and delta encoding each add independently measured improvements.
