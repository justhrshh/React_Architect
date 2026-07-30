/**
 * execution-flow.template.js
 *
 * Full application execution flow template definition.
 * Phase 1 update: includes all new edge types from Phase 0 data layer.
 */

export default {
  id: "execution-flow",
  displayName: "Execution Flow",
  description: "Trace application execution from entry through components, hooks, APIs, and services.",
  icon: "Workflow",
  chipColor: "#3B82F6",

  aliases: [
    "execution", "flow", "execution flow", "how does", "explain",
    "auth flow", "authentication flow", "login flow", "dashboard",
    "checkout", "payment", "signup", "onboarding",
    "show", "trace", "walkthrough",
    "blueprint", "full app", "full application", "overview"
  ],

  query: {
    graphType: "execution-flow",
    traversal: {
      includeKinds: [
        "component", "route", "api", "state", "hook",
        "controller", "service", "middleware", "model", "database"
      ],
      includeEdgeTypes: [
        // Rendering
        "RENDERS", "ROUTE_RENDERS", "ROUTE_PARENT", "LAZY_LOADS",
        // Hooks & Context (Phase 0 additions)
        "USES_HOOK", "HOOK_CALLS_HOOK", "USES_CONTEXT",
        // State
        "STATE_CONSUMER", "DISPATCHES_ACTION", "ASYNC_THUNK", "SUBSCRIBES_TO",
        // API
        "USES_API", "CALLS_API", "TARGETS_ROUTE",
        // Backend
        "HANDLED_BY", "AUTHORIZES", "VALIDATES", "USES",
        "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB",
        // Synthetic bridge
        "EXECUTION_FLOW"
      ],
      excludeKinds: ["file", "function", "variable", "data"],
      depth: 6,
      direction: "forward",
      maxNodes: 60,
    },
    focus: {
      strategy: "name-match",
    },
    composition: {
      grouping: {
        collapseDeepComponents: true,
        maxGroupSize: 4,
      },
      annotation: "contextual",
    },
    layout: {
      style: "lanes",
      options: {},
    },
    presentation: {
      edgeSemantics: {
        RENDERS:            { label: "renders",      style: "solid" },
        USES_HOOK:          { label: "uses",         style: "solid" },
        USES_CONTEXT:       { label: "consumes",     style: "dashed" },
        USES_API:           { label: "calls",        style: "solid" },
        STATE_CONSUMER:     { label: "reads state",  style: "dashed" },
        DISPATCHES_ACTION:  { label: "dispatches",   style: "dashed" },
        ASYNC_THUNK:        { label: "async",        style: "dashed" },
        SUBSCRIBES_TO:      { label: "subscribes",   style: "solid" },
        HANDLED_BY:         { label: "handled by",   style: "solid" },
        CALLS_SERVICE:      { label: "delegates to", style: "solid" },
        EXECUTION_FLOW:     { label: "→",            style: "dotted" },
      },
      interaction: {
        expandable: true,
        traceable: true,
        explorable: false,
      },
    },
  },

  emptyState: {
    heading: "No execution flow detected",
    description: "This project may not have been fully analyzed or the specified focus component was not found.",
    suggestions: ["Composed Architecture", "Component Hierarchy"],
  },

  historyLabel: (focus) => (focus ? `Execution Flow — ${focus}` : "Full Application Flow"),
};
