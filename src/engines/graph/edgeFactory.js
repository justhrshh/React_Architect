/**
 * Factory for creating standardized Knowledge Graph relationship edges.
 *
 * Enforces deterministic ID generation: `edge:<type>:<source>-><target>`
 */

export function createEdgeId(type, source, target) {
  return `edge:${type}:${source}->${target}`;
}

export function createEdge({ id, type, source, target, metadata = {} }) {
  const edgeId = id || createEdgeId(type, source, target);
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
