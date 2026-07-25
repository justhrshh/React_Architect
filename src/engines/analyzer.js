import { runAnalysisPipeline } from "./pipeline/pipeline.js";
import { layoutGraphNodes } from "./layout/layoutEngine.js";

/**
 * Backward-compatibility Facade for Analyze Project.
 *
 * Forwards requests to the layered Pipeline Orchestrator (src/engines/pipeline/pipeline.js).
 */
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 30));

export async function analyzeProject(project, dirHandle, zipFile, onProgress) {
  onProgress?.("scanning");

  const inputSource = dirHandle || zipFile;
  if (!inputSource) {
    throw new Error("No directory handle or ZIP file reference found to perform scan.");
  }

  await yieldToMain();

  onProgress?.("building-graph");
  await yieldToMain();
  const { knowledgeGraph: kg, analysis, files } = await runAnalysisPipeline(inputSource, project);

  onProgress?.("resolving");
  await yieldToMain();
  const layoutedNodes = layoutGraphNodes(kg.nodes, kg.edges);
  kg.nodes = layoutedNodes;
  kg.rawFiles = files;

  onProgress?.("analyzing");
  await yieldToMain();
  kg.analysis = analysis;

  onProgress?.("complete");
  await yieldToMain();
  return kg;
}
