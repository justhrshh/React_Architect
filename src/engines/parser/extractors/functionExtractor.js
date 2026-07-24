import { walk } from "../walk.js";
import { getCalleeName } from "../astUtils.js";

/**
 * Extracts top-level/module-level standalone helper functions.
 * Excludes React components (Capitalized returning JSX) and Hooks (useX).
 * Checks if the function identifier is referenced anywhere else in the declaring file.
 *
 * @param {object} ast
 * @returns {Array<object>} extracted module-level functions
 */
export function extractFunctions(ast) {
  const functions = [];
  if (!ast || !ast.program || !ast.program.body) return functions;

  const exportedNames = new Set();
  const allIdentifiersInFile = new Map(); // identifier -> occurrence count

  // Count identifier references across the entire AST
  walk(ast.program, (node) => {
    if (node.type === "Identifier" && node.name) {
      allIdentifiersInFile.set(node.name, (allIdentifiersInFile.get(node.name) || 0) + 1);
    }
  });

  ast.program.body.forEach((node) => {
    let stmt = node;

    // Track exports
    if (node.type === "ExportNamedDeclaration" && node.declaration) {
      stmt = node.declaration;
      if (stmt.id && stmt.id.name) exportedNames.add(stmt.id.name);
      if (stmt.declarations) {
        stmt.declarations.forEach((d) => {
          if (d.id && d.id.name) exportedNames.add(d.id.name);
        });
      }
    }

    // 1. Top-level function declaration: function foo() {}
    if (stmt.type === "FunctionDeclaration") {
      const name = stmt.id && stmt.id.name;
      if (name && !/^[A-Z]/.test(name) && !/^use[A-Z0-9]/.test(name)) {
        const occurrences = allIdentifiersInFile.get(name) || 0;
        // Function declaration AST node contains `name` once in node.id.
        // If occurrences === 1, the name appears ONLY in its declaration line!
        const isReferencedInFile = occurrences > 1;
        const calls = extractCalledIdentifiers(stmt.body);

        functions.push({
          name,
          line: stmt.loc ? stmt.loc.start.line : 1,
          loc: stmt.loc ? stmt.loc.end.line - stmt.loc.start.line + 1 : 1,
          isExported: exportedNames.has(name) || node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration",
          isReferencedInFile,
          calledIdentifiers: calls,
        });
      }
    }

    // 2. Top-level const helper = () => {} or const helper = function() {}
    if (stmt.type === "VariableDeclaration" && stmt.declarations) {
      stmt.declarations.forEach((decl) => {
        const name = decl.id && decl.id.name;
        const init = decl.init;
        if (
          name &&
          !/^[A-Z]/.test(name) &&
          !/^use[A-Z0-9]/.test(name) &&
          init &&
          (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")
        ) {
          const occurrences = allIdentifiersInFile.get(name) || 0;
          const isReferencedInFile = occurrences > 1;
          const calls = extractCalledIdentifiers(init.body);

          functions.push({
            name,
            line: decl.loc ? decl.loc.start.line : 1,
            loc: decl.loc ? decl.loc.end.line - decl.loc.start.line + 1 : 1,
            isExported: exportedNames.has(name) || node.type === "ExportNamedDeclaration",
            isReferencedInFile,
            calledIdentifiers: calls,
          });
        }
      });
    }
  });

  return functions;
}

function extractCalledIdentifiers(bodyNode) {
  const calls = new Set();
  if (!bodyNode) return [];

  walk(bodyNode, (node) => {
    if (node.type === "CallExpression") {
      const name = getCalleeName(node.callee);
      if (name) calls.add(name);
    }
  });

  return [...calls];
}
