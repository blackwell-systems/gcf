---
layout: home
sidebar: false
hero:
  name: GCF
  text: Drop-in JSON replacement for all AI pipelines, with superpowers for graph-shaped data.
  tagline: 'The most token-efficient wire format for LLMs. 79% fewer input tokens than <span class="json">JSON</span>. 63% fewer output tokens. <span class="gcf">GCF</span> averages <strong>90.5% comprehension accuracy</strong> across 10 models and 3 providers where <span class="json">JSON</span> averages 53.6% and <span class="toon">TOON</span> averages 68.5%. No model has been trained on GCF.'
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
  - title: 63% fewer output tokens
    details: 'LLMs produce valid <span class="gcf">GCF</span> with a 3-line primer. 33% smaller output than <span class="toon">TOON</span>. 5/5 generation validity on every frontier model across 3 providers. Zero training.'
  - title: Optimized for the reader that matters
    details: 'At 500 symbols across 10 models, <span class="json">JSON</span> averages 53.6% accuracy and <span class="toon">TOON</span> averages 68.5%. <span class="gcf">GCF</span> averages 90.5% (four models hit 100%). 23 runs, 3 providers, zero training. <span class="toon">TOON</span> fails on distance grouping. <span class="json">JSON</span> drowns in structural noise.'
  - title: Gets cheaper every call
    details: 'Session deduplication (92.7% savings by 5th call) and delta encoding (81.2% on re-queries). No other format has these. They compound.'
  - title: Beats TOON on TOON's benchmark
    details: 'Wins all 6 datasets on <span class="toon">TOON</span> own benchmark. 34% fewer tokens on mixed-structure, 42% on semi-uniform, 3% on flat. Their datasets, their tokenizer, their library.'
  - title: Six languages, zero dependencies
    details: 'Go, TypeScript, Python, Rust, Swift, and Kotlin. Graph profile (encode) and generic profile (encodeGeneric). CLI included. MCP proxy for zero-code adoption.'
---
