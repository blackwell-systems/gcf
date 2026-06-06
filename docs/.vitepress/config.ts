import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GCF',
  description: 'Token-optimized wire format for LLM tool responses',
  base: '/',
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { property: 'og:title', content: 'GCF - Graph Compact Format' }],
    ['meta', { property: 'og:description', content: 'The most token-efficient wire format for LLMs. 79% fewer tokens than JSON. 34% fewer than TOON. 52% smaller output. Beats TOON on their own benchmark.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://gcformat.com/' }],
    ['meta', { property: 'og:image', content: 'https://gcformat.com/og.png' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'GCF - Graph Compact Format' }],
    ['meta', { name: 'twitter:description', content: 'The most token-efficient wire format for LLMs. 79% fewer tokens than JSON. 34% fewer than TOON. Beats TOON on their own benchmark.' }],
    ['meta', { name: 'keywords', content: 'GCF, graph compact format, LLM, tokens, wire format, MCP, TOON, JSON alternative, token efficiency, agent communication' }],
    ['link', { rel: 'canonical', href: 'https://gcformat.com/' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Playground', link: '/playground' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'GCF vs TOON', link: '/guide/vs-toon' },
      { text: 'Benchmarks', link: '/guide/benchmarks' },
      { text: 'Reference', link: '/reference/spec' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Format Overview', link: '/guide/format-overview' },
          { text: 'Session Deduplication', link: '/guide/sessions' },
          { text: 'Delta Encoding', link: '/guide/delta' },
          { text: 'Using GCF with LLMs', link: '/guide/llm-integration' },
          { text: 'MCP Integration', link: '/guide/mcp' },
          { text: 'MCP Proxy (Zero-Code)', link: '/guide/proxy' },
          { text: 'Streaming Encoding', link: '/guide/streaming' },
          { text: 'Benchmarks', link: '/guide/benchmarks' },
          { text: 'Benchmarks (Full Data)', link: '/guide/eval-results' },
          { text: 'GCF vs TOON', link: '/guide/vs-toon' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Specification', link: '/reference/spec' },
          { text: 'Syntax Cheatsheet', link: '/reference/cheatsheet' },
          { text: 'Token Savings Proof', link: '/reference/token-savings-proof' },
          { text: 'API (Go)', link: '/reference/api-go' },
          { text: 'API (TypeScript)', link: '/reference/api-typescript' },
          { text: 'API (Python)', link: '/reference/api-python' },
          { text: 'API (Rust)', link: '/reference/api-rust' },
          { text: 'API (Swift)', link: '/reference/api-swift' },
          { text: 'API (Kotlin)', link: '/reference/api-kotlin' },
        ],
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Implementations', link: '/ecosystem/implementations' },
          { text: 'Who Uses GCF', link: '/ecosystem/adopters' },
        ],
      },
    ],
    logo: '/favicon-32x32.png',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/blackwell-systems/gcf' },
    ],
  },
})
