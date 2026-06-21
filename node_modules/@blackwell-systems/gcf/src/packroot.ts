import { createHash } from 'node:crypto';
import type { Symbol, Edge } from './types.js';
import { KIND_ABBREV } from './constants.js';
import { formatNumber } from './scalar.js';

/**
 * Compute a content-addressed PackRoot hash for a set of symbols and edges.
 *
 * Algorithm:
 * 1. Build canonical symbol records: S\t{kind}\t{qname}\t{score}\t{provenance}\t{distance}\n
 * 2. Build canonical edge records: E\t{srcKind}\t{source}\t{tgtKind}\t{target}\t{edgeType}\n
 * 3. Sort both arrays independently by UTF-8 byte order
 * 4. Concatenate: all symbols then all edges
 * 5. SHA-256 hash
 * 6. Return sha256:{hex}
 */
export function packRoot(symbols: Symbol[], edges: Edge[], symbolKinds?: Map<string, string>): string {
  const symRecords: string[] = [];
  const edgeRecords: string[] = [];

  // Build symbol records.
  for (const s of symbols) {
    const kind = KIND_ABBREV[s.kind] || s.kind;
    symRecords.push(`S\t${kind}\t${s.qualifiedName}\t${formatNumber(s.score)}\t${s.provenance}\t${s.distance}\n`);
  }

  // Build edge records.
  // For edges, we need kind lookups for source and target.
  // Build a map of qualifiedName -> kind from symbols.
  const kindMap = symbolKinds ?? new Map<string, string>();
  if (!symbolKinds) {
    for (const s of symbols) {
      const kind = KIND_ABBREV[s.kind] || s.kind;
      kindMap.set(s.qualifiedName, kind);
    }
  }

  for (const e of edges) {
    const srcKind = kindMap.get(e.source) || 'fn';
    const tgtKind = kindMap.get(e.target) || 'fn';
    edgeRecords.push(`E\t${srcKind}\t${e.source}\t${tgtKind}\t${e.target}\t${e.edgeType}\n`);
  }

  // Sort both arrays by UTF-8 byte order.
  symRecords.sort();
  edgeRecords.sort();

  // Concatenate.
  const data = symRecords.join('') + edgeRecords.join('');

  // SHA-256 hash.
  const hash = createHash('sha256').update(data, 'utf8').digest('hex');
  return `sha256:${hash}`;
}
