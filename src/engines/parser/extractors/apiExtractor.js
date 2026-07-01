import { walk } from "../walk";

/**
 * Extracts API gateway and endpoint parameters from AST and source code string.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Array<object>} apiDetails
 */
export function extractApi(ast, code) {
  const apiDetails = [];

  walk(ast.program, (node) => {
    // Axios config: axios.create({ baseURL: '...' })
    if (node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.object.name === "axios" &&
        node.callee.property.name === "create") {
      
      let baseURL = "axios";
      const arg = node.arguments[0];
      if (arg && arg.type === "ObjectExpression") {
        arg.properties.forEach(p => {
          if (p.key && p.key.name === "baseURL" && p.value.type === "StringLiteral") {
            baseURL = p.value.value;
          }
        });
      }

      apiDetails.push({
        type: "gateway",
        name: "axiosClient",
        baseURL,
        line: node.loc ? node.loc.start.line : null,
      });
    }

    // Services/Endpoints mappings (e.g. login(data) { return api.post('/login', data) })
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
      const propName = node.callee.property.name;
      const objectName = node.callee.object.name;

      if ((objectName === "api" || objectName === "axios" || objectName === "axiosClient" || objectName === "client") &&
          ["get", "post", "put", "delete", "patch"].includes(propName)) {
        
        const arg = node.arguments[0];
        if (arg && arg.type === "StringLiteral") {
          apiDetails.push({
            type: "endpoint",
            method: propName.toUpperCase(),
            path: arg.value,
            line: node.loc ? node.loc.start.line : null,
          });
        }
      }
    }
  });

  // Fallback: Regex matches
  if (apiDetails.length === 0) {
    const apiRegex = /(?:api|axios|client)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;
    let match;
    while ((match = apiRegex.exec(code)) !== null) {
      apiDetails.push({
        type: "endpoint",
        method: match[1].toUpperCase(),
        path: match[2],
        line: null,
      });
    }
  }

  return apiDetails;
}
