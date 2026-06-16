<script setup>
import { ref } from 'vue'
const style = ref(1)
</script>

<template>
  <div class="button-bar">
    <div class="style-toggle">
      <button v-for="i in 4" :key="i" @click="style = i" :class="{ active: style === i }">{{ i }}</button>
    </div>

    <!-- Style 1: Pill gradient -->
    <div v-if="style === 1" class="button-bar-inner">
      <a href="/guide/getting-started" class="s1-brand">
        Get Started <span class="s1-arrow">→</span>
      </a>
      <a href="/playground" class="s1-alt">Try the Playground</a>
      <a href="/calculator" class="s1-alt">Cost Calculator</a>
      <a href="/guide/vs-toon" class="s1-alt">GCF vs TOON</a>
    </div>

    <!-- Style 2: Outlined glow -->
    <div v-if="style === 2" class="button-bar-inner">
      <a href="/guide/getting-started" class="s2-brand">
        Get Started <span class="s2-arrow">→</span>
      </a>
      <a href="/playground" class="s2-alt">Try the Playground</a>
      <a href="/calculator" class="s2-alt">Cost Calculator</a>
      <a href="/guide/vs-toon" class="s2-alt">GCF vs TOON</a>
    </div>

    <!-- Style 3: Big CTA + text links -->
    <div v-if="style === 3" class="s3-layout">
      <a href="/guide/getting-started" class="s3-brand">
        Get Started <span class="s3-arrow">→</span>
      </a>
      <div class="s3-links">
        <a href="/playground" class="s3-link">Playground</a>
        <span class="s3-sep">·</span>
        <a href="/calculator" class="s3-link">Calculator</a>
        <span class="s3-sep">·</span>
        <a href="/guide/vs-toon" class="s3-link">GCF vs TOON</a>
      </div>
    </div>

    <!-- Style 4: Ghost underline -->
    <div v-if="style === 4" class="button-bar-inner">
      <a href="/guide/getting-started" class="s4-brand">
        Get Started <span class="s4-arrow">→</span>
      </a>
      <a href="/playground" class="s4-ghost">Try the Playground</a>
      <a href="/calculator" class="s4-ghost">Cost Calculator</a>
      <a href="/guide/vs-toon" class="s4-ghost">GCF vs TOON</a>
    </div>
  </div>
</template>

<style scoped>
.button-bar {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.button-bar-inner {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.style-toggle {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
}

.style-toggle button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(24, 190, 252, 0.2);
  background: rgba(24, 190, 252, 0.05);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.style-toggle button.active {
  background: var(--gcf-blue, #18befc);
  color: #000;
  border-color: var(--gcf-blue, #18befc);
}

/* ── Style 1: Pill gradient ── */
.s1-brand, .s1-alt {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 50px;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.s1-brand {
  background: linear-gradient(135deg, #18befc, #0d8abf);
  color: #000;
  font-weight: 700;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(24, 190, 252, 0.3);
}

.s1-brand:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(24, 190, 252, 0.4);
}

.s1-alt {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.s1-alt:hover {
  background: rgba(24, 190, 252, 0.08);
  color: #fff;
  border-color: rgba(24, 190, 252, 0.2);
  transform: translateY(-2px);
}

.s1-arrow {
  transition: transform 0.3s;
}

.s1-brand:hover .s1-arrow {
  transform: translateX(4px);
}

/* ── Style 2: Outlined glow ── */
.s2-brand, .s2-alt {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  letter-spacing: 0.01em;
  border: 1.5px solid transparent;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.s2-brand {
  border-color: var(--gcf-blue, #18befc);
  color: var(--gcf-blue, #18befc);
  background: transparent;
  gap: 8px;
}

.s2-brand:hover {
  background: var(--gcf-blue, #18befc);
  color: #000;
  box-shadow: 0 0 28px rgba(24, 190, 252, 0.35);
  transform: translateY(-2px);
}

.s2-alt {
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
}

.s2-alt:hover {
  border-color: rgba(24, 190, 252, 0.4);
  color: var(--gcf-blue, #18befc);
  box-shadow: 0 0 20px rgba(24, 190, 252, 0.15);
  transform: translateY(-2px);
}

.s2-arrow {
  transition: transform 0.3s;
}

.s2-brand:hover .s2-arrow {
  transform: translateX(4px);
}

/* ── Style 3: Big CTA + text links ── */
.s3-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.s3-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 44px;
  font-size: 1.05rem;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  background: var(--gcf-blue, #18befc);
  color: #000;
  box-shadow: 0 4px 20px rgba(24, 190, 252, 0.3);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.s3-brand:hover {
  background: #fff;
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.s3-arrow {
  transition: transform 0.3s;
  font-size: 1.1em;
}

.s3-brand:hover .s3-arrow {
  transform: translateX(4px);
}

.s3-links {
  display: flex;
  gap: 8px;
  align-items: center;
}

.s3-link {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.s3-link:hover {
  color: var(--gcf-blue, #18befc);
}

.s3-sep {
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.85rem;
}

/* ── Style 4: Ghost underline ── */
.s4-brand, .s4-ghost {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.01em;
  border-radius: 8px;
  position: relative;
  transition: color 0.3s;
}

.s4-brand {
  color: var(--gcf-blue, #18befc);
  gap: 8px;
  font-weight: 700;
}

.s4-brand::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 24px;
  right: 24px;
  height: 2px;
  background: var(--gcf-blue, #18befc);
  transform: scaleX(0.6);
  opacity: 0.4;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
}

.s4-brand:hover::after {
  transform: scaleX(1);
  opacity: 1;
}

.s4-ghost {
  color: rgba(255, 255, 255, 0.45);
}

.s4-ghost::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 24px;
  right: 24px;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.s4-ghost:hover {
  color: rgba(255, 255, 255, 0.8);
}

.s4-ghost:hover::after {
  transform: scaleX(1);
}

.s4-arrow {
  transition: transform 0.3s;
}

.s4-brand:hover .s4-arrow {
  transform: translateX(4px);
}

@media (max-width: 640px) {
  .button-bar-inner, .s3-layout {
    flex-direction: column;
    align-items: center;
  }
  .s1-brand, .s1-alt, .s2-brand, .s2-alt, .s4-brand, .s4-ghost {
    width: 100%;
    justify-content: center;
  }
  .s3-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
