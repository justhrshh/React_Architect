import { parse } from "@babel/parser";
import { defaultExtractorRegistry } from "../extractors/registry.js";

/**
 * Parses source code contents into Babel AST and runs all registered extractors via ExtractorRegistry.
 *
 * @param {string} code
 * @param {string} filePath
 * @param {ExtractorRegistry} [registry=defaultExtractorRegistry]
 * @returns {object} fileSummary
 */
export function parseFile(code, filePath, registry = defaultExtractorRegistry) {
  const cleanPath = filePath.replace(/\\/g, "/");
  const summary = {
    filePath: cleanPath,
    components: [],
    functions: [],
    variables: [],
    imports: [],
    exports: [],
    hooks: [],
    contexts: [],
    redux: [],
    routes: [],
    api: [],
    express: { routes: [], middleware: [], controllers: [], services: [] },
    parseErrors: [],
  };

  const ext = cleanPath.split(".").pop().toLowerCase();
  if (ext === "md" || ext === "json") {
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

  if (ast.errors && ast.errors.length > 0) {
    ast.errors.forEach((err) => {
      summary.parseErrors.push({ stage: "ast-parse-recovered", message: err.message || String(err) });
    });
  }

  const context = { code, filePath: cleanPath };
  const extractedMap = registry.runAll(ast, context);

  for (const [key, res] of extractedMap.entries()) {
    summary[key] = res.data !== undefined ? res.data : [];
    if (res.errors && res.errors.length > 0) {
      summary.parseErrors.push(...res.errors);
    }
  }

  return summary;
}
