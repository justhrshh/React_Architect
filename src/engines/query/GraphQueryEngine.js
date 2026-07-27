import {
  findShortestPath,
  findAncestors,
  findDescendants,
  findCycles,
  findOrphans,
} from "./graphAlgorithms.js";
import {
  getArchitectureView,
  getDependencyView,
  getRequestFlowView,
  getNetworkView,
  getStateView,
  getSecurityView,
  getDatabaseView,
} from "./projections.js";
import { AIQueryAdapter } from "./aiQueryAdapter.js";

/**
 * GraphQueryEngine
 *
 * Intelligent query and graph projection engine over the Knowledge Graph.
 * Completely encapsulates graph storage and maintains sub-millisecond $O(1)$ indexes.
 */
export class GraphQueryEngine {
  constructor(knowledgeGraph = { nodes: [], edges: [] }) {
    this.rawGraph = knowledgeGraph;

    this.nodes = knowledgeGraph.nodes || [];
    this.edges = knowledgeGraph.edges || [];

    // O(1) Fast Indexes
    this.nodesMap = new Map();
    this.kindIndex = new Map();
    this.subtypeIndex = new Map();
    this.fileIndex = new Map();
    this.capabilityIndex = new Map();
    this.incomingEdgesIndex = new Map();
    this.outgoingEdgesIndex = new Map();

    this._buildIndexes();
    this.ai = new AIQueryAdapter(this);
  }

  _buildIndexes() {
    this.nodes.forEach((node) => {
      this.nodesMap.set(node.id, node);

      // 1. Kind Index
      if (node.kind) {
        if (!this.kindIndex.has(node.kind)) this.kindIndex.set(node.kind, new Set());
        this.kindIndex.get(node.kind).add(node.id);
      }

      // 2. Subtype Index
      if (node.subtype) {
        if (!this.subtypeIndex.has(node.subtype)) this.subtypeIndex.set(node.subtype, new Set());
        this.subtypeIndex.get(node.subtype).add(node.id);
      }

      // 3. File Index
      if (node.file) {
        const cleanFile = node.file.replace(/\\/g, "/");
        if (!this.fileIndex.has(cleanFile)) this.fileIndex.set(cleanFile, new Set());
        this.fileIndex.get(cleanFile).add(node.id);
      }

      // 4. Capability Index
      if (node.metadata && node.metadata.capabilities) {
        (node.metadata.capabilities || []).forEach((cap) => {
          if (!this.capabilityIndex.has(cap)) this.capabilityIndex.set(cap, new Set());
          this.capabilityIndex.get(cap).add(node.id);
        });
      }
    });

    // 5. Incoming & Outgoing Edges Indexes
    this.edges.forEach((edge) => {
      if (edge.source) {
        if (!this.outgoingEdgesIndex.has(edge.source)) this.outgoingEdgesIndex.set(edge.source, []);
        this.outgoingEdgesIndex.get(edge.source).push(edge);
      }
      if (edge.target) {
        if (!this.incomingEdgesIndex.has(edge.target)) this.incomingEdgesIndex.set(edge.target, []);
        this.incomingEdgesIndex.get(edge.target).push(edge);
      }
    });
  }

  // --- Core Node Queries ---
  getNodes() {
    return this.nodes;
  }

  getEdges() {
    return this.edges;
  }

  findNode(id) {
    if (!id) return null;
    return this.nodesMap.get(id) || null;
  }

  findNodes(ids = []) {
    return ids.map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findNodesByKind(kind) {
    const ids = this.kindIndex.get(kind) || new Set();
    return Array.from(ids).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findNodesBySubtype(subtype) {
    const ids = this.subtypeIndex.get(subtype) || new Set();
    return Array.from(ids).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findNodesByFile(filePath) {
    const cleanFile = (filePath || "").replace(/\\/g, "/");
    const ids = this.fileIndex.get(cleanFile) || new Set();
    return Array.from(ids).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findNodesByCapability(capability) {
    const ids = this.capabilityIndex.get(capability) || new Set();
    return Array.from(ids).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  search(queryStr = "") {
    if (!queryStr || queryStr.trim() === "") return [];
    const q = queryStr.toLowerCase().trim();
    return this.nodes.filter(
      (node) =>
        (node.name && node.name.toLowerCase().includes(q)) ||
        (node.file && node.file.toLowerCase().includes(q)) ||
        (node.kind && node.kind.toLowerCase().includes(q)) ||
        (node.subtype && node.subtype.toLowerCase().includes(q))
    );
  }

  query(predicateFn) {
    if (typeof predicateFn !== "function") return [];
    return this.nodes.filter(predicateFn);
  }

  // --- Edge & Traversal Queries ---
  findIncomingEdges(nodeId) {
    return this.incomingEdgesIndex.get(nodeId) || [];
  }

  findOutgoingEdges(nodeId) {
    return this.outgoingEdgesIndex.get(nodeId) || [];
  }

  findNeighbors(nodeId, direction = "both") {
    const neighborIds = new Set();

    if (direction === "outgoing" || direction === "both") {
      this.findOutgoingEdges(nodeId).forEach((e) => neighborIds.add(e.target));
    }
    if (direction === "incoming" || direction === "both") {
      this.findIncomingEdges(nodeId).forEach((e) => neighborIds.add(e.source));
    }

    return Array.from(neighborIds).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findPath(sourceId, targetId) {
    return findShortestPath(sourceId, targetId, this.nodesMap, this.outgoingEdgesIndex);
  }

  findDependents(nodeId) {
    const incoming = this.findIncomingEdges(nodeId);
    const sourceIds = new Set(incoming.map((e) => e.source));
    return Array.from(sourceIds).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findDependencies(nodeId) {
    const outgoing = this.findOutgoingEdges(nodeId);
    const targetIds = new Set(outgoing.map((e) => e.target));
    return Array.from(targetIds).map((id) => this.nodesMap.get(id)).filter(Boolean);
  }

  findAncestors(nodeId) {
    return findAncestors(nodeId, this.nodesMap, this.outgoingEdgesIndex);
  }

  findDescendants(nodeId) {
    return findDescendants(nodeId, this.nodesMap, this.incomingEdgesIndex);
  }

  findCycles() {
    const cycleIdArrays = findCycles(this.nodes, this.outgoingEdgesIndex);
    return cycleIdArrays.map((idArray) => idArray.map((id) => this.nodesMap.get(id)).filter(Boolean));
  }

  findOrphans() {
    return findOrphans(this.nodes, this.incomingEdgesIndex, this.outgoingEdgesIndex);
  }

  // --- Domain Conveniences ---
  findRoutes() {
    return this.findNodesByKind("route");
  }

  findControllers() {
    return this.findNodesByKind("controller");
  }

  findServices() {
    return this.findNodesByKind("service");
  }

  findComponents() {
    return this.findNodesByKind("component");
  }

  findModels() {
    return this.findNodesByKind("model");
  }

  findState() {
    return this.findNodesByKind("state");
  }

  findMiddleware() {
    return this.findNodesByKind("middleware");
  }

  // --- Graph Projection Views ---
  getArchitectureView() {
    return getArchitectureView(this);
  }

  getDependencyView() {
    return getDependencyView(this);
  }

  getRequestFlowView() {
    return getRequestFlowView(this);
  }

  getNetworkView() {
    return getNetworkView(this);
  }

  getStateView() {
    return getStateView(this);
  }

  getSecurityView() {
    return getSecurityView(this);
  }

  getDatabaseView() {
    return getDatabaseView(this);
  }

  /**
   * Primary traversal engine execution method for ArchitectureQuery objects.
   * Performs seed-anchored, depth-bounded, edge-type-filtered BFS and returns a focused subgraph.
   *
   * @param {object} query - ArchitectureQuery instance
   * @returns {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }}
   */
  executeQuery(query) {
    const startTime = performance.now();
    if (!query || !query.traversal) {
      return { nodes: [], edges: [], queryMeta: { executionMs: 0, nodeCount: 0, edgeCount: 0 } };
    }

    const { focus, traversal, meta } = query;
    const { includeKinds = [], includeEdgeTypes = [], excludeKinds = [], depth = 4, direction = "forward", maxNodes = 50 } = traversal;

    // Step 1 — Seed Resolution
    let seeds = [];
    if (focus?.seeds && focus.seeds.length > 0) {
      seeds = focus.seeds.filter((id) => this.nodesMap.has(id));
    } else if (focus?.term) {
      const term = focus.term.toLowerCase().trim();
      const strategy = focus.strategy || "name-match";

      if (strategy === "name-match") {
        seeds = this.nodes.filter((n) => n.name && n.name.toLowerCase().includes(term)).map((n) => n.id);
      } else if (strategy === "kind-match") {
        seeds = includeKinds.flatMap((k) => Array.from(this.kindIndex.get(k) || []));
      } else if (strategy === "entry-points") {
        seeds = this.nodes.filter((n) =>
          (n.kind === "file" && /(main|index|App|server|app|_app)\.[jt]sx?$/i.test(n.file || "")) ||
          (n.kind === "component" && (n.name === "App" || n.name === "main" || n.subtype === "root"))
        ).map((n) => n.id);
      } else if (strategy === "router-nodes") {
        seeds = this.nodes.filter((n) => n.kind === "route" && (n.subtype === "router" || (n.name && n.name.includes("Router")))).map((n) => n.id);
      }
    } else {
      // No focus term: check for entry-points seed first (Section 5.6 fallback)
      const entrySeeds = this.nodes.filter((n) =>
        (n.kind === "file" && /(main|index|App|server|app|_app)\.[jt]sx?$/i.test(n.file || "")) ||
        (n.kind === "component" && (n.name === "App" || n.name === "main" || n.subtype === "root"))
      ).map((n) => n.id);

      if (entrySeeds.length > 0) {
        seeds = entrySeeds;
      }
    }

    // Fallback: If seeds still empty, seed from domain kinds
    if (seeds.length === 0) {
      if (includeKinds.length > 0) {
        seeds = includeKinds.flatMap((k) => Array.from(this.kindIndex.get(k) || []));
      } else {
        seeds = this.nodes.map((n) => n.id);
      }
    }

    // Step 2 — BFS Traversal
    const visited = new Set(seeds);
    let queue = [...seeds];
    let currentDepth = 0;

    const includeEdgeSet = new Set(includeEdgeTypes);

    while (queue.length > 0 && currentDepth < depth) {
      const nextQueue = [];
      for (const nodeId of queue) {
        if (direction === "forward" || direction === "both") {
          const outgoing = this.outgoingEdgesIndex.get(nodeId) || [];
          for (const edge of outgoing) {
            if (includeEdgeSet.size === 0 || includeEdgeSet.has(edge.type)) {
              if (!visited.has(edge.target)) {
                visited.add(edge.target);
                nextQueue.push(edge.target);
              }
            }
          }
        }

        if (direction === "backward" || direction === "both") {
          const incoming = this.incomingEdgesIndex.get(nodeId) || [];
          for (const edge of incoming) {
            if (includeEdgeSet.size === 0 || includeEdgeSet.has(edge.type)) {
              if (!visited.has(edge.source)) {
                visited.add(edge.source);
                nextQueue.push(edge.source);
              }
            }
          }
        }
      }
      queue = nextQueue;
      currentDepth++;
    }

    // Step 3 — Kind Filter & Exclusion
    const includeKindSet = new Set(includeKinds);
    const excludeKindSet = new Set(excludeKinds);

    let resultNodeIds = Array.from(visited).filter((id) => {
      const node = this.nodesMap.get(id);
      if (!node) return false;
      if (excludeKindSet.has(node.kind)) return false;
      if (includeKindSet.size > 0 && !includeKindSet.has(node.kind)) return false;
      return true;
    });

    let truncated = false;

    // Step 4 — maxNodes Enforcement (Sort by degree connectivity)
    if (resultNodeIds.length > maxNodes) {
      truncated = true;
      resultNodeIds.sort((a, b) => {
        const degA = (this.incomingEdgesIndex.get(a)?.length || 0) + (this.outgoingEdgesIndex.get(a)?.length || 0);
        const degB = (this.incomingEdgesIndex.get(b)?.length || 0) + (this.outgoingEdgesIndex.get(b)?.length || 0);
        return degB - degA;
      });
      resultNodeIds = resultNodeIds.slice(0, maxNodes);
    }

    const finalNodeSet = new Set(resultNodeIds);
    const resultNodes = resultNodeIds.map((id) => this.nodesMap.get(id));

    // Step 5 — Edge Collection
    const resultEdges = [];
    finalNodeSet.forEach((sourceId) => {
      const outgoing = this.outgoingEdgesIndex.get(sourceId) || [];
      for (const edge of outgoing) {
        if (finalNodeSet.has(edge.target)) {
          if (includeEdgeSet.size === 0 || includeEdgeSet.has(edge.type)) {
            resultEdges.push(edge);
          }
        }
      }
    });

    const executionMs = Math.round(performance.now() - startTime);

    return {
      nodes: resultNodes,
      edges: resultEdges,
      queryMeta: {
        templateId: meta?.templateId || "custom",
        focus: focus?.term || null,
        nodeCount: resultNodes.length,
        edgeCount: resultEdges.length,
        truncated,
        executionMs,
        classification: this.rawGraph?.project?.classification || null,
      },
    };
  }
}

