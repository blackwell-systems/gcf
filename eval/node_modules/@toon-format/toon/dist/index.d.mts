//#region src/constants.d.ts
declare const DELIMITERS: {
  readonly comma: ",";
  readonly tab: "	";
  readonly pipe: "|";
};
type DelimiterKey = keyof typeof DELIMITERS;
type Delimiter = typeof DELIMITERS[DelimiterKey];
declare const DEFAULT_DELIMITER: Delimiter;
//#endregion
//#region src/types.d.ts
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined };
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
/**
* A function that transforms or filters values during encoding.
*
* Called for every value (root, object properties, array elements) during the encoding process.
* Similar to `JSON.stringify`'s replacer, but with path tracking.
*
* @param key - The property key or array index (as string). Empty string (`''`) for root value.
* @param value - The normalized `JsonValue` at this location.
* @param path - Array representing the path from root to this value.
*
* @returns The replacement value (will be normalized again), or `undefined` to omit.
*          For root value, returning `undefined` means "no change" (don't omit root).
*
* @example
* ```ts
* // Remove password fields
* const replacer = (key, value) => {
*   if (key === 'password') return undefined
*   return value
* }
*
* // Add timestamps
* const replacer = (key, value, path) => {
*   if (path.length === 0 && typeof value === 'object' && value !== null) {
*     return { ...value, _timestamp: Date.now() }
*   }
*   return value
* }
* ```
*/
type EncodeReplacer = (key: string, value: JsonValue, path: readonly (string | number)[]) => unknown;
interface EncodeOptions {
  /**
  * Number of spaces per indentation level.
  * @default 2
  */
  indent?: number;
  /**
  * Delimiter to use for tabular array rows and inline primitive arrays.
  * @default DELIMITERS.comma
  */
  delimiter?: Delimiter;
  /**
  * Enable key folding to collapse single-key wrapper chains.
  * When set to 'safe', nested objects with single keys are collapsed into dotted paths
  * (e.g., data.metadata.items instead of nested indentation).
  * @default 'off'
  */
  keyFolding?: "off" | "safe";
  /**
  * Maximum number of segments to fold when keyFolding is enabled.
  * Controls how deep the folding can go in single-key chains.
  * Values 0 or 1 have no practical effect (treated as effectively disabled).
  * @default Infinity
  */
  flattenDepth?: number;
  /**
  * A function to transform or filter values during encoding.
  * Called for the root value and every nested property/element.
  * Return `undefined` to omit properties/elements (root cannot be omitted).
  * @default undefined
  */
  replacer?: EncodeReplacer;
}
type ResolvedEncodeOptions = Readonly<Required<Omit<EncodeOptions, "replacer">>> & Pick<EncodeOptions, "replacer">;
interface DecodeOptions {
  /**
  * Number of spaces per indentation level.
  * @default 2
  */
  indent?: number;
  /**
  * When true, enforce strict validation of array lengths and tabular row counts.
  * @default true
  */
  strict?: boolean;
  /**
  * Enable path expansion to reconstruct dotted keys into nested objects.
  * When set to 'safe', keys containing dots are expanded into nested structures
  * if all segments are valid identifiers (e.g., data.metadata.items becomes nested objects).
  * Pairs with keyFolding='safe' for lossless round-trips.
  * @default 'off'
  */
  expandPaths?: "off" | "safe";
}
type ResolvedDecodeOptions = Readonly<Required<DecodeOptions>>;
/**
* Options for streaming decode operations.
*
* @remarks
* Path expansion is not supported in streaming mode.
*/
interface DecodeStreamOptions extends Omit<DecodeOptions, "expandPaths"> {
  /**
  * Path expansion is not supported in streaming decode.
  * This option is explicitly omitted.
  */
  expandPaths?: never;
}
type JsonStreamEvent = {
  type: "startObject";
} | {
  type: "endObject";
} | {
  type: "startArray";
  length: number;
} | {
  type: "endArray";
} | {
  type: "key";
  key: string;
  wasQuoted?: boolean;
} | {
  type: "primitive";
  value: JsonPrimitive;
};
//#endregion
//#region src/decode/errors.d.ts
/**
* Error thrown by the TOON decoder when input cannot be parsed.
*
* Extends `SyntaxError` so existing `instanceof SyntaxError` checks keep working.
* Adds structured location fields for programmatic consumers and richer CLI output.
*/
declare class ToonDecodeError extends SyntaxError {
  /** 1-based line number where the error was detected, if known. */
  readonly line?: number;
  /** Raw source line (including indentation) where the error was detected, if known. */
  readonly source?: string;
  constructor(message: string, context?: {
    line?: number;
    source?: string;
    cause?: unknown;
  });
}
//#endregion
//#region src/index.d.ts
/**
* Encodes a JavaScript value into TOON format string.
*
* @param input - Any JavaScript value (objects, arrays, primitives)
* @param options - Optional encoding configuration
* @returns TOON formatted string
*
* @example
* ```ts
* encode({ name: 'Alice', age: 30 })
* // name: Alice
* // age: 30
*
* encode({ users: [{ id: 1 }, { id: 2 }] })
* // users[2]{id}:
* //   1
* //   2
*
* encode({ tags: [] })
* // tags: []
*
* encode(data, { indent: 4, keyFolding: 'safe' })
* ```
*/
declare function encode(input: unknown, options?: EncodeOptions): string;
/**
* Decodes a TOON format string into a JavaScript value.
*
* @param input - TOON formatted string
* @param options - Optional decoding configuration
* @returns Parsed JavaScript value (object, array, or primitive)
*
* @example
* ```ts
* decode('name: Alice\nage: 30')
* // { name: 'Alice', age: 30 }
*
* decode('users[2]:\n  - id: 1\n  - id: 2')
* // { users: [{ id: 1 }, { id: 2 }] }
*
* decode('tags: []')
* // { tags: [] }
*
* decode(toonString, { strict: false, expandPaths: 'safe' })
* ```
*/
declare function decode(input: string, options?: DecodeOptions): JsonValue;
/**
* Encodes a JavaScript value into TOON format as a sequence of lines.
*
* This function yields TOON lines one at a time without building the full string,
* making it suitable for streaming large outputs to files, HTTP responses, or process stdout.
*
* @param input - Any JavaScript value (objects, arrays, primitives)
* @param options - Optional encoding configuration
* @returns Iterable of TOON lines (without trailing newlines)
*
* @example
* ```ts
* // Stream to stdout
* for (const line of encodeLines({ name: 'Alice', age: 30 })) {
*   console.log(line)
* }
*
* // Collect to array
* const lines = Array.from(encodeLines(data))
*
* // Equivalent to encode()
* const toonString = Array.from(encodeLines(data, options)).join('\n')
* ```
*/
declare function encodeLines(input: unknown, options?: EncodeOptions): Iterable<string>;
/**
* Decodes TOON format from pre-split lines into a JavaScript value.
*
* This is a convenience wrapper around the streaming decoder that builds
* the full value in memory. Useful when you already have lines as an array
* or iterable and want the standard decode behavior with path expansion support.
*
* @param lines - Iterable of TOON lines (without newlines)
* @param options - Optional decoding configuration (supports expandPaths)
* @returns Parsed JavaScript value (object, array, or primitive)
*
* @example
* ```ts
* const lines = ['name: Alice', 'age: 30']
* decodeFromLines(lines)
* // { name: 'Alice', age: 30 }
* ```
*/
declare function decodeFromLines(lines: Iterable<string>, options?: DecodeOptions): JsonValue;
/**
* Synchronously decodes TOON lines into a stream of JSON events.
*
* This function yields structured events (startObject, endObject, startArray, endArray,
* key, primitive) that represent the JSON data model without building the full value tree.
* Useful for streaming processing, custom transformations, or memory-efficient parsing.
*
* @remarks
* Path expansion (`expandPaths: 'safe'`) is not supported in streaming mode.
*
* @param lines - Iterable of TOON lines (without newlines)
* @param options - Optional decoding configuration (expandPaths not supported)
* @returns Iterable of JSON stream events
*
* @example
* ```ts
* const lines = ['name: Alice', 'age: 30']
* for (const event of decodeStreamSync(lines)) {
*   console.log(event)
*   // { type: 'startObject' }
*   // { type: 'key', key: 'name' }
*   // { type: 'primitive', value: 'Alice' }
*   // ...
* }
* ```
*/
declare function decodeStreamSync(lines: Iterable<string>, options?: DecodeStreamOptions): Iterable<JsonStreamEvent>;
/**
* Asynchronously decodes TOON lines into a stream of JSON events.
*
* This function yields structured events (startObject, endObject, startArray, endArray,
* key, primitive) that represent the JSON data model without building the full value tree.
* Supports both sync and async iterables for maximum flexibility with file streams,
* network responses, or other async sources.
*
* @remarks
* Path expansion (`expandPaths: 'safe'`) is not supported in streaming mode.
*
* @param source - Async or sync iterable of TOON lines (without newlines)
* @param options - Optional decoding configuration (expandPaths not supported)
* @returns Async iterable of JSON stream events
*
* @example
* ```ts
* const fileStream = createReadStream('data.toon', 'utf-8')
* const lines = splitLines(fileStream) // Async iterable of lines
*
* for await (const event of decodeStream(lines)) {
*   console.log(event)
*   // { type: 'startObject' }
*   // { type: 'key', key: 'name' }
*   // { type: 'primitive', value: 'Alice' }
*   // ...
* }
* ```
*/
declare function decodeStream(source: AsyncIterable<string> | Iterable<string>, options?: DecodeStreamOptions): AsyncIterable<JsonStreamEvent>;
//#endregion
export { DEFAULT_DELIMITER, DELIMITERS, type DecodeOptions, type DecodeStreamOptions, type Delimiter, type DelimiterKey, type EncodeOptions, type EncodeReplacer, type JsonArray, type JsonObject, type JsonPrimitive, type JsonStreamEvent, type JsonValue, type ResolvedDecodeOptions, type ResolvedEncodeOptions, ToonDecodeError, decode, decodeFromLines, decodeStream, decodeStreamSync, encode, encodeLines };