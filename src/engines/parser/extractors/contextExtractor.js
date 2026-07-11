import { walk } from "../walk.js";

/**
 * Extracts Context creations (createContext) from AST.
 *
 * Previously this also matched the bare CallExpression form independently
 * of its VariableDeclarator, which meant every `createContext(...)` call
 * produced a *second*, name-less "unknownContext" entry in addition to the
 * correctly-named one - every context in the project was double counted.
 * We now only record the CallExpression when it's *not* the direct child of
 * a VariableDeclarator (covering the rare `export default createContext()`
 * case with no local binding), and otherwise rely solely on the
 * VariableDeclarator branch, which has the real name.
 *
 * @param {object} ast
 * @returns {Array<{name: string, line: number|null}>}
 */
export function extractContexts(ast) {
  const contexts = [];
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
