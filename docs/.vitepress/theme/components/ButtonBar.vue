<template>
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-btn bb-brand">Get Started</a>
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
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.15s;
}

.bb-brand {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.bb-brand:hover {
  opacity: 0.9;
}

.bb-alt {
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.bb-alt:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
