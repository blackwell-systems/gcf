<script setup lang="ts">
const features = [
  {
    icon: '🔄',
    title: 'The universal pivot for structured data',
    details: 'JSON, YAML, TOML, CSV, MessagePack: any format in, GCF in the context window, any format out. One format that speaks every format. No other wire format operates across format boundaries.<br><br><code class="terminal">decode(encode(value)) == value</code> for every structured value. Verified across <a href="/guide/lossless-verification" style="color: var(--gcf-blue, #18befc); font-weight: 800; font-style: italic; text-decoration: none;">43,000,000,000+ lossless round-trips</a> in 5 formats and 6 languages.',
  },
  {
    icon: '📉',
    title: '53-71% fewer input tokens',
    details: 'At 500 orders: <span class="json">JSON</span> uses 80K tokens, <span class="gcf">GCF</span> uses 24K.<br><br>At 1000 orders, JSON doesn\'t even fit in a 200K context window. GCF fits in 47K. Positional fields, inline schemas, and hierarchical grouping eliminate per-record overhead.',
  },
  {
    icon: '✍️',
    title: '63% fewer output tokens',
    details: 'LLMs produce valid <span class="gcf">GCF</span> with a 3-line primer.<br><br>33% smaller output than <span class="toon">TOON</span>. 5/5 generation validity on every frontier model across 3 providers. Zero training.',
  },
  {
    icon: '🧠',
    title: '100% comprehension on every frontier model',
    details: 'The only format that never fails. Tested across Claude, GPT-5.5, Gemini, and Mistral with zero format instructions. On structurally complex code graphs, GCF scores 91.2% where <span class="json">JSON</span> drops to 53.4% and <span class="toon">TOON</span> to 68.2%. 2,400+ evaluations, 4 providers.',
  },
  {
    icon: '🔒',
    title: 'Proven lossless. 6 languages. Spec v3.1 Stable.',
    details: '43B+ (yes, really) round-trips across JSON, YAML, TOML, CSV, and MessagePack. Zero failures. 157 conformance fixtures. Cross-language 6x6 encode/decode matrix verified. <a href="https://github.com/blackwell-systems/gcf/blob/main/SPEC.md">Read the spec</a>.',
  },
  {
    icon: '🏆',
    title: '25.5% fewer tokens than TOON (15 datasets)',
    details: 'Wins 13/15 real-world datasets. 38% fewer on semi-uniform data, 30% on nested, 32% on the exact comprehension eval payload. <span class="toon">TOON</span>\'s two wins total 104 tokens combined.',
  },
]
</script>

<template>
  <div class="feature-band">
  <div class="feature-cards">
    <div class="feature-grid">
      <div v-for="(f, i) in features" :key="i" class="feature-card">
        <div class="feature-icon">{{ f.icon }}</div>
        <h3 class="feature-title">{{ f.title }}</h3>
        <p class="feature-details" v-html="f.details"></p>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.feature-band {
  background: #010102;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
  background-size: 20px 20px;
  padding: 8px 0;
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.feature-cards {
  max-width: 1152px;
  margin: 0 auto;
  padding: 32px 24px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 960px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .feature-grid { grid-template-columns: 1fr; }
}

.feature-card {
  position: relative;
  padding: 24px;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 14px;
  background: rgba(24, 190, 252, 0.03);
  overflow: visible;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(24, 190, 252, 0.035);
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
  clip-path: polygon(
    0 0, 14px 0, 14px 1px, 1px 1px, 1px 14px, 0 14px,
    0 calc(100% - 14px), 1px calc(100% - 14px), 1px calc(100% - 1px), 14px calc(100% - 1px), 14px 100%, 0 100%,
    100% 100%, calc(100% - 14px) 100%, calc(100% - 14px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 14px), 100% calc(100% - 14px),
    100% 14px, calc(100% - 1px) 14px, calc(100% - 1px) 1px, calc(100% - 14px) 1px, calc(100% - 14px) 0, 100% 0
  );
}

.feature-card:hover {
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
}

.feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
  line-height: 1.4;
}

.feature-details {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.feature-details :deep(a) {
  color: var(--gcf-blue, #18befc);
  text-decoration: none;
  font-weight: 600;
}

.feature-details :deep(a:hover) {
  text-decoration: underline;
}

.feature-details :deep(em) {
  font-style: italic;
  color: var(--vp-c-text-1);
}
</style>
