import { analyzeProject } from "./analyzer.js";
import { runAnalysisPipeline } from "./pipeline/pipeline.js";
import { defaultExtractorRegistry } from "./extractors/registry.js";
import { defaultPluginRegistry } from "./plugins/pluginRegistry.js";
import { createQueryEngine, GraphQueryEngine } from "./query/index.js";

/**
 * Public Engine API
 *
 * Single stable entry point for React Architect Analysis Engine v2.
 * UI components and external consumers SHOULD ONLY import from this module.
 */

export { analyzeProject, runAnalysisPipeline, createQueryEngine, GraphQueryEngine };

export function registerExtractor(name, extractorFn) {
  defaultExtractorRegistry.register(name, extractorFn);
}

export function registerPlugin(plugin) {
  defaultPluginRegistry.register(plugin);
}

export function getEngineVersion() {
  return "2.0.0";
}
