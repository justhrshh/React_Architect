/**
 * state-flow.template.js
 *
 * State origin, movement, and consumption template definition.
 * Implements Section 8 of the Studio Re-Architecture Implementation Specification.
 */

export default {
  id: "state-flow",
  displayName: "State Flow",
  description: "Map state origins, hooks, dispatchers, and state consumption across components.",
  icon: "GitBranch",
  chipColor: "#8B5CF6",

  aliases: [
    "redux", "state", "slices", "store", "global state", "state management",
    "context", "providers", "usecontext", "react context",
    "zustand", "reducers", "actions", "dispatch", "thunk"
  ],

  query: {
    graphType: "state-flow",
    traversal: {
      includeKinds: ["state", "component", "hook", "api"],
      includeEdgeTypes: [
        "STATE_CONSUMER", "DISPATCHES_ACTION", "ASYNC_THUNK",
        "USES_CONTEXT", "SUBSCRIBES_TO", "USES_HOOK", "HOOK_CALLS_HOOK",
        "USES_API", "TARGETS_ROUTE"
      ],
      excludeKinds: [
        "file", "function", "variable", "data",
        "route", "controller", "service", "model", "database"
      ],
      depth: 4,
      direction: "both",
      maxNodes: 60,
    },
    focus: {
      strategy: "kind-match",
    },
    composition: {
      grouping: {
        groupReduxSlices: true,
        groupContextProviders: true,
        maxGroupSize: 5,
      },
      annotation: "contextual",
    },
    layout: {
      style: "tripartite",
      options: { leftGroup: "state", middleGroup: "hook", rightGroup: "component" },
    },
    presentation: {
      edgeSemantics: {
        STATE_CONSUMER:    { label: "reads",       style: "solid" },
        DISPATCHES_ACTION: { label: "dispatches",  style: "dashed" },
        ASYNC_THUNK:       { label: "async",       style: "dashed" },
        USES_CONTEXT:      { label: "consumes",    style: "solid" },
        SUBSCRIBES_TO:     { label: "subscribes",  style: "solid" },
        USES_HOOK:         { label: "uses",        style: "solid" },
        HOOK_CALLS_HOOK:   { label: "calls",       style: "solid" },
        USES_API:          { label: "calls",       style: "solid" },
      },
      interaction: {
        expandable: true,
        traceable: false,
        explorable: true,
      },
    },
  },

  emptyState: {
    heading: "No shared state detected",
    description: "No Redux, Context, or Zustand state detected. This project may use local component state (useState) only.",
    suggestions: ["Component Hierarchy", "Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `State Flow — ${focus}` : "State Flow"),
};
