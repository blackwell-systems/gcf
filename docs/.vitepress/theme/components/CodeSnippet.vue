<script setup>
import { ref, computed } from 'vue'

const active = ref('python')

const languages = [
  {
    id: 'python',
    label: 'Python',
    code: `from gcf import encode_generic, decode_generic

gcf_string = encode_generic(data)
original   = decode_generic(gcf_string)`,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    code: `import { encodeGeneric, decodeGeneric } from '@blackwell-systems/gcf'

const gcfString = encodeGeneric(data)
const original  = decodeGeneric(gcfString)`,
  },
  {
    id: 'go',
    label: 'Go',
    code: `import gcf "github.com/blackwell-systems/gcf-go"

gcfString := gcf.EncodeGeneric(data)
original, err := gcf.DecodeGeneric(gcfString)`,
  },
  {
    id: 'rust',
    label: 'Rust',
    code: `use gcf::{encode_generic, decode_generic};

let gcf_string = encode_generic(&data);
let original   = decode_generic(&gcf_string)?;`,
  },
  {
    id: 'swift',
    label: 'Swift',
    code: `import GCF

let gcfString = encodeGeneric(data)
let original  = try decodeGeneric(gcfString)`,
  },
  {
    id: 'kotlin',
    label: 'Kotlin',
    code: `import com.blackwellsystems.gcf.encodeGeneric
import com.blackwellsystems.gcf.decodeGeneric

val gcfString = encodeGeneric(data)
val original  = decodeGeneric(gcfString)`,
  },
]

const keywords = new Set([
  'from', 'import', 'const', 'let', 'val', 'var', 'use', 'try', 'err',
])

function highlight(code) {
  return code.split('\n').map(line => {
    return line
      // strings (double-quoted and single-quoted)
      .replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '<span class="hl-str">$&</span>')
      // comments
      .replace(/(\/\/.*)$/g, '<span class="hl-cmt">$1</span>')
      .replace(/(#.*)$/g, '<span class="hl-cmt">$1</span>')
      // keywords at word boundaries
      .replace(/\b(from|import|const|let|val|var|use|try|err|fun|def|func|pub|async|await)\b/g, '<span class="hl-kw">$&</span>')
      // function calls (word followed by parenthesis)
      .replace(/\b(encode_generic|decode_generic|encodeGeneric|decodeGeneric|EncodeGeneric|DecodeGeneric)\b/g, '<span class="hl-fn">$&</span>')
  }).join('\n')
}

const highlighted = computed(() => {
  const lang = languages.find(l => l.id === active.value)
  return lang ? highlight(lang.code) : ''
})
</script>

<template>
  <div class="snippet-wrap">
    <h2 class="snippet-title">Two lines. Six languages.</h2>
    <div class="snippet-inner">
      <div class="snippet-tabs">
        <button
          v-for="lang in languages"
          :key="lang.id"
          :class="['snippet-tab', { active: active === lang.id }]"
          @click="active = lang.id"
        >{{ lang.label }}</button>
      </div>
      <div class="snippet-code">
        <pre><code v-html="highlighted"></code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snippet-wrap {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.snippet-title {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.snippet-inner {
  border: 1px solid rgba(24, 190, 252, 0.15);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.snippet-tabs {
  display: flex;
  border-bottom: 1px solid rgba(24, 190, 252, 0.1);
}

.snippet-tab {
  padding: 8px 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: color 0.2s ease, background 0.2s ease;
}

.snippet-tab:hover {
  color: rgba(255, 255, 255, 0.7);
}

.snippet-tab.active {
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.05);
  border-bottom: 1px solid var(--gcf-blue, #18befc);
}

.snippet-code {
  padding: 20px 24px;
}

.snippet-code pre {
  margin: 0;
  background: transparent !important;
}

.snippet-code code {
  font-size: 0.8rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75) !important;
  background: transparent !important;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
}

.snippet-code :deep(.hl-kw) {
  color: #c792ea;
}

.snippet-code :deep(.hl-str) {
  color: #c3e88d;
}

.snippet-code :deep(.hl-fn) {
  color: #82aaff;
}

.snippet-code :deep(.hl-cmt) {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}
</style>
