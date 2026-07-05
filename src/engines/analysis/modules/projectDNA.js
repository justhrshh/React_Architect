/**
 * projectDNA.js
 *
 * Produces a concise architectural fingerprint of the imported project.
 * Every value is derived from the Knowledge Graph (nodes/edges/project meta) —
 * nothing here is hardcoded, so a richer parser automatically yields a richer DNA
 * without any changes to this file.
 */

import {
  getNodesByKind,
  findLargestComponent,
  averageComponentSize,
  degreeMaps,
  average,
} from "./metrics.js";

/**
 * @param {object} graph - the Knowledge Graph ({ project, nodes, edges, ... })
 * @returns {object} projectDNA
 */
export function analyze(graph) {
  const { nodes = [], edges = [], project = {} } = graph;

  const components = getNodesByKind(nodes, "component");
  const pages = components.filter(n => n.subtype === "page");
  const routes = getNodesByKind(nodes, "route").filter(n => n.subtype === "endpoint");
  const apiEndpoints = getNodesByKind(nodes, "api").filter(n => n.subtype === "endpoint");
  const stateSlices = getNodesByKind(nodes, "state").filter(n => n.subtype === "slice");
  const contexts = components.filter(n => n.subtype === "provider" || n.subtype === "context");

  // Hooks are stored per-component in metadata.hooks — flatten + dedupe to count unique hook usages.
  const hookUsages = components.flatMap(c => c.metadata?.hooks || []);
  const uniqueHooks = new Set(hookUsages);

  const largestComponent = findLargestComponent(nodes, "component");

  // Average dependency count = average out-degree (RENDERS + IMPORTS + USES_API) per component.
  const { out: outDegree } = degreeMaps(nodes, edges);
  const avgDependencyCount = average(components.map(c => outDegree.get(c.id) || 0));

  const avgComponentSize = averageComponentSize(nodes, "component");

  return {
    framework: project.framework || "Unknown",
    language: project.language || "Unknown",
    router: project.router || "None",
    stateLibrary: project.state || "None",
    buildTool: project.buildTool || "Unknown",
    packageManager: project.packageManager || "Unknown",

    componentCount: components.length,
    pageCount: pages.length,
    hookCount: uniqueHooks.size,
    contextCount: contexts.length,
    reduxSliceCount: stateSlices.length,
    apiCount: apiEndpoints.length,
    routeCount: routes.length,

    largestComponent: largestComponent
      ? { name: largestComponent.name, file: largestComponent.file, loc: largestComponent.metadata.loc }
      : null,
    averageComponentSize: avgComponentSize,
    averageDependencyCount: avgDependencyCount,

    estimatedComplexity: estimateComplexity({
      componentCount: components.length,
      routeCount: routes.length,
      apiCount: apiEndpoints.length,
      avgDependencyCount,
    }),
  };
}

/**
 * Lightweight, transparent heuristic — not a black box score.
 * Buckets purely on scale signals already present in the graph.
 */
function estimateComplexity({ componentCount, routeCount, apiCount, avgDependencyCount }) {
  const signal = componentCount + routeCount * 2 + apiCount * 1.5 + avgDependencyCount * 5;
  if (signal < 25) return "Low";
  if (signal < 90) return "Medium";
  if (signal < 200) return "High";
  return "Very High";
}