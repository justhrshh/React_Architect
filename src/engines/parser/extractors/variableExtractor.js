import { walk } from "../walk.js";

/**
 * Extracts module-level variable declarations (const, let, var).
 * Excludes React components, hooks, functions, and imports/exports.
 * Checks identifier reference frequency across the file.
 *
 * @param {object} ast
 * @returns {Array<object>} extracted variables
 */
export function extractVariables(ast) {
  const variables = [];
  if (!ast || !ast.program || !ast.program.body) return variables;

  const exportedNames = new Set();
  const allIdentifiersInFile = new Map();

  // Count identifier occurrences across the AST
  walk(ast.program, (node) => {
    if (node.type === "Identifier" && node.name) {
      allIdentifiersInFile.set(node.name, (allIdentifiersInFile.get(node.name) || 0) + 1);
    }
  });

  ast.program.body.forEach((node) => {
    let stmt = node;

    if (node.type === "ExportNamedDeclaration" && node.declaration) {
      stmt = node.declaration;
      if (stmt.id && stmt.id.name) exportedNames.add(stmt.id.name);
      if (stmt.declarations) {
        stmt.declarations.forEach((d) => {
          if (d.id && d.id.name) exportedNames.add(d.id.name);
        });
      }
    }

    if (stmt.type === "VariableDeclaration" && stmt.declarations) {
      stmt.declarations.forEach((decl) => {
        const name = decl.id && decl.id.name;
        const init = decl.init;

        // Skip components, hooks, and function expressions (handled by component/hook/function extractors)
        const isFunctionValued =
          init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression");
        const isComponentOrHook = name && (/^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name));

        if (name && !isFunctionValued && !isComponentOrHook) {
          const occurrences = allIdentifiersInFile.get(name) || 0;
          const isReferencedInFile = occurrences > 1;

          variables.push({
            name,
            line: decl.loc ? decl.loc.start.line : 1,
            loc: decl.loc ? decl.loc.end.line - decl.loc.start.line + 1 : 1,
            isExported: exportedNames.has(name) || node.type === "ExportNamedDeclaration",
            isReferencedInFile,
          });
        }
      });
    }
  });

  return variables;
}
