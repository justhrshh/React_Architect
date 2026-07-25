import { walk } from "../../parser/walk.js";
import { getCalleeName } from "../../parser/astUtils.js";
import { createExtractionResult } from "../../types/schemas.js";

/**
 * Shared Function Extractor
 * Adheres to Common Extractor Interface: extract(ast, context) => ExtractionResult
 */
export function extract(ast, context = {}) {
  const fns = extractFunctions(ast);
  return createExtractionResult("functions", fns);
}

export function extractFunctions(ast) {
  const functions = [];
  if (!ast || !ast.program || !ast.program.body) return functions;

  const exportedNames = new Set();
  const allIdentifiersInFile = new Map();

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

    if (stmt.type === "FunctionDeclaration") {
      const name = stmt.id && stmt.id.name;
      if (name && !/^[A-Z]/.test(name) && !/^use[A-Z0-9]/.test(name)) {
        const occurrences = allIdentifiersInFile.get(name) || 0;
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
