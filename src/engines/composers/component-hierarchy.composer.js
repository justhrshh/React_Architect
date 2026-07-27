/**
 * component-hierarchy.composer.js
 *
 * Component Hierarchy Tree Composer.
 * Implements Section 7 of the Studio Re-Architecture Implementation Specification.
 */

import { buildAnnotation } from "./composerUtils.js";

/**
 * Composes a component render tree hierarchy from the Knowledge Graph subgraph.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeComponentHierarchy(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";

  // Section 7.9 — Project-type adaptation: disabled for backend projects
  if (projectType === "backend") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Component Hierarchy is for frontend projects. This project appears to be a backend service.",
      layoutHints: { style: "tree" },
      queryMeta: { ...queryMeta, composerName: "component-hierarchy", projectType },
    };
  }

  // Section 7.4 — Exclude route nodes. Keep only component nodes.
  const compNodes = nodes.filter((n) => n.kind === "component");
  const compNodeIds = new Set(compNodes.map((n) => n.id));

  // Filter edges to RENDERS and LAZY_LOADS between components
  const renderEdges = edges.filter(
    (e) =>
      e &&
      (e.type === "RENDERS" || e.type === "LAZY_LOADS") &&
      compNodeIds.has(e.source) &&
      compNodeIds.has(e.target)
  );

  // Section 7.5 — Root Selection Priority
  // 1. App component
  // 2. Component with highest out-degree
  // 3. Nodes with zero in-degree
  const inDegreeMap = new Map();
  const outDegreeMap = new Map();
  compNodes.forEach((n) => {
    inDegreeMap.set(n.id, 0);
    outDegreeMap.set(n.id, 0);
  });

  renderEdges.forEach((e) => {
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
    outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
  });

  let rootNode = compNodes.find(
    (n) => (n.name === "App" || n.name === "main") && (inDegreeMap.get(n.id) || 0) === 0
  );

  if (!rootNode) {
    const zeroInDegree = compNodes.filter((n) => (inDegreeMap.get(n.id) || 0) === 0);
    if (zeroInDegree.length > 0) {
      zeroInDegree.sort((a, b) => (outDegreeMap.get(b.id) || 0) - (outDegreeMap.get(a.id) || 0));
      rootNode = zeroInDegree[0];
    } else if (compNodes.length > 0) {
      const sorted = [...compNodes].sort((a, b) => (outDegreeMap.get(b.id) || 0) - (outDegreeMap.get(a.id) || 0));
      rootNode = sorted[0];
    }
  }

  const rootId = rootNode?.id || null;

  // Build depth map via BFS from root(s)
  const depthMap = new Map();
  const visited = new Set();
  const queue = [];

  if (rootId) {
    depthMap.set(rootId, 0);
    visited.add(rootId);
    queue.push(rootId);
  }

  // Also seed any disconnected roots
  compNodes.forEach((n) => {
    if ((inDegreeMap.get(n.id) || 0) === 0 && !visited.has(n.id)) {
      depthMap.set(n.id, 0);
      visited.add(n.id);
      queue.push(n.id);
    }
  });

  while (queue.length > 0) {
    const currId = queue.shift();
    const currDepth = depthMap.get(currId) || 0;
    const outgoing = renderEdges.filter((e) => e.source === currId);
    for (const edge of outgoing) {
      if (!depthMap.has(edge.target)) {
        depthMap.set(edge.target, currDepth + 1);
        visited.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  // Section 7.2 & 7.7 — Shared Component Detection & Reference Cards (Option D)
  // Components rendered by > 1 parent in this graph get sharedComponent: true.
  // First occurrence (lowest depth) is canonical node. Subsequent occurrences are reference cards.
  const seenCanonical = new Set();
  const finalNodes = [];
  const finalEdges = [];

  // Sort nodes by depth ascending
  const sortedCompNodes = [...compNodes].sort((a, b) => (depthMap.get(a.id) ?? 0) - (depthMap.get(b.id) ?? 0));

  sortedCompNodes.forEach((node) => {
    const totalParents = inDegreeMap.get(node.id) || 0;
    const isShared = totalParents > 1;

    if (isShared && seenCanonical.has(node.id)) {
      // Secondary occurrence -> Reference card
      finalNodes.push({
        ...node,
        id: `ref:${node.id}`,
        isReference: true,
        canonicalId: node.id,
        depth: depthMap.get(node.id) ?? 0,
        annotation: `Reference -> ${node.name}`,
      });
    } else {
      if (isShared) seenCanonical.add(node.id);
      finalNodes.push({
        ...node,
        sharedComponent: isShared,
        parentCount: totalParents,
        depth: depthMap.get(node.id) ?? 0,
        annotation: isShared ? `Used in ${totalParents} places` : buildAnnotation(node, queryMeta),
      });
    }
  });

  // Re-map edges to point to reference cards if applicable
  renderEdges.forEach((e) => {
    const targetParents = inDegreeMap.get(e.target) || 0;
    if (targetParents > 1 && seenCanonical.has(e.target)) {
      // Check if another edge already targeted canonical
      const alreadyTargeted = finalEdges.some((fe) => fe.target === e.target);
      if (alreadyTargeted) {
        finalEdges.push({ ...e, target: `ref:${e.target}` });
      } else {
        finalEdges.push(e);
      }
    } else {
      finalEdges.push(e);
    }
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
    layoutHints: {
      style: "tree",
      rootId,
      depthMap,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "component-hierarchy",
      projectType,
    },
  };
}
