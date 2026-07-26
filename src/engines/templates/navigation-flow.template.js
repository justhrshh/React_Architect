/**
 * navigation-flow.template.js
 *
 * Routing and page navigation flow template.
 */

export default {
  id: "navigation-flow",
  displayName: "Navigation Flow",
  description: "Map routes, nested route structures, and page component mappings.",
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
      includeKinds: ["route", "component"],
      includeEdgeTypes: ["ROUTE_PARENT", "ROUTE_RENDERS", "RENDERS"],
      excludeKinds: [
        "file", "function", "variable", "data",
        "api", "state", "hook", "controller", "service", "model", "database"
      ],
      depth: 6,
      direction: "forward",
      maxNodes: 60,
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
        ROUTE_PARENT: { label: "nested in", style: "solid" },
        ROUTE_RENDERS: { label: "renders", style: "dashed" },
        RENDERS: { label: "renders", style: "dotted" },
      },
      interaction: {
        expandable: false,
        traceable: false,
        explorable: true,
      },
    },
  },

  emptyState: {
    heading: "No routes detected",
    description: "This project has no React Router routes, Next.js file routes, or page declarations detected.",
    suggestions: ["Component Hierarchy", "Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `Navigation — ${focus}` : "Navigation Flow"),
};
