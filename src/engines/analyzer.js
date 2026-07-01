import { scanDirectory, scanZip } from "./scanner/scanner";
import { buildKnowledgeGraph } from "./graph/buildKnowledgeGraph";
import { layoutGraphNodes } from "./layout/layoutEngine";

/**
 * Orchestrates the full architectural analysis pipeline using the new
 * modular Knowledge Graph engine.
 *
 * @param {object} project - selected project metadata details
 * @param {FileSystemDirectoryHandle|null} dirHandle
 * @param {File|null} zipFile
 * @returns {Promise<object>} knowledgeGraph - central single source of truth
 */
export async function analyzeProject(project, dirHandle, zipFile) {
  let files = [];

  if (dirHandle) {
    files = await scanDirectory(dirHandle);
  } else if (zipFile) {
    files = await scanZip(zipFile);
  } else {
    throw new Error("No directory handle or ZIP file reference found to perform scan.");
  }

  // 1. Build Knowledge Graph (internally parses ASTs and extracts relationships)
  const kg = buildKnowledgeGraph(files, project);

  // 2. Compute Node Coordinates (Layout Engine)
  const layoutedNodes = layoutGraphNodes(kg.nodes, kg.edges);
  kg.nodes = layoutedNodes;

  // 3. Keep a cache of raw files inside knowledgeGraph metadata for docs visualizer
  kg.rawFiles = files;

  return kg;
}
