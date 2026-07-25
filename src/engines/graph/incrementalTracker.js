/**
 * Incremental Analysis Tracker & Manifest Generator
 *
 * Prepares the architecture for incremental graph rebuilding:
 * 1. Computes deterministic file content hashes (FNV-1a 32-bit).
 * 2. Compares previous and current file manifests to identify diffs (added, modified, deleted, unchanged).
 * 3. Builds node-to-file, edge-to-node, and node-to-dependent lookup maps.
 * 4. Computes affected subgraphs for partial re-analysis.
 */

export function hashFileContent(content = "") {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export function buildFileManifest(files = []) {
  const manifest = new Map();
  files.forEach((file) => {
    const cleanPath = (file.path || "").replace(/\\/g, "/");
    manifest.set(cleanPath, hashFileContent(file.content || ""));
  });
  return manifest;
}

export function computeFileDiff(prevManifest = new Map(), currentManifest = new Map()) {
  const added = [];
  const modified = [];
  const deleted = [];
  const unchanged = [];

  for (const [path, currentHash] of currentManifest.entries()) {
    if (!prevManifest.has(path)) {
      added.push(path);
    } else if (prevManifest.get(path) !== currentHash) {
      modified.push(path);
    } else {
      unchanged.push(path);
    }
  }

  for (const path of prevManifest.keys()) {
    if (!currentManifest.has(path)) {
      deleted.push(path);
    }
  }

  return { added, modified, deleted, unchanged };
}

export function createGraphLookupMaps(graph = { nodes: [], edges: [] }) {
  const fileToNodes = new Map();
  const nodeToEdges = new Map();
  const nodeToDependents = new Map();

  (graph.nodes || []).forEach((node) => {
    const filePath = node.file;
    if (filePath) {
      if (!fileToNodes.has(filePath)) fileToNodes.set(filePath, new Set());
      fileToNodes.get(filePath).add(node.id);
    }
  });

  (graph.edges || []).forEach((edge) => {
    if (!nodeToEdges.has(edge.source)) nodeToEdges.set(edge.source, new Set());
    if (!nodeToEdges.has(edge.target)) nodeToEdges.set(edge.target, new Set());

    nodeToEdges.get(edge.source).add(edge.id);
    nodeToEdges.get(edge.target).add(edge.id);

    if (!nodeToDependents.has(edge.target)) nodeToDependents.set(edge.target, new Set());
    nodeToDependents.get(edge.target).add(edge.source);
  });

  return { fileToNodes, nodeToEdges, nodeToDependents };
}

export function getAffectedSubGraph(changedFilePaths = [], graph = { nodes: [], edges: [] }) {
  const { fileToNodes, nodeToEdges, nodeToDependents } = createGraphLookupMaps(graph);

  const directlyAffectedNodes = new Set();
  const dependentNodes = new Set();
  const affectedEdges = new Set();

  changedFilePaths.forEach((filePath) => {
    const cleanPath = filePath.replace(/\\/g, "/");
    const nodeIds = fileToNodes.get(cleanPath) || new Set();
    nodeIds.forEach((nodeId) => {
      directlyAffectedNodes.add(nodeId);

      const edges = nodeToEdges.get(nodeId) || new Set();
      edges.forEach((edgeId) => affectedEdges.add(edgeId));

      const dependents = nodeToDependents.get(nodeId) || new Set();
      dependents.forEach((depId) => dependentNodes.add(depId));
    });
  });

  return {
    directlyAffectedNodes: Array.from(directlyAffectedNodes),
    dependentNodes: Array.from(dependentNodes),
    affectedEdges: Array.from(affectedEdges),
  };
}
