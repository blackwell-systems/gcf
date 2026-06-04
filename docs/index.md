---
layout: home
sidebar: false
hero:
  name: GCF
  text: Graph Compact Format
  tagline: Token-optimized wire format for structured LLM tool responses. 84% fewer tokens than JSON, 34% fewer than TOON. Encodes any data, not just graphs.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Benchmarks
      link: /guide/benchmarks
    - theme: alt
      text: GitHub
      link: https://github.com/blackwell-systems/gcf

features:
  - title: 79% fewer tokens than JSON
    details: Positional fields, local IDs, and hierarchical grouping eliminate per-record overhead. Savings grow with payload size.
  - title: 34% fewer tokens than TOON
    details: Tested on TOON's own benchmark with their datasets and tokenizer. GCF wins on mixed-structure, flat, and semi-uniform data.
  - title: 100% LLM comprehension
    details: At 500 symbols, JSON scores 66.7% on structured extraction (it miscounts). GCF scores 100% at the lowest token cost.
  - title: Gets cheaper over time
    details: Session deduplication (92.7% savings by 5th call) and delta encoding (81.2% savings on re-queries). No other format has these.
  - title: 75% cheaper output tokens
    details: LLMs produce valid GCF with a 3-line primer. 75% fewer output tokens than JSON, 52% fewer than TOON. Proven at 100 symbols.
  - title: Zero dependencies
    details: Go, TypeScript, and Python implementations. Each is a single package with no runtime dependencies.
---
