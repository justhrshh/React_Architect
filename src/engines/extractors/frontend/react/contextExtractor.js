import { walk } from "../../../parser/walk.js";
import { createExtractionResult } from "../../../types/schemas.js";

export function extract(ast, context = {}) {
  const contexts = extractContexts(ast);
  return createExtractionResult("contexts", contexts);
}

export function extractContexts(ast) {
  const contexts = [];
  if (!ast || !ast.program) return contexts;

  const handledCallNodes = new Set();

  walk(ast.program, (node) => {
    if (node.type === "VariableDeclarator" && node.init && node.init.type === "CallExpression") {
      if (isCreateContextCall(node.init)) {
        handledCallNodes.add(node.init);
        contexts.push({
          name: (node.id && node.id.name) || "unknownContext",
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  walk(ast.program, (node) => {
    if (node.type === "CallExpression" && isCreateContextCall(node) && !handledCallNodes.has(node)) {
      contexts.push({
        name: "unknownContext",
        line: node.loc ? node.loc.start.line : null,
      });
    }
  });

  return contexts;
}

function isCreateContextCall(node) {
  return (
    node.callee.name === "createContext" ||
    (node.callee.type === "MemberExpression" && node.callee.object.name === "React" && node.callee.property.name === "createContext")
  );
}
