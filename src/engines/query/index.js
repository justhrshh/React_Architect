import { GraphQueryEngine } from "./GraphQueryEngine.js";

/**
 * Creates and initializes a new GraphQueryEngine instance over a Knowledge Graph.
 *
 * @param {object} knowledgeGraph
 * @returns {GraphQueryEngine}
 */
export function createQueryEngine(knowledgeGraph) {
  return new GraphQueryEngine(knowledgeGraph);
}

export { GraphQueryEngine };
export { AIQueryAdapter } from "./aiQueryAdapter.js";
export * from "./projections.js";
export * from "./graphAlgorithms.js";
