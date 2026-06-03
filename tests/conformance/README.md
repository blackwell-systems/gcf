# GCF Conformance Test Suite

Language-agnostic test fixtures for validating GCF implementations. Each fixture is a JSON file containing an input payload and the expected GCF output.

## Structure

```
tests/conformance/
├── encode/           # Input payload → expected GCF output
├── decode/           # GCF input → expected parsed payload
├── session/          # Multi-call session sequences
├── delta/            # Delta payload encoding
└── errors/           # Malformed input → expected error
```

## Running

Each implementation loads the JSON fixtures and validates its output matches exactly (byte-for-byte for encode, structural equality for decode).

### Go

```bash
cd gcf-go && go test -run TestConformance ./...
```

### TypeScript

```bash
cd gcf-typescript && npx vitest run tests/conformance
```

### Python

```bash
cd gcf-python && pytest tests/test_conformance.py
```

## Fixture format

### Encode fixtures

```json
{
  "name": "basic_two_symbols",
  "description": "Two symbols in different distance groups with one edge",
  "input": {
    "tool": "context_for_task",
    "tokenBudget": 5000,
    "tokensUsed": 1847,
    "packRoot": "",
    "symbols": [
      {"qualifiedName": "pkg.Auth", "kind": "function", "score": 0.78, "provenance": "lsp_resolved", "distance": 0},
      {"qualifiedName": "pkg.Server", "kind": "function", "score": 0.54, "provenance": "lsp_resolved", "distance": 1}
    ],
    "edges": [
      {"source": "pkg.Server", "target": "pkg.Auth", "edgeType": "calls", "status": ""}
    ]
  },
  "expected": "GCF tool=context_for_task budget=5000 tokens=1847 symbols=2\n## targets\n@0 fn pkg.Auth 0.78 lsp_resolved\n## related\n@1 fn pkg.Server 0.54 lsp_resolved\n## edges\n@0<@1 calls\n"
}
```

### Decode fixtures

```json
{
  "name": "basic_decode",
  "description": "Parse a simple GCF payload",
  "input": "GCF tool=context_for_task budget=5000 tokens=1847 symbols=2\n## targets\n@0 fn pkg.Auth 0.78 lsp_resolved\n## related\n@1 fn pkg.Server 0.54 lsp_resolved\n## edges\n@0<@1 calls\n",
  "expected": {
    "tool": "context_for_task",
    "tokenBudget": 5000,
    "tokensUsed": 1847,
    "packRoot": "",
    "symbols": [
      {"qualifiedName": "pkg.Auth", "kind": "function", "score": 0.78, "provenance": "lsp_resolved", "distance": 0},
      {"qualifiedName": "pkg.Server", "kind": "function", "score": 0.54, "provenance": "lsp_resolved", "distance": 1}
    ],
    "edges": [
      {"source": "pkg.Server", "target": "pkg.Auth", "edgeType": "calls", "status": ""}
    ]
  }
}
```

### Session fixtures

```json
{
  "name": "session_second_call",
  "description": "Second call with overlapping symbol becomes bare ref",
  "calls": [
    {
      "input": { "...payload1..." },
      "expected": "...full output..."
    },
    {
      "input": { "...payload2 with overlapping symbol..." },
      "expected": "...output with @N  # previously transmitted..."
    }
  ]
}
```

### Error fixtures

```json
{
  "name": "invalid_header",
  "description": "Missing GCF prefix should error",
  "input": "INVALID tool=test\n@0 fn pkg.Foo 0.9 lsp\n",
  "expectedError": true
}
```

## Contributing fixtures

Add a JSON file to the appropriate directory. Run all three implementations against it to confirm they agree on the output.
