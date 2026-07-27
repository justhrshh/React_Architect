/**
 * navigation-flow.template.js
 *
 * Routing and page navigation flow template definition.
 * Implements Section 6 of the Studio Re-Architecture Implementation Specification.
 */

export default {
  id: "navigation-flow",
  displayName: "Navigation Flow",
  description: "Map route hierarchies, nested route structures, and page component assignments.",
  icon: "Compass",
  chipColor: "#F59E0B",

  aliases: [
    "routes", "routing", "route structure", "navigation", "page flow",
    "page links", "path flow", "router", "pages", "url", "paths",
    "protected routes", "route map", "sitemap"
  ],

  query: {
    graphType: "navigation-flow",
    traversal: {
      includeKinds: ["route"],
      includeEdgeTypes: ["ROUTE_PARENT", "ROUTE_RENDERS"],
      excludeKinds: [
        "file", "function", "variable", "data",
        "api", "state", "hook", "controller", "service", "model", "database", "component"
      ],
      depth: 8,
      direction: "forward",
      maxNodes: 80,
    },
    focus: {
      strategy: "kind-match",
    },
    composition: {
      grouping: {
        groupNestedRoutes: true,
      },
      annotation: "contextual",
    },
    layout: {
      style: "tree",
      options: { rootStrategy: "router-nodes" },
    },
    presentation: {
      edgeSemantics: {
        ROUTE_PARENT:  { label: "nests",  style: "solid" },
        ROUTE_RENDERS: { label: "serves", style: "dashed" },
      },
      interaction: {
        expandable: true,
        traceable: false,
        explorable: true,
      },
    },
  },

  emptyState: {
    heading: "No routes detected",
    description: "This project has no React Router routes or Next.js file routes detected.",
    suggestions: ["Component Hierarchy", "Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `Navigation — ${focus}` : "Navigation Flow"),
};
