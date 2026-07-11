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

  // Map of node ID -> list of directly affected node IDs (dependents)
  const dependentsMap = new Map();
  nodes.forEach(n => dependentsMap.set(n.id, []));

  edges.forEach(e => {
    if (e.type === "STATE_CONSUMER" || e.type === "ROUTE_PARENT") {
      // Source changes -> Target is affected
      if (dependentsMap.has(e.source)) {
        dependentsMap.get(e.source).push(e.target);
      }
    } else {
      // Default: Target changes -> Source is affected (RENDERS, USES_API, LAZY_LOADS, DEPENDENCY, IMPORTS)
      if (dependentsMap.has(e.target)) {
        dependentsMap.get(e.target).push(e.source);
      }
    }
  });

  // Handle virtual dependencies between route nodes and their target components
  nodes.forEach(n => {
    if (n.kind === "route" && n.metadata?.componentName) {
      // Find the component node by name
      const targetComp = nodes.find(c => c.kind === "component" && c.name === n.metadata.componentName);
      if (targetComp && dependentsMap.has(targetComp.id)) {
        dependentsMap.get(targetComp.id).push(n.id);
      }
    }
  });

  // BFS outward (directed, following only dependent paths) to find all affected nodes
  const visited = new Set([nodeId]);
  const affectedIds = [];
  const queue = [nodeId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const directDeps = dependentsMap.get(current) || [];
    directDeps.forEach(id => {
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

  // Collect direct uses (dependencies) and usedBy (dependents)
  const directUsesSet = new Set();
  const directUsedBySet = new Set();

  edges.forEach(e => {
    if (e.type === "STATE_CONSUMER" || e.type === "ROUTE_PARENT") {
      if (e.target === nodeId) directUsesSet.add(e.source);
      if (e.source === nodeId) directUsedBySet.add(e.target);
    } else {
      if (e.source === nodeId) directUsesSet.add(e.target);
      if (e.target === nodeId) directUsedBySet.add(e.source);
    }
  });

  // Add virtual route-component dependents
  if (target.kind === "component") {
    nodes.forEach(n => {
      if (n.kind === "route" && n.metadata?.componentName === target.name) {
        directUsedBySet.add(n.id);
      }
    });
  }
  // Add virtual component dependency to route
  if (target.kind === "route" && target.metadata?.componentName) {
    const depComp = nodes.find(c => c.kind === "component" && c.name === target.metadata.componentName);
    if (depComp) directUsesSet.add(depComp.id);
  }

  const uses = Array.from(directUsesSet)
    .map(id => nodeMap.get(id))
    .filter(Boolean)
    .map(node => ({ ...brief(node), kind: node.kind }));

  const usedBy = Array.from(directUsedBySet)
    .map(id => nodeMap.get(id))
    .filter(Boolean)
    .map(node => ({ ...brief(node), kind: node.kind }));

  const blastRadius = affectedNodes.length;

  return {
    target: { id: target.id, name: target.name, kind: target.kind, file: target.file },
    componentsAffected: componentsAffected.map(brief),
    routesAffected: routesAffected.map(brief),
    apiAffected: apiAffected.map(brief),
    stateAffected: stateAffected.map(brief),
    affectedByKind: {
      component: componentsAffected.length,
      route: routesAffected.length,
      api: apiAffected.length,
      state: stateAffected.length,
    },
    direct: {
      uses,
      usedBy,
    },
    blastRadius,
    riskLevel: getRiskLevel(blastRadius, usedBy.length),
  };
}

function brief(node) {
  return { id: node.id, name: node.name, file: node.file };
}

function getRiskLevel(blastRadius, dependentCount) {
  if (blastRadius >= 12 || dependentCount >= 6) return "high";
  if (blastRadius >= 5 || dependentCount >= 2) return "medium";
  return "low";
}
