<script setup>
import { ref } from 'vue'

const copiedIndex = ref(-1)

async function copyCmd(text, index) {
  try {
    await navigator.clipboard.writeText(text)
    copiedIndex.value = index
    setTimeout(() => { copiedIndex.value = -1 }, 1500)
  } catch {}
}

const commands = [
  'pip install gcf-proxy',
  'npm i -g @blackwell-systems/gcf-proxy',
  'go install github.com/blackwell-systems/gcf-proxy@latest',
]
</script>

<template>
  <div class="proxy-wrap">
    <h2 class="proxy-headline">Zero-code option for MCP servers</h2>
    <p class="proxy-subtitle">One command. 61-71% fewer tokens. Zero code changes.</p>
    <div class="proxy-callout">
      <div class="proxy-left">
        <div class="proxy-title">Zero-code adoption</div>
        <div class="proxy-desc">Drop-in proxy for existing MCP servers. Or integrate natively with any of 6 languages below.</div>
        <a href="https://github.com/blackwell-systems/gcf-proxy" target="_blank" class="proxy-link">View on GitHub →</a>
      </div>
      <div class="proxy-right">
        <div class="proxy-cmds">
          <div
            v-for="(cmd, i) in commands"
            :key="i"
            class="proxy-cmd-wrap"
            @click="copyCmd(cmd, i)"
          >
            <code class="proxy-cmd">{{ cmd }}</code>
            <span class="proxy-copy" :class="{ 'proxy-copied': copiedIndex === i }">
              {{ copiedIndex === i ? 'Copied!' : 'Copy' }}
            </span>
          </div>
        </div>
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

.proxy-cmd-wrap {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.proxy-cmd-wrap:hover {
  background: rgba(24, 190, 252, 0.06);
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
  flex: 1;
}

.proxy-copy {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(24, 190, 252, 0.5);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  padding-left: 8px;
  flex-shrink: 0;
}

.proxy-cmd-wrap:hover .proxy-copy {
  opacity: 1;
}

.proxy-copied {
  color: #4ade80;
}

.proxy-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--gcf-blue, #18befc);
  text-decoration: none;
  margin-top: 10px;
  display: inline-block;
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
