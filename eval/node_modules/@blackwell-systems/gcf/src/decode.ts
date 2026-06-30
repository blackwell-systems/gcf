import type { Edge, Payload, Symbol } from './types.js';
import { KIND_EXPAND } from './constants.js';

/**
 * Decode parses GCF text back into a Payload.
 */
export function decode(input: string): Payload {
  const lines = input.split('\n');
  if (lines.length === 0) {
    throw new Error('gcf: empty input');
  }

  const header = lines[0];
  if (!header.startsWith('GCF ')) {
    throw new Error(`gcf: invalid header, expected 'GCF ...' got "${header}"`);
  }

  const p: Payload = {
    tool: '',
    tokenBudget: 0,
    tokensUsed: 0,
    symbols: [],
    edges: [],
  };

  // Parse header fields.
  parseHeader(header.slice(4), p);

  // v3.1: tool field is optional (SHOULD be present for MCP tool responses, not required).

  // Detect delta mode.
  const isDelta = header.includes(' delta=true');
  const validDeltaSections = new Set(['removed', 'added', 'edges_removed', 'edges_added']);

  // Parse body: symbols and edges.
  const symbols: Symbol[] = [];
  const symByID = new Map<number, Symbol>();
  let currentDistance = 0;
  let inEdges = false;

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].replace(/\r$/, '');
    if (line === '') continue;

    // Skip ##! summary trailer.
    if (line.startsWith('##! ')) continue;

    // Group header.
    if (line.startsWith('## ')) {
      let group = line.slice(3);
      // Strip bracket suffix: "edges [200]" -> "edges"
      const bracketIdx = group.indexOf(' [');
      if (bracketIdx >= 0) {
        group = group.slice(0, bracketIdx);
      }

      if (isDelta && !validDeltaSections.has(group)) {
        throw new Error(`malformed_delta: invalid delta section "${group}"`);
      }

      inEdges = group === 'edges';
      if (!inEdges) {
        switch (group) {
          case 'targets':
            currentDistance = 0;
            break;
          case 'related':
            currentDistance = 1;
            break;
          case 'extended':
            currentDistance = 2;
            break;
          default:
            if (group.startsWith('distance_')) {
              const d = parseInt(group.slice(9), 10);
              if (!isNaN(d)) {
                currentDistance = d;
              }
            }
            break;
        }
      }
      continue;
    }

    // Comment.
    if (line.startsWith('# ')) {
      continue;
    }

    if (inEdges) {
      const edge = parseEdgeLine(line, symByID);
      p.edges.push(edge);
    } else {
      const { symbol, id } = parseSymbolLine(line, currentDistance);
      symbols.push(symbol);
      symByID.set(id, symbol);
    }
  }

  p.symbols = symbols;
  return p;
}

function parseHeader(fields: string, p: Payload): void {
  const parts = fields.split(/\s+/);
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);

    switch (key) {
      case 'tool':
        p.tool = value;
        break;
      case 'budget': {
        const v = parseInt(value, 10);
        if (isNaN(v)) throw new Error(`gcf: invalid budget "${value}"`);
        p.tokenBudget = v;
        break;
      }
      case 'tokens': {
        const v = parseInt(value, 10);
        if (isNaN(v)) throw new Error(`gcf: invalid tokens "${value}"`);
        p.tokensUsed = v;
        break;
      }
      case 'pack_root':
        p.packRoot = value;
        break;
      case 'symbols':
        // Informational, reconstructed from parsed symbols.
        break;
    }
  }
}

function parseSymbolLine(
  line: string,
  distance: number
): { symbol: Symbol; id: number } {
  if (!line.startsWith('@')) {
    throw new Error(`gcf: expected symbol line starting with @, got "${line}"`);
  }

  const parts = line.split(/\s+/);
  if (parts.length < 5) {
    throw new Error(
      `invalid_node_line: symbol line needs at least 5 fields, got ${parts.length} in "${line}"`
    );
  }

  const idStr = parts[0].slice(1); // strip @
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    throw new Error(`invalid_symbol_id: invalid symbol id "${idStr}"`);
  }

  let kind = parts[1];
  if (KIND_EXPAND[kind]) {
    kind = KIND_EXPAND[kind];
  }

  const qname = parts[2];

  const score = parseFloat(parts[3]);
  if (isNaN(score)) {
    throw new Error(`invalid_score: invalid score "${parts[3]}"`);
  }

  const provenance = parts[4];

  return {
    symbol: {
      qualifiedName: qname,
      kind,
      score,
      provenance,
      distance,
    },
    id,
  };
}

function parseEdgeLine(line: string, symByID: Map<number, Symbol>): Edge {
  const parts = line.split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`gcf: edge line needs at least 2 fields, got "${line}"`);
  }

  const ref = parts[0];
  const ltIdx = ref.indexOf('<');
  if (ltIdx < 0) {
    throw new Error(`invalid_edge_syntax: edge line missing '<' separator in "${ref}"`);
  }

  const targetIDStr = ref.slice(1, ltIdx); // strip leading @
  const sourceIDStr = ref.slice(ltIdx + 2); // strip <@

  const targetID = parseInt(targetIDStr, 10);
  if (isNaN(targetID)) {
    throw new Error(`gcf: invalid target id "${targetIDStr}"`);
  }
  const sourceID = parseInt(sourceIDStr, 10);
  if (isNaN(sourceID)) {
    throw new Error(`gcf: invalid source id "${sourceIDStr}"`);
  }

  const targetSym = symByID.get(targetID);
  const sourceSym = symByID.get(sourceID);
  if (!targetSym || !sourceSym) {
    throw new Error(
      `unknown_edge_reference: edge references unknown symbol id(s): target=${targetID} source=${sourceID}`
    );
  }

  const edgeType = parts[1];
  const status = parts.length >= 3 ? parts[2] : undefined;

  return {
    source: sourceSym.qualifiedName,
    target: targetSym.qualifiedName,
    edgeType,
    status,
  };
}
