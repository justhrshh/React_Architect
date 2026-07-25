import { walk } from "../../../parser/walk.js";
import { getCalleeName } from "../../../parser/astUtils.js";

const ORM_QUERY_METHODS = new Set([
  "find", "findOne", "findById", "findMany", "findUnique", "create", "update", "updateMany",
  "delete", "deleteMany", "aggregate", "count", "query", "exec"
]);

/**
 * Express Service & Database Extractor
 *
 * Normalizes backend services, ORMs, and database models into Universal Architecture concepts:
 * - Kind: "service", Subtype: "business"
 * - Kind: "model", Subtype: "orm" | "mongoose" | "prisma" | "typeorm"
 *
 * @param {object} ast
 * @param {object} context - { code, filePath }
 * @returns {Array<object>} extractedServicesAndModels
 */
export function extractExpressServices(ast, context = {}) {
  const items = [];
  if (!ast || !ast.program) return items;

  const isServiceFile =
    /(service|dao|repository)s?\.[jt]sx?$/i.test(context.filePath || "") ||
    /(^|\/)(service|dao|repository)s?\//i.test(context.filePath || "");

  const isModelFile =
    /(model|schema|entity)s?\.[jt]sx?$/i.test(context.filePath || "") ||
    /(^|\/)(model|schema|entity)s?\//i.test(context.filePath || "");

  if (isModelFile) {
    const modelName = deriveModelName(context.filePath);
    items.push({
      entityType: "model",
      name: modelName,
      subtype: "orm",
      file: context.filePath,
    });
  }

  walk(ast.program, (node) => {
    // 1. Service classes: class UserService { async findUser() {} }
    if (node.type === "ClassDeclaration" && node.id && node.id.name) {
      const className = node.id.name;
      if (isServiceFile || /Service|Repository|DAO/i.test(className)) {
        items.push({
          entityType: "service",
          name: className,
          subtype: "business",
          file: context.filePath,
          line: node.loc ? node.loc.start.line : 1,
        });
      }
    }

    // 2. ORM and Database query calls: prisma.user.findMany(), UserModel.findOne(), db.query()
    if (node.type === "CallExpression") {
      const calleeName = getCalleeName(node.callee);

      if (calleeName) {
        const parts = calleeName.split(".");
        if (parts.length >= 2) {
          const targetObj = parts[0];
          const targetProp = parts[parts.length - 1];

          if (ORM_QUERY_METHODS.has(targetProp) || targetObj === "prisma" || targetObj === "db") {
            const modelName = parts.length > 2 ? parts[1] : targetObj;
            items.push({
              entityType: "db_query",
              targetObject: targetObj,
              modelName,
              operation: targetProp,
              line: node.loc ? node.loc.start.line : 1,
              file: context.filePath,
            });
          }
        }
      }
    }
  });

  return items;
}

function deriveModelName(filePath = "") {
  const base = filePath.split("/").pop().replace(/\.[jt]sx?$/i, "");
  const clean = base.replace(/(model|schema|entity)/i, "");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Model";
}
