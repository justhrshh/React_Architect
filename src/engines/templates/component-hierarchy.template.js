/**
 * component-hierarchy.template.js
 *
 * Component render tree hierarchy template definition.
 * Implements Section 7 of the Studio Re-Architecture Implementation Specification.
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
      includeKinds: ["component"],
      includeEdgeTypes: ["RENDERS", "LAZY_LOADS"],
      excludeKinds: [
        "route", "file", "function", "variable", "data",
        "api", "state", "hook", "controller", "service", "model", "database"
      ],
      depth: 8,
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
        RENDERS:    { label: "renders",    style: "solid" },
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
    description: "This project has no React components detected.",
    suggestions: ["Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `Component Hierarchy — ${focus}` : "Component Hierarchy"),
};
