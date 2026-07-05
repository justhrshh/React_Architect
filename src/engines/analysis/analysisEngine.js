/**
 * analysisEngine.js
 *
 * Orchestrates every analysis module. The Analysis Engine NEVER parses source,
 * reads files, touches Babel, or touches React Flow — it only ever consumes
 * the Knowledge Graph object produced by buildKnowledgeGraph.js.
 *
 * EXTENSIBILITY: to add a new analysis capability (Refactor Suggestions, AI
 * Context Builder, Architecture Timeline, Performance Analyzer, ...):
 *   1. Create modules/yourModule.js exporting `analyze(graph, ...args)`.
 *   2. Register it in the `moduleRegistry` below.
 * No existing module needs to change.
 */

import * as projectDNA from "./modules/projectDNA.js";
import * as architectureHealth from "./modules/architectureHealth.js";
import * as dependencyHeatmap from "./modules/dependencyHeatmap.js";
import * as deadCode from "./modules/deadCode.js";
import * as complexity from "./modules/complexity.js";
import * as impactAnalysis from "./modules/impactAnalysis.js";

/**
 * Modules that run automatically as part of `runAnalysis(graph)`.
 * `impactAnalysis` is intentionally excluded — it requires a target node id
 * and is invoked on demand via `analyzeImpact(graph, nodeId)` instead.
 */
const moduleRegistry = [
  { key: "projectDNA", module: projectDNA },
  { key: "dependencyHeatmap", module: dependencyHeatmap },
  { key: "deadCode", module: deadCode },
  { key: "complexity", module: complexity },
  // architectureHealth runs last — it consumes deadCode + graph.validation as context.
  { key: "architectureHealth", module: architectureHealth, needsContext: true },
];

/**
 * Runs every registered analysis module against a Knowledge Graph.
 * @param {object} graph - the Knowledge Graph ({ nodes, edges, project, validation, ... })
 * @returns {object} { projectDNA, architectureHealth, dependencyHeatmap, deadCode, complexity }
 */
export function runAnalysis(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("runAnalysis(graph) requires a Knowledge Graph with `nodes` and `edges` arrays.");
  }

  const results = {};

  moduleRegistry.forEach(({ key, module, needsContext }) => {
    // Modules that opt into `needsContext` receive everything computed so far,
    // so later modules (like architectureHealth) can reuse earlier results
    // (like deadCode) instead of recomputing the same graph scans.
    results[key] = needsContext
      ? module.analyze(graph, { ...results, validation: graph.validation })
      : module.analyze(graph);
  });

  return results;
}

/**
 * On-demand impact analysis for a single node — kept out of the default
 * `runAnalysis` sweep since it's parameterized per node (e.g. fired from a
 * "Delete this component" action in the inspector).
 * @param {object} graph
 * @param {string} nodeId
 * @returns {object|null}
 */
export function analyzeImpact(graph, nodeId) {
  return impactAnalysis.analyze(graph, nodeId);
}

export { moduleRegistry };