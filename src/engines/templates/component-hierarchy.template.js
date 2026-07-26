/**
 * component-hierarchy.template.js
 *
 * Component render tree hierarchy template.
 */

export default {
  id: "component-hierarchy",
  displayName: "Component Hierarchy",
  description: "Visualize the parent-child rendering tree of UI components.",
  icon: "Layers",
  chipColor: "#10B981",

  aliases: [
    "components", "component tree", "hierarchy", "component hierarchy",
    "ui", "ui structure", "page structure", "component breakdown",
    "layout", "tree", "render tree", "children"
  ],

  query: {
    graphType: "component-hierarchy",
    traversal: {
      includeKinds: ["component", "route"],
      includeEdgeTypes: ["RENDERS", "ROUTE_RENDERS", "LAZY_LOADS"],
      excludeKinds: [
        "file", "function", "variable", "data",
        "api", "state", "hook", "controller", "service", "model", "database"
      ],
      depth: 6,
      direction: "forward",
      maxNodes: 80,
    },
    focus: {
      strategy: "name-match",
      fallback: "entry-points",
    },
    composition: {
      grouping: {
        collapseAtDepth: 4,
        maxGroupSize: 6,
      },
      annotation: "minimal",
    },
    layout: {
      style: "tree",
      options: { rootStrategy: "entry-points" },
    },
    presentation: {
      edgeSemantics: {
        RENDERS: { label: "renders", style: "solid" },
        ROUTE_RENDERS: { label: "renders", style: "solid" },
        LAZY_LOADS: { label: "lazy loads", style: "dashed" },
      },
      interaction: {
        expandable: true,
        traceable: false,
        explorable: false,
      },
    },
  },

  emptyState: {
    heading: "No components found",
    description: "This project has no React components detected. Ensure the project was scanned correctly.",
    suggestions: ["Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `Component Hierarchy — ${focus}` : "Component Hierarchy"),
};
