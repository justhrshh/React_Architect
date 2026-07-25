/**
 * Factory for creating generic, framework-agnostic Knowledge Graph nodes.
 *
 * Enforces deterministic ID generation across all entity types:
 * - component: `component:<file>:<name>`
 * - function: `function:<file>:<name>`
 * - variable: `variable:<file>:<name>`
 * - hook: `hook:<file>:<name>`
 * - context: `context:<file>:<name>`
 * - state slice: `slice:<file>:<name>`
 * - state store: `store:<file>:<name>`
 * - route: `route:<file>:<path>`
 * - api endpoint: `api:<file>:<method>:<path>`
 * - api gateway: `api:<file>:gateway:<name>`
 * - data module: `data:<file>`
 * - file: `file:<file>`
 * - controller (future): `controller:<file>:<name>`
 * - service (future): `service:<file>:<name>`
 */

export function createNodeId(kind, file, name, subtype = "") {
  const cleanFile = (file || "").replace(/\\/g, "/");
  if (kind === "file") return `file:${cleanFile}`;
  if (kind === "data") return `data:${cleanFile}`;
  if (kind === "route") return `route:${cleanFile}:${name}`;
  if (kind === "api" && subtype === "endpoint") return `api:${cleanFile}:${name}`;
  if (kind === "api" && subtype === "gateway") return `api:${cleanFile}:gateway:${name}`;
  if (kind === "state" && (subtype === "slice" || subtype === "store" || subtype === "thunk")) {
    return `${subtype}:${cleanFile}:${name}`;
  }
  return `${kind}:${cleanFile}:${name}`;
}

export function createNode({ id, kind, subtype = "default", name, file, metadata = {}, relationships = [] }) {
  const cleanFile = (file || "").replace(/\\/g, "/");
  const parts = cleanFile.split("/");
  const directory = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";

  const deterministicId = id || createNodeId(kind, cleanFile, name, subtype);

  return {
    id: deterministicId,
    kind,
    subtype,
    name,
    file: cleanFile,
    directory,
    metadata: {
      loc: null,
      line: null,
      ...metadata,
    },
    relationships: [...new Set(relationships)],
  };
}
