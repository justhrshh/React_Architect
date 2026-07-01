import { parse } from "@babel/parser";
import { extractImports } from "./extractors/importExtractor";
import { extractExports } from "./extractors/exportExtractor";
import { extractComponents } from "./extractors/componentExtractor";
import { extractHooks } from "./extractors/hookExtractor";
import { extractContexts } from "./extractors/contextExtractor";
import { extractRedux } from "./extractors/reduxExtractor";
import { extractRoutes } from "./extractors/routeExtractor";
import { extractApi } from "./extractors/apiExtractor";

/**
 * Parses source code contents and orchestrates the extraction process.
 *
 * @param {string} code
 * @param {string} filePath
 * @returns {object} fileSummary
 */
export function parseFile(code, filePath) {
  const summary = {
    filePath: filePath.replace(/\\/g, "/"),
    components: [],
    imports: [],
    exports: [],
    hooks: [],
    contexts: [],
    redux: [],
    routes: [],
    api: [],
  };

  const ext = filePath.split(".").pop().toLowerCase();
  if (ext === "md") {
    // Return empty arrays for markdown files (they are indexed but not AST parsed)
    return summary;
  }

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "dynamicImport",
        "objectRestSpread",
        "decorators-legacy",
      ],
    });
  } catch (err) {
    console.warn(`AST Parse error for ${filePath}: ${err.message}`);
    return summary;
  }

  // Orchestrate extractors
  try {
    summary.imports = extractImports(ast);
    summary.exports = extractExports(ast);
    summary.components = extractComponents(ast);
    summary.hooks = extractHooks(ast);
    summary.contexts = extractContexts(ast);
    summary.redux = extractRedux(ast);
    summary.routes = extractRoutes(ast, code);
    summary.api = extractApi(ast, code);
  } catch (err) {
    console.warn(`Extraction error for ${filePath}:`, err);
  }

  return summary;
}
