/**
 * state-flow.composer.js
 *
 * State Flow Tripartite Composer.
 * Implements Section 8 of the Studio Re-Architecture Implementation Specification.
 */

import { buildAnnotation } from "./composerUtils.js";

/**
 * Composes state flow nodes and edges into a tripartite/quadpartite layout.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeStateFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";

  // Section 8.11 — Project-type adaptation: disabled for backend projects
  if (projectType === "backend") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "State Flow is designed for frontend state management. This project has no frontend state.",
      layoutHints: { style: "tripartite" },
      queryMeta: { ...queryMeta, composerName: "state-flow", projectType },
    };
  }

  // Step 1: Partition nodes into state, hook, component, api
  const stateNodes = [];
  const hookNodes = [];
  const compNodes = [];
  const apiNodes = [];

  nodes.forEach((node) => {
    if (
      node.kind === "state" ||
      node.subtype === "slice" ||
      node.subtype === "context" ||
      node.subtype === "provider" ||
      node.subtype === "zustand-store"
    ) {
      stateNodes.push(node);
    } else if (node.kind === "hook") {
      hookNodes.push(node);
    } else if (node.kind === "component") {
      compNodes.push(node);
    } else if (node.kind === "api") {
      apiNodes.push(node);
    }
  });

  const stateNodeIds = new Set(stateNodes.map((n) => n.id));
  const hookNodeIds = new Set(hookNodes.map((n) => n.id));
  const compNodeIds = new Set(compNodes.map((n) => n.id));
  const apiNodeIds = new Set(apiNodes.map((n) => n.id));
  const allIds = new Set([...stateNodeIds, ...hookNodeIds, ...compNodeIds, ...apiNodeIds]);

  // Filter edges to state-relevant edges
  const stateEdgeTypes = new Set([
    "STATE_CONSUMER", "DISPATCHES_ACTION", "ASYNC_THUNK",
    "USES_CONTEXT", "SUBSCRIBES_TO", "USES_HOOK", "HOOK_CALLS_HOOK",
    "USES_API", "TARGETS_ROUTE"
  ]);

  const stateEdges = edges.filter(
    (e) =>
      e &&
      stateEdgeTypes.has(e.type) &&
      allIds.has(e.source) &&
      allIds.has(e.target)
  );

  // Step 5: Read and write count calculation for state nodes
  const writeCountMap = new Map();
  const readCountMap = new Map();

  stateNodes.forEach((s) => {
    writeCountMap.set(s.id, 0);
    readCountMap.set(s.id, 0);
  });

  stateEdges.forEach((e) => {
    if (stateNodeIds.has(e.target) && (e.type === "DISPATCHES_ACTION" || e.type === "ASYNC_THUNK")) {
      writeCountMap.set(e.target, (writeCountMap.get(e.target) || 0) + 1);
    }
    if (stateNodeIds.has(e.source) && (e.type === "STATE_CONSUMER" || e.type === "USES_CONTEXT" || e.type === "SUBSCRIBES_TO")) {
      readCountMap.set(e.source, (readCountMap.get(e.source) || 0) + 1);
    }
  });

  // Annotate nodes
  const annotatedNodes = nodes
    .filter((n) => allIds.has(n.id))
    .map((node) => {
      let group = "component";
      if (stateNodeIds.has(node.id)) group = "state";
      else if (hookNodeIds.has(node.id)) group = "hook";
      else if (apiNodeIds.has(node.id)) group = "api";

      let annotation = buildAnnotation(node, queryMeta);
      if (group === "state") {
        const reads = readCountMap.get(node.id) || 0;
        const writes = writeCountMap.get(node.id) || 0;
        if (node.subtype === "slice") {
          annotation = `${reads} reader${reads === 1 ? "" : "s"}, ${writes} writer${writes === 1 ? "" : "s"}`;
        } else if (node.subtype === "context") {
          annotation = `React Context (${reads} consumer${reads === 1 ? "" : "s"})`;
        } else if (node.subtype === "zustand-store") {
          annotation = `Zustand Store (${reads} subscriber${reads === 1 ? "" : "s"})`;
        }
      }

      return {
        ...node,
        group,
        metadata: {
          ...node.metadata,
          readCount: readCountMap.get(node.id) || 0,
          writeCount: writeCountMap.get(node.id) || 0,
        },
        annotation,
      };
    });

  return {
    nodes: annotatedNodes,
    edges: stateEdges,
    layoutHints: {
      style: "tripartite",
      leftGroup: "state",
      middleGroup: "hook",
      rightGroup: "component",
      apiGroup: "api",
    },
    queryMeta: {
      ...queryMeta,
      composerName: "state-flow",
      projectType,
    },
  };
}
