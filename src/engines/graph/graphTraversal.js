/**
 * graphTraversal.js
 *
 * Centralized, unified Graph Traversal Engine (BFS / DFS).
 * Acts as the single source of truth for reachability and request lifecycle tracing
 * across Hygiene Analysis (dead code), Flow Studio, Impact Analysis, and AI Context.
 */

/**
 * Structural edge types used for general reachability analysis.
 */
export const DEFAULT_STRUCTURAL_EDGES = [
  "IMPORTS", "RENDERS", "USES_HOOK", "USES_CONTEXT", "STATE_CONSUMER",
  "USES_API", "CALLS_API", "TARGETS_ROUTE", "ROUTE_PARENT", "RE_EXPORTS", "EXPORTS",
  "DYNAMIC_IMPORT", "REGISTERS", "CALLS", "FORWARDS_REF", "HANDLED_BY",
  "AUTHORIZES", "VALIDATES", "USES", "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB"
];

/**
 * Performs multi-root BFS traversal starting from entryNodeIds.
 *
 * @param {object} graph - Knowledge Graph ({ nodes, edges })
 * @param {Array<string>} entryNodeIds - Array of root node IDs
 * @param {Array<string>} [allowedEdgeTypes] - Allowed edge types to follow
 * @returns {Set<string>} reachableNodeIds
 */
export function getReachableNodes(graph, entryNodeIds = [], allowedEdgeTypes = DEFAULT_STRUCTURAL_EDGES) {
  const reachable = new Set();
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return reachable;
  }

  const allowedSet = new Set(allowedEdgeTypes);
  
  // Forward adjacency map: sourceId -> Array<targetId>
  const adj = new Map();
  for (const edge of graph.edges) {
    if (!edge || !edge.source || !edge.target) continue;
    if (allowedSet.size > 0 && !allowedSet.has(edge.type)) continue;

    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source).push(edge.target);
  }

  const queue = [...entryNodeIds];
  entryNodeIds.forEach(id => reachable.add(id));

  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = adj.get(curr) || [];

    for (const nxt of neighbors) {
      if (!reachable.has(nxt)) {
        reachable.add(nxt);
        queue.push(nxt);
      }
    }
  }

  return reachable;
}

/**
 * Traces downstream execution chain from a starting node.
 * Useful for building end-to-end request flows:
 * Component -> Hook -> API -> Express Route -> Middleware -> Controller -> Service -> Model -> Database
 *
 * @param {object} graph
 * @param {string} startNodeId
 * @returns {Array<object>} chainOfNodes
 */
export function getExecutionChain(graph, startNodeId) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return [];
  }

  const nodesById = new Map(graph.nodes.map(n => [n.id, n]));
  const startNode = nodesById.get(startNodeId);
  if (!startNode) return [];

  const flowEdgeTypes = new Set([
    "USES_HOOK", "USES_API", "CALLS_API", "TARGETS_ROUTE",
    "HANDLED_BY", "AUTHORIZES", "VALIDATES", "USES",
    "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB"
  ]);

  const adj = new Map();
  for (const edge of graph.edges) {
    if (!flowEdgeTypes.has(edge.type)) continue;
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source).push({ targetId: edge.target, edgeType: edge.type });
  }

  const visited = new Set([startNodeId]);
  const chain = [startNode];

  let currentId = startNodeId;
  while (currentId) {
    const outgoing = adj.get(currentId) || [];
    const unvisited = outgoing.find(o => !visited.has(o.targetId));

    if (unvisited) {
      const nextNode = nodesById.get(unvisited.targetId);
      if (nextNode) {
        visited.add(unvisited.targetId);
        chain.push(nextNode);
        currentId = unvisited.targetId;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return chain;
}

/**
 * Identifies entry points across both Frontend and Backend.
 *
 * @param {object} graph
 * @returns {{ frontendRoots: Array<object>, backendRoots: Array<object>, allRootIds: Array<string> }}
 */
export function findApplicationEntryPoints(graph) {
  const nodes = graph?.nodes || [];
  
  const frontendPatterns = /(^|\/)(main|index|App|_app|_document)\.[jt]sx?$/i;
  const backendPatterns  = /(^|\/)(server|app|index|backend\/server|backend\/app|backend\/index)\.[jt]sx?$/i;

  const frontendRoots = [];
  const backendRoots = [];
  const allRootIds = [];

  for (const node of nodes) {
    if (node.kind === "file") {
      if (frontendPatterns.test(node.file)) {
        frontendRoots.push(node);
        allRootIds.push(node.id);
      } else if (backendPatterns.test(node.file)) {
        backendRoots.push(node);
        allRootIds.push(node.id);
      }
    } else if (node.kind === "component" && (node.subtype === "page" || node.subtype === "layout")) {
      allRootIds.push(node.id);
    } else if (node.kind === "route" && node.subtype === "router") {
      allRootIds.push(node.id);
    }
  }

  return { frontendRoots, backendRoots, allRootIds };
}
