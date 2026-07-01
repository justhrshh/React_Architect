/**
 * Factory for creating generic, framework-agnostic Knowledge Graph nodes.
 *
 * @param {object} params
 * @param {string} params.id - stable identifier, e.g. "component:src/components/Card.jsx:Card"
 * @param {string} params.kind - "component" | "api" | "state" | "route" | "file"
 * @param {string} params.subtype - e.g. "page", "provider", "endpoint", "slice", "router"
 * @param {string} params.name - display name
 * @param {string} params.file - file path relative to project root
 * @param {object} [params.metadata] - node-specific properties
 * @param {Array<string>} [params.relationships] - list of connected node IDs
 * @returns {object} node
 */
export function createNode({ id, kind, subtype = "default", name, file, metadata = {}, relationships = [] }) {
  const cleanFile = file.replace(/\\/g, "/");
  const parts = cleanFile.split("/");
  const directory = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";

  return {
    id,
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
