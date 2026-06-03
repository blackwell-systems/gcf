import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GCF',
  description: 'Token-optimized wire format for LLM tool responses',
  base: '/gcf/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/spec' },
      { text: 'Benchmarks', link: '/guide/benchmarks' },
      { text: 'Playground', link: '/playground' },
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
          { text: 'Benchmarks', link: '/guide/benchmarks' },
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
    socialLinks: [
      { icon: 'github', link: 'https://github.com/blackwell-systems/gcf' },
    ],
  },
})
