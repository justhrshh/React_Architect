/**
 * impactAnalysis.js
 *
 * Given a node id, traverses the graph in both directions to answer:
 * "what breaks if I change or delete this?"
 *
 * This is the module future Live Refactoring (Feature 1) and Refactor
 * Simulator (Feature 10) will sit directly on top of — it deliberately
 * returns plain, serializable data (no DOM/React Flow concerns) so it can
 * be reused for a dry-run preview before any file is touched.
 */

import { nodeMapOf } from "./metrics.js";

/**
 * @param {object} graph
 * @param {string} nodeId - id of the node to analyze
 * @returns {object|null} impact report, or null if nodeId isn't in the graph
 */
export function analyze(graph, nodeId) {
  const { nodes = [], edges = [] } = graph;
  const nodeMap = nodeMapOf(nodes);
  const target = nodeMap.get(nodeId);
  if (!target) return null;

  // Any edge touching this node, in either direction, counts as a dependency
  // relationship worth walking — direction matters for "who is affected".
  const undirectedNeighbors = new Map();
  edges.forEach(e => {
    if (!undirectedNeighbors.has(e.source)) undirectedNeighbors.set(e.source, []);
    if (!undirectedNeighbors.has(e.target)) undirectedNeighbors.set(e.target, []);
    undirectedNeighbors.get(e.source).push({ id: e.target, type: e.type, direction: "out" });
    undirectedNeighbors.get(e.target).push({ id: e.source, type: e.type, direction: "in" });
  });

  // BFS outward from the node to find everything structurally connected to it.
  const visited = new Set([nodeId]);
  const affectedIds = [];
  const queue = [nodeId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const neighbors = undirectedNeighbors.get(current) || [];
    neighbors.forEach(({ id }) => {
      if (!visited.has(id)) {
        visited.add(id);
        affectedIds.push(id);
        queue.push(id);
      }
    });
  }

  const affectedNodes = affectedIds.map(id => nodeMap.get(id)).filter(Boolean);

  const componentsAffected = affectedNodes.filter(n => n.kind === "component");
  const routesAffected = affectedNodes.filter(n => n.kind === "route");
  const apiAffected = affectedNodes.filter(n => n.kind === "api");
  const stateAffected = affectedNodes.filter(n => n.kind === "state");

  return {
    target: { id: target.id, name: target.name, kind: target.kind, file: target.file },
    componentsAffected: componentsAffected.map(brief),
    routesAffected: routesAffected.map(brief),
    apiAffected: apiAffected.map(brief),
    stateAffected: stateAffected.map(brief),
    blastRadius: affectedNodes.length,
  };
}

function brief(node) {
  return { id: node.id, name: node.name, file: node.file };
}