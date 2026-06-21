/**
 * Symbol represents a node in a GCF payload.
 */
export interface Symbol {
  /** Fully qualified identifier (e.g., "pkg/auth.Middleware") */
  qualifiedName: string;
  /** Node type: "function", "type", "method", etc. */
  kind: string;
  /** Relevance score (0.0 to 1.0) */
  score: number;
  /** Discovery method: "lsp_resolved", "ast_inferred", etc. */
  provenance: string;
  /** Hops from query center (0=target, 1=related, 2+=extended) */
  distance: number;
  /** Optional: function/method signature */
  signature?: string;
  /** Optional: score breakdown */
  components?: Components;
}

/**
 * Components holds the score breakdown for a symbol.
 */
export interface Components {
  blastRadius: number;
  confidence: number;
  recency: number;
  distance: number;
}

/**
 * Edge represents a directed relationship in a GCF payload.
 */
export interface Edge {
  /** Qualified name of source symbol */
  source: string;
  /** Qualified name of target symbol */
  target: string;
  /** Relationship type (e.g., "calls", "imports", "implements") */
  edgeType: string;
  /** Optional: "added", "removed", "unchanged" (for diff responses) */
  status?: string;
}

/**
 * Payload is the input/output structure for GCF encoding/decoding.
 */
export interface Payload {
  /** Producing tool name (e.g., "context_for_task") */
  tool: string;
  /** Token budget requested by the consumer */
  tokenBudget: number;
  /** Actual tokens consumed by this payload */
  tokensUsed: number;
  /** Content-addressed identity (hex SHA-256), enables delta encoding */
  packRoot?: string;
  /** Ordered by score descending within each distance group */
  symbols: Symbol[];
  /** Directed relationships between symbols */
  edges: Edge[];
}

/**
 * DeltaPayload represents the diff between a prior context pack and the
 * current result. Used for incremental context delivery.
 */
export interface DeltaPayload {
  tool: string;
  /** pack_root the consumer has */
  baseRoot: string;
  /** pack_root of the current result */
  newRoot: string;
  removed: Symbol[];
  added: Symbol[];
  removedEdges: Edge[];
  addedEdges: Edge[];
  deltaTokens: number;
  fullTokens: number;
}
