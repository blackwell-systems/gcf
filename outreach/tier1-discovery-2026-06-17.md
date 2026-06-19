# GCF Outreach Discovery Report - Tier 1
**Date:** 2026-06-17
**Scope:** TOON users, token optimization repos, MCP servers with heavy JSON payloads

---

## Category A: TOON Users (Convert to GCF)

These repos already use TOON for token reduction. They changed their code once; the pitch is better numbers and actual lossless guarantees.

**Pitch:** You switched from JSON to TOON for 15-30% savings. GCF delivers 53-71%, beats TOON by 25.5% across 15 datasets, and is verified lossless across 43B+ round-trips. TOON has a 7.54% failure rate under adversarial fuzz testing including 176K silent data corruptions.

### High Priority (1,000+ stars, active)

| Stars | Repo | What | TOON Usage | Approach |
|-------|------|------|------------|----------|
| 4,230 | [Pimzino/spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp) | Spec-driven dev workflow MCP server | `import { encode } from '@toon-format/toon'` in src/types.ts | Issue: benchmark comparison on their payloads |
| 3,897 | [IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge) | AI gateway/proxy with TOON encoder plugin | Python TOON encoder plugin | Issue: GCF plugin as alternative, show savings delta |
| 3,064 | [GladysAssistant/Gladys](https://github.com/GladysAssistant/Gladys) | Privacy-first home assistant with MCP | `require('@toon-format/toon')` in MCP service | Issue: GCF integration for MCP responses |
| 2,930 | [deepnote/deepnote](https://github.com/deepnote/deepnote) | Jupyter replacement with TOON analysis | `import { encode as toonEncode }` in CLI utils | Issue: compare GCF vs TOON on notebook data payloads |
| 1,314 | [rest-sh/restish](https://github.com/rest-sh/restish) | REST API CLI tool with TOON output | Design doc for TOON output format | Issue or PR: add GCF output format |
| 1,141 | [mongodb/kingfisher](https://github.com/mongodb/kingfisher) | Rust secret scanner with TOON encoding | Rust TOON with KeyFolding | Issue: GCF Rust crate as drop-in, show size comparison |

### Medium Priority (100-999 stars, active)

| Stars | Repo | What | TOON Usage | Approach |
|-------|------|------|------------|----------|
| 869 | [kunchenguid/axi](https://github.com/kunchenguid/axi) | Agent SDK with TOON output layer | `import { encode } from "@toon-format/toon"` in output.ts | Issue: GCF as output format option |
| 556 | [automateyournetwork/netclaw](https://github.com/automateyournetwork/netclaw) | Network MCP server, claims 40-60% TOON savings | TOON serialization for all MCP responses | Issue: GCF delivers 53-71%, benchmark on network data |
| 253 | [vinkius-labs/mcpfusion](https://github.com/vinkius-labs/mcpfusion) | MCP framework with TOON response encoding | `toonSuccess` function in response.ts | Issue: GCF integration |
| 251 | [PeterWaher/IoTGateway](https://github.com/PeterWaher/IoTGateway) | C# IoT gateway with TOON output | TOON output with KeyFolding | Issue: GCF comparison on IoT telemetry data |
| 184 | [skorokithakis/stavrobot](https://github.com/skorokithakis/stavrobot) | AI personal assistant with TOON | `import { encode } from "@toon-format/toon"` in toon.ts | Issue: GCF swap |
| 156 | [aashari/mcp-server-atlassian-bitbucket](https://github.com/aashari/mcp-server-atlassian-bitbucket) | Bitbucket MCP server with TOON | TOON encoding in toon.util.ts | Issue: Jira/Bitbucket data is perfect tabular GCF target |
| 154 | [rocket-admin/rocketadmin](https://github.com/rocket-admin/rocketadmin) | Admin panel with TOON in AI core | TOON encoder in ai-core utils | Issue: GCF for AI core responses |
| 135 | [S1LV4/th0th](https://github.com/S1LV4/th0th) | Agent with TOON for memory/search | TOON encoding in store_memory, search, checkpoints | Issue: GCF for memory storage format |
| 132 | [zio/zio-blocks](https://github.com/zio/zio-blocks) | Scala/ZIO with full TOON schema module | TOON schema with KeyFolding in Scala | Issue: GCF Kotlin lib works on JVM |
| 100 | [frank-morales2020/MLxDL](https://github.com/frank-morales2020/MLxDL) | ML/DL notebooks using TOON | `from toon import encode, decode` in notebook | Issue: GCF Python comparison |

### Lower Priority (active but smaller, or docs-only references)

| Stars | Repo | What | TOON Usage |
|-------|------|------|------------|
| 1,987 | [Dicklesworthstone/mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail) | Agent mail, TOON in docs only | Docs reference |
| 894 | [Dicklesworthstone/coding_agent_session_search](https://github.com/Dicklesworthstone/coding_agent_session_search) | Session search TUI | TOON integration brief doc |
| 597 | [LedgerHQ/ledger-live](https://github.com/LedgerHQ/ledger-live) | Ledger wallet CLI | Third-party dependency listing |
| 483 | [LogtalkDotOrg/logtalk3](https://github.com/LogtalkDotOrg/logtalk3) | Logtalk (Prolog) | Library integration |
| 442 | [ldomaradzki/xcsift](https://github.com/ldomaradzki/xcsift) | Swift Xcode output parsing | Package.swift dependency |
| 390 | [antflydb/antfly](https://github.com/antflydb/antfly) | Zig database | TOON conformance tests |
| 385 | [jdereg/json-io](https://github.com/jdereg/json-io) | Java JSON library | Native TOON conversion, Baeldung draft |
| 381 | [Cerlancism/chatgpt-subtitle-translator](https://github.com/Cerlancism/chatgpt-subtitle-translator) | Subtitle translator | npm dependency |
| 334 | [elusznik/mcp-server-code-execution-mode](https://github.com/elusznik/mcp-server-code-execution-mode) | MCP code execution | Optional TOON output mode |
| 241 | [alibaba/anolisa](https://github.com/alibaba/anolisa) | Alibaba tokenless module | TOON compression in docs |
| 88 | [nikolai-vysotskyi/trace-mcp](https://github.com/nikolai-vysotskyi/trace-mcp) | MCP exploration server | TOON output format option |
| 88 | [AryaLabsHQ/bunli](https://github.com/AryaLabsHQ/bunli) | Bun CLI output formatter | TOON encoding in formatter |
| 77 | [akutishevsky/lunchmoney-mcp](https://github.com/akutishevsky/lunchmoney-mcp) | Personal finance MCP | TOON encoding in format.ts |
| 76 | [microsoft/MMCTAgent](https://github.com/microsoft/MMCTAgent) | Microsoft multi-modal agent | TOON encoder for video pipeline |
| 64 | [fkiene/llmtrim](https://github.com/fkiene/llmtrim) | Rust LLM proxy | TOON serialization stage |
| 63 | [PCIRCLE-AI/toonify-mcp](https://github.com/PCIRCLE-AI/toonify-mcp) | TOON Claude Code plugin | Direct competitor in plugin space |
| 44 | [synergy-design-system/synergy-design-system](https://github.com/synergy-design-system/synergy-design-system) | Design system | TOON compression in MCP package |
| 40 | [jaenster/puppeteer-mcp-claude](https://github.com/jaenster/puppeteer-mcp-claude) | Browser automation MCP | TOON encoding for responses |

### TOON Ecosystem Stats (competitive context)
- Main repo: 24,580 stars, 3M monthly npm downloads
- 10+ community implementations (Python, PHP, Scala, Kotlin, Elixir, Ruby, Rust, Swift, Delphi, Java, C#, Zig, Go, PowerShell, Logtalk, Perl)
- OpenAPI `text/toon` media type registered
- Enterprise adopters: IBM, Microsoft, MongoDB, Alibaba, Ledger
- Changelog News episode 168 featured TOON
- Baeldung article draft in progress (jdereg/json-io)

---

## Category B: MCP Servers With No Optimization (Greenfield)

These send raw JSON to LLMs. No TOON, no compression. The pitch is pure savings on data they're already sending.

**Pitch:** Your MCP server returns JSON arrays with repeated keys on every record. GCF encodes the same data in 53-71% fewer tokens, lossless, with SDKs in 6 languages. Two lines to integrate.

### Framework-Level Targets (multiplier effect)

| Stars | Repo | What | GCF Fit | Approach |
|-------|------|------|---------|----------|
| 25,670 | [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) | MCP server framework | VERY HIGH: every server built on it benefits | PR: add GCF output encoding option to serialization layer |
| 10,112 | [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use) | MCP app framework | HIGH: same multiplier effect | PR: GCF encoding in transport layer |

### Database/Tabular Data (textbook GCF case)

| Stars | Repo | What | GCF Fit | Approach |
|-------|------|------|---------|----------|
| 15,641 | [googleapis/mcp-toolbox](https://github.com/googleapis/mcp-toolbox) | Google DB query MCP (Postgres, MySQL, BigQuery, Spanner, Firestore) | VERY HIGH: row sets repeat column names per row | Issue: benchmark on 100-row query, show 60%+ savings |
| 3,940 | [haris-musa/excel-mcp-server](https://github.com/haris-musa/excel-mcp-server) | Excel spreadsheet MCP | VERY HIGH: pure tabular, 20 cols x 500 rows = 10K repeated keys in JSON | Issue: GCF tabular encoding eliminates key repetition |
| 4,429 | [makenotion/notion-mcp-server](https://github.com/makenotion/notion-mcp-server) | Notion database queries | VERY HIGH: Notion JSON is notoriously verbose with nested type wrappers | Issue: benchmark on Notion DB query results |

### High-Star General Purpose

| Stars | Repo | What | GCF Fit | Approach |
|-------|------|------|---------|----------|
| 34,020 | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Browser automation MCP | HIGH: DOM/accessibility trees repeat role, name, children per node | Issue: GCF for accessibility tree payloads |
| 30,747 | [github/github-mcp-server](https://github.com/github/github-mcp-server) | GitHub API MCP | HIGH: issue/PR/commit arrays with identical schemas | Issue: GCF for list responses |
| 15,133 | [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) | Figma design trees | HIGH: design nodes repeat x, y, width, height, fills, strokes | Issue: GCF for design tree payloads |
| 9,646 | [0x4m4/hexstrike-ai](https://github.com/0x4m4/hexstrike-ai) | Security scanner (150+ tools) | VERY HIGH: scan result arrays with identical field schemas | Issue: GCF for vulnerability/scan result output |
| 9,282 | [awslabs/mcp](https://github.com/awslabs/mcp) | AWS services MCP | VERY HIGH: AWS API responses are notoriously verbose JSON | Issue: GCF for resource listing responses |
| 5,414 | [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) | Jira + Confluence MCP | VERY HIGH: Jira issue listings are perfect tabular data (50+ fields per issue) | Issue: benchmark on Jira issue list |
| 4,588 | [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) | Web search MCP | HIGH: search result arrays with identical schemas | Issue: GCF for search results |
| 3,869 | [cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare) | Cloudflare services MCP | HIGH: DNS records, analytics arrays | Issue: GCF for list/analytics responses |
| 3,748 | [CodeGraphContext/CodeGraphContext](https://github.com/CodeGraphContext/CodeGraphContext) | Code graph DB | VERY HIGH: graph nodes + edges, GCF graph codec designed for this | PR: GCF graph profile integration |

### Structured Data Returns

| Stars | Repo | What | GCF Fit | Approach |
|-------|------|------|---------|----------|
| 11,946 | [hangwin/mcp-chrome](https://github.com/hangwin/mcp-chrome) | Chrome browser MCP | HIGH: page content extraction arrays | Issue |
| 9,260 | [LaurieWired/GhidraMCP](https://github.com/LaurieWired/GhidraMCP) | Reverse engineering MCP | HIGH: function/symbol tables with repeated fields | Issue |
| 8,498 | [kreuzberg-dev/kreuzberg](https://github.com/kreuzberg-dev/kreuzberg) | Document extraction (97+ formats) | HIGH: extracted metadata with repeated properties | Issue |
| 8,175 | [idosal/git-mcp](https://github.com/idosal/git-mcp) | Git repo documentation MCP | MODERATE: file trees | Issue |
| 6,602 | [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) | Web scraping MCP | HIGH: crawl result arrays | Issue |
| 4,164 | [antvis/mcp-server-chart](https://github.com/antvis/mcp-server-chart) | Chart data MCP | HIGH: data series are classic tabular arrays | Issue |
| 4,065 | [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | Code knowledge graph MCP | HIGH: already claims "99% fewer tokens", graph data | Issue: GCF graph codec comparison |

---

## Recommended Outreach Priority

### Wave 1: Highest Impact (open issues first)
1. **PrefectHQ/fastmcp** (25.6K stars) - framework multiplier
2. **googleapis/mcp-toolbox** (15.6K stars) - textbook tabular case
3. **IBM/mcp-context-forge** (3.9K stars) - enterprise TOON user, convert
4. **Pimzino/spec-workflow-mcp** (4.2K stars) - TOON user, convert
5. **sooperset/mcp-atlassian** (5.4K stars) - Jira data is perfect GCF fit

### Wave 2: High-Star Greenfield
6. **github/github-mcp-server** (30.7K stars) - GitHub official
7. **awslabs/mcp** (9.3K stars) - AWS official
8. **makenotion/notion-mcp-server** (4.4K stars) - Notion official
9. **haris-musa/excel-mcp-server** (3.9K stars) - pure tabular
10. **CodeGraphContext/CodeGraphContext** (3.7K stars) - graph codec fit

### Wave 3: TOON Conversions
11. **GladysAssistant/Gladys** (3K stars)
12. **deepnote/deepnote** (2.9K stars)
13. **mongodb/kingfisher** (1.1K stars)
14. **kunchenguid/axi** (869 stars)
15. **automateyournetwork/netclaw** (556 stars)

---

## Issue/PR Templates

### For TOON Users (Category A)
**Title:** Consider GCF as alternative to TOON for token reduction

**Body:**
I noticed this project uses TOON for encoding tool responses to reduce LLM token costs. Have you considered GCF (Graph Context Format)?

Some comparative data:
- GCF uses 25.5% fewer tokens than TOON across 15 real-world datasets (wins 13/15)
- 53-71% fewer tokens vs JSON (TOON typically delivers 15-30%)
- 90.7% LLM comprehension vs TOON's 68.5% across Claude, GPT-5.5, and Gemini (1,700+ evaluations)
- Verified lossless across 43B+ round-trips in 5 formats and 6 languages

We also ran 10M fuzz tests against TOON's Node library and found a 7.54% failure rate under adversarial workloads, including 176K cases of silent data corruption on strings containing brackets, colons, or braces (URLs, timestamps, structured IDs).

GCF SDKs available in Python, TypeScript, Go, Rust, Swift, and Kotlin: https://gcformat.com

Happy to help with integration or run benchmarks on your specific payloads.

### For MCP Servers (Category B)
**Title:** Reduce tool response token costs with GCF encoding

**Body:**
This MCP server returns structured JSON responses that could benefit from wire-level token optimization. GCF (Graph Context Format) encodes arrays of objects using positional fields with inline schemas, eliminating repeated keys entirely.

Example: a 500-row query result with 10 columns repeats those 10 column names 500 times in JSON. GCF declares them once in a header and uses pipe-delimited rows.

Measured results:
- 53-71% fewer tokens vs JSON on real-world data
- 90.7% LLM comprehension (vs 53.6% for JSON) across 1,700+ evaluations
- Verified lossless across 43B+ round-trips

SDKs in Python, TypeScript, Go, Rust, Swift, Kotlin: https://gcformat.com
Two-line integration: `encode(data)` / `decode(gcfString)`

Would you be open to a PR adding optional GCF encoding for tool responses?
