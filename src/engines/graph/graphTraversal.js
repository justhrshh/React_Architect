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
 * Performs bidirectional (upstream + downstream) BFS from a single node — the traversal
 * shape Blueprint Flow needs for hover/select highlighting (as opposed to
 * `getReachableNodes`, which is forward-only and multi-root, for dead-code/impact analysis).
 *
 * Additive: does not change `getReachableNodes`/`getExecutionChain` or any existing caller.
 *
 * Includes a built-in existence guard: if `startNodeId` does not appear in `graph.nodes`,
 * returns an empty Set rather than a lone "phantom" node. This matters for callers like
 * Blueprint Flow, where the currently-selected id may refer to a Knowledge Graph node that a
 * downstream filtering step (e.g. `buildBlueprintGraph`'s architectural-unit filter) chose
 * not to include — without this guard, every other node would incorrectly appear "dimmed"
 * (not connected to a target that isn't actually present).
 *
 * @param {object} graph - Graph to traverse ({ nodes, edges }) — pass an already-curated
 *   graph (e.g. a Blueprint Graph) when you want traversal scoped to just that graph's edges.
 * @param {string} startNodeId
 * @param {Array<string>} [allowedEdgeTypes] - Restrict traversal to these edge types. Pass an
 *   empty array (the default) to traverse every edge in `graph.edges` as-is — appropriate
 *   when `graph.edges` is already curated (e.g. Blueprint Flow's `blueprintEdges`). Pass an
 *   explicit list (e.g. `DEFAULT_STRUCTURAL_EDGES`) when traversing a raw, uncurated graph.
 * @returns {Set<string>} connectedNodeIds - includes startNodeId itself when found
 */
export function getBidirectionalReachableNodes(graph, startNodeId, allowedEdgeTypes = []) {
  const connected = new Set();
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !startNodeId) {
    return connected;
  }

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  if (!nodeIds.has(startNodeId)) {
    return connected; // existence guard — see docstring
  }

  const allowedSet = new Set(allowedEdgeTypes);
  const forwardAdj = new Map();
  const reverseAdj = new Map();

  for (const edge of graph.edges) {
    if (!edge || !edge.source || !edge.target) continue;
    if (allowedSet.size > 0 && !allowedSet.has(edge.type)) continue;

    if (!forwardAdj.has(edge.source)) forwardAdj.set(edge.source, []);
    forwardAdj.get(edge.source).push(edge.target);

    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target).push(edge.source);
  }

  connected.add(startNodeId);

  const queueDown = [startNodeId];
  while (queueDown.length > 0) {
    const curr = queueDown.shift();
    (forwardAdj.get(curr) || []).forEach(next => {
      if (!connected.has(next)) {
        connected.add(next);
        queueDown.push(next);
      }
    });
  }

  const queueUp = [startNodeId];
  while (queueUp.length > 0) {
    const curr = queueUp.shift();
    (reverseAdj.get(curr) || []).forEach(prev => {
      if (!connected.has(prev)) {
        connected.add(prev);
        queueUp.push(prev);
      }
    });
  }

  return connected;
}

/**
 * Bounded, directional execution-neighborhood lookup (Phase 8 of the Blueprint Flow v2
 * refactor — see TASK.md). Unlike `getBidirectionalReachableNodes` above (unbounded, used for
 * Part 1's general-purpose highlighting), this walks only `upstreamHops`/`downstreamHops` steps
 * in each direction — the "what happened just before this, what happens right after" view the
 * v2 design calls for, so selecting a node near the top of a large graph doesn't light up
 * everything beneath it.
 *
 * Same existence guard as `getBidirectionalReachableNodes`: an id not present in `graph.nodes`
 * yields empty sets rather than a false "phantom" neighborhood.
 *
 * @param {object} graph - Graph to traverse ({ nodes, edges }) — pass an already-curated graph
 *   (e.g. a Blueprint Graph) when you want the neighborhood scoped to just that graph's edges.
 * @param {string} nodeId
 * @param {object} [options]
 * @param {number} [options.upstreamHops=1] - how many edges to walk backward (predecessors)
 * @param {number} [options.downstreamHops=1] - how many edges to walk forward (successors)
 * @param {Array<string>} [options.allowedEdgeTypes=[]] - restrict traversal to these edge types;
 *   empty (default) means "trust graph.edges as already curated," same convention as
 *   `getBidirectionalReachableNodes`.
 * @returns {{ upstream: Set<string>, downstream: Set<string> }} - neither set includes `nodeId`
 *   itself; a node reachable both ways (e.g. via a cycle) appears in both sets.
 */
export function getExecutionNeighborhood(graph, nodeId, options = {}) {
  const upstreamHops = options.upstreamHops ?? 1;
  const downstreamHops = options.downstreamHops ?? 1;
  const allowedEdgeTypes = options.allowedEdgeTypes ?? [];

  const empty = { upstream: new Set(), downstream: new Set() };
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !nodeId) {
    return empty;
  }

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  if (!nodeIds.has(nodeId)) {
    return empty; // existence guard — see docstring
  }

  const allowedSet = new Set(allowedEdgeTypes);
  const forwardAdj = new Map();
  const reverseAdj = new Map();

  for (const edge of graph.edges) {
    if (!edge || !edge.source || !edge.target) continue;
    if (allowedSet.size > 0 && !allowedSet.has(edge.type)) continue;

    if (!forwardAdj.has(edge.source)) forwardAdj.set(edge.source, []);
    forwardAdj.get(edge.source).push(edge.target);

    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target).push(edge.source);
  }

  function walkHops(adj, hops) {
    const visited = new Set();
    let frontier = [nodeId];
    for (let hop = 0; hop < hops && frontier.length > 0; hop++) {
      const next = [];
      frontier.forEach((curr) => {
        (adj.get(curr) || []).forEach((neighborId) => {
          if (neighborId !== nodeId && !visited.has(neighborId)) {
            visited.add(neighborId);
            next.push(neighborId);
          }
        });
      });
      frontier = next;
    }
    return visited;
  }

  return {
    upstream: walkHops(reverseAdj, upstreamHops),
    downstream: walkHops(forwardAdj, downstreamHops),
  };
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