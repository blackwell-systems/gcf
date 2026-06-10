---
layout: home
sidebar: false
hero:
  name: GCF
  text: Proven lossless JSON encoding for <span class="hero-highlight">all AI pipelines</span>, with superpowers for graph-shaped data.
  tagline: 'The most token-efficient wire format for LLMs. 79% fewer input tokens than <span class="json">JSON</span>. 63% fewer output tokens. <span class="gcf">GCF</span> averages <strong>90.7% comprehension accuracy</strong> across 10 models and 3 providers where <span class="json">JSON</span> averages 53.6% and <span class="toon">TOON</span> averages 68.5%. Spec v2.0 Stable.'
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
  - title: Proven lossless JSON encoding
    details: '<code>decode(encode(value)) == value</code> for every JSON value. Verified across 200M+ random round-trips and 7.9M fuzz executions. Six implementations, cross-language conformance matrix verified. Spec v2.0 Stable.'
  - title: 79% fewer input tokens
    details: '<span class="json">JSON</span> uses 53,341 tokens at 500 symbols.<br><span class="gcf">GCF</span> uses 11,090. Positional fields, local IDs, and hierarchical grouping eliminate per-record overhead.'
  - title: 63% fewer output tokens
    details: 'LLMs produce valid <span class="gcf">GCF</span> with a 3-line primer. 33% smaller output than <span class="toon">TOON</span>. 5/5 generation validity on every frontier model across 3 providers. Zero training.'
  - title: The format LLMs understand without training
    details: '90.7% comprehension, 5/5 generation validity across every frontier model from Anthropic, OpenAI, and Google. No model has seen GCF in training. <span class="toon">TOON</span>&apos;s own decoder rejects LLM-generated output on 7 of 9 models. 23 comprehension runs, 28 generation runs, zero losses.'
  - title: 133 conformance fixtures, 6 languages
    details: 'All implementations at v1.0.0. Go and Kotlin pass 133/133 fixtures. 200M+ property-based round-trips across all languages. Cross-language encode/decode matrix verified. <a href="https://github.com/blackwell-systems/gcf/blob/main/SPEC.md">Spec v2.0</a> designated Stable.'
  - title: Beats TOON on TOON's benchmark
    details: 'Wins all 6 datasets on <span class="toon">TOON</span> own benchmark. 34% fewer tokens on mixed-structure, 42% on semi-uniform, 3% on flat. Their datasets, their tokenizer, their library.'
---

<!-- <RotatingText /> -->
