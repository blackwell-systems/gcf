import type { Payload, Symbol } from './types.js';
import { KIND_ABBREV } from './constants.js';
import { encode } from './encode.js';

/**
 * Session tracks symbols that have been transmitted to a client, enabling
 * subsequent responses to reference them by ID without full retransmission.
 * This makes multi-call workflows progressively cheaper.
 */
export class Session {
  private symbols: Map<string, number> = new Map();
  private nextID: number = 0;

  /** Returns true if the symbol has been sent in a previous response. */
  transmitted(qname: string): boolean {
    return this.symbols.has(qname);
  }

  /** Returns the session-global ID for a previously transmitted symbol, or -1 if not found. */
  getID(qname: string): number {
    const id = this.symbols.get(qname);
    return id !== undefined ? id : -1;
  }

  /**
   * Record marks symbols as transmitted and assigns session-global IDs.
   * Call this after a successful encode to register newly-sent symbols.
   */
  record(symbols: Symbol[]): void {
    for (const sym of symbols) {
      if (!this.symbols.has(sym.qualifiedName)) {
        this.symbols.set(sym.qualifiedName, this.nextID);
        this.nextID++;
      }
    }
  }

  /** Returns the number of symbols tracked in this session. */
  size(): number {
    return this.symbols.size;
  }

  /** Clears the session state. */
  reset(): void {
    this.symbols.clear();
    this.nextID = 0;
  }
}

interface DistanceGroup {
  distance: number;
  symbols: Symbol[];
}

function groupByDistance(symbols: Symbol[]): DistanceGroup[] {
  if (symbols.length === 0) return [];
  const groups: DistanceGroup[] = [];
  let current: DistanceGroup | null = null;
  for (const s of symbols) {
    if (current === null || current.distance !== s.distance) {
      current = { distance: s.distance, symbols: [] };
      groups.push(current);
    }
    current.symbols.push(s);
  }
  return groups;
}

/**
 * Encode a payload using GCF with session deduplication.
 * Symbols that were already transmitted in prior responses are emitted as
 * bare references (`@N  # previously transmitted`) instead of full declarations.
 * After encoding, newly-sent symbols are recorded in the session.
 */
export function encodeWithSession(p: Payload, sess: Session | null): string {
  if (!sess) {
    return encode(p);
  }

  const lines: string[] = [];

  // Header with session=true marker.
  let header = `GCF profile=graph tool=${p.tool}`;
  if (p.tokenBudget) header += ` budget=${p.tokenBudget}`;
  if (p.tokensUsed) header += ` tokens=${p.tokensUsed}`;
  header += ` symbols=${p.symbols.length}`;
  if (p.edges.length > 0) header += ` edges=${p.edges.length}`;
  header += ' session=true';
  if (p.packRoot) {
    header += ` pack_root=${p.packRoot}`;
  }
  lines.push(header);

  // Build local ID mapping for this response.
  const localIndex = new Map<string, number>();
  for (let i = 0; i < p.symbols.length; i++) {
    localIndex.set(p.symbols[i].qualifiedName, i);
  }

  // Track which symbols are new for recording after encode.
  const newSymbols: Symbol[] = [];

  // Group by distance.
  const groups = groupByDistance(p.symbols);
  const groupNames = ['targets', 'related', 'extended'];

  for (const g of groups) {
    if (g.symbols.length === 0) continue;

    let name: string;
    if (g.distance < groupNames.length) {
      name = groupNames[g.distance];
    } else {
      name = `distance_${g.distance}`;
    }
    lines.push(`## ${name}`);

    for (const s of g.symbols) {
      const idx = localIndex.get(s.qualifiedName)!;
      if (sess.transmitted(s.qualifiedName)) {
        // Bare reference: symbol was sent in a prior response.
        lines.push(`@${idx}  # previously transmitted`);
      } else {
        // Full declaration.
        const kind = KIND_ABBREV[s.kind] || s.kind;
        lines.push(`@${idx} ${kind} ${s.qualifiedName} ${s.score.toFixed(2)} ${s.provenance}`);
        newSymbols.push(s);
      }
    }
  }

  // Edges section.
  if (p.edges.length > 0) {
    lines.push(`## edges [${p.edges.length}]`);
    for (const e of p.edges) {
      const srcIdx = localIndex.get(e.source);
      const tgtIdx = localIndex.get(e.target);
      if (srcIdx === undefined || tgtIdx === undefined) continue;

      let line = `@${tgtIdx}<@${srcIdx} ${e.edgeType}`;
      if (e.status && e.status !== 'unchanged') {
        line += ` ${e.status}`;
      }
      lines.push(line);
    }
  }

  // Record all new symbols in the session.
  sess.record(newSymbols);

  return lines.join('\n') + '\n';
}
