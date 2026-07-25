import { walk } from "../../parser/walk.js";
import { createExtractionResult } from "../../types/schemas.js";

/**
 * Shared Import Extractor
 * Adheres to the Common Extractor Interface: extract(ast, context) => ExtractionResult
 */
export function extract(ast, context = {}) {
  const imports = extractImports(ast);
  return createExtractionResult("imports", imports);
}

export function extractImports(ast) {
  const imports = [];
  if (!ast || !ast.program || !ast.program.body) return imports;

  ast.program.body.forEach((node) => {
    if (node.type === "ImportDeclaration") {
      const source = node.source.value;
      const line = node.loc ? node.loc.start.line : null;
      node.specifiers.forEach((spec) => {
        let kind = "named";
        let importedName = spec.local.name;
        if (spec.type === "ImportDefaultSpecifier") {
          kind = "default";
          importedName = "default";
        } else if (spec.type === "ImportNamespaceSpecifier") {
          kind = "namespace";
          importedName = "*";
        } else if (spec.imported && spec.imported.name) {
          importedName = spec.imported.name;
        }

        imports.push({
          name: spec.local.name,
          importedName,
          source,
          kind,
          dynamic: false,
          line,
        });
      });
    }
  });

  walk(ast.program, (node) => {
    let source = null;

    if (node.type === "ImportExpression" && node.source && node.source.type === "StringLiteral") {
      source = node.source.value;
    } else if (node.type === "CallExpression" && node.callee.type === "Import") {
      const arg = node.arguments && node.arguments[0];
      if (arg && arg.type === "StringLiteral") source = arg.value;
    }

    if (source) {
      imports.push({
        name: null,
        importedName: "default",
        source,
        kind: "dynamic",
        dynamic: true,
        line: node.loc ? node.loc.start.line : null,
      });
    }
  });

  return imports;
}
