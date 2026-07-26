/**
 * request-lifecycle.template.js
 *
 * Full-stack request lifecycle pipeline template (Frontend -> API -> Backend -> Logic -> Data).
 */

export default {
  id: "request-lifecycle",
  displayName: "Request Lifecycle",
  description: "Trace full-stack request execution from component fetch through controllers to database.",
  icon: "Repeat",
  chipColor: "#EC4899",

  aliases: [
    "api", "apis", "endpoints", "requests", "fetch", "axios", "http",
    "api lifecycle", "request lifecycle", "api flow",
    "backend", "express", "server", "controllers", "services",
    "backend execution", "server flow", "api server"
  ],

  query: {
    graphType: "request-lifecycle",
    traversal: {
      includeKinds: [
        "component", "api", "route", "middleware",
        "controller", "service", "model", "database"
      ],
      includeEdgeTypes: [
        "USES_API", "CALLS_API", "TARGETS_ROUTE", "HANDLED_BY",
        "AUTHORIZES", "VALIDATES", "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB"
      ],
      excludeKinds: ["file", "function", "variable", "data"],
      depth: 6,
      direction: "forward",
      maxNodes: 50,
    },
    focus: {
      strategy: "name-match",
    },
    composition: {
      grouping: {
        collapseSameStage: true,
        stages: [
          { id: "frontend", label: "Frontend", kinds: ["component"] },
          { id: "api", label: "API Gateway", kinds: ["api"] },
          { id: "backend", label: "Backend Routes", kinds: ["route", "middleware"] },
          { id: "logic", label: "Business Logic", kinds: ["controller", "service"] },
          { id: "data", label: "Data Layer", kinds: ["model", "database"] },
        ],
      },
      annotation: "verbose",
    },
    layout: {
      style: "pipeline",
      options: {
        stages: ["frontend", "api", "backend", "logic", "data"],
      },
    },
    presentation: {
      edgeSemantics: {
        USES_API: { label: "calls", style: "solid" },
        HANDLED_BY: { label: "handled by", style: "solid" },
        CALLS_SERVICE: { label: "delegates to", style: "solid" },
        AUTHORIZES: { label: "authorized by", style: "dashed" },
        ACCESSES_DB: { label: "queries", style: "solid" },
      },
      interaction: {
        expandable: true,
        traceable: true,
        explorable: false,
      },
    },
  },

  emptyState: {
    heading: "No full-stack connection detected",
    description: "This template shows the complete request lifecycle from frontend to database. Your project may be frontend-only or backend-only.",
    suggestions: ["Execution Flow", "Component Hierarchy"],
  },

  historyLabel: (focus) => (focus ? `Request Lifecycle — ${focus}` : "Request Lifecycle"),
};
