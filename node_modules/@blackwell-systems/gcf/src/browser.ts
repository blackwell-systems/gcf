// Browser-safe entry point. Excludes Node-only modules (packroot, delta).
export type { Symbol, Edge, Payload, DeltaPayload, Components } from './types.js';
export { KIND_ABBREV, KIND_EXPAND } from './constants.js';
export { encode } from './encode.js';
export { decode } from './decode.js';
export { encodeGeneric } from './generic.js';
export { decodeGeneric } from './decode_generic.js';
export { formatScalar, formatKey, parseScalar, needsQuote, quoteString } from './scalar.js';
export { StreamEncoder, type StreamWriter, type StreamOptions } from './stream.js';
export { GenericStreamEncoder } from './stream_generic.js';
