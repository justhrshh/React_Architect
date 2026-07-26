/**
 * composerUtils.js
 *
 * Shared utilities extracted from blueprintGraphBuilder.js for all composers.
 */

export const ARCHITECTURAL_NODE_KINDS = new Set([
  "component", "route", "controller", "middleware",
  "service", "model", "database", "api", "hook", "state",
]);

export const ARCHITECTURAL_EDGE_TYPES = new Set([
  "RENDERS", "USES_HOOK", "USES_CONTEXT", "STATE_CONSUMER", "DISPATCHES_ACTION",
  "USES_API", "CALLS_API", "TARGETS_ROUTE", "ROUTE_PARENT", "ROUTE_RENDERS",
  "HANDLED_BY", "AUTHORIZES", "VALIDATES", "USES",
  "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB", "LAZY_LOADS",
]);

export const BRIDGED_EDGE_TYPE = "EXECUTION_FLOW";

/**
 * Classifies a Knowledge Graph node into its semantic architectural lane.
 *
 * @param {object} node
 * @returns {string} laneId
 */
export function classifyArchitecturalUnit(node) {
  if (!node) return "components";

  const { kind, subtype, file = "", name = "" } = node;
  const lowerFile = file.toLowerCase();
  const lowerName = name.toLowerCase();

  // 9. Database
  if (kind === "database") return "database";

  // 8. Models
  if (kind === "model" || subtype === "orm" || lowerFile.includes("models/")) return "models";

  // 7. Controllers & Services
  if (
    kind === "controller" ||
    kind === "service" ||
    lowerFile.includes("controllers/") ||
    lowerFile.includes("services/")
  ) {
    return "business_logic";
  }

  // 6. Backend Routes & Middleware
  if (
    kind === "middleware" ||
    (kind === "route" && lowerFile.includes("routes/")) ||
    lowerFile.includes("middleware/")
  ) {
    return "backend_routes";
  }

  // 5. API Clients & Frontend Endpoints
  if (kind === "api" || lowerName.includes("api") || lowerFile.includes("api/")) {
    return "api_clients";
  }

  // 4. Hooks & State
  if (
    kind === "hook" ||
    kind === "state" ||
    subtype === "slice" ||
    subtype === "context" ||
    subtype === "provider" ||
    /^use[A-Z]/.test(name)
  ) {
    return "hooks_state";
  }

  // 0. Entry (Files or Root Components)
  if (
    (kind === "file" && /(^|\/)(main|index|App|server|app|_app|_document)\.[jt]sx?$/i.test(file)) ||
    (kind === "component" && (name === "App" || name === "main" || subtype === "root"))
  ) {
    return "entry";
  }

  // 1. Routing
  if (
    kind === "route" ||
    subtype === "router" ||
    subtype === "route" ||
    name === "Router" ||
    lowerName.includes("route")
  ) {
    return "routing";
  }

  // 2. Pages
  if (
    subtype === "page" ||
    lowerFile.includes("pages/") ||
    lowerFile.includes("views/") ||
    lowerName.endsWith("page")
  ) {
    return "pages";
  }

  // 3. Components (Default UI)
  return "components";
}

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
  if (kind === "database") return "Database Storage";

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
