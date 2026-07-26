/**
 * ArchitectureQuery.js
 *
 * Data contract and schema validation for query objects passed to GraphQueryEngine.
 */

export const VALID_GRAPH_TYPES = [
  "execution-flow",
  "component-hierarchy",
  "state-flow",
  "navigation-flow",
  "request-lifecycle",
];

/**
 * Creates an ArchitectureQuery object with safe defaults.
 *
 * @param {Partial<import('./ArchitectureQuery').ArchitectureQuery>} partial
 * @returns {object} ArchitectureQuery
 */
export function createQuery(partial = {}) {
  return {
    graphType: partial.graphType || "execution-flow",

    focus: {
      term: partial.focus?.term || null,
      strategy: partial.focus?.strategy || "name-match",
      seeds: Array.isArray(partial.focus?.seeds) ? partial.focus.seeds : [],
    },

    traversal: {
      includeKinds: Array.isArray(partial.traversal?.includeKinds)
        ? partial.traversal.includeKinds
        : [],
      includeEdgeTypes: Array.isArray(partial.traversal?.includeEdgeTypes)
        ? partial.traversal.includeEdgeTypes
        : [],
      excludeKinds: Array.isArray(partial.traversal?.excludeKinds)
        ? partial.traversal.excludeKinds
        : ["file", "function", "variable"],
      depth: typeof partial.traversal?.depth === "number" ? partial.traversal.depth : 4,
      direction: partial.traversal?.direction || "forward",
      maxNodes: typeof partial.traversal?.maxNodes === "number" ? partial.traversal.maxNodes : 50,
    },

    composition: {
      grouping: partial.composition?.grouping || {},
      annotation: partial.composition?.annotation || "contextual",
    },

    layout: {
      style: partial.layout?.style || "lanes",
      options: partial.layout?.options || {},
    },

    presentation: {
      edgeSemantics: partial.presentation?.edgeSemantics || {},
      interaction: {
        expandable: partial.presentation?.interaction?.expandable ?? true,
        traceable: partial.presentation?.interaction?.traceable ?? false,
        explorable: partial.presentation?.interaction?.explorable ?? false,
      },
    },

    emptyState: {
      heading: partial.emptyState?.heading || "No results found",
      description: partial.emptyState?.description || "Try adjusting your search or query focus.",
      suggestions: Array.isArray(partial.emptyState?.suggestions)
        ? partial.emptyState.suggestions
        : ["Execution Flow"],
    },

    meta: {
      templateId: partial.meta?.templateId || "custom",
      displayName: partial.meta?.displayName || "Custom Architecture Query",
      timestamp: partial.meta?.timestamp || Date.now(),
    },
  };
}

/**
 * Validates an ArchitectureQuery object.
 *
 * @param {object} query
 * @throws {Error} if query is invalid
 */
export function validateQuery(query) {
  if (!query || typeof query !== "object") {
    throw new Error("ArchitectureQuery must be an object.");
  }

  if (!VALID_GRAPH_TYPES.includes(query.graphType)) {
    throw new Error(
      `Invalid graphType: "${query.graphType}". Must be one of: ${VALID_GRAPH_TYPES.join(", ")}`
    );
  }

  if (!query.focus || typeof query.focus !== "object") {
    throw new Error("ArchitectureQuery must have a focus object.");
  }

  if (!query.traversal || typeof query.traversal !== "object") {
    throw new Error("ArchitectureQuery must have a traversal object.");
  }

  return true;
}
