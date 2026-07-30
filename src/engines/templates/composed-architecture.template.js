/**
 * composed-architecture.template.js
 *
 * Composed Architecture Lens Template Definition.
 * Answers: "What is [Page/Component] composed of?"
 */

export default {
  id: "composed-architecture",
  displayName: "Composed Architecture",
  description: "Architectural composition blueprint showing all building block categories around a page or component.",
  icon: "Package",
  chipColor: "#8B5CF6",

  aliases: [
    "composed architecture", "composed", "composition blueprint", "building blocks",
    "what is composed", "what is made of", "composed of", "page composition",
    "component composition", "what is this page made of", "blueprint", "composition"
  ],

  query: {
    graphType: "composed-architecture",
    traversal: {
      includeKinds: [
        "component", "page", "view", "state", "context", "redux", "hook",
        "api", "route", "service", "utility", "form", "animation"
      ],
      depth: 2,
      direction: "both",
      maxNodes: 100,
    },
    focus: {
      strategy: "name-match",
      fallback: "entry-points",
    },
    composition: {
      grouping: {
        byCategory: true,
      },
      annotation: "multiplicity",
    },
    layout: {
      style: "radial-blueprint",
      options: { centerStrategy: "focus-or-page" },
    },
    presentation: {
      edgeSemantics: {
        contains:  { label: "contains",  style: "solid" },
        renders:   { label: "renders",   style: "solid" },
        uses:      { label: "uses",      style: "dashed" },
        calls:     { label: "calls",     style: "dotted" },
        manages:   { label: "manages",   style: "solid" },
        navigates: { label: "navigates", style: "dashed" },
      },
      interaction: {
        expandable: true,
        traceable: true,
        explorable: true,
      },
    },
  },

  emptyState: {
    heading: "No composition found",
    description: "Could not extract architectural composition for this focus target.",
    suggestions: ["Component Hierarchy", "Execution Flow"],
  },

  historyLabel: (focus) => (focus ? `Composed Architecture — ${focus}` : "Composed Architecture"),
};
