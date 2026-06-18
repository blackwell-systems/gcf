<template>
  <div class="snippet-wrap">
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
        <pre><code>{{ languages.find(l => l.id === active)?.code }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const active = ref('python')

const languages = [
  {
    id: 'python',
    label: 'Python',
    code: `from gcf import encode_generic, decode_generic

gcf_string = encode_generic(data)    # any dict, list, or nested structure
original   = decode_generic(gcf_string)  # exact same data back`,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    code: `import { encodeGeneric, decodeGeneric } from '@blackwell-systems/gcf'

const gcfString = encodeGeneric(data)    // any object, array, or nested structure
const original  = decodeGeneric(gcfString)  // exact same data back`,
  },
  {
    id: 'go',
    label: 'Go',
    code: `import gcf "github.com/blackwell-systems/gcf-go"

gcfString := gcf.EncodeGeneric(data)              // any interface{}
original, err := gcf.DecodeGeneric(gcfString)      // exact same data back`,
  },
  {
    id: 'rust',
    label: 'Rust',
    code: `use gcf::{encode_generic, decode_generic};

let gcf_string = encode_generic(&data);            // any serde Value
let original   = decode_generic(&gcf_string)?;      // exact same data back`,
  },
  {
    id: 'swift',
    label: 'Swift',
    code: `import GCF

let gcfString = encodeGeneric(data)                // any Swift value
let original  = try decodeGeneric(gcfString)        // exact same data back`,
  },
  {
    id: 'kotlin',
    label: 'Kotlin',
    code: `import com.blackwellsystems.gcf.encodeGeneric
import com.blackwellsystems.gcf.decodeGeneric

val gcfString = encodeGeneric(data)                // any Any?
val original  = decodeGeneric(gcfString)            // exact same data back`,
  },
]
</script>

<style scoped>
.snippet-wrap {
  max-width: 700px;
  margin: 0 auto;
  padding: 0 24px 32px;
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
</style>
