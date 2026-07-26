/**
 * execution-flow.template.js
 *
 * Full application execution flow template definition. Replaces former Blueprint Flow.
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
        "RENDERS", "ROUTE_RENDERS", "ROUTE_PARENT", "USES_API", "CALLS_API",
        "STATE_CONSUMER", "DISPATCHES_ACTION", "USES_HOOK", "USES_CONTEXT",
        "HANDLED_BY", "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB",
        "AUTHORIZES", "VALIDATES", "LAZY_LOADS", "EXECUTION_FLOW"
      ],
      excludeKinds: ["file", "function", "variable", "data"],
      depth: 5,
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
        RENDERS: { label: "renders", style: "solid" },
        USES_API: { label: "calls", style: "solid" },
        STATE_CONSUMER: { label: "reads state", style: "dashed" },
        DISPATCHES_ACTION: { label: "dispatches", style: "dashed" },
        HANDLED_BY: { label: "handled by", style: "solid" },
        EXECUTION_FLOW: { label: "→", style: "dotted" },
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
    suggestions: ["State Flow", "Component Hierarchy"],
  },

  historyLabel: (focus) => (focus ? `Execution Flow — ${focus}` : "Full Application Flow"),
};
