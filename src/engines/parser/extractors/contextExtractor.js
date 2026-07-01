import { walk } from "../walk";

/**
 * Extracts Context creations (createContext) from AST.
 *
 * @param {object} ast
 * @returns {Array<{name: string, line: number|null}>}
 */
export function extractContexts(ast) {
  const contexts = [];

  walk(ast.program, (node) => {
    if (node.type === "CallExpression") {
      const isCreateContext = node.callee.name === "createContext" ||
        (node.callee.type === "MemberExpression" &&
         node.callee.object.name === "React" &&
         node.callee.property.name === "createContext");
      
      if (isCreateContext) {
        // Trace back variable name: e.g. const AuthContext = React.createContext()
        let name = "unknownContext";
        // Check if grandparent or parent is VariableDeclarator
        // We walk up to check declarations
        contexts.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
    
    // Check VariableDeclarator directly
    if (node.type === "VariableDeclarator" && node.init && node.init.type === "CallExpression") {
      const callee = node.init.callee;
      const isCreateContext = callee.name === "createContext" ||
        (callee.type === "MemberExpression" &&
         callee.object.name === "React" &&
         callee.property.name === "createContext");
      
      if (isCreateContext) {
        contexts.push({
          name: node.id.name || "unknownContext",
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  return contexts;
}
