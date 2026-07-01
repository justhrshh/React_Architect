/**
 * Factory for creating standardized Knowledge Graph relationship edges.
 *
 * @param {object} params
 * @param {string} [params.id] - unique identifier, generated if omitted
 * @param {string} params.type - relationship type, e.g. "IMPORTS", "RENDERS", "USES_HOOK", "USES_CONTEXT", "USES_API", "ROUTE_PARENT", "STATE_CONSUMER", "DEPENDENCY"
 * @param {string} params.source - source node ID
 * @param {string} params.target - target node ID
 * @param {object} [params.metadata] - edge-specific properties
 * @returns {object} edge
 */
export function createEdge({ id, type, source, target, metadata = {} }) {
  const edgeId = id || `${type}:${source}->${target}`;
  return {
    id: edgeId,
    type,
    source,
    target,
    metadata: {
      resolved: true,
      dynamic: false,
      line: null,
      ...metadata,
    },
  };
}
