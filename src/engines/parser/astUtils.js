/**
 * astUtils.js
 * Small, dependency-free helpers shared across parser extractors.
 * Centralizing these avoids six slightly-different reimplementations
 * of "get the dotted name of a callee" scattered across extractors.
 */

/**
 * Resolves a human-readable dotted name for a Callee node.
 * Supports: identifier calls (`foo()`), member calls (`foo.bar()`),
 * and chained member calls (`foo.bar.baz()` -> "foo.bar.baz").
 *
 * @param {object} callee - Babel AST callee node
 * @returns {string|null}
 */
export function getCalleeName(callee) {
  if (!callee) return null;
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression") {
    const objectName = callee.object.type === "Identifier"
      ? callee.object.name
      : callee.object.type === "MemberExpression"
        ? getCalleeName(callee.object)
        : null;
    const propertyName = callee.property && callee.property.name;
    if (objectName && propertyName) return `${objectName}.${propertyName}`;
    return propertyName || null;
  }
  return null;
}

/**
 * Returns just the trailing property name of a callee, regardless of how
 * deeply nested the member expression is. Useful for matching `builder.query`
 * whether `builder` is a plain identifier or itself a member expression.
 *
 * @param {object} callee
 * @returns {string|null}
 */
export function getCalleeProperty(callee) {
  if (!callee) return null;
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression") return callee.property && callee.property.name;
  return null;
}

/**
 * Extracts a best-effort string value from a StringLiteral or TemplateLiteral node.
 * Interpolated expressions inside template literals are replaced with a `:param`
 * placeholder so API/route paths remain readable (e.g. `/users/${id}` -> "/users/:param").
 *
 * @param {object} node
 * @returns {string|null}
 */
export function extractStringOrTemplate(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") {
    let result = "";
    node.quasis.forEach((quasi, i) => {
      result += quasi.value.raw;
      if (i < node.expressions.length) {
        const expr = node.expressions[i];
        const paramName = expr.type === "Identifier" ? expr.name : "param";
        result += `:${paramName}`;
      }
    });
    return result;
  }
  return null;
}

/**
 * Finds the nearest enclosing declared name for an anonymous function/expression,
 * by checking whether it is the direct init of a VariableDeclarator or the
 * declaration of an ExportDefaultDeclaration. Falls back to null.
 * Not a full scope walk - just handles the two common real-world shapes.
 *
 * @param {string} filePath
 * @returns {string} PascalCase guess derived from the file's basename
 */
export function guessNameFromFilePath(filePath) {
  const base = filePath.split("/").pop().replace(/\.[^/.]+$/, "");
  if (base.toLowerCase() === "index") {
    // index.jsx gives no useful name; fall back to parent directory name
    const parts = filePath.split("/");
    const parentDir = parts[parts.length - 2] || "Component";
    return toPascalCase(parentDir);
  }
  return toPascalCase(base);
}

function toPascalCase(str) {
  return str
    .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

/**
 * Safely strips // and /* *\/ comments and trailing commas from JSON-with-comments
 * content (tsconfig.json / jsconfig.json commonly contain both). Best-effort only;
 * malformed input still may fail JSON.parse, which callers should catch.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripJsonComments(text) {
  let result = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      result += ch;
      if (ch === "\\") {
        result += next;
        i++;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      result += ch;
    } else if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
    } else if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
    } else {
      result += ch;
    }
  }

  // Remove trailing commas before ] or }
  return result.replace(/,(\s*[}\]])/g, "$1");
}
