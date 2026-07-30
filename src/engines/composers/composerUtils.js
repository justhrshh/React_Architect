/**
 * composerUtils.js
 *
 * Shared utilities extracted from blueprintGraphBuilder.js for all composers.
 */

export {
  classifyArchitecturalUnit,
  ARCHITECTURAL_NODE_KINDS,
  ARCHITECTURAL_EDGE_TYPES,
  BRIDGED_EDGE_TYPE,
} from "../graph/laneClassifier.js";

/**
 * Synthesizes bridge edges for execution chains that pass through excluded (filtered-out) nodes.
 *
 * @param {Array<object>} rawEdges
 * @param {Set<string>} includedIds
 * @param {Set<string>} allNodeIds
 * @returns {Array<object>} bridgeEdges
 */
export function bridgeExcludedNodes(rawEdges, includedIds, allNodeIds) {
  const forwardAdj = new Map();
  rawEdges.forEach((edge) => {
    if (!edge || !edge.source || !edge.target) return;
    if (!forwardAdj.has(edge.source)) forwardAdj.set(edge.source, []);
    forwardAdj.get(edge.source).push(edge.target);
  });

  const memo = new Map();

  function nearestIncludedDescendants(nodeId, visiting) {
    if (memo.has(nodeId)) return memo.get(nodeId);
    if (visiting.has(nodeId)) return { targets: new Set(), via: new Set() };
    visiting.add(nodeId);

    const targets = new Set();
    const via = new Set([nodeId]);

    (forwardAdj.get(nodeId) || []).forEach((nextId) => {
      if (includedIds.has(nextId)) {
        targets.add(nextId);
      } else if (allNodeIds.has(nextId)) {
        via.add(nextId);
        const sub = nearestIncludedDescendants(nextId, visiting);
        sub.targets.forEach((t) => targets.add(t));
        sub.via.forEach((v) => via.add(v));
      }
    });

    visiting.delete(nodeId);
    const result = { targets, via };
    memo.set(nodeId, result);
    return result;
  }

  const bridgeEdges = [];
  const seenPairs = new Set();

  rawEdges.forEach((edge) => {
    if (!edge || !edge.source || !edge.target) return;
    if (!includedIds.has(edge.source)) return;
    if (includedIds.has(edge.target)) return;
    if (!allNodeIds.has(edge.target)) return;

    const { targets, via } = nearestIncludedDescendants(edge.target, new Set());
    targets.forEach((targetId) => {
      if (targetId === edge.source) return;
      const pairKey = `${edge.source}->${targetId}`;
      if (seenPairs.has(pairKey)) return;
      seenPairs.add(pairKey);
      bridgeEdges.push({
        id: `bridge:${edge.source}->${targetId}`,
        type: BRIDGED_EDGE_TYPE,
        source: edge.source,
        target: targetId,
        metadata: { bridged: true, via: [...via] },
      });
    });
  });

  return bridgeEdges;
}

/**
 * Builds contextual annotation text for a node card.
 *
 * @param {object} node
 * @param {object} queryMeta
 * @returns {string} annotation
 */
export function buildAnnotation(node, queryMeta = {}) {
  if (!node) return "";

  const { kind, name = "", subtype = "", metadata = {} } = node;

  if (kind === "component") {
    if (metadata.childCount) return `Renders ${metadata.childCount} children`;
    return "UI Component";
  }

  if (kind === "api") {
    if (metadata.endpoint) return `Endpoint: ${metadata.endpoint}`;
    return "API Request";
  }

  if (kind === "state") {
    if (subtype === "slice") return "Redux State Slice";
    if (subtype === "context") return "React Context";
    return "State Container";
  }

  if (kind === "route") {
    if (metadata.path) return `Path: ${metadata.path}`;
    return "Route Endpoint";
  }

  if (kind === "controller") return "Controller Logic";
  if (kind === "service") return "Business Service";
  if (kind === "model") return "Data Model";
  if (kind === "database") return `${node.metadata?.engine || "Database"} Storage`;
  if (kind === "hook") return "Custom Hook";

  return subtype || kind || "";
}

/**
 * Group nodes by criteria defined in template configuration.
 *
 * @param {Array<object>} nodes
 * @param {object} groupingConfig
 * @returns {Array<object>}
 */
export function groupNodesByCriteria(nodes = [], groupingConfig = {}) {
  // Simple pass-through for now, expandable when specific limits hit
  return nodes;
}
