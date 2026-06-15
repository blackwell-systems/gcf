<template>
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-btn bb-brand">
        <span class="bb-text">Get Started</span>
        <span class="bb-arrow">→</span>
      </a>
      <a href="/playground" class="bb-btn bb-alt">Try the Playground</a>
      <a href="/calculator" class="bb-btn bb-alt">Cost Calculator</a>
      <a href="/guide/vs-toon" class="bb-btn bb-alt">GCF vs TOON</a>
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
  gap: 14px;
  flex-wrap: wrap;
}

.bb-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  letter-spacing: 0.01em;
}

.bb-brand {
  background: var(--gcf-blue, #18befc);
  color: #000;
  font-weight: 700;
  gap: 8px;
  box-shadow: 0 0 20px rgba(24, 190, 252, 0.2);
}

.bb-brand:hover {
  box-shadow: 0 0 30px rgba(24, 190, 252, 0.4);
  transform: translateY(-1px);
}

.bb-arrow {
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  font-size: 1.1em;
}

.bb-brand:hover .bb-arrow {
  transform: translateX(3px);
}

.bb-alt {
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--vp-c-text-1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(4px);
}

.bb-alt:hover {
  border-color: var(--gcf-blue, #18befc);
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.06);
  transform: translateY(-1px);
}
</style>
