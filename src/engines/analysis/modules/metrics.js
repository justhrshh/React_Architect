/**
 * metrics.js
 *
 * Reusable, framework-agnostic graph math shared by every Analysis Engine module.
 *
 * DESIGN RULE: these helpers only ever touch the generic `{nodes, edges}` shape
 * produced by nodeFactory.js / edgeFactory.js. Nothing here knows what a
 * "component" or a "route" really is beyond the `kind` string on the node —
 * that keeps this file valid even if the parser starts emitting new kinds.
 */

// ---------------------------------------------------------------------------
// Basic counting / filtering
// ---------------------------------------------------------------------------

/** Count nodes, optionally matching a predicate or a {kind, subtype} filter. */
export function countNodes(nodes, filter) {
  return getNodesBy(nodes, filter).length;
}

/** Count edges, optionally matching a predicate or a {type} filter. */
export function countEdges(edges, filter) {
  return getEdgesBy(edges, filter).length;
}

/** Filter nodes by a predicate function OR a {kind, subtype} partial match object. */
export function getNodesBy(nodes, filter) {
  if (!filter) return nodes;
  if (typeof filter === "function") return nodes.filter(filter);
  return nodes.filter(n =>
    (filter.kind === undefined || n.kind === filter.kind) &&
    (filter.subtype === undefined || n.subtype === filter.subtype)
  );
}

/** Filter edges by a predicate function OR a {type} partial match object. */
export function getEdgesBy(edges, filter) {
  if (!filter) return edges;
  if (typeof filter === "function") return edges.filter(filter);
  return edges.filter(e => filter.type === undefined || e.type === filter.type);
}

export function getNodesByKind(nodes, kind) {
  return nodes.filter(n => n.kind === kind);
}

export function getEdgesByType(edges, type) {
  return edges.filter(e => e.type === type);
}

export function nodeMapOf(nodes) {
  return new Map(nodes.map(n => [n.id, n]));
}

// ---------------------------------------------------------------------------
// Adjacency / degree
// ---------------------------------------------------------------------------

/**
 * Build an outgoing adjacency list, optionally restricted to one or more edge types.
 * @param {Array<object>} edges
 * @param {string|Array<string>} [types] - restrict to these edge type(s); omit for all edges
 * @returns {Map<string, string[]>} source id -> [target ids]
 */
export function buildAdjacency(edges, types) {
  const typeSet = types ? new Set(Array.isArray(types) ? types : [types]) : null;
  const adj = new Map();
  edges.forEach(e => {
    if (typeSet && !typeSet.has(e.type)) return;
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  });
  return adj;
}

/** Build a reverse (incoming) adjacency list. */
export function buildReverseAdjacency(edges, types) {
  const typeSet = types ? new Set(Array.isArray(types) ? types : [types]) : null;
  const adj = new Map();
  edges.forEach(e => {
    if (typeSet && !typeSet.has(e.type)) return;
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.target).push(e.source);
  });
  return adj;
}

/** Returns {in: Map<id,count>, out: Map<id,count>} degree maps across all edges (or a type filter). */
export function degreeMaps(nodes, edges, types) {
  const typeSet = types ? new Set(Array.isArray(types) ? types : [types]) : null;
  const inMap = new Map(nodes.map(n => [n.id, 0]));
  const outMap = new Map(nodes.map(n => [n.id, 0]));
  edges.forEach(e => {
    if (typeSet && !typeSet.has(e.type)) return;
    if (outMap.has(e.source)) outMap.set(e.source, outMap.get(e.source) + 1);
    if (inMap.has(e.target)) inMap.set(e.target, inMap.get(e.target) + 1);
  });
  return { in: inMap, out: outMap };
}

// ---------------------------------------------------------------------------
// Structural analysis
// ---------------------------------------------------------------------------

/** Nodes with zero total connections (neither source nor target of any edge). */
export function findOrphans(nodes, edges) {
  const connected = new Set();
  edges.forEach(e => {
    connected.add(e.source);
    connected.add(e.target);
  });
  return nodes.filter(n => !connected.has(n.id));
}

/**
 * Detect cycles via DFS over a given edge type (defaults to "RENDERS").
 * @returns {Array<{source: string, target: string}>} back-edges that closed a cycle
 */
export function findCycles(nodes, edges, edgeType = "RENDERS") {
  const adj = buildAdjacency(edges, edgeType);
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(nodeId) {
    visited.add(nodeId);
    recStack.add(nodeId);
    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        cycles.push({ source: nodeId, target: neighbor });
      }
    }
    recStack.delete(nodeId);
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) dfs(n.id);
  });

  return cycles;
}

/** The node with the largest metadata.loc among a kind (default "component"). */
export function findLargestComponent(nodes, kind = "component") {
  const candidates = nodes.filter(n => n.kind === kind && typeof n.metadata?.loc === "number");
  if (candidates.length === 0) return null;
  return candidates.reduce((largest, n) => (n.metadata.loc > (largest?.metadata.loc ?? -1) ? n : largest), null);
}

/** Average metadata.loc among a kind (default "component"). Returns 0 if none measured. */
export function averageComponentSize(nodes, kind = "component") {
  const candidates = nodes.filter(n => n.kind === kind && typeof n.metadata?.loc === "number");
  if (candidates.length === 0) return 0;
  const total = candidates.reduce((sum, n) => sum + n.metadata.loc, 0);
  return Math.round((total / candidates.length) * 10) / 10;
}

/**
 * BFS depth from a set of root nodes (nodes with in-degree 0 within the given edge type).
 * Returns {depths: Map<id, depth>, maxDepth: number, roots: string[]}
 */
export function computeDepths(nodes, edges, edgeType = "RENDERS") {
  const adj = buildAdjacency(edges, edgeType);
  const { in: inMap } = degreeMaps(nodes, edges, edgeType);
  let roots = nodes.filter(n => (inMap.get(n.id) || 0) === 0).map(n => n.id);
  if (roots.length === 0 && nodes.length > 0) roots = [nodes[0].id];

  const depths = new Map();
  const queue = [];
  roots.forEach(id => {
    depths.set(id, 0);
    queue.push(id);
  });

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const depth = depths.get(current);
    const neighbors = adj.get(current) || [];
    neighbors.forEach(next => {
      if (!depths.has(next) || depths.get(next) < depth + 1) {
        depths.set(next, depth + 1);
        queue.push(next);
      }
    });
  }

  const maxDepth = depths.size > 0 ? Math.max(...depths.values()) : 0;
  return { depths, maxDepth, roots };
}

/**
 * Simple degree centrality: (inDegree + outDegree) normalized against the busiest node.
 * Cheap, dependency-free stand-in that scales fine for typical project graphs;
 * swap in betweenness/eigenvector centrality later without touching call sites.
 * @returns {Map<string, number>} node id -> centrality score in [0, 1]
 */
export function calculateCentrality(nodes, edges) {
  const { in: inMap, out: outMap } = degreeMaps(nodes, edges);
  const scores = new Map();
  let max = 0;
  nodes.forEach(n => {
    const score = (inMap.get(n.id) || 0) + (outMap.get(n.id) || 0);
    scores.set(n.id, score);
    if (score > max) max = score;
  });
  if (max === 0) return scores;
  scores.forEach((score, id) => scores.set(id, Math.round((score / max) * 1000) / 1000));
  return scores;
}

/** Group nodes by an arbitrary key function or property name. */
export function groupBy(nodes, keyOrFn) {
  const fn = typeof keyOrFn === "function" ? keyOrFn : n => n[keyOrFn];
  const map = new Map();
  nodes.forEach(n => {
    const key = fn(n);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  });
  return map;
}

/** Safe average of a numeric array. */
export function average(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  return Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 10) / 10;
}