/**
 * Public entry point for the Analysis Engine.
 *
 * Usage:
 *   import { runAnalysis, analyzeImpact } from "src/engines/analysis";
 *   const analysis = runAnalysis(knowledgeGraph);
 *   const impact = analyzeImpact(knowledgeGraph, "component:src/App.jsx:App");
 */

export { runAnalysis, analyzeImpact, moduleRegistry } from "./analysisEngine.js";

// Individual modules are also exported directly for callers that only need
// one analysis (e.g. re-running just `deadCode` after a targeted refactor)
// without paying for a full `runAnalysis` sweep.
export * as projectDNA from "./modules/projectDNA.js";
export * as architectureHealth from "./modules/architectureHealth.js";
export * as dependencyHeatmap from "./modules/dependencyHeatmap.js";
export * as deadCode from "./modules/deadCode.js";
export * as complexity from "./modules/complexity.js";
export * as impactAnalysis from "./modules/impactAnalysis.js";
export * as metrics from "./modules/metrics.js";