# Session and Delta Interoperability

## Status

This document is an informative design proposal for cross-implementation
interoperability. It does not modify the normative requirements in
[SPEC.md](SPEC.md).

GCF v2.0 defines the wire syntax for session references and delta payloads.
That is sufficient when one library controls both producer state and payload
generation. Cross-vendor use also requires agreement on state identity,
content hashing, recovery, concurrency, and delta application.

The objective is straightforward:

> Two independent implementations should be able to exchange session-aware
> and delta GCF payloads without private coordination.

## What GCF v2.0 Already Defines

The specification currently defines:

- `session=true` and stable session-scoped `@N` identifiers.
- Bare references using `@N  # previously transmitted`.
- `pack_root`, `base_root`, `new_root`, `delta`, and `unchanged` header fields.
- The `removed`, `added`, `edges_removed`, and `edges_added` delta sections.
- Full-payload fallback when a prior root is unknown.
- A recommendation to send a delta only when it is substantially smaller than
  a complete payload.

These rules define valid GCF text. They do not yet define the complete
stateful protocol surrounding that text.

## Interoperability Requirements

### 1. Capability Negotiation

A producer must not emit session references or deltas unless the consumer has
advertised support.

A transport integration should negotiate these capabilities independently:

| Capability | Meaning |
|------------|---------|
| `gcf.graph` | Consumer accepts ordinary graph-profile payloads |
| `gcf.session` | Consumer retains and resolves session-scoped local IDs |
| `gcf.delta` | Consumer retains snapshots and can apply graph deltas |
| `gcf.pack-root.v1` | Consumer implements the agreed root algorithm |

Capability negotiation belongs to the transport, such as MCP initialization,
HTTP headers, or an SDK handshake. It does not need to appear in every GCF
payload.

### 2. Session Identity and Scope

The transport must associate each session-aware payload with an opaque session
identifier. A session should be scoped to:

- one authorization principal;
- one conversation or agent execution;
- one logical producer namespace;
- one agreed GCF protocol version.

Session identifiers should not contain user data and must be unguessable when
they cross a trust boundary. Implementations must not share session state
between users or conversations.

The session identifier may be carried by the surrounding protocol. It does not
need to become a GCF header field unless GCF is used without an enclosing
session-aware transport.

### 3. Session ID Lifecycle

Within a session:

- A local ID must remain bound to the same symbol identity.
- A local ID must not be reused for another symbol.
- New IDs should be allocated monotonically.
- A bare reference is valid only after the full symbol declaration has been
  delivered successfully in that session.
- Session reset invalidates every prior local ID.

Symbol identity should be defined independently of mutable ranking metadata.
For the current graph model, the recommended identity key is:

```text
(kind, qualified_name)
```

Changes to `score`, `provenance`, or distance do not create a different symbol
identity, but may require retransmission or a delta update if the consumer
needs the new values.

### 4. Session Expiry and Context Loss

Server-side state and model-visible context are separate concerns. The server
may still recognize `@7` after the earlier declaration has fallen out of the
model context.

The consumer therefore needs a way to request a complete refresh. Recommended
transport outcomes are:

| Condition | Required behavior |
|-----------|-------------------|
| Session unknown or expired | Return a full non-session payload and a new session |
| Consumer lost prior context | Consumer requests session reset or full refresh |
| Bare reference cannot be resolved | Reject the response and request full refresh |
| Producer cannot prove delivery of a declaration | Emit the full declaration |

Sessions should have documented idle expiry, maximum lifetime, and maximum
retained symbol count.

## Canonical Pack Roots

### Why Canonicalization Matters

Calling `pack_root` a SHA-256 hash is not enough for interoperability. Two
implementations can hash the same logical graph differently because of
ordering, whitespace, score formatting, Unicode handling, or included
metadata.

A future normative revision should define a named algorithm such as
`gcf-pack-root-v1`.

### Proposed `gcf-pack-root-v1`

The root should identify the logical graph snapshot, not a particular GCF text
rendering.

1. Validate all strings as UTF-8 Unicode scalar-value sequences.
2. Build one canonical record for each symbol:

   ```text
   S<TAB>kind<TAB>qualified_name<TAB>score<TAB>provenance<TAB>distance<LF>
   ```

3. Build one canonical record for each edge:

   ```text
   E<TAB>source_kind<TAB>source_qname<TAB>target_kind<TAB>target_qname<TAB>edge_type<LF>
   ```

4. Format scores using the canonical GCF number rules.
5. Sort symbol and edge records independently by unsigned UTF-8 byte order.
6. Concatenate all symbol records followed by all edge records.
7. Compute SHA-256 over those bytes.
8. Serialize the root as lowercase hexadecimal with an algorithm prefix:

   ```text
   sha256:<64 lowercase hex characters>
   ```

Open design decision: whether distance, score, and provenance belong in the
root. Including them makes every observable graph-profile change produce a new
root. Excluding them makes roots more stable but prevents deltas from reliably
communicating metadata-only changes. The safer default is to include them.

The final algorithm requires conformance fixtures containing canonical bytes
and expected roots, including Unicode and ordering cases.

## Delta Semantics

### Snapshot Model

A delta transforms exactly one immutable base snapshot into one immutable new
snapshot:

```text
apply(base_root, delta) -> new_root
```

The consumer must have the complete snapshot identified by `base_root`. A
delta must not be applied to a merely similar or newer snapshot.

### Change Classification

Recommended symbol and edge rules:

| Change | Delta representation |
|--------|----------------------|
| Symbol added | `## added` |
| Symbol removed | `## removed` |
| Symbol identity changed | Remove old symbol, add new symbol |
| Score/provenance/distance changed | Remove old declaration, add updated declaration |
| Edge added | `## edges_added` |
| Edge removed | `## edges_removed` |
| Edge type changed | Remove old edge, add new edge |

Delta section ordering must not affect the resulting logical snapshot.
Encoders should nevertheless use deterministic ordering to enable byte-exact
tests and reproducible debugging.

### Atomic Application

A consumer should apply a delta transactionally:

1. Verify that its current root equals `base_root`.
2. Validate the entire delta before changing local state.
3. Reject duplicate, missing, contradictory, or malformed operations.
4. Apply removals and additions to a temporary snapshot.
5. Recompute the canonical root.
6. Verify that the computed root equals `new_root`.
7. Commit the temporary snapshot only after verification succeeds.

If any step fails, the consumer must retain the base snapshot and request a
full payload. Partial application is not interoperable.

### Unknown Base and Verification Failure

Recommended outcomes:

| Condition | Producer/consumer action |
|-----------|--------------------------|
| Producer does not retain `base_root` | Producer returns a full snapshot |
| Consumer does not retain `base_root` | Consumer requests a full snapshot |
| Computed root differs from `new_root` | Discard delta and request a full snapshot |
| Delta is not smaller enough | Producer returns a full snapshot |

An unchanged response is valid only when the producer has computed the current
root and it exactly matches the consumer-provided root.

## Concurrency and Branching

Two requests can start from the same root and produce different successors:

```text
root A -> root B
root A -> root C
```

This is valid branching, not a hash collision. Implementations should treat
roots as immutable snapshot identifiers and must not assume one global linear
history.

Consumers should apply responses only to the request that supplied the matching
base root. An out-of-order response must not replace a newer snapshot unless
the application explicitly selects that branch.

For transports supporting request IDs, session state should track:

```text
(session_id, request_id, base_root, resulting_root)
```

## Combining Sessions and Deltas

Sessions optimize repeated declarations in the model-visible conversation.
Deltas optimize changes between retained logical snapshots. They solve related
but different problems.

Combining them is possible but introduces ambiguity:

- A delta addition represented as a bare session reference may not contain the
  metadata required to reconstruct the new snapshot.
- The consumer may retain the graph snapshot but not the earlier conversational
  declaration, or vice versa.
- Session reset must not invalidate the identity of a retained delta snapshot.

The conservative interoperability rule is:

> Delta `## added` sections should contain full node declarations. Do not use
> bare session references inside delta payloads.

This keeps delta reconstruction independent from conversational context.
Session references can continue to be used in ordinary non-delta graph
payloads.

## Security and Resource Limits

Implementations should:

- bind sessions and retained roots to the authenticated principal;
- use opaque, high-entropy session identifiers;
- enforce session expiry and storage limits;
- limit retained snapshot count and total bytes;
- reject roots with unsupported algorithms or malformed encodings;
- prevent replay across users, tools, repositories, or authorization scopes;
- treat qualified names and roots as untrusted input;
- avoid using caller-provided roots directly as filesystem paths or database
  object names.

## Suggested Exchange

The enclosing protocol sends a request:

```json
{
  "session_id": "opaque-session-id",
  "accept": ["gcf.graph", "gcf.session", "gcf.delta", "gcf.pack-root.v1"],
  "base_root": "sha256:0123456789abcdef..."
}
```

The producer may return a delta:

```text
GCF profile=graph tool=context_for_task delta=true base_root=sha256:0123456789abcdef... new_root=sha256:fedcba9876543210...
## removed
fn pkg.OldHandler
## added
@18 fn pkg.NewHandler 0.85 lsp_resolved
## edges_removed
pkg.Router -> pkg.OldHandler calls
## edges_added
pkg.Router -> pkg.NewHandler calls
```

If the base is unknown, the producer returns a complete graph payload instead.
If the consumer cannot verify the resulting root, it discards the delta and
requests a complete payload.

## Work Needed for Normative Adoption

Before session and delta behavior is fully interoperable across independent
implementations, the project should add:

1. A normative `pack_root` algorithm and canonical-byte definition.
2. Root conformance fixtures shared by every implementation.
3. A transport-neutral session lifecycle and reset contract.
4. Delta application and validation fixtures.
5. Explicit metadata-update semantics.
6. Unknown-session, unknown-root, and verification-failure test cases.
7. Concurrency and out-of-order response guidance.
8. A declared rule for whether session references are legal inside deltas.

These additions would strengthen stateful interoperability without changing
the ordinary generic or stateless graph profiles.
