---
layout: home
sidebar: false
hero:
  name: GCF
  text: Graph Compact Format
  tagline: The most token-efficient wire format for LLMs. 79% fewer input tokens than JSON. 75% fewer output tokens. 100% comprehension accuracy at scale.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Try the Playground
      link: /playground
    - theme: alt
      text: GCF vs TOON
      link: /guide/vs-toon

features:
  - title: 79% fewer input tokens
    details: Positional fields, local IDs, and hierarchical grouping eliminate per-record overhead. At 500 symbols, JSON uses 53,341 tokens. GCF uses 11,090.
  - title: 75% fewer output tokens
    details: LLMs produce valid GCF with a 3-line primer. 52% smaller output than TOON. Proven at 5 to 100 symbols with 100% decoder validity.
  - title: 100% comprehension, where JSON fails
    details: At 500 symbols, JSON drops to 66.7% accuracy (it miscounts records). GCF and TOON both score 100%. GCF does it in 32% fewer tokens.
  - title: Gets cheaper every call
    details: Session deduplication (92.7% savings by 5th call) and delta encoding (81.2% on re-queries). No other format has these. They compound.
  - title: Beats TOON on TOON's benchmark
    details: 34% fewer tokens on mixed-structure data, 44% on semi-uniform, 3% on flat tabular. Tested with their datasets, their tokenizer, their library.
  - title: Three languages, zero dependencies
    details: Go, TypeScript, and Python. Graph profile (encode) and tabular profile (encodeGeneric). CLI included. MCP proxy for zero-code adoption.
---
