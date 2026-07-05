import { walk } from "../walk";

/**
 * Extracts custom hook *declarations* from AST (not hook *usages* - those
 * are tracked per-component in componentExtractor).
 *
 * Uses the same `use[A-Z0-9]` boundary check as componentExtractor so names
 * like `userData` or `useful` (which merely start with the substring "use")
 * are not misidentified as hooks. Function-valued VariableDeclarators are
 * required for the arrow-function form to avoid matching plain constants
 * such as `const useDefault = 5`.
 *
 * @param {object} ast
 * @returns {Array<{name: string, line: number|null}>}
 */
export function extractHooks(ast) {
  const hooks = [];

  walk(ast.program, (node) => {
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^use[A-Z0-9]/.test(name)) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }

    if (node.type === "VariableDeclarator") {
      const name = node.id && node.id.name;
      const isFunctionValued =
        node.init && (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression");
      if (name && isFunctionValued && /^use[A-Z0-9]/.test(name)) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  return hooks;
}
