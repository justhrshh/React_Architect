import { walk } from "../../../parser/walk.js";
import { getCalleeName } from "../../../parser/astUtils.js";

const COMMON_MIDDLEWARE_NAMES = new Set([
  "cors", "helmet", "morgan", "cookieParser", "json", "urlencoded", "session", "passport",
  "auth", "verifyToken", "authenticate", "checkAuth", "validateRole", "rateLimit", "bodyParser"
]);

export function extractExpressMiddleware(ast, context = {}) {
  const middleware = [];
  if (!ast || !ast.program) return middleware;

  walk(ast.program, (node) => {
    if (node.type === "FunctionDeclaration" && node.params && node.params.length === 4) {
      middleware.push({
        name: (node.id && node.id.name) || "errorHandler",
        subtype: "error",
        scope: "global",
        line: node.loc ? node.loc.start.line : 1,
        file: context.filePath,
      });
    }

    if (node.type === "CallExpression") {
      const callee = node.callee;
      if (!callee) return;

      const line = node.loc ? node.loc.start.line : 1;

      if (callee.type === "MemberExpression" && callee.property && callee.property.name === "use" && callee.object) {
        const owner = callee.object.name || "app";

        node.arguments.forEach((arg) => {
          if (!arg) return;
          let mwName = null;
          let subtype = "custom";

          if (arg.type === "CallExpression") {
            mwName = getCalleeName(arg.callee);
          } else if (arg.type === "Identifier") {
            mwName = arg.name;
          } else if (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") {
            if (arg.params && arg.params.length === 4) {
              mwName = arg.id ? arg.id.name : `errorHandler@L${line}`;
              subtype = "error";
            }
          }

          if (mwName && (COMMON_MIDDLEWARE_NAMES.has(mwName.toLowerCase()) || /auth|token|jwt|guard|check|validate|cors|log/i.test(mwName))) {
            subtype = categorizeMiddleware(mwName, subtype);
            middleware.push({
              name: mwName,
              subtype,
              scope: owner === "app" ? "global" : "router",
              line,
              owner,
              file: context.filePath,
            });
          }
        });
      }
    }
  });

  return middleware;
}

function categorizeMiddleware(name, defaultType) {
  const lower = name.toLowerCase();
  if (lower.includes("cors")) return "cors";
  if (lower.includes("log") || lower.includes("morgan")) return "logging";
  if (lower.includes("auth") || lower.includes("token") || lower.includes("jwt") || lower.includes("passport")) return "auth";
  if (lower.includes("validate") || lower.includes("check") || lower.includes("body") || lower.includes("json")) return "validation";
  if (lower.includes("error")) return "error";
  return defaultType;
}
