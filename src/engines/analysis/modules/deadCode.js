/**
 * deadCode.js
 *
 * Flags graph elements that appear structurally unreachable or unconsumed.
 * These are heuristics based on what the graph can currently see — a node
 * with zero incoming edges of the "relevant" type is reported as a candidate,
 * not a certainty (e.g. true app entry points are expected to have no incoming
 * RENDERS edge and are excluded on purpose).
 */

import { getNodesByKind, buildReverseAdjacency } from "./metrics.js";

/**
 * @param {object} graph
 * @returns {object} deadCode report
 */
export function analyze(graph) {
  const { nodes = [], edges = [] } = graph;

  const components = getNodesByKind(nodes, "component");
  const routes = getNodesByKind(nodes, "route").filter(n => n.subtype === "endpoint");
  const contexts = components.filter(n => n.subtype === "provider" || n.subtype === "context");
  const apiEndpoints = getNodesByKind(nodes, "api").filter(n => n.subtype === "endpoint");
  const files = getNodesByKind(nodes, "file");

  const renderIncoming = buildReverseAdjacency(edges, "RENDERS");
  const routeParentIncoming = buildReverseAdjacency(edges, "ROUTE_PARENT");
  const stateConsumerIncoming = buildReverseAdjacency(edges, "STATE_CONSUMER");
  const usesContextIncoming = buildReverseAdjacency(edges, "USES_CONTEXT");
  const usesApiIncoming = buildReverseAdjacency(edges, "USES_API");
  const importsIncoming = buildReverseAdjacency(edges, "IMPORTS");

  // Unused Components: no incoming RENDERS edge, and not a legitimate root.
  // Pages are entered via routes, layouts/providers wrap trees, and app entry
  // components (App.jsx, main.jsx) are mounted directly by ReactDOM — none of
  // these are expected to have a RENDERS parent, so absence of one is normal.
  const rootLikeSubtypes = new Set(["page", "layout", "provider", "context"]);
  const unusedComponents = components.filter(
    c =>
      !rootLikeSubtypes.has(c.subtype) &&
      !isEntryFile(c.file) &&
      (renderIncoming.get(c.id) || []).length === 0
  );

  // Unused Hooks: hooks declared on a component's metadata that never surface
  // as a USES_HOOK edge target elsewhere. Since hooks are currently metadata-only
  // (no dedicated hook nodes yet), we report hook names used by exactly one
  // component and nowhere else in the project as low-reuse candidates.
  const hookUsageCount = new Map();
  components.forEach(c => {
    (c.metadata?.hooks || []).forEach(hook => {
      hookUsageCount.set(hook, (hookUsageCount.get(hook) || 0) + 1);
    });
  });
  const unusedHooks = Array.from(hookUsageCount.entries())
    .filter(([hook, count]) => count === 1 && !isBuiltInHook(hook))
    .map(([hook]) => hook);

  // Unused Routes: no ROUTE_PARENT edge connecting it to a router, or its
  // target component doesn't resolve to any component node in the graph.
  const componentNames = new Set(components.map(c => c.name));
  const unusedRoutes = routes.filter(r => {
    const hasParent = (routeParentIncoming.get(r.id) || []).length > 0;
    const targetExists = r.metadata?.componentName ? componentNames.has(r.metadata.componentName) : true;
    return !hasParent || !targetExists;
  });

  // Unused Contexts: provider/context components with no STATE_CONSUMER or
  // USES_CONTEXT edges pointing at them.
  const unusedContexts = contexts.filter(ctx => {
    const consumers = (stateConsumerIncoming.get(ctx.id) || []).length;
    const contextUsers = (usesContextIncoming.get(ctx.id) || []).length;
    return consumers === 0 && contextUsers === 0;
  });

  // Unused API Services: endpoints with no USES_API edge pointing at them.
  const unusedApiServices = apiEndpoints.filter(ep => (usesApiIncoming.get(ep.id) || []).length === 0);

  // Orphan Files: file nodes never imported by another file, and not obvious
  // entry points (main.jsx/index.jsx/App.jsx).
  const entryFilePattern = /(^|\/)(main|index|App)\.[jt]sx?$/;
  const orphanFiles = files.filter(f => {
    const hasIncomingImport = (importsIncoming.get(f.id) || []).length > 0;
    return !hasIncomingImport && !entryFilePattern.test(f.file);
  });

  return {
    unusedComponents: unusedComponents.map(brief),
    unusedHooks,
    unusedRoutes: unusedRoutes.map(brief),
    unusedContexts: unusedContexts.map(brief),
    unusedApiServices: unusedApiServices.map(brief),
    orphanFiles: orphanFiles.map(brief),
  };
}

function brief(node) {
  return { id: node.id, name: node.name, file: node.file };
}

function isEntryFile(filePath) {
  return /(^|\/)(main|index|App)\.[jt]sx?$/.test(filePath);
}

function isBuiltInHook(hookName) {
  return ["useState", "useEffect", "useRef", "useMemo", "useCallback", "useContext", "useReducer"].includes(
    hookName
  );
}