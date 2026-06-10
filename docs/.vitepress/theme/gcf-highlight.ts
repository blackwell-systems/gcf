import { Parser, Language } from 'web-tree-sitter'

let gcfParser: Parser | null = null
let jsonParser: Parser | null = null

// GCF node colors (One Dark theme)
const GCF_COLORS: Record<string, string> = {
  gcf_keyword: '#c678dd',
  key: '#e06c75',
  kv_value: '#d19a66',
  section_name: '#61afef',
  number: '#d19a66',
  deferred: '#d19a66',
  field_name: '#e5c07b',
  at_sign: '#c678dd',
  id_number: '#d19a66',
  kind: '#56b6c2',
  qualified_name: '#98c379',
  score: '#d19a66',
  provenance: '#e5c07b',
  arrow: '#c678dd',
  target_id: '#d19a66',
  source_id: '#d19a66',
  edge_type: '#61afef',
  status: '#c678dd',
  comment: '#5c6370',
  summary_keyword: '#c678dd',
  inline_array: '#98c379',
  text_content: '#abb2bf',
}

// JSON node colors
const JSON_COLORS: Record<string, string> = {
  string: '#98c379',
  string_content: '#98c379',
  number: '#d19a66',
  true: '#d19a66',
  false: '#d19a66',
  null: '#c678dd',
  pair: '',
  // Keys are the first string child of a pair
}

export async function initParser(): Promise<void> {
  if (gcfParser) return
  await Parser.init({
    locateFile(scriptName: string) {
      return `https://cdn.jsdelivr.net/npm/web-tree-sitter@0.26.9/${scriptName}`
    }
  })

  gcfParser = new Parser()
  const gcfLang = await Language.load('/tree-sitter-gcf.wasm')
  gcfParser.setLanguage(gcfLang)

  jsonParser = new Parser()
  const jsonLang = await Language.load('/tree-sitter-json.wasm')
  jsonParser.setLanguage(jsonLang)
}

export function highlightGCF(code: string): string {
  if (!gcfParser || !code.trim()) return escapeHtml(code)
  return highlightWithParser(gcfParser, code, GCF_COLORS)
}

export function highlightJSON(code: string): string {
  if (!jsonParser || !code.trim()) return escapeHtml(code)
  return highlightJSONTree(jsonParser, code)
}

export function highlightTOON(code: string): string {
  if (!code.trim()) return escapeHtml(code)
  return highlightTOONRegex(code)
}

function highlightWithParser(parser: Parser, code: string, colors: Record<string, string>): string {
  const tree = parser.parse(code)
  const highlights: Array<{ start: number; end: number; color: string }> = []

  function walk(node: any) {
    if (node.childCount === 0) {
      const text = code.slice(node.startIndex, node.endIndex)

      // Handle tabular_row (pipe-separated values, opaque token)
      if (node.type === 'tabular_row') {
        const text = code.slice(node.startIndex, node.endIndex).replace(/\n$/, '')
        const parts = text.split('|')
        let pos = node.startIndex
        // Check for @id prefix on first part
        const firstPart = parts[0]
        const idMatch = firstPart.match(/^(@\d+)\s+(.*)$/)
        if (idMatch) {
          highlights.push({ start: pos, end: pos + idMatch[1].length, color: '#c678dd' })
          pos += idMatch[1].length + 1
          highlights.push({ start: pos, end: pos + idMatch[2].length, color: '#98c379' })
          pos += idMatch[2].length
        } else {
          const color = /^\d+(\.\d+)?$/.test(firstPart.trim()) ? '#d19a66' : '#98c379'
          highlights.push({ start: pos, end: pos + firstPart.length, color })
          pos += firstPart.length
        }
        for (let i = 1; i < parts.length; i++) {
          highlights.push({ start: pos, end: pos + 1, color: '#5c6370' })
          pos += 1
          const val = parts[i]
          const color = /^\d+(\.\d+)?$/.test(val.trim()) ? '#d19a66' : '#98c379'
          highlights.push({ start: pos, end: pos + val.length, color })
          pos += val.length
        }
        return
      }

      // Handle text_content that contains key=value or key|value patterns
      if (node.type === 'text_content') {
        if (text.includes('=')) {
          const eqIdx = text.indexOf('=')
          const absStart = node.startIndex
          highlights.push({ start: absStart, end: absStart + eqIdx, color: '#e06c75' })  // key
          highlights.push({ start: absStart + eqIdx, end: absStart + eqIdx + 1, color: '#abb2bf' })  // =
          highlights.push({ start: absStart + eqIdx + 1, end: node.endIndex, color: '#98c379' })  // value
          return
        }
        if (text.includes('|')) {
          const parts = text.split('|')
          let pos = node.startIndex
          for (let i = 0; i < parts.length; i++) {
            highlights.push({ start: pos, end: pos + parts[i].length, color: '#abb2bf' })
            pos += parts[i].length
            if (i < parts.length - 1) {
              highlights.push({ start: pos, end: pos + 1, color: '#5c6370' })  // pipe
              pos += 1
            }
          }
          return
        }
      }

      const color = colors[node.type]
      if (color) {
        highlights.push({ start: node.startIndex, end: node.endIndex, color })
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i))
    }
  }

  walk(tree.rootNode)
  highlights.sort((a, b) => a.start - b.start)
  return buildHighlightedHTML(code, highlights)
}

function highlightJSONTree(parser: Parser, code: string): string {
  const tree = parser.parse(code)
  const highlights: Array<{ start: number; end: number; color: string }> = []

  function walk(node: any, isKey: boolean = false) {
    if (node.type === 'pair') {
      // First child is the key, second is the value
      if (node.childCount >= 3) {
        walk(node.child(0), true)  // key
        for (let i = 1; i < node.childCount; i++) {
          walk(node.child(i), false)
        }
        return
      }
    }

    if (node.childCount === 0) {
      let color = ''
      if (node.type === 'string' || node.type === 'string_content') {
        color = isKey ? '#e06c75' : '#98c379'  // red keys, green values
      } else if (node.type === 'number') {
        color = '#d19a66'
      } else if (node.type === 'true' || node.type === 'false') {
        color = '#d19a66'
      } else if (node.type === 'null') {
        color = '#c678dd'
      }
      if (color) {
        highlights.push({ start: node.startIndex, end: node.endIndex, color })
      }
    } else {
      for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i), isKey)
      }
    }
  }

  walk(tree.rootNode)
  highlights.sort((a, b) => a.start - b.start)
  return buildHighlightedHTML(code, highlights)
}

function highlightTOONRegex(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (const line of lines) {
    let highlighted = escapeHtml(line)

    // Header declarations: name[N]{fields}:
    highlighted = highlighted.replace(
      /^(\s*)(\w+)(\[)(\d+)(\])(\{)([^}]+)(\})(:\s*)$/,
      '$1<span style="color:#61afef">$2</span><span style="color:#c678dd">$3</span><span style="color:#d19a66">$4</span><span style="color:#c678dd">$5</span><span style="color:#c678dd">$6</span><span style="color:#e5c07b">$7</span><span style="color:#c678dd">$8</span>$9'
    )

    // Primitive arrays: name[N]: val,val
    highlighted = highlighted.replace(
      /^(\s*)(\w+)(\[)(\d+)(\]:\s+)(.+)$/,
      '$1<span style="color:#61afef">$2</span><span style="color:#c678dd">$3</span><span style="color:#d19a66">$4</span><span style="color:#c678dd">$5</span><span style="color:#98c379">$6</span>'
    )

    // Key-value: key: value
    if (!highlighted.includes('style=')) {
      highlighted = highlighted.replace(
        /^(\s*)(\w[\w.]*)(:\s+)(.+)$/,
        '$1<span style="color:#e06c75">$2</span>$3<span style="color:#98c379">$4</span>'
      )
    }

    // Data rows (indented, comma-separated)
    if (!highlighted.includes('style=') && /^\s+\S/.test(line) && line.includes(',')) {
      const indent = highlighted.match(/^(\s*)/)?.[1] || ''
      const values = line.trim().split(',')
      highlighted = indent + values.map(v =>
        `<span style="color:#abb2bf">${escapeHtml(v)}</span>`
      ).join('<span style="color:#5c6370">,</span>')
    }

    result.push(highlighted)
  }

  return result.join('\n')
}

function buildHighlightedHTML(code: string, highlights: Array<{ start: number; end: number; color: string }>): string {
  let result = ''
  let lastEnd = 0

  for (const h of highlights) {
    if (h.start > lastEnd) {
      result += escapeHtml(code.slice(lastEnd, h.start))
    }
    result += `<span style="color:${h.color}">${escapeHtml(code.slice(h.start, h.end))}</span>`
    lastEnd = h.end
  }

  if (lastEnd < code.length) {
    result += escapeHtml(code.slice(lastEnd))
  }

  return result
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
