/**
 * KindAbbrev maps full kind names to short GCF abbreviations.
 */
export const KIND_ABBREV: Record<string, string> = {
  function: 'fn',
  type: 'type',
  method: 'method',
  interface: 'iface',
  var: 'var',
  const: 'const',
  resource: 'resource',
  table: 'table',
  class: 'class',
  selector: 'selector',
  field: 'field',
  route_handler: 'route',
  external: 'ext',
  file: 'file',
  package: 'pkg',
  service: 'svc',
};

/**
 * KindExpand is the reverse of KindAbbrev: maps abbreviations back to full kind names.
 */
export const KIND_EXPAND: Record<string, string> = {
  fn: 'function',
  type: 'type',
  method: 'method',
  iface: 'interface',
  var: 'var',
  const: 'const',
  resource: 'resource',
  table: 'table',
  class: 'class',
  selector: 'selector',
  field: 'field',
  route: 'route_handler',
  ext: 'external',
  file: 'file',
  pkg: 'package',
  svc: 'service',
};
