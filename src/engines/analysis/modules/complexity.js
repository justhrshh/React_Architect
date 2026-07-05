/**
 * complexity.js
 *
 * Graph-derived complexity heuristics. Deliberately simple: these are signals
 * to guide developer attention, not a formal cyclomatic-complexity calculation
 * (that belongs in the parser/AST layer, not up here).
 */

import { getNodesByKind, computeDepths, average } from "./metrics.js";

/**
 * @param {object} graph
 * @returns {object} complexity report
 */
export function analyze(graph) {
  const { nodes = [], edges = [] } = graph;
  const components = getNodesByKind(nodes, "component");

  const componentComplexity = components
    .map(c => ({
      id: c.id,
      name: c.name,
      file: c.file,
      score: scoreComponent(c),
    }))
    .sort((a, b) => b.score - a.score);

  const { depths, maxDepth } = computeDepths(nodes, edges, "RENDERS");
  const avgNestingDepth = average(Array.from(depths.values()));

  // Largest render tree: the root whose reachable RENDERS subtree is biggest.
  const largestRenderTree = findLargestRenderTree(nodes, edges);

  // Dependency depth reuses the same BFS but across IMPORTS edges (file-level).
  const { maxDepth: dependencyDepth } = computeDepths(
    getNodesByKind(nodes, "file"),
    edges,
    "IMPORTS"
  );

  const projectComplexity = average(componentComplexity.map(c => c.score));

  return {
    componentComplexity,
    projectComplexity,
    averageNestingDepth: avgNestingDepth,
    maxNestingDepth: maxDepth,
    largestRenderTree,
    dependencyDepth,
  };
}

/**
 * Per-component complexity: weighted mix of size, hook usage, children, and API calls.
 * Weights are intentionally simple and documented so they're easy to retune later.
 */
function scoreComponent(component) {
  const meta = component.metadata || {};
  const loc = meta.loc || 0;
  const hooks = (meta.hooks || []).length;
  const children = (meta.children || []).length;
  const apiCalls = (meta.apiCalls || []).length;

  const score = loc * 0.1 + hooks * 2 + children * 1.5 + apiCalls * 2;
  return Math.round(score * 10) / 10;
}

function findLargestRenderTree(nodes, edges) {
  const rendersAdj = new Map();
  edges.forEach(e => {
    if (e.type !== "RENDERS") return;
    if (!rendersAdj.has(e.source)) rendersAdj.set(e.source, []);
    rendersAdj.get(e.source).push(e.target);
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  function subtreeSize(rootId, visited = new Set()) {
    if (visited.has(rootId)) return 0; // guard against cycles
    visited.add(rootId);
    const children = rendersAdj.get(rootId) || [];
    return 1 + children.reduce((sum, childId) => sum + subtreeSize(childId, visited), 0);
  }

  let best = null;
  rendersAdj.forEach((_, rootId) => {
    const size = subtreeSize(rootId);
    if (!best || size > best.size) {
      const node = nodeMap.get(rootId);
      best = { id: rootId, name: node?.name || rootId, size };
    }
  });

  return best;
}