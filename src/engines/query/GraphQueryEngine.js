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
}
