/**
 * index.js (src/engines/composers)
 *
 * Graph Type Composer Registry and primary composer dispatch interface.
 */

import { composeExecutionFlow } from "./execution-flow.composer.js";
import { composeComponentHierarchy } from "./component-hierarchy.composer.js";
import { composeNavigationFlow } from "./navigation-flow.composer.js";
import { composeRequestLifecycle } from "./request-lifecycle.composer.js";
import { composeComposedArchitecture } from "./composed-architecture.composer.js";

export const GRAPH_TYPE_REGISTRY = {
  "composed-architecture": composeComposedArchitecture,
  "execution-flow": composeExecutionFlow,
  "component-hierarchy": composeComponentHierarchy,
  "navigation-flow": composeNavigationFlow,
  "request-lifecycle": composeRequestLifecycle,
};

/**
 * Primary compose function routing a subgraph and template to its graph-type composer.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function compose(subgraph, template, queryMeta = {}) {
  const graphType = template?.query?.graphType || "execution-flow";
  const composerFn = GRAPH_TYPE_REGISTRY[graphType] || composeExecutionFlow;
  return composerFn(subgraph, template, queryMeta);
}
