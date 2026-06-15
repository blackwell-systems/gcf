<script setup lang="ts">
const plugins = [
  {
    name: 'VS Code',
    desc: 'Syntax highlighting for .gcf files',
    install: 'ext install blackwell-systems.gcf-vscode',
    url: 'https://marketplace.visualstudio.com/items?itemName=blackwell-systems.gcf-vscode',
    icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
  },
  {
    name: 'Claude Code',
    desc: 'One-command proxy setup, session stats',
    install: '/plugin install gcf-proxy',
    url: 'https://github.com/blackwell-systems/gcf-claude-plugin',
    icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg',
  },
  {
    name: 'Codex CLI',
    desc: 'One-command proxy setup, session stats',
    install: 'codex plugin add gcf-proxy',
    url: 'https://github.com/blackwell-systems/gcf-codex-plugin',
    icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg',
  },
  {
    name: 'n8n',
    desc: 'Encode/decode node for workflows',
    install: 'npm install n8n-nodes-gcf',
    url: 'https://www.npmjs.com/package/n8n-nodes-gcf',
    icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/n8n.svg',
  },
  {
    name: 'JetBrains',
    desc: 'IntelliJ, PyCharm, WebStorm, GoLand',
    install: 'Search "GCF" in Plugins',
    url: 'https://github.com/blackwell-systems/gcf-jetbrains',
    icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/jetbrains.svg',
  },
]
</script>

<template>
  <div class="plugin-strip">
    <div class="plugin-strip-inner">
      <div class="plugin-grid">
        <a v-for="p in plugins" :key="p.name" :href="p.url" target="_blank" class="plugin-card">
          <img :src="p.icon" :alt="p.name" class="plugin-icon" />
          <div class="plugin-name">{{ p.name }}</div>
          <div class="plugin-desc">{{ p.desc }}</div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-strip {
  max-width: 1152px;
  margin: 0 auto;
  padding: 24px 24px 0;
}

.plugin-strip-inner {
  text-align: center;
}

.plugin-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--vp-c-text-1);
}

.plugin-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.plugin-grid > * {
  flex: 0 0 calc(20% - 10px);
  min-width: 150px;
}

@media (max-width: 960px) {
  .plugin-grid > * { flex: 0 0 calc(33% - 10px); }
}

@media (max-width: 480px) {
  .plugin-grid > * { flex: 0 0 100%; }
}

.plugin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition: all 0.15s;
}

.plugin-card:hover {
  border-color: var(--gcf-blue, #18befc);
  background: color-mix(in srgb, var(--gcf-blue, #18befc) 5%, var(--vp-c-bg-soft));
  transform: translateY(-2px);
}

.plugin-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
  filter: brightness(0) invert(1);
  opacity: 0.85;
}

.plugin-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.plugin-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}

.plugin-install {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--gcf-blue, #18befc);
  background: var(--vp-c-bg);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  white-space: nowrap;
  margin-top: auto;
}
</style>
