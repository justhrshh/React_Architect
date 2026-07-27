/**
 * request-lifecycle.composer.js
 *
 * Request Lifecycle 5-Stage Pipeline Composer.
 * Implements Section 9 of the Studio Re-Architecture Implementation Specification.
 */

import { buildAnnotation } from "./composerUtils.js";

/**
 * Assigns a node to its request lifecycle stage according to Section 9.7.
 * Returns null if the node should be excluded.
 */
function assignRequestStage(node) {
  if (node.kind === "component") return "frontend";
  if (node.kind === "api") return "api_client";
  if (node.kind === "middleware") return "backend";
  if (node.kind === "route") {
    const source = node.metadata?.source || "";
    if (source === "express" || source === "nestjs" || source === "fastify" || source === "koa") {
      return "backend";
    }
    return null; // React Router / Next.js routes: EXCLUDED from Request Lifecycle backend stage
  }
  if (node.kind === "controller" || node.kind === "service") return "logic";
  if (node.kind === "model" || node.kind === "database") return "data";
  return null;
}

/**
 * Composes a request lifecycle 5-stage pipeline from the Knowledge Graph subgraph.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeRequestLifecycle(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";

  // Section 9.9 — Project-type adaptation: disabled for library projects
  if (projectType === "library") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Request Lifecycle requires an application with API calls.",
      layoutHints: { style: "pipeline", stages: [] },
      queryMeta: { ...queryMeta, composerName: "request-lifecycle", projectType },
    };
  }

  const allStages = [
    { id: "frontend", label: "Frontend UI" },
    { id: "api_client", label: "API Client" },
    { id: "backend", label: "Backend Routes" },
    { id: "logic", label: "Business Logic" },
    { id: "data", label: "Data Layer" },
  ];

  const stageNodeMap = new Map(allStages.map((s) => [s.id, []]));
  const activeNodes = [];

  nodes.forEach((node) => {
    const stageId = assignRequestStage(node);
    if (stageId) {
      let annotation = buildAnnotation(node, queryMeta);

      // Section 9.8 — Middleware annotation
      if (node.kind === "middleware") {
        const sub = node.subtype || "";
        if (sub === "auth") annotation = "Auth Check";
        else if (sub === "validation") annotation = "Input Validation";
        else if (sub === "logging") annotation = "Logging";
        else if (sub === "cors") annotation = "CORS Policy";
      }

      const annotatedNode = {
        ...node,
        stage: stageId,
        annotation,
      };

      stageNodeMap.get(stageId).push(annotatedNode);
      activeNodes.push(annotatedNode);
    }
  });

  const activeNodeIds = new Set(activeNodes.map((n) => n.id));
  const activeEdges = edges.filter(
    (e) => e && activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
  );

  const activeStageIds = allStages
    .filter((s) => (stageNodeMap.get(s.id) || []).length > 0)
    .map((s) => s.id);

  const frontendOnly =
    activeStageIds.length > 0 && activeStageIds.every((id) => id === "frontend" || id === "api_client");
  const backendOnly =
    activeStageIds.length > 0 &&
    activeStageIds.every((id) => id === "backend" || id === "logic" || id === "data");

  const message = frontendOnly
    ? "Showing frontend request flow only. Connect a backend project to see the full pipeline."
    : null;

  return {
    nodes: activeNodes,
    edges: activeEdges,
    message,
    layoutHints: {
      style: "pipeline",
      stages: activeStageIds.length > 0 ? activeStageIds : ["frontend", "api_client"],
      stageNodeMap,
      frontendOnly,
      backendOnly,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "request-lifecycle",
      projectType,
      frontendOnly,
      backendOnly,
    },
  };
}
