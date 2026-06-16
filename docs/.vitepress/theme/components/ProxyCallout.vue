<template>
  <div class="proxy-wrap">
    <h2 class="proxy-headline">Don't want to change code?</h2>
    <p class="proxy-subtitle">One command. 61-71% fewer tokens. Zero code changes.</p>
    <div class="proxy-callout">
      <div class="proxy-left">
        <div class="proxy-title">Zero-code adoption</div>
        <div class="proxy-desc">Drop-in proxy for existing MCP servers. Or integrate natively with any of 6 languages below.</div>
      </div>
      <div class="proxy-right">
        <div class="proxy-cmds">
          <code class="proxy-cmd">pip install gcf-proxy</code>
          <code class="proxy-cmd">npm i -g @blackwell-systems/gcf-proxy</code>
          <code class="proxy-cmd">go install github.com/blackwell-systems/gcf-proxy@latest</code>
        </div>
        <a href="https://github.com/blackwell-systems/gcf-proxy" target="_blank" class="proxy-link">GitHub</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proxy-wrap {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 16px;
}

.proxy-headline {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  text-align: center;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.proxy-subtitle {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  text-align: center;
  margin: 0 0 20px;
  letter-spacing: 0.02em;
}

.proxy-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 28px;
  background: #1133487d;
  border: 1px solid rgba(24, 190, 252, 0.2);
  border-radius: 14px;
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

.proxy-cmds {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.proxy-hook {
  color: var(--gcf-blue, #18befc);
  font-weight: 700;
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

@media (max-width: 768px) {
  .proxy-wrap {
    padding: 0 16px 12px;
  }
  .proxy-callout {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }
  .proxy-right {
    flex-direction: column;
    width: 100%;
  }
  .proxy-cmd {
    font-size: 0.72rem;
    padding: 6px 10px;
    white-space: normal;
    word-break: break-all;
  }
}
</style>
