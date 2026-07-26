/**
 * request-lifecycle.composer.js
 *
 * Request Lifecycle 5-Stage Pipeline Composer.
 */

import { buildAnnotation } from "./composerUtils.js";

export function composeRequestLifecycle(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};

  const stages = [
    { id: "frontend", label: "Frontend", kinds: ["component"] },
    { id: "api", label: "API Gateway", kinds: ["api"] },
    { id: "backend", label: "Backend Routes", kinds: ["route", "middleware"] },
    { id: "logic", label: "Business Logic", kinds: ["controller", "service"] },
    { id: "data", label: "Data Layer", kinds: ["model", "database"] },
  ];

  const stageNodeMap = new Map(stages.map((s) => [s.id, []]));
  const activeNodes = [];

  nodes.forEach((node) => {
    let assignedStage = null;
    for (const stage of stages) {
      if (stage.kinds.includes(node.kind)) {
        assignedStage = stage.id;
        break;
      }
    }

    if (assignedStage) {
      const annotatedNode = {
        ...node,
        stage: assignedStage,
        annotation: buildAnnotation(node, queryMeta),
      };
      stageNodeMap.get(assignedStage).push(annotatedNode);
      activeNodes.push(annotatedNode);
    }
  });

  const activeNodeIds = new Set(activeNodes.map((n) => n.id));
  const activeEdges = edges.filter(
    (e) => e && activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
  );

  const activeStageIds = stages
    .filter((s) => (stageNodeMap.get(s.id) || []).length > 0)
    .map((s) => s.id);

  const frontendOnly =
    activeStageIds.length > 0 && activeStageIds.every((id) => id === "frontend" || id === "api");
  const backendOnly =
    activeStageIds.length > 0 &&
    activeStageIds.every((id) => id === "backend" || id === "logic" || id === "data");

  return {
    nodes: activeNodes,
    edges: activeEdges,
    layoutHints: {
      style: "pipeline",
      stages: activeStageIds.length > 0 ? activeStageIds : ["frontend", "api"],
      stageNodeMap,
      frontendOnly,
      backendOnly,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "request-lifecycle",
      frontendOnly,
      backendOnly,
    },
  };
}
