import { scanDirectory, scanZip } from "../scanner/scanner.js";
import { detectFrameworks } from "../detector/frameworkDetector.js";
import { buildKnowledgeGraph } from "../graph/buildKnowledgeGraph.js";
import { runAnalysis } from "../analysis/index.js";
import { PipelineDiagnostics } from "./diagnostics.js";

/**
 * Pipeline Orchestrator
 *
 * Fully instrumented and plugin-driven:
 * 1. Scanner (file discovery)
 * 2. Framework & Plugin Detection
 * 3. Plugin Execution
 * 4. Parser & Extractor Registry Execution
 * 5. Knowledge Graph & Relationship Resolvers
 * 6. Architecture Analyzers
 *
 * @param {FileSystemDirectoryHandle|File|Array} inputSource
 * @param {object} [projectMeta={}]
 * @returns {Promise<{knowledgeGraph: object, analysis: object, framework: object, diagnostics: object}>}
 */
export async function runAnalysisPipeline(inputSource, projectMeta = {}) {
  const diagnostics = new PipelineDiagnostics();
  const pipelineStart = diagnostics.startStage("total");

  // Stage 1: Scanner
  const scannerStart = diagnostics.startStage("scanner");
  let files = [];
  try {
    if (Array.isArray(inputSource)) {
      files = inputSource;
    } else if (inputSource && typeof inputSource.values === "function") {
      files = await scanDirectory(inputSource);
    } else if (inputSource instanceof File || (inputSource && inputSource.name && inputSource.name.endsWith(".zip"))) {
      files = await scanZip(inputSource);
    } else {
      throw new Error("Invalid input source provided to Analysis Pipeline.");
    }
  } catch (err) {
    diagnostics.log("error", "scanner", `Scan failed: ${err.message}`);
    throw err;
  } finally {
    diagnostics.endStage("scanner", scannerStart);
  }

  diagnostics.setFilesSummary(files.length, 0);

  // Stage 2: Framework Detection & Plugin Execution
  const framework = detectFrameworks(files);
  const pluginContext = { files, framework };
  (framework.activePlugins || []).forEach((plugin) => {
    try {
      if (typeof plugin.run === "function") {
        plugin.run(pluginContext);
      }
    } catch (err) {
      diagnostics.log("error", "plugin", `Plugin '${plugin.name}' failed: ${err.message}`);
    }
  });

  const project = {
    id: projectMeta.id || "default-proj",
    name: projectMeta.name || "Project",
    framework: framework.primaryFramework,
    language: framework.hasTypeScript ? "TypeScript" : "JavaScript",
    hasRouter: framework.hasRouter || framework.hasNext,
    hasRedux: framework.hasRedux,
  };

  // Stage 3 & 4: Parser, Extractors, Graph Builder & Resolvers
  const graphStart = diagnostics.startStage("graphBuild");
  let knowledgeGraph;
  try {
    knowledgeGraph = buildKnowledgeGraph(files, project);
  } catch (err) {
    diagnostics.log("error", "graphBuild", `Graph construction failed: ${err.message}`);
    throw err;
  } finally {
    diagnostics.endStage("graphBuild", graphStart);
  }

  // Stage 5: Analyzers
  const analysisStart = diagnostics.startStage("analysis");
  let analysis;
  try {
    analysis = runAnalysis(knowledgeGraph);
  } catch (err) {
    diagnostics.log("error", "analysis", `Analysis engine failed: ${err.message}`);
    throw err;
  } finally {
    diagnostics.endStage("analysis", analysisStart);
  }

  const finalDiagnostics = diagnostics.finalize(pipelineStart);
  knowledgeGraph.diagnostics = finalDiagnostics;

  return {
    knowledgeGraph,
    analysis,
    framework,
    files,
    diagnostics: finalDiagnostics,
  };
}
