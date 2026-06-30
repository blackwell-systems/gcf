#!/usr/bin/env node
/**
 * GCF command-line interface: encode, decode, stats.
 */

import { readFileSync } from 'node:fs';
import { encode } from './encode.js';
import { decode } from './decode.js';
import { encodeGeneric } from './generic.js';
import { decodeGeneric } from './decode_generic.js';
import type { Payload, Symbol, Edge } from './types.js';

const USAGE = `gcf - token-optimized wire format for LLM tool responses

Usage:
  gcf encode [file]           Encode JSON graph payload to GCF (stdin if no file)
  gcf decode [file]           Decode GCF graph text to JSON (stdin if no file)
  gcf encode-generic [file]   Encode generic JSON to GCF (stdin if no file)
  gcf decode-generic [file]   Decode generic GCF to JSON (stdin if no file)
  gcf stats  [file]           Compare token counts: JSON vs GCF (stdin if no file)
  gcf version                 Print version

Examples:
  gcf encode < payload.json
  gcf decode < payload.gcf
  gcf encode-generic < data.json
  gcf decode-generic < data.gcf
  gcf stats payload.json
`;

function readInput(args: string[]): string {
  if (args.length > 0 && args[0] !== '-') {
    return readFileSync(args[0]!, 'utf-8');
  }
  return readFileSync(0, 'utf-8');
}

function payloadFromJSON(data: string): Payload {
  const obj = JSON.parse(data);
  return {
    tool: obj.tool ?? '',
    tokenBudget: obj.tokenBudget ?? 0,
    tokensUsed: obj.tokensUsed ?? 0,
    packRoot: obj.packRoot ?? '',
    symbols: (obj.symbols ?? []).map((s: any) => ({
      qualifiedName: s.qualifiedName,
      kind: s.kind,
      score: s.score,
      provenance: s.provenance,
      distance: s.distance ?? 0,
    })),
    edges: (obj.edges ?? []).map((e: any) => ({
      source: e.source,
      target: e.target,
      edgeType: e.edgeType,
      status: e.status ?? '',
    })),
  };
}

function payloadToJSON(p: Payload): string {
  return JSON.stringify({
    tool: p.tool,
    tokensUsed: p.tokensUsed,
    tokenBudget: p.tokenBudget,
    packRoot: p.packRoot ?? '',
    symbols: p.symbols.map(s => ({
      qualifiedName: s.qualifiedName,
      kind: s.kind,
      score: s.score,
      provenance: s.provenance,
      distance: s.distance,
    })),
    edges: p.edges.map(e => ({
      source: e.source,
      target: e.target,
      edgeType: e.edgeType,
      ...(e.status ? { status: e.status } : {}),
    })),
  }, null, 2);
}

function doEncode(data: string): void {
  const p = payloadFromJSON(data);
  process.stdout.write(encode(p));
}

function doDecode(data: string): void {
  const p = decode(data);
  console.log(payloadToJSON(p));
}

function doStats(data: string): void {
  const p = payloadFromJSON(data);
  const gcfOutput = encode(p);

  const jsonTokens = Math.floor(data.trim().length / 4);
  const gcfTokens = Math.floor(gcfOutput.trim().length / 4);

  const savings = jsonTokens > 0 ? 100 * (1 - gcfTokens / jsonTokens) : 0;

  const barWidth = 30;
  const jsonBar = '█'.repeat(barWidth);
  const gcfFilled = jsonTokens > 0 ? Math.round((gcfTokens * barWidth) / jsonTokens) : 0;
  const gcfBar = '█'.repeat(gcfFilled) + '░'.repeat(barWidth - gcfFilled);

  console.log(`Payload: ${p.symbols.length} symbols, ${p.edges.length} edges\n`);
  console.log(`  JSON  ${jsonBar}  ${jsonTokens} tokens`);
  console.log(`  GCF   ${gcfBar}  ${gcfTokens} tokens`);
  console.log(`\n  Savings: ${Math.round(savings)}% fewer tokens with GCF`);
}

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'encode':
    doEncode(readInput(args.slice(1)));
    break;
  case 'decode':
    doDecode(readInput(args.slice(1)));
    break;
  case 'encode-generic':
    process.stdout.write(encodeGeneric(JSON.parse(readInput(args.slice(1)))));
    break;
  case 'decode-generic':
    console.log(JSON.stringify(decodeGeneric(readInput(args.slice(1))), null, 2));
    break;
  case 'stats':
    doStats(readInput(args.slice(1)));
    break;
  case 'version':
    console.log('gcf 0.1.0');
    break;
  case '-h':
  case '--help':
  case 'help':
    process.stdout.write(USAGE);
    break;
  default:
    if (!cmd) {
      process.stderr.write(USAGE);
      process.exit(1);
    }
    process.stderr.write(`unknown command: ${cmd}\n\n`);
    process.stderr.write(USAGE);
    process.exit(1);
}
