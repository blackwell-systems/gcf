<script setup lang="ts">
const languages = [
  { name: 'Go', version: 'v1.3.2', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg', url: 'https://github.com/blackwell-systems/gcf-go', registry: 'pkg.go.dev' },
  { name: 'Rust', version: 'v2.2.2', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/rust.svg', url: 'https://github.com/blackwell-systems/gcf-rust', registry: 'crates.io', invert: true },
  { name: 'TypeScript', version: 'v2.2.3', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', url: 'https://github.com/blackwell-systems/gcf-typescript', registry: 'npm' },
  { name: 'Python', version: 'v2.2.2', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', url: 'https://github.com/blackwell-systems/gcf-python', registry: 'PyPI' },
  { name: 'Swift', version: 'v2.2.2', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg', url: 'https://github.com/blackwell-systems/gcf-swift', registry: 'SPM' },
  { name: 'Kotlin', version: 'v2.2.2', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg', url: 'https://github.com/blackwell-systems/gcf-kotlin', registry: 'JitPack' },
]
</script>

<template>
  <div class="lang-strip">
    <div class="lang-strip-inner">
      <div class="lang-grid">
        <a v-for="lang in languages" :key="lang.name" :href="lang.url" target="_blank" class="lang-card">
          <img :src="lang.icon" :alt="lang.name" :class="['lang-icon', { 'lang-icon-invert': lang.invert }]" />
          <div class="lang-name">{{ lang.name }}</div>
          <div class="lang-version">{{ lang.version }}</div>
          <div class="lang-check">174/174</div>
          <div class="lang-registry">{{ lang.registry }}</div>
        </a>
      </div>
      <div class="lang-deps">
        <span class="lang-deps-rule"></span>
        <span class="lang-deps-text">Zero runtime dependencies · No transitive deps · No supply chain risk · <span class="lang-deps-em">Permanent commitment</span> · MIT licensed</span>
        <span class="lang-deps-rule"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proxy-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 28px;
  background: color-mix(in srgb, var(--gcf-blue, #18befc) 6%, var(--vp-c-bg-soft));
  border: 1px solid color-mix(in srgb, var(--gcf-blue, #18befc) 20%, var(--vp-c-border));
  border-radius: 12px;
  margin-bottom: 32px;
  text-align: left;
}

.proxy-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.proxy-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.proxy-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.proxy-cmd {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--gcf-blue, #18befc);
  white-space: nowrap;
}

.proxy-cmds {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.proxy-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--gcf-blue, #18befc);
  text-decoration: none;
}

.proxy-link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .proxy-callout {
    flex-direction: column;
    text-align: center;
  }
  .proxy-right {
    flex-direction: column;
  }
}

.lang-strip {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 24px;
}

.lang-strip-inner {
  text-align: center;
}

.lang-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--vp-c-text-1);
}

.lang-subtitle {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-bottom: 28px;
}

.lang-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .lang-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 480px) {
  .lang-grid { grid-template-columns: repeat(2, 1fr); }
}

.lang-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px 16px;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 14px;
  background: rgba(24, 190, 252, 0.03);
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease,
              box-shadow 0.2s ease,
              border-color 0.2s ease,
              background 0.2s ease;
}

.lang-card:hover {
  border-color: rgba(24, 190, 252, 0.2);
  background: rgba(24, 190, 252, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(24, 190, 252, 0.04);
}

.lang-icon {
  width: 65px;
  height: 65px;
  margin-bottom: 10px;
}

.lang-icon-invert {
  filter: brightness(0) invert(1);
  opacity: 0.85;
}

.lang-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 2px;
}

.lang-version {
  font-size: 0.75rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
}

.lang-check {
  font-size: 0.7rem;
  font-weight: 700;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  padding: 1px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
}

.lang-registry {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.lang-deps {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.lang-deps-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(24, 190, 252, 0.15), transparent);
}

.lang-deps-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

.lang-deps-em {
  color: rgba(255, 255, 255, 0.5);
}
</style>
