import { scanDirectory, scanZip } from "./scanner/scanner.js";
import { buildKnowledgeGraph } from "./graph/buildKnowledgeGraph.js";
import { layoutGraphNodes } from "./layout/layoutEngine.js";
import { runAnalysis } from "./analysis/index.js";

/**
 * Orchestrates the full architectural analysis pipeline using the new
 * modular Knowledge Graph engine.
 *
 * @param {object} project - selected project metadata details
 * @param {FileSystemDirectoryHandle|null} dirHandle
 * @param {File|null} zipFile
 * @param {function|null} onProgress - optional progress callback
 * @returns {Promise<object>} knowledgeGraph - central single source of truth
 */
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 30));

export async function analyzeProject(project, dirHandle, zipFile, onProgress) {
  onProgress?.("scanning");
  let files;

  if (dirHandle) {
    files = await scanDirectory(dirHandle);
  } else if (zipFile) {
    files = await scanZip(zipFile);
  } else {
    throw new Error("No directory handle or ZIP file reference found to perform scan.");
  }

  await yieldToMain();

  // 1. Build Knowledge Graph (internally parses ASTs and extracts relationships)
  onProgress?.("building-graph");
  await yieldToMain();
  const kg = buildKnowledgeGraph(files, project);

  // 2. Compute Node Coordinates (Layout Engine)
  onProgress?.("resolving");
  await yieldToMain();
  const layoutedNodes = layoutGraphNodes(kg.nodes, kg.edges);
  kg.nodes = layoutedNodes;

  // 3. Keep a cache of raw files inside knowledgeGraph metadata for docs visualizer
  kg.rawFiles = files;

  // 4. Run Analysis Engine
  onProgress?.("analyzing");
  await yieldToMain();
  kg.analysis = runAnalysis(kg);

  onProgress?.("complete");
  await yieldToMain();
  return kg;
}
