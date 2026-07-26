/**
 * blueprintGraphBuilder.js
 *
 * React Architect — Legacy Re-export Shim for Architectural Classification & Bridging
 * ====================================================================================
 * Note: buildBlueprintGraph() has been superseded by ExecutionFlowComposer.
 * The core helper functions (classifyArchitecturalUnit, bridgeExcludedNodes, node/edge constants)
 * are re-exported from engines/composers/composerUtils.js for backward compatibility.
 */

export {
  classifyArchitecturalUnit,
  bridgeExcludedNodes,
  ARCHITECTURAL_NODE_KINDS,
  ARCHITECTURAL_EDGE_TYPES,
  BRIDGED_EDGE_TYPE,
} from "../composers/composerUtils.js";