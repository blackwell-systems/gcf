<template>
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-btn bb-brand">
        Get Started <span class="bb-arrow">→</span>
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
  gap: 12px;
  flex-wrap: wrap;
}

.bb-btn {
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

.bb-brand {
  border-color: var(--gcf-blue, #18befc);
  color: var(--gcf-blue, #18befc);
  background: transparent;
  gap: 8px;
  font-weight: 700;
}

.bb-brand:hover {
  background: var(--gcf-blue, #18befc);
  color: #000;
  box-shadow: 0 0 28px rgba(24, 190, 252, 0.35);
  transform: translateY(-2px);
}

.bb-arrow {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 1.1em;
}

.bb-brand:hover .bb-arrow {
  transform: translateX(4px);
}

.bb-alt {
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
}

.bb-alt:hover {
  border-color: rgba(24, 190, 252, 0.4);
  color: var(--gcf-blue, #18befc);
  box-shadow: 0 0 20px rgba(24, 190, 252, 0.15);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .button-bar {
    padding: 0 16px 24px;
  }
  .button-bar-inner {
    gap: 8px;
  }
  .bb-btn {
    padding: 10px 16px;
    font-size: 0.8rem;
    width: 100%;
    justify-content: center;
  }
}
</style>
