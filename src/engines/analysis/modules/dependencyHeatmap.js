/**
 * dependencyHeatmap.js
 *
 * Analyzes raw graph connectivity to surface which nodes matter most.
 * Produces structured metrics only — no colors, no sizes, no UI concerns.
 * The Architecture Studio (or any future studio) maps these numbers to
 * visuals however it likes.
 */

import { degreeMaps, calculateCentrality, computeDepths, getNodesByKind } from "./metrics.js";

const CRITICAL_NODE_LIMIT = 10;

/**
 * @param {object} graph
 * @returns {object} dependencyHeatmap
 */
export function analyze(graph) {
  const { nodes = [], edges = [] } = graph;

  const { in: inMap, out: outMap } = degreeMaps(nodes, edges);
  const centrality = calculateCentrality(nodes, edges);
  const { depths } = computeDepths(getNodesByKind(nodes, "component"), edges, "RENDERS");

  const heatmap = nodes.map(n => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    incoming: inMap.get(n.id) || 0,
    outgoing: outMap.get(n.id) || 0,
    depth: depths.has(n.id) ? depths.get(n.id) : null,
    centrality: centrality.get(n.id) || 0,
    // Usage frequency: for now, incoming-edge count is the best graph-derived
    // proxy for "how often is this relied upon". Swap for real call-site counts
    // once the parser tracks them without changing this module's contract.
    usageFrequency: inMap.get(n.id) || 0,
  }));

  const criticalNodes = [...heatmap]
    .sort((a, b) => b.centrality - a.centrality || b.incoming - a.incoming)
    .slice(0, CRITICAL_NODE_LIMIT)
    .filter(n => n.centrality > 0 || n.incoming > 0);

  return {
    nodes: heatmap,
    criticalNodes,
  };
}