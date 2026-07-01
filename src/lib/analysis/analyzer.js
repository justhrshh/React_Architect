import { scanDirectory, scanZip } from "./scanner";
import { parseFile } from "./parser";
import { buildGraph } from "./graphBuilder";
import { layoutGraph } from "./reactFlowAdapter";
import { buildRouteGraph } from "./routeParser";

/**
 * Orchestrates the full analysis pipeline:
 * 1. Recursive directory/ZIP file scanning
 * 2. Babel AST component parsing
 * 3. Component relationship & edge resolving
 * 4. Hierarchical graph layout coordinates generation
 * 5. Route structure parsing
 *
 * @param {object} project - selected project metadata
 * @param {FileSystemDirectoryHandle|null} dirHandle
 * @param {File|null} zipFile
 * @returns {Promise<{nodes: Array, edges: Array, files: Array, routeNodes: Array, routeEdges: Array}>}
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

  // Parse every file using the Babel AST parser
  const parsedFiles = files.map(file => {
    const ext = file.path.split(".").pop().toLowerCase();
    if (ext === "md") {
      return {
        ...file,
        components: [],
        imports: [],
        exports: [],
      };
    }
    const summary = parseFile(file.content, file.path);
    return {
      ...file,
      components: summary.components,
      imports: summary.imports,
      exports: summary.exports,
    };
  });

  // Resolve imports and JSX usage to build a component dependency tree
  const rawGraph = buildGraph(parsedFiles);

  // Apply hierarchical depth layouter
  const layoutedGraph = layoutGraph(rawGraph.nodes, rawGraph.edges);

  // Resolve routing table mapping
  const routeGraph = buildRouteGraph(files, project);

  return {
    nodes: layoutedGraph.nodes,
    edges: layoutedGraph.edges,
    files: files.map(f => f.path.replace(/\\/g, "/")),
    rawFiles: files,
    routeNodes: routeGraph.nodes,
    routeEdges: routeGraph.edges,
  };
}
