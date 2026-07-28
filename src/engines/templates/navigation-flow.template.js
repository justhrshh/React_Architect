/**
 * navigation-flow.template.js
 *
 * Progressive Disclosure Navigation Sitemap template definition.
 * Maps complete sitemap render chain (Router -> Route -> Guard -> Layout -> Page -> Children -> Leaf Components).
 */

export default {
  id: "navigation-flow",
  displayName: "Navigation Flow",
  description: "Explore the complete expandable sitemap render tree from entry point to leaf components.",
  icon: "Compass",
  chipColor: "#06B6D4",

  aliases: [
    "routes", "routing", "route structure", "navigation", "page flow",
    "page links", "path flow", "router", "pages", "url", "paths",
    "protected routes", "route map", "sitemap", "render chain", "expandable sitemap"
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
      depth: 25,
      direction: "forward",
      maxNodes: 500,
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
      style: "sitemap",
      options: { rootStrategy: "router-nodes", orientation: "horizontal" },
    },
    presentation: {
      edgeSemantics: {
        ROUTE_PARENT:  { label: "nests",   style: "solid" },
        ROUTE_RENDERS: { label: "serves",  style: "dashed" },
        RENDERS:       { label: "renders", style: "dotted" },
      },
      interaction: {
        expandable: true,
        traceable: true,
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
