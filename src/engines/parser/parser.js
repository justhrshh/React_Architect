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
 * Error handling philosophy: a single malformed file, or a single extractor
 * throwing on an unusual AST shape, must never abort analysis of the rest of
 * the project. Every extractor call is now individually wrapped, so (for
 * example) a route-parsing edge case doesn't also silently wipe out the
 * hooks/contexts/api data that were already extracted for that file (the
 * previous implementation ran all extractors inside a single try/catch,
 * where one throw skipped everything after it in the block).
 *
 * Any failures are collected into `summary.parseErrors` rather than only
 * logged, so the graph builder / UI can surface them as validation warnings
 * instead of failing silently.
 *
 * @param {string} code
 * @param {string} filePath
 * @returns {object} fileSummary
 */
export function parseFile(code, filePath) {
  const cleanPath = filePath.replace(/\\/g, "/");
  const summary = {
    filePath: cleanPath,
    components: [],
    imports: [],
    exports: [],
    hooks: [],
    contexts: [],
    redux: [],
    routes: [],
    api: [],
    parseErrors: [],
  };

  const ext = cleanPath.split(".").pop().toLowerCase();
  if (ext === "md" || ext === "json") {
    // Markdown and JSON/config files are indexed but not AST-parsed as code.
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
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "objectRestSpread",
        "optionalChaining",
        "nullishCoalescingOperator",
        "decorators-legacy",
      ],
      errorRecovery: true,
    });
  } catch (err) {
    summary.parseErrors.push({ stage: "ast-parse", message: err.message });
    console.warn(`AST parse error for ${cleanPath}: ${err.message}`);
    return summary;
  }

  // Babel's errorRecovery mode can produce a partial AST alongside recorded
  // errors instead of throwing - surface those too, without discarding the
  // (still useful) partial tree.
  if (ast.errors && ast.errors.length > 0) {
    ast.errors.forEach((err) => {
      summary.parseErrors.push({ stage: "ast-parse-recovered", message: err.message || String(err) });
    });
  }

  const extractors = [
    ["imports", () => extractImports(ast)],
    ["exports", () => extractExports(ast)],
    ["components", () => extractComponents(ast, cleanPath)],
    ["hooks", () => extractHooks(ast)],
    ["contexts", () => extractContexts(ast)],
    ["redux", () => extractRedux(ast)],
    ["routes", () => extractRoutes(ast, code)],
    ["api", () => extractApi(ast, code)],
  ];

  extractors.forEach(([key, run]) => {
    try {
      summary[key] = run();
    } catch (err) {
      summary.parseErrors.push({ stage: `extract-${key}`, message: err.message });
      console.warn(`Extraction error (${key}) for ${cleanPath}:`, err);
      // summary[key] keeps its default empty-array value - the rest of the
      // extractors still run normally.
    }
  });

  return summary;
}
