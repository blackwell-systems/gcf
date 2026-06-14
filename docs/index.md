---
layout: home
sidebar: false
hero:
  name: GCF
  text: The AI-native wire format for <span class="hero-highlight">structured data</span>.
  tagline: '71% fewer tokens than <span class="json">JSON</span>. <strong>100% comprehension</strong> on every frontier model. 23 billion+ lossless round-trips across 5 formats (<span class="json">JSON</span>, YAML, TOML, CSV, MessagePack). Spec v3.1 Stable.'
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Try the Playground
      link: /playground
    - theme: brand
      text: Cost Calculator
      link: /calculator
    - theme: alt
      text: GCF vs TOON
      link: /guide/vs-toon

features:
  - title: Proven lossless JSON encoding
    details: '<code class="terminal">decode(encode(value)) == value</code> for every structured value. Verified across <em>23,000,000,000+</em> random round-trips across 5 formats (JSON, YAML, TOML, CSV, MessagePack) and 6 language implementations. 157 conformance fixtures, cross-language matrix verified. Spec v3.1 Stable.'
  - title: 53-71% fewer input tokens
    details: 'At 500 orders: <span class="json">JSON</span> uses 80K tokens, <span class="gcf">GCF</span> uses 24K.<br><br>At 1000 orders, JSON doesn&apos;t even fit in a 200K context window. GCF fits in 47K. Positional fields, inline schemas, and hierarchical grouping eliminate per-record overhead.'
  - title: 63% fewer output tokens
    details: 'LLMs produce valid <span class="gcf">GCF</span> with a 3-line primer.<br><br>33% smaller output than <span class="toon">TOON</span>. 5/5 generation validity on every frontier model across 3 providers. Zero training.'
  - title: 100% comprehension on every frontier model
    details: 'The only format that never fails. Tested across Claude, GPT-5.5, and Gemini with zero format instructions. On structurally complex code graphs, GCF scores 90.7% where <span class="json">JSON</span> drops to 53.6% and <span class="toon">TOON</span> to 68.5%. 1,700+ evaluations, 3 providers.'
  - title: Proven lossless. 6 languages. Spec v3.1 Stable.
    details: '23B+ (yes, really) round-trips across JSON, YAML, TOML, CSV, and MessagePack. Zero failures. 157 conformance fixtures. Cross-language 6x6 encode/decode matrix verified. <a href="https://github.com/blackwell-systems/gcf/blob/main/SPEC.md">Read the spec</a>.'
  - title: 25.5% fewer tokens than TOON (15 datasets)
    details: 'Wins 13/15 real-world datasets. 38% fewer on semi-uniform data, 30% on nested, 32% on the exact comprehension eval payload. <span class="toon">TOON</span>&apos;s two wins total 104 tokens combined.'
---

<LanguageStrip />

<HowItWorks />
