import { walk } from "../../../parser/walk.js";
import { getCalleeName, extractStringOrTemplate } from "../../../parser/astUtils.js";

const HTTP_VERBS = new Set(["get", "post", "put", "delete", "patch", "options", "head", "all"]);

/**
 * Express Route Extractor
 *
 * Normalizes Express routes and router mounting declarations into Universal Route Node metadata.
 */
export function extractExpressRoutes(ast, context = {}) {
  const routes = [];
  if (!ast || !ast.program) return routes;

  walk(ast.program, (node) => {
    if (node.type !== "CallExpression") return;

    const callee = node.callee;
    if (!callee) return;

    const line = node.loc ? node.loc.start.line : 1;

    // 1. express.Router() or Router() initialization
    const calleeName = getCalleeName(callee);
    if (calleeName === "express.Router" || calleeName === "Router" || calleeName === "express.Router()") {
      routes.push({
        entityType: "router",
        name: "express_router",
        line,
        file: context.filePath,
      });
      return;
    }

    // 2. Direct verb calls: app.get('/path', handler) or router.post('/login', middleware, controller)
    if (callee.type === "MemberExpression" && callee.property && callee.object) {
      const propName = (callee.property.name || callee.property.value || "").toLowerCase();
      const objectName = callee.object.name || (callee.object.property && callee.object.property.name) || "app";

      if (HTTP_VERBS.has(propName)) {
        const pathArg = node.arguments[0];
        const routePath = extractStringOrTemplate(pathArg) || "/";

        const handlers = [];
        for (let i = 1; i < node.arguments.length; i++) {
          const arg = node.arguments[i];
          const handlerName = extractHandlerName(arg, i, line);
          if (handlerName) handlers.push(handlerName);
        }

        routes.push({
          entityType: "route",
          method: propName.toUpperCase(),
          path: routePath,
          line,
          owner: objectName,
          handlers,
          file: context.filePath,
        });
      }

      // 3. Router mounting: app.use('/api/v1', userRouter) or app.use('/api', router)
      if (propName === "use") {
        const firstArg = node.arguments[0];
        const secondArg = node.arguments[1];

        const mountPath = extractStringOrTemplate(firstArg);
        if (mountPath && secondArg) {
          const routerName = secondArg.name || (secondArg.id && secondArg.id.name) || (secondArg.callee ? (secondArg.callee.name || "router") : "router");
          routes.push({
            entityType: "mount",
            prefix: mountPath,
            routerName,
            line,
            owner: objectName,
            file: context.filePath,
          });
        } else if (!mountPath && firstArg) {
          // Mount without prefix: app.use(userRouter)
          const routerName = firstArg.name || (firstArg.id && firstArg.id.name) || null;
          if (routerName && /router|routes/i.test(routerName)) {
            routes.push({
              entityType: "mount",
              prefix: "/",
              routerName,
              line,
              owner: objectName,
              file: context.filePath,
            });
          }
        }
      }
    }
  });

  return routes;
}

function extractHandlerName(argNode, index, line) {
  if (!argNode) return null;
  if (argNode.type === "Identifier") return argNode.name;
  if (argNode.type === "MemberExpression") {
    const obj = argNode.object ? (argNode.object.name || "Controller") : "Controller";
    const prop = argNode.property ? (argNode.property.name || "method") : "method";
    return `${obj}.${prop}`;
  }
  if (argNode.type === "ArrowFunctionExpression" || argNode.type === "FunctionExpression") {
    const name = argNode.id ? argNode.id.name : `anonymousHandler@L${line}_${index}`;
    return name;
  }
  return null;
}
