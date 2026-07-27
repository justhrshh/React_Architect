import { walk } from "../../../parser/walk.js";
import { createExtractionResult } from "../../../types/schemas.js";

export function extract(ast, context = {}) {
  const routes = extractRoutes(ast, context.code || "", context.filePath || "");
  return createExtractionResult("routes", routes);
}

export function extractRoutes(ast, code, filePath = "") {
  const routes = [];
  if (!ast || !ast.program) return routes;

  const seenObjectNodes = new Set();

  walk(ast.program, (node) => {
    if (node.type === "JSXElement" && node.openingElement.name.name === "Route") {
      const route = readJsxRouteAttributes(node.openingElement);
      if (route.path !== null || route.index) {
        routes.push({
          path: route.path || "/",
          component: route.component || "Component",
          type: "jsx",
          index: route.index,
          protected: route.isProtected,
          guardName: route.guardName,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  walk(ast.program, (node) => {
    if (node.type === "ObjectExpression" && !seenObjectNodes.has(node) && hasRouteShape(node)) {
      const route = readObjectRoute(node, seenObjectNodes, "");
      if (route) routes.push(route);
    }
  });

  if (routes.length === 0) {
    const isRouterPath = !/(^|\/)(engines|lib|services|redux|utils|styles|assets|hooks)\//.test(filePath);
    if (isRouterPath) {
      const jsxRouteRegex = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*(?:element=\{<([A-Z]\w*)|component=\{([A-Z]\w*)\})/g;
      const objectRouteRegex = /path:\s*["']([^"']+)["']\s*,\s*element:\s*<([A-Z]\w*)/g;
      let match;

      while ((match = jsxRouteRegex.exec(code)) !== null) {
        routes.push({ path: match[1], component: match[2] || match[3], type: "jsx-regex", line: null });
      }
      while ((match = objectRouteRegex.exec(code)) !== null) {
        routes.push({ path: match[1], component: match[2], type: "object-regex", line: null });
      }
    }
  }

  return routes;
}

function readJsxRouteAttributes(openingElement) {
  let pathVal = null;
  let elementVal = null;
  let index = false;
  let isProtected = false;
  let guardName = null;

  openingElement.attributes.forEach((attr) => {
    if (!attr.name) return;
    const attrName = attr.name.name;

    if (attrName === "path" && attr.value) {
      pathVal = attr.value.value || (attr.value.expression && attr.value.expression.value);
    }
    if (attrName === "index") {
      index = true;
    }
    if (attrName === "element" && attr.value && attr.value.expression && attr.value.expression.type === "JSXElement") {
      const elemNode = attr.value.expression;
      const topName = elemNode.openingElement.name.name;
      if (topName && /guard|private|protected|auth|require/i.test(topName)) {
        isProtected = true;
        guardName = topName;
        const childElem = (elemNode.children || []).find((c) => c.type === "JSXElement");
        if (childElem && childElem.openingElement && childElem.openingElement.name && childElem.openingElement.name.name) {
          elementVal = childElem.openingElement.name.name;
        } else {
          elementVal = topName;
        }
      } else {
        elementVal = topName;
      }
    }
    if ((attrName === "component" || attrName === "Component") && attr.value && attr.value.expression) {
      const expr = attr.value.expression;
      if (expr.type === "Identifier") {
        elementVal = expr.name;
        if (/guard|private|protected|auth|require/i.test(expr.name)) {
          isProtected = true;
          guardName = expr.name;
        }
      }
    }
  });

  return { path: pathVal, component: elementVal, index, isProtected, guardName };
}

function hasRouteShape(objectExpr) {
  const keys = new Set(objectExpr.properties.map(p => p.key && p.key.name).filter(Boolean));
  const hasPathOrIndex = keys.has("path") || keys.has("index");
  const hasRoutingKey = keys.has("element") || keys.has("Component") || keys.has("children") || keys.has("lazy") || keys.has("action") || keys.has("loader") || keys.has("redirectTo");
  return hasPathOrIndex && hasRoutingKey;
}

function readObjectRoute(objectExpr, seenObjectNodes, parentPath) {
  seenObjectNodes.add(objectExpr);

  let pathVal = null;
  let elementVal = null;
  let isIndex = false;
  let childrenNode = null;

  objectExpr.properties.forEach((prop) => {
    if (!prop.key) return;
    if (prop.key.name === "path" && prop.value && prop.value.type === "StringLiteral") {
      pathVal = prop.value.value;
    }
    if (prop.key.name === "index" && prop.value && prop.value.value === true) {
      isIndex = true;
    }
    if (prop.key.name === "element" && prop.value && prop.value.type === "JSXElement") {
      elementVal = prop.value.openingElement.name.name;
    }
    if (prop.key.name === "Component" && prop.value && prop.value.type === "Identifier") {
      elementVal = prop.value.name;
    }
    if (prop.key.name === "children" && prop.value && prop.value.type === "ArrayExpression") {
      childrenNode = prop.value;
    }
  });

  const composedPath = composePath(parentPath, pathVal, isIndex);

  const children = [];
  if (childrenNode) {
    childrenNode.elements.forEach((el) => {
      if (el && el.type === "ObjectExpression" && hasRouteShape(el)) {
        const childRoute = readObjectRoute(el, seenObjectNodes, composedPath);
        if (childRoute) children.push(childRoute);
      }
    });
  }

  if (pathVal === null && !isIndex && children.length === 0) return null;

  return {
    path: composedPath,
    component: elementVal || "Component",
    type: "object",
    index: isIndex,
    children,
    line: objectExpr.loc ? objectExpr.loc.start.line : null,
  };
}

function composePath(parentPath, ownPath, isIndex) {
  if (isIndex) return parentPath || "/";
  if (!ownPath) return parentPath || "/";
  if (ownPath.startsWith("/")) return ownPath;
  const base = parentPath && parentPath !== "/" ? parentPath : "";
  return `${base}/${ownPath}`.replace(/\/+/g, "/");
}
