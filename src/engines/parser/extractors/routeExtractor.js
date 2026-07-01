import { walk } from "../walk";

/**
 * Extracts route mappings (URLs/Components) from AST and source code string.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Array<object>} routes
 */
export function extractRoutes(ast, code) {
  const routes = [];

  // 1. AST check for <Route path="..." element={<Component />} />
  walk(ast.program, (node) => {
    if (node.type === "JSXOpeningElement" && node.name.name === "Route") {
      let pathVal = null;
      let elementVal = null;

      node.attributes.forEach(attr => {
        if (attr.name && attr.name.name === "path" && attr.value) {
          pathVal = attr.value.value || (attr.value.expression && attr.value.expression.value);
        }
        if (attr.name && attr.name.name === "element" && attr.value && attr.value.expression) {
          const expr = attr.value.expression;
          if (expr.type === "JSXElement") {
            elementVal = expr.openingElement.name.name;
          }
        }
      });

      if (pathVal) {
        routes.push({
          path: pathVal,
          component: elementVal || "Component",
          type: "jsx",
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }

    // 2. Object properties: e.g. path: "/dashboard", element: <Dashboard />
    if (node.type === "ObjectExpression") {
      let pathVal = null;
      let elementVal = null;

      node.properties.forEach(prop => {
        if (prop.key && prop.key.name === "path" && prop.value && prop.value.type === "StringLiteral") {
          pathVal = prop.value.value;
        }
        if (prop.key && prop.key.name === "element" && prop.value && prop.value.type === "JSXElement") {
          elementVal = prop.value.openingElement.name.name;
        }
      });

      if (pathVal) {
        routes.push({
          path: pathVal,
          component: elementVal || "Component",
          type: "object",
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  // 3. Fallback: Regex checks if AST parsing had no targets
  if (routes.length === 0) {
    const jsxRouteRegex = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*element=\{<([A-Z]\w*)/g;
    const objectRouteRegex = /path:\s*["']([^"']+)["']\s*,\s*element:\s*<([A-Z]\w*)/g;
    let match;

    while ((match = jsxRouteRegex.exec(code)) !== null) {
      routes.push({
        path: match[1],
        component: match[2],
        type: "jsx-regex",
        line: null,
      });
    }

    while ((match = objectRouteRegex.exec(code)) !== null) {
      routes.push({
        path: match[1],
        component: match[2],
        type: "object-regex",
        line: null,
      });
    }
  }

  return routes;
}
