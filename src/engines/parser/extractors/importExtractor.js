import { walk } from "../walk";

/**
 * Extracts ES6 Import declarations from AST.
 *
 * @param {object} ast
 * @returns {Array<{name: string, source: string, line: number|null}>}
 */
export function extractImports(ast) {
  const imports = [];
  if (ast.program && ast.program.body) {
    ast.program.body.forEach((node) => {
      if (node.type === "ImportDeclaration") {
        const source = node.source.value;
        const line = node.loc ? node.loc.start.line : null;
        node.specifiers.forEach((spec) => {
          imports.push({
            name: spec.local.name,
            source,
            line,
          });
        });
      }
    });
  }
  return imports;
}
