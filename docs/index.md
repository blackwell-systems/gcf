---
layout: home
sidebar: false
hero:
  name: GCF
  text: Drop-in JSON replacement for all AI pipelines. Superpowers for graph-shaped data.
  tagline: 'The most token-efficient wire format for LLMs. 79% fewer input tokens than <span class="json">JSON</span>. 75% fewer output tokens. <span class="gcf">GCF</span> scores <strong>100% comprehension accuracy</strong> at 500 symbols where <span class="json">JSON</span> scores 76.9% and <span class="toon">TOON</span> scores 92.3%.'
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
    details: '<span class="json">JSON</span> uses 53,341 tokens at 500 symbols.<br><span class="gcf">GCF</span> uses 11,090. Positional fields, local IDs, and hierarchical grouping eliminate per-record overhead.'
  - title: 75% fewer output tokens
    details: 'LLMs produce valid <span class="gcf">GCF</span> with a 3-line primer. 52% smaller output than <span class="toon">TOON</span>. Proven at 5 to 100 symbols with 100% decoder validity.'
  - title: Optimized for the reader that matters
    details: 'At 500 symbols, <span class="json">JSON</span> drops to 76.9% accuracy and <span class="toon">TOON</span> to 92.3%. <span class="gcf">GCF</span> scores 100% (13/13). <span class="toon">TOON</span> fails on distance grouping. <span class="json">JSON</span> drowns in structural noise. <span class="gcf">GCF</span> is the only format with perfect comprehension at scale, at 32% fewer tokens than <span class="toon">TOON</span>.'
  - title: Gets cheaper every call
    details: 'Session deduplication (92.7% savings by 5th call) and delta encoding (81.2% on re-queries). No other format has these. They compound.'
  - title: Beats TOON on TOON's benchmark
    details: 'Wins all 6 datasets on <span class="toon">TOON</span> own benchmark. 34% fewer tokens on mixed-structure, 42% on semi-uniform, 3% on flat. Their datasets, their tokenizer, their library.'
  - title: Six languages, zero dependencies
    details: 'Go, TypeScript, Python, Rust, Swift, and Kotlin. Graph profile (encode) and generic profile (encodeGeneric). CLI included. MCP proxy for zero-code adoption.'
---
