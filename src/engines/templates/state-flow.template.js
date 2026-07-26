/**
 * state-flow.template.js
 *
 * Global and local state management template.
 */

export default {
  id: "state-flow",
  displayName: "State Flow",
  description: "Map Redux slices, React Context, and state propagation across components.",
  icon: "GitBranch",
  chipColor: "#8B5CF6",

  aliases: [
    "redux", "state", "slices", "store", "global state", "state management",
    "context", "providers", "usecontext", "react context",
    "zustand", "reducers", "actions", "dispatch"
  ],

  query: {
    graphType: "state-flow",
    traversal: {
      includeKinds: ["state", "component", "hook"],
      includeEdgeTypes: [
        "STATE_CONSUMER", "DISPATCHES_ACTION", "USES_HOOK",
        "USES_CONTEXT", "PROVIDES", "CONSUMES"
      ],
      excludeKinds: [
        "file", "function", "variable", "data",
        "route", "api", "controller", "service", "model", "database"
      ],
      depth: 3,
      direction: "both",
      maxNodes: 50,
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
      style: "bipartite",
      options: { leftGroup: "state", rightGroup: "consumer" },
    },
    presentation: {
      edgeSemantics: {
        STATE_CONSUMER: { label: "reads", style: "solid" },
        DISPATCHES_ACTION: { label: "dispatches", style: "dashed" },
        USES_CONTEXT: { label: "consumes", style: "solid" },
        USES_HOOK: { label: "uses", style: "dotted" },
      },
      interaction: {
        expandable: true,
        traceable: false,
        explorable: true,
      },
    },
  },

  emptyState: {
    heading: "No state management detected",
    description: "This project doesn't appear to use Redux, React Context, or Zustand. State may be managed locally in components.",
    suggestions: ["Component Hierarchy", "Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `State Flow — ${focus}` : "State Management"),
};
