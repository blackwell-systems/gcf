/**
 * GCF Generic Encoder: Nested Object Flattening Prototype
 *
 * Forked from gcf-typescript/src/generic.ts + scalar.ts
 * Single change: encodeTabular detects fixed-shape nested objects
 * and promotes them to semicolon-path column names instead of
 * emitting ^ + .field {} attachment blocks.
 *
 * Everything else (formatScalar, formatKey, quoting, escaping,
 * expanded arrays, attachment fallback) is identical to production.
 */

// ── scalar.ts (verbatim) ─────────────────────────────────────────────────

const JSON_NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const NUMERIC_LIKE_RE = /^[+-]\.?\d|^\.\d|^0\d/;
const INLINE_ARRAY_RE = /\[[^\]]*\]\s*:/;

function needsQuote(s) {
  if (s === '') return true;
  if (s === '-' || s === '~' || s === '^' || s === 'true' || s === 'false') return true;
  if (JSON_NUMBER_RE.test(s)) return true;
  if (NUMERIC_LIKE_RE.test(s)) return true;
  if (s[0] === ' ' || s[s.length - 1] === ' ') return true;
  if (s[0] === '#' || s[0] === '@' || s[0] === '.') return true;
  if (INLINE_ARRAY_RE.test(s)) return true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22 || c === 0x5c || c < 0x20 || c === 0x0a || c === 0x0d ||
        c === 0x7c || c === 0x2c) return true;
    if (c >= 0x80 && c <= 0x9f) return true;
    if (c > 0x7f && (c === 0xa0 || c === 0x2028 || c === 0x2029 || c === 0xfeff ||
        c === 0x1680 || (c >= 0x2000 && c <= 0x200a) || c === 0x202f ||
        c === 0x205f || c === 0x3000)) return true;
  }
  return false;
}

function quoteString(s) {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    switch (c) {
      case 0x22: out += '\\"'; break;
      case 0x5c: out += '\\\\'; break;
      case 0x08: out += '\\b'; break;
      case 0x0c: out += '\\f'; break;
      case 0x0a: out += '\\n'; break;
      case 0x0d: out += '\\r'; break;
      case 0x09: out += '\\t'; break;
      default:
        if (c < 0x20) {
          out += '\\u' + c.toString(16).padStart(4, '0');
        } else {
          out += s[i];
        }
    }
  }
  return out + '"';
}

function formatScalar(v, delimiter = 0) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return formatNumber(v);
  const s = String(v);
  if (needsQuote(s) || (delimiter && s.includes(String.fromCharCode(delimiter)))) {
    return quoteString(s);
  }
  return s;
}

function formatNumber(f) {
  if (Object.is(f, -0)) return '-0';
  if (f === 0) return '0';
  const abs = Math.abs(f);
  if (abs >= 1e-6 && abs < 1e21) {
    return String(f);
  }
  let s = f.toExponential();
  s = s.replace(/[eE]\+?0*(\d)/, 'e+$1').replace(/[eE]-0*(\d)/, 'e-$1');
  return s;
}

const BARE_KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function isBareKey(s) {
  return BARE_KEY_RE.test(s);
}

function formatKey(s) {
  return isBareKey(s) ? s : quoteString(s);
}

// ── generic.ts (forked) ──────────────────────────────────────────────────

let PATH_SEP = '>';

function indent(depth) {
  return '  '.repeat(depth);
}

export function encodeGenericFlat(data) {
  PATH_SEP = '>';
  let out = 'GCF profile=generic\n';
  out += encodeRootValue(data);
  return out;
}

export function encodeGenericFlatSemicolon(data) {
  PATH_SEP = ';';
  let out = 'GCF profile=generic\n';
  out += encodeRootValue(data);
  return out;
}

// Also export the unmodified encoder for A/B comparison.
export function encodeGenericOriginal(data) {
  let out = 'GCF profile=generic\n';
  out += encodeRootValueOriginal(data);
  return out;
}

// ── Shared helpers (identical to production) ─────────────────────────────

function encodeObject(obj, depth) {
  const prefix = indent(depth);
  let out = '';
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fk = formatKey(key);
    if (Array.isArray(value)) {
      out += encodeNamedArray(fk, value, depth);
    } else if (typeof value === 'object' && value !== null) {
      out += `${prefix}## ${fk}\n`;
      out += encodeObject(value, depth + 1);
    } else {
      out += `${prefix}${fk}=${formatScalar(value, 0)}\n`;
    }
  }
  return out;
}

function allPrimitives(arr) {
  return arr.every(v => typeof v !== 'object' || v === null);
}

function tabularFields(arr) {
  if (arr.length === 0) return null;
  const fieldOrder = [];
  const seen = new Set();
  for (const item of arr) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
    for (const k of Object.keys(item)) {
      if (!seen.has(k)) { fieldOrder.push(k); seen.add(k); }
    }
  }
  return fieldOrder.length > 0 ? fieldOrder : null;
}

function encodeNamedArray(name, arr, depth) {
  const prefix = indent(depth);
  if (arr.length === 0) return `${prefix}## ${name} [0]\n`;
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `${prefix}${name}[${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields) return encodeTabularFlat(`${prefix}## ${name} `, arr, fields, depth);
  return encodeExpanded(`${prefix}## ${name} `, arr, depth);
}

function encodeExpanded(headerPrefix, arr, depth) {
  const prefix = indent(depth);
  let out = `${headerPrefix}[${arr.length}]\n`;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (Array.isArray(item)) {
      out += encodeExpandedArrayItem(prefix, i, item, depth);
    } else if (typeof item === 'object' && item !== null) {
      out += `${prefix}@${i} {}\n`;
      out += encodeObject(item, depth + 1);
    } else {
      out += `${prefix}@${i} =${formatScalar(item, 0)}\n`;
    }
  }
  return out;
}

function encodeExpandedArrayItem(prefix, idx, arr, depth) {
  if (arr.length === 0) return `${prefix}@${idx} [0]\n`;
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `${prefix}@${idx} [${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields) return encodeTabularFlat(`${prefix}@${idx} `, arr, fields, depth + 1);
  return encodeExpanded(`${prefix}@${idx} `, arr, depth + 1);
}

// ── Attachment helpers (identical to production) ─────────────────────────

function inlineSchemaFields(arr, fieldName) {
  const first = arr[0];
  if (!first || !(fieldName in first)) return null;
  const firstVal = first[fieldName];
  if (firstVal === null || firstVal === undefined || typeof firstVal !== 'object' || Array.isArray(firstVal)) return null;

  let canonicalKeys = null;
  for (const item of arr) {
    const obj = item;
    if (!(fieldName in obj) || obj[fieldName] === null || obj[fieldName] === undefined) continue;
    const v = obj[fieldName];
    if (typeof v !== 'object' || Array.isArray(v)) return null;
    const keys = Object.keys(v);
    for (const k of keys) {
      const val = v[k];
      if (val !== null && val !== undefined && typeof val === 'object') return null;
    }
    if (!canonicalKeys) {
      canonicalKeys = keys;
    } else {
      if (keys.length !== canonicalKeys.length) return null;
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] !== canonicalKeys[i]) return null;
      }
    }
  }
  if (!canonicalKeys || canonicalKeys.length < 3) return null;
  return canonicalKeys;
}

function sharedArraySchema(arr, fieldName) {
  const first = arr[0];
  if (!first || !(fieldName in first)) return null;
  const firstVal = first[fieldName];
  if (!Array.isArray(firstVal)) return null;

  let canonicalFields = null;
  for (const item of arr) {
    const obj = item;
    if (!(fieldName in obj) || obj[fieldName] === null || obj[fieldName] === undefined) continue;
    const v = obj[fieldName];
    if (!Array.isArray(v)) return null;
    const fields = tabularFields(v);
    if (!fields) return null;
    for (const arrItem of v) {
      if (typeof arrItem !== 'object' || arrItem === null) return null;
      for (const val of Object.values(arrItem)) {
        if (val !== null && val !== undefined && typeof val === 'object') return null;
      }
    }
    if (!canonicalFields) {
      canonicalFields = fields;
    } else {
      if (fields.length !== canonicalFields.length) return null;
      for (let i = 0; i < fields.length; i++) {
        if (fields[i] !== canonicalFields[i]) return null;
      }
    }
  }
  return canonicalFields;
}

function encodeAttachmentArray(attPrefix, fk, arr, depth) {
  if (arr.length === 0) return `${attPrefix}.${fk} [0]\n`;
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `${attPrefix}.${fk} [${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields) return encodeTabularFlat(`${attPrefix}.${fk} `, arr, fields, depth);
  return encodeExpanded(`${attPrefix}.${fk} `, arr, depth);
}

function encodeAttachmentArrayShared(attPrefix, fk, arr, depth, sharedFields) {
  if (arr.length === 0) return `${attPrefix}.${fk} [0]\n`;
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `${attPrefix}.${fk} [${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields && fields.length === sharedFields.length && fields.every((f, i) => f === sharedFields[i])) {
    const prefix = indent(depth);
    let out = `${attPrefix}.${fk} [${arr.length}]\n`;
    for (const item of arr) {
      const obj = item;
      const cells = sharedFields.map(f => {
        if (!(f in obj)) return '~';
        if (obj[f] === null || obj[f] === undefined) return '-';
        return formatScalar(obj[f], 0x7c);
      });
      out += `${prefix}${cells.join('|')}\n`;
    }
    return out;
  }
  return encodeAttachmentArray(attPrefix, fk, arr, depth);
}

// ── THE MODIFICATION: flattenable nested object detection ────────────────

/**
 * Detect fixed-shape nested objects that can be flattened into
 * semicolon-path column names. A field is flattenable if:
 *   1. It's an object (not array, not null) in every row that has it
 *   2. It has the same keys in every row
 *   3. All leaf values are scalars (not objects, not arrays)
 *   4. At least one row has the field (absent rows get ~ per leaf)
 *
 * Recurses: if a nested object contains another fixed-shape nested
 * object, that gets flattened too (e.g., organizer;emailAddress;name).
 *
 * Returns a Map<fieldName, FlatSpec> where FlatSpec describes the
 * leaf paths to emit as columns.
 */

/**
 * @typedef {Object} FlatLeaf
 * @property {string} path - semicolon-joined path (e.g., "start;dateTime")
 * @property {string[]} keys - key chain to traverse (e.g., ["start", "dateTime"])
 */

/**
 * Analyze a single field across all rows. Returns an array of leaf
 * descriptors if flattenable, or null if it should use attachments.
 */
function analyzeFlattenable(arr, fieldName, parentPath) {
  // Collect the object value from each row (skip absent/null rows).
  let canonicalShape = null; // { key: 'scalar' | FlatLeaf[] }

  for (const item of arr) {
    const obj = item;
    if (!(fieldName in obj) || obj[fieldName] === null || obj[fieldName] === undefined) continue;
    const v = obj[fieldName];
    // Must be a plain object, not array.
    if (typeof v !== 'object' || Array.isArray(v)) return null;

    const keys = Object.keys(v);

    if (!canonicalShape) {
      // First row with this field: establish shape.
      canonicalShape = {};
      for (const k of keys) {
        const val = v[k];
        if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
          // Nested object: try to recurse.
          canonicalShape[k] = 'nested';
        } else if (Array.isArray(val)) {
          // Arrays can't be flattened.
          return null;
        } else {
          canonicalShape[k] = 'scalar';
        }
      }
    } else {
      // Subsequent rows: verify same shape.
      const keys2 = Object.keys(v);
      if (keys2.length !== Object.keys(canonicalShape).length) return null;
      for (const k of keys2) {
        if (!(k in canonicalShape)) return null;
        const val = v[k];
        const expected = canonicalShape[k];
        if (expected === 'scalar') {
          if (val !== null && val !== undefined && typeof val === 'object') return null;
        } else if (expected === 'nested') {
          if (val !== null && val !== undefined) {
            if (typeof val !== 'object' || Array.isArray(val)) return null;
          }
        }
      }
    }
  }

  if (!canonicalShape) return null;

  // Now resolve nested fields recursively.
  const leaves = [];
  const currentPath = parentPath ? parentPath + PATH_SEP + fieldName : fieldName;

  for (const k of Object.keys(canonicalShape)) {
    if (canonicalShape[k] === 'scalar') {
      leaves.push({
        path: currentPath + PATH_SEP + k,
        keys: [...(parentPath ? parentPath.split(PATH_SEP) : []), fieldName, k],
      });
    } else {
      // Nested: extract sub-objects and recurse.
      const subArr = arr.map(item => {
        const obj = item;
        if (!(fieldName in obj) || obj[fieldName] === null || obj[fieldName] === undefined) return {};
        return obj[fieldName];
      });
      const subLeaves = analyzeFlattenable(subArr, k, currentPath);
      if (!subLeaves) return null; // Can't flatten this sub-object, bail on entire field.
      leaves.push(...subLeaves);
    }
  }

  return leaves;
}

/**
 * Resolve a value from an object by following a key chain.
 * Returns undefined if any step is missing.
 */
function resolveKeyChain(obj, keys) {
  let current = obj;
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[k];
  }
  return current;
}

// ── Flattened tabular encoder ────────────────────────────────────────────

function encodeRootValue(v) {
  if (v === null || v === undefined) return '=-\n';
  if (Array.isArray(v)) return encodeRootArray(v);
  if (typeof v === 'object') return encodeObject(v, 0);
  return `=${formatScalar(v, 0)}\n`;
}

function encodeRootArray(arr) {
  if (arr.length === 0) return '## [0]\n';
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `## [${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields) return encodeTabularFlat('## ', arr, fields, 0);
  return encodeExpanded('## ', arr, 0);
}

/**
 * The modified tabular encoder. Detects flattenable nested objects
 * and promotes them to semicolon-path columns. Falls back to
 * attachments for everything else (arrays, irregular objects).
 */
function encodeTabularFlat(headerPrefix, arr, fields, depth) {
  const prefix = indent(depth);

  // Phase 1: Analyze each field for flattening potential.
  //
  // For each field, we either:
  //   - flatten it (replace the field with N leaf columns)
  //   - keep it as-is (scalar or attachment)
  //
  // Build the expanded column list and a mapping for value extraction.

  /** @type {Array<{name: string, type: 'scalar'|'flat'|'attachment', field: string, keys?: string[], leaves?: FlatLeaf[]}>} */
  const columns = [];
  const flattenedFields = new Set();

  for (const f of fields) {
    // Check if this field is flattenable.
    const leaves = analyzeFlattenable(arr, f, '');
    if (leaves && leaves.length > 0) {
      // Flatten: replace this field with leaf columns.
      flattenedFields.add(f);
      for (const leaf of leaves) {
        columns.push({
          name: leaf.path,
          type: 'flat',
          field: f,
          keys: leaf.keys,
        });
      }
    } else {
      // Check if it's always a scalar (or absent/null).
      let isAlwaysScalar = true;
      for (const item of arr) {
        const obj = item;
        if (!(f in obj) || obj[f] === null || obj[f] === undefined) continue;
        if (typeof obj[f] === 'object') { isAlwaysScalar = false; break; }
      }

      if (isAlwaysScalar) {
        columns.push({ name: f, type: 'scalar', field: f });
      } else {
        columns.push({ name: f, type: 'attachment', field: f });
      }
    }
  }

  // Phase 2: Pre-compute inline schemas and shared array schemas for remaining attachments.
  const inlineSchemas = new Map();
  const sharedArrSchemas = new Map();
  for (const col of columns) {
    if (col.type === 'attachment') {
      const ifs = inlineSchemaFields(arr, col.field);
      if (ifs) inlineSchemas.set(col.field, ifs);
      const sas = sharedArraySchema(arr, col.field);
      if (sas) sharedArrSchemas.set(col.field, sas);
    }
  }

  // Phase 3: Format column names for the header.
  const fmtColumns = columns.map(col => {
    if (col.type === 'flat') {
      // Semicolon paths need quoting since they contain non-bare-key chars.
      return quoteString(col.name);
    }
    return formatKey(col.field);
  });

  let out = `${headerPrefix}[${arr.length}]{${fmtColumns.join(',')}}\n`;

  // Phase 4: Encode rows.
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    const cells = [];
    const attachments = [];
    let rowHasAttachment = false;

    for (const col of columns) {
      if (col.type === 'flat') {
        // Resolve the value by traversing the key chain.
        const v = resolveKeyChain(obj, col.keys);
        if (v === undefined) {
          cells.push('~');
        } else if (v === null) {
          cells.push('-');
        } else {
          cells.push(formatScalar(v, 0x7c));
        }
      } else if (col.type === 'scalar') {
        const f = col.field;
        if (!(f in obj)) { cells.push('~'); continue; }
        const v = obj[f];
        if (v === null || v === undefined) { cells.push('-'); continue; }
        cells.push(formatScalar(v, 0x7c));
      } else {
        // attachment
        const f = col.field;
        if (!(f in obj)) { cells.push('~'); continue; }
        const v = obj[f];
        if (v === null || v === undefined) { cells.push('-'); continue; }
        if (typeof v === 'object') {
          const ifs = inlineSchemas.get(f);
          if (ifs && !Array.isArray(v)) {
            if (i === 0) {
              const fmtIF = ifs.map(k => formatKey(k));
              cells.push(`^{${fmtIF.join(',')}}`);
            } else {
              cells.push('^');
            }
            attachments.push({ name: f, value: v, inline: true, inlineFields: ifs });
          } else {
            cells.push('^');
            attachments.push({ name: f, value: v, inline: false });
          }
          rowHasAttachment = true;
        } else {
          cells.push(formatScalar(v, 0x7c));
        }
      }
    }

    const row = cells.join('|');
    if (rowHasAttachment) {
      out += `${prefix}@${i} ${row}\n`;
    } else {
      out += `${prefix}${row}\n`;
    }

    // Emit attachments for non-flattened fields.
    for (const att of attachments) {
      const fk = formatKey(att.name);
      if (att.inline && att.inlineFields) {
        const vals = att.inlineFields.map(inf => {
          const val = att.value[inf];
          if (val === undefined) return '~';
          return formatScalar(val, 0x7c);
        });
        out += `${prefix}${vals.join('|')}\n`;
      } else if (Array.isArray(att.value)) {
        const sas = sharedArrSchemas.get(att.name);
        if (sas && i > 0) {
          out += encodeAttachmentArrayShared(prefix, fk, att.value, depth + 2, sas);
        } else {
          out += encodeAttachmentArray(prefix, fk, att.value, depth + 2);
        }
      } else {
        out += `${prefix}.${fk} {}\n`;
        out += encodeObject(att.value, depth + 2);
      }
    }
  }
  return out;
}

// ── Original (unmodified) encoder for comparison ─────────────────────────

function encodeRootValueOriginal(v) {
  if (v === null || v === undefined) return '=-\n';
  if (Array.isArray(v)) return encodeRootArrayOriginal(v);
  if (typeof v === 'object') return encodeObject(v, 0);
  return `=${formatScalar(v, 0)}\n`;
}

function encodeRootArrayOriginal(arr) {
  if (arr.length === 0) return '## [0]\n';
  if (allPrimitives(arr)) {
    const vals = arr.map(v => formatScalar(v, 0x2c));
    return `## [${arr.length}]: ${vals.join(',')}\n`;
  }
  const fields = tabularFields(arr);
  if (fields) return encodeTabularOriginal('## ', arr, fields, 0);
  return encodeExpanded('## ', arr, 0);
}

function encodeTabularOriginal(headerPrefix, arr, fields, depth) {
  const prefix = indent(depth);

  const inlineSchemas = new Map();
  const sharedArrSchemas = new Map();
  for (const f of fields) {
    const ifs = inlineSchemaFields(arr, f);
    if (ifs) inlineSchemas.set(f, ifs);
    const sas = sharedArraySchema(arr, f);
    if (sas) sharedArrSchemas.set(f, sas);
  }

  const fmtFields = fields.map(f => formatKey(f));
  let out = `${headerPrefix}[${arr.length}]{${fmtFields.join(',')}}\n`;

  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    const cells = [];
    const attachments = [];
    let rowHasAttachment = false;

    for (const f of fields) {
      if (!(f in obj)) { cells.push('~'); continue; }
      const v = obj[f];
      if (v === null || v === undefined) { cells.push('-'); continue; }
      if (typeof v === 'object') {
        const ifs = inlineSchemas.get(f);
        if (ifs && !Array.isArray(v)) {
          if (i === 0) {
            const fmtIF = ifs.map(k => formatKey(k));
            cells.push(`^{${fmtIF.join(',')}}`);
          } else {
            cells.push('^');
          }
          attachments.push({ name: f, value: v, inline: true, inlineFields: ifs });
        } else {
          cells.push('^');
          attachments.push({ name: f, value: v, inline: false });
        }
        rowHasAttachment = true;
      } else {
        cells.push(formatScalar(v, 0x7c));
      }
    }

    const row = cells.join('|');
    if (rowHasAttachment) {
      out += `${prefix}@${i} ${row}\n`;
    } else {
      out += `${prefix}${row}\n`;
    }

    for (const att of attachments) {
      const fk = formatKey(att.name);
      if (att.inline && att.inlineFields) {
        const vals = att.inlineFields.map(inf => {
          const val = att.value[inf];
          if (val === undefined) return '~';
          return formatScalar(val, 0x7c);
        });
        out += `${prefix}${vals.join('|')}\n`;
      } else if (Array.isArray(att.value)) {
        const sas = sharedArrSchemas.get(att.name);
        if (sas && i > 0) {
          out += encodeAttachmentArrayShared(prefix, fk, att.value, depth + 2, sas);
        } else {
          out += encodeAttachmentArray(prefix, fk, att.value, depth + 2);
        }
      } else {
        out += `${prefix}.${fk} {}\n`;
        out += encodeObject(att.value, depth + 2);
      }
    }
  }
  return out;
}
