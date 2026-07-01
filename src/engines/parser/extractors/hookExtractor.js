import { walk } from "../walk";

/**
 * Extracts custom hook declarations from AST.
 *
 * @param {object} ast
 * @returns {Array<{name: string, line: number|null}>}
 */
export function extractHooks(ast) {
  const hooks = [];

  walk(ast.program, (node) => {
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && name.startsWith("use") && name.length > 3) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }

    if (node.type === "VariableDeclarator") {
      const name = node.id && node.id.name;
      if (name && name.startsWith("use") && name.length > 3) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  return hooks;
}
