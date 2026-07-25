import { walk } from "../../../parser/walk.js";
import { getCalleeName } from "../../../parser/astUtils.js";

/**
 * Express Controller Extractor
 *
 * Normalizes Express request handler functions and controller classes into Universal Controller Node metadata:
 * - Kind: "controller", Subtype: "class" | "function"
 *
 * @param {object} ast
 * @param {object} context - { code, filePath }
 * @returns {Array<object>} extractedControllers
 */
export function extractExpressControllers(ast, context = {}) {
  const controllers = [];
  if (!ast || !ast.program) return controllers;

  const isControllerFile =
    /(controller|handler)s?\.[jt]sx?$/i.test(context.filePath || "") ||
    /(^|\/)(controller|handler)s?\//i.test(context.filePath || "");

  walk(ast.program, (node) => {
    // 1. Controller classes: class UserController { async getUsers(req, res) {} }
    if (node.type === "ClassDeclaration" && node.id && node.id.name) {
      const className = node.id.name;
      const methods = [];

      node.body.body.forEach((method) => {
        if (method.type === "ClassMethod" && method.key && method.key.name) {
          const methodName = method.key.name;
          const responses = analyzeResponseHandling(method.body);

          methods.push({
            name: methodName,
            responses,
            line: method.loc ? method.loc.start.line : 1,
          });

          controllers.push({
            name: `${className}.${methodName}`,
            className,
            methodName,
            subtype: "class",
            responses,
            line: method.loc ? method.loc.start.line : 1,
            file: context.filePath,
          });
        }
      });
    }

    // 2. Standalone controller functions: export async function getUsers(req, res) {}
    if (node.type === "FunctionDeclaration" && node.id && node.id.name) {
      const name = node.id.name;
      if (isExpressHandlerParams(node.params) || isControllerFile || /Controller|Handler/i.test(name)) {
        const responses = analyzeResponseHandling(node.body);
        controllers.push({
          name,
          subtype: "function",
          responses,
          line: node.loc ? node.loc.start.line : 1,
          file: context.filePath,
        });
      }
    }

    // 3. Arrow function controller exports: export const getUsers = async (req, res) => {}
    if (node.type === "VariableDeclarator" && node.id && node.id.name && node.init) {
      const name = node.id.name;
      const init = node.init;

      if ((init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")) {
        if (isExpressHandlerParams(init.params) || isControllerFile || /Controller|Handler/i.test(name)) {
          const responses = analyzeResponseHandling(init.body);
          controllers.push({
            name,
            subtype: "function",
            responses,
            line: node.loc ? node.loc.start.line : 1,
            file: context.filePath,
          });
        }
      }
    }
  });

  return controllers;
}

function isExpressHandlerParams(params = []) {
  if (params.length < 2) return false;
  const p0 = params[0] && (params[0].name || "");
  const p1 = params[1] && (params[1].name || "");
  return /^req/i.test(p0) && /^res/i.test(p1);
}

function analyzeResponseHandling(bodyNode) {
  const responses = [];
  if (!bodyNode) return responses;

  walk(bodyNode, (node) => {
    if (node.type === "CallExpression") {
      const calleeName = getCalleeName(node.callee);
      if (calleeName && calleeName.startsWith("res.")) {
        let statusCode = 200;
        let responseType = "json";

        if (calleeName.includes("status")) {
          const codeArg = node.arguments[0];
          if (codeArg && codeArg.type === "NumericLiteral") {
            statusCode = codeArg.value;
          }
        }
        if (calleeName.endsWith(".send") || calleeName.endsWith(".sendFile")) responseType = "text";
        if (calleeName.endsWith(".render")) responseType = "html";
        if (calleeName.endsWith(".redirect")) responseType = "redirect";

        responses.push({ statusCode, responseType, line: node.loc ? node.loc.start.line : null });
      }
    }
  });

  return responses;
}
