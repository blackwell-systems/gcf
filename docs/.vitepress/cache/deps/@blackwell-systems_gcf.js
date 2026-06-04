import {
  __publicField
} from "./chunk-V6TY7KAL.js";

// node_modules/.pnpm/@blackwell-systems+gcf@0.1.0/node_modules/@blackwell-systems/gcf/dist/constants.js
var KIND_ABBREV = {
  function: "fn",
  type: "type",
  method: "method",
  interface: "iface",
  var: "var",
  const: "const",
  resource: "resource",
  table: "table",
  class: "class",
  selector: "selector",
  field: "field",
  route_handler: "route",
  external: "ext",
  file: "file",
  package: "pkg",
  service: "svc"
};
var KIND_EXPAND = {
  fn: "function",
  type: "type",
  method: "method",
  iface: "interface",
  var: "var",
  const: "const",
  resource: "resource",
  table: "table",
  class: "class",
  selector: "selector",
  field: "field",
  route: "route_handler",
  ext: "external",
  file: "file",
  pkg: "package",
  svc: "service"
};

// node_modules/.pnpm/@blackwell-systems+gcf@0.1.0/node_modules/@blackwell-systems/gcf/dist/encode.js
function groupByDistance(symbols) {
  if (symbols.length === 0)
    return [];
  const groups = [];
  let current = null;
  for (const s of symbols) {
    if (current === null || current.distance !== s.distance) {
      current = { distance: s.distance, symbols: [] };
      groups.push(current);
    }
    current.symbols.push(s);
  }
  return groups;
}
function encode(p) {
  const lines = [];
  let header = `GCF tool=${p.tool} budget=${p.tokenBudget} tokens=${p.tokensUsed} symbols=${p.symbols.length}`;
  if (p.packRoot) {
    header += ` pack_root=${p.packRoot}`;
  }
  lines.push(header);
  const symIndex = /* @__PURE__ */ new Map();
  for (let i = 0; i < p.symbols.length; i++) {
    symIndex.set(p.symbols[i].qualifiedName, i);
  }
  const groups = groupByDistance(p.symbols);
  const groupNames = ["targets", "related", "extended"];
  for (const g of groups) {
    if (g.symbols.length === 0)
      continue;
    let name;
    if (g.distance < groupNames.length) {
      name = groupNames[g.distance];
    } else {
      name = `distance_${g.distance}`;
    }
    lines.push(`## ${name}`);
    for (const s of g.symbols) {
      const idx = symIndex.get(s.qualifiedName);
      const kind = KIND_ABBREV[s.kind] || s.kind;
      lines.push(`@${idx} ${kind} ${s.qualifiedName} ${s.score.toFixed(2)} ${s.provenance}`);
    }
  }
  if (p.edges.length > 0) {
    lines.push("## edges");
    for (const e of p.edges) {
      const srcIdx = symIndex.get(e.source);
      const tgtIdx = symIndex.get(e.target);
      if (srcIdx === void 0 || tgtIdx === void 0)
        continue;
      let line = `@${tgtIdx}<@${srcIdx} ${e.edgeType}`;
      if (e.status && e.status !== "unchanged") {
        line += ` ${e.status}`;
      }
      lines.push(line);
    }
  }
  return lines.join("\n") + "\n";
}

// node_modules/.pnpm/@blackwell-systems+gcf@0.1.0/node_modules/@blackwell-systems/gcf/dist/decode.js
function decode(input) {
  const lines = input.split("\n");
  if (lines.length === 0) {
    throw new Error("gcf: empty input");
  }
  const header = lines[0];
  if (!header.startsWith("GCF ")) {
    throw new Error(`gcf: invalid header, expected 'GCF ...' got "${header}"`);
  }
  const p = {
    tool: "",
    tokenBudget: 0,
    tokensUsed: 0,
    symbols: [],
    edges: []
  };
  parseHeader(header.slice(4), p);
  const symbols = [];
  const symByID = /* @__PURE__ */ new Map();
  let currentDistance = 0;
  let inEdges = false;
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].replace(/\r$/, "");
    if (line === "")
      continue;
    if (line.startsWith("## ")) {
      const group = line.slice(3);
      inEdges = group === "edges";
      if (!inEdges) {
        switch (group) {
          case "targets":
            currentDistance = 0;
            break;
          case "related":
            currentDistance = 1;
            break;
          case "extended":
            currentDistance = 2;
            break;
          default:
            if (group.startsWith("distance_")) {
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
    if (line.startsWith("# ")) {
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
function parseHeader(fields, p) {
  const parts = fields.split(/\s+/);
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0)
      continue;
    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);
    switch (key) {
      case "tool":
        p.tool = value;
        break;
      case "budget": {
        const v = parseInt(value, 10);
        if (isNaN(v))
          throw new Error(`gcf: invalid budget "${value}"`);
        p.tokenBudget = v;
        break;
      }
      case "tokens": {
        const v = parseInt(value, 10);
        if (isNaN(v))
          throw new Error(`gcf: invalid tokens "${value}"`);
        p.tokensUsed = v;
        break;
      }
      case "pack_root":
        p.packRoot = value;
        break;
      case "symbols":
        break;
    }
  }
}
function parseSymbolLine(line, distance) {
  if (!line.startsWith("@")) {
    throw new Error(`gcf: expected symbol line starting with @, got "${line}"`);
  }
  const parts = line.split(/\s+/);
  if (parts.length < 5) {
    throw new Error(`gcf: symbol line needs at least 5 fields, got ${parts.length} in "${line}"`);
  }
  const idStr = parts[0].slice(1);
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    throw new Error(`gcf: invalid symbol id "${idStr}"`);
  }
  let kind = parts[1];
  if (KIND_EXPAND[kind]) {
    kind = KIND_EXPAND[kind];
  }
  const qname = parts[2];
  const score = parseFloat(parts[3]);
  if (isNaN(score)) {
    throw new Error(`gcf: invalid score "${parts[3]}"`);
  }
  const provenance = parts[4];
  return {
    symbol: {
      qualifiedName: qname,
      kind,
      score,
      provenance,
      distance
    },
    id
  };
}
function parseEdgeLine(line, symByID) {
  const parts = line.split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`gcf: edge line needs at least 2 fields, got "${line}"`);
  }
  const ref = parts[0];
  const ltIdx = ref.indexOf("<");
  if (ltIdx < 0) {
    throw new Error(`gcf: edge line missing '<' separator in "${ref}"`);
  }
  const targetIDStr = ref.slice(1, ltIdx);
  const sourceIDStr = ref.slice(ltIdx + 2);
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
    throw new Error(`gcf: edge references unknown symbol id(s): target=${targetID} source=${sourceID}`);
  }
  const edgeType = parts[1];
  const status = parts.length >= 3 ? parts[2] : void 0;
  return {
    source: sourceSym.qualifiedName,
    target: targetSym.qualifiedName,
    edgeType,
    status
  };
}

// node_modules/.pnpm/@blackwell-systems+gcf@0.1.0/node_modules/@blackwell-systems/gcf/dist/session.js
var Session = class {
  constructor() {
    __publicField(this, "symbols", /* @__PURE__ */ new Map());
    __publicField(this, "nextID", 0);
  }
  /** Returns true if the symbol has been sent in a previous response. */
  transmitted(qname) {
    return this.symbols.has(qname);
  }
  /** Returns the session-global ID for a previously transmitted symbol, or -1 if not found. */
  getID(qname) {
    const id = this.symbols.get(qname);
    return id !== void 0 ? id : -1;
  }
  /**
   * Record marks symbols as transmitted and assigns session-global IDs.
   * Call this after a successful encode to register newly-sent symbols.
   */
  record(symbols) {
    for (const sym of symbols) {
      if (!this.symbols.has(sym.qualifiedName)) {
        this.symbols.set(sym.qualifiedName, this.nextID);
        this.nextID++;
      }
    }
  }
  /** Returns the number of symbols tracked in this session. */
  size() {
    return this.symbols.size;
  }
  /** Clears the session state. */
  reset() {
    this.symbols.clear();
    this.nextID = 0;
  }
};
function groupByDistance2(symbols) {
  if (symbols.length === 0)
    return [];
  const groups = [];
  let current = null;
  for (const s of symbols) {
    if (current === null || current.distance !== s.distance) {
      current = { distance: s.distance, symbols: [] };
      groups.push(current);
    }
    current.symbols.push(s);
  }
  return groups;
}
function encodeWithSession(p, sess) {
  if (!sess) {
    return encode(p);
  }
  const lines = [];
  let header = `GCF tool=${p.tool} budget=${p.tokenBudget} tokens=${p.tokensUsed} symbols=${p.symbols.length} session=true`;
  if (p.packRoot) {
    header += ` pack_root=${p.packRoot}`;
  }
  lines.push(header);
  const localIndex = /* @__PURE__ */ new Map();
  for (let i = 0; i < p.symbols.length; i++) {
    localIndex.set(p.symbols[i].qualifiedName, i);
  }
  const newSymbols = [];
  const groups = groupByDistance2(p.symbols);
  const groupNames = ["targets", "related", "extended"];
  for (const g of groups) {
    if (g.symbols.length === 0)
      continue;
    let name;
    if (g.distance < groupNames.length) {
      name = groupNames[g.distance];
    } else {
      name = `distance_${g.distance}`;
    }
    lines.push(`## ${name}`);
    for (const s of g.symbols) {
      const idx = localIndex.get(s.qualifiedName);
      if (sess.transmitted(s.qualifiedName)) {
        lines.push(`@${idx}  # previously transmitted`);
      } else {
        const kind = KIND_ABBREV[s.kind] || s.kind;
        lines.push(`@${idx} ${kind} ${s.qualifiedName} ${s.score.toFixed(2)} ${s.provenance}`);
        newSymbols.push(s);
      }
    }
  }
  if (p.edges.length > 0) {
    lines.push("## edges");
    for (const e of p.edges) {
      const srcIdx = localIndex.get(e.source);
      const tgtIdx = localIndex.get(e.target);
      if (srcIdx === void 0 || tgtIdx === void 0)
        continue;
      let line = `@${tgtIdx}<@${srcIdx} ${e.edgeType}`;
      if (e.status && e.status !== "unchanged") {
        line += ` ${e.status}`;
      }
      lines.push(line);
    }
  }
  sess.record(newSymbols);
  return lines.join("\n") + "\n";
}

// node_modules/.pnpm/@blackwell-systems+gcf@0.1.0/node_modules/@blackwell-systems/gcf/dist/delta.js
function encodeDelta(d) {
  const lines = [];
  let savings = 0;
  if (d.fullTokens > 0) {
    savings = Math.round(100 * (1 - d.deltaTokens / d.fullTokens));
  }
  lines.push(`GCF tool=${d.tool} delta=true base_root=${d.baseRoot} new_root=${d.newRoot} tokens=${d.deltaTokens} savings=${savings}%`);
  if (d.removed.length > 0) {
    lines.push("## removed");
    for (const s of d.removed) {
      const kind = KIND_ABBREV[s.kind] || s.kind;
      lines.push(`${kind} ${s.qualifiedName}`);
    }
  }
  if (d.added.length > 0) {
    lines.push("## added");
    for (let i = 0; i < d.added.length; i++) {
      const s = d.added[i];
      const kind = KIND_ABBREV[s.kind] || s.kind;
      lines.push(`@${i} ${kind} ${s.qualifiedName} ${s.score.toFixed(2)} ${s.provenance}`);
    }
  }
  if (d.removedEdges.length > 0) {
    lines.push("## edges_removed");
    for (const e of d.removedEdges) {
      lines.push(`${e.source} -> ${e.target} ${e.edgeType}`);
    }
  }
  if (d.addedEdges.length > 0) {
    lines.push("## edges_added");
    for (const e of d.addedEdges) {
      lines.push(`${e.source} -> ${e.target} ${e.edgeType}`);
    }
  }
  return lines.join("\n") + "\n";
}
export {
  KIND_ABBREV,
  KIND_EXPAND,
  Session,
  decode,
  encode,
  encodeDelta,
  encodeWithSession
};
//# sourceMappingURL=@blackwell-systems_gcf.js.map
