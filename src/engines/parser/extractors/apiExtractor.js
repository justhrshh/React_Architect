import { walk } from "../walk.js";
import { getCalleeName, getCalleeProperty, extractStringOrTemplate } from "../astUtils.js";

const DEFAULT_GATEWAY_VAR_NAMES = ["api", "axios", "axiosClient", "client", "http", "httpClient", "apiClient"];
const HTTP_METHODS = ["get", "post", "put", "delete", "patch"];

/**
 * Extracts API gateway and endpoint definitions from AST and source code.
 *
 * Improvements over the previous implementation:
 * - Gateway variable names are no longer limited to a hardcoded list: any
 *   variable assigned the result of `X.create({...})` is tracked, so a
 *   project's own custom-named client (e.g. `const backend = axios.create(...)`)
 *   is recognized in addition to the common `api`/`client`/`axiosClient` names.
 * - Endpoint paths built from template literals (`` api.get(`/users/${id}`) ``)
 *   are captured, with interpolations normalized to a `:param` placeholder.
 * - Plain `fetch(url, { method })` calls are recognized alongside axios-style clients.
 * - Minimal RTK Query `createApi({...})` support: the gateway itself plus
 *   `builder.query(...)`/`builder.mutation(...)` endpoint definitions.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Array<object>} apiDetails
 */
export function extractApi(ast, code) {
  const apiDetails = [];
  const gatewayVarNames = new Set(DEFAULT_GATEWAY_VAR_NAMES);

  // Pass 1: discover custom-named gateway variables, e.g. `const backend = axios.create({...})`
  walk(ast.program, (node) => {
    if (node.type === "VariableDeclarator" && node.id && node.id.name && node.init && node.init.type === "CallExpression") {
      const calleeName = getCalleeName(node.init.callee);
      if (calleeName && calleeName.endsWith(".create")) {
        gatewayVarNames.add(node.id.name);
      }
    }
  });

  // Pass 2: gateways, endpoint calls, fetch(), and RTK Query createApi
  walk(ast.program, (node) => {
    if (node.type !== "CallExpression") return;

    const calleeName = getCalleeName(node.callee);

    // axios.create({ baseURL: '...' })
    if (calleeName === "axios.create" || calleeName === "Axios.create") {
      apiDetails.push({
        type: "gateway",
        name: "axiosClient",
        baseURL: readObjectStringProp(node.arguments[0], "baseURL") || "axios",
        line: lineOf(node),
      });
      return;
    }

    // trackedVar.get('/path') / .post(...) / etc, where trackedVar came from Pass 1 or the default list
    if (node.callee.type === "MemberExpression") {
      const objectName = node.callee.object.name;
      const propName = node.callee.property.name;
      if (objectName && gatewayVarNames.has(objectName) && HTTP_METHODS.includes(propName)) {
        const pathArg = node.arguments[0];
        const path = extractStringOrTemplate(pathArg);
        if (path) {
          apiDetails.push({
            type: "endpoint",
            method: propName.toUpperCase(),
            path,
            line: lineOf(node),
            source: "axios",
          });
        }
        return;
      }
    }

    // fetch(url) / fetch(url, { method: 'POST' })
    if (calleeName === "fetch") {
      const urlArg = node.arguments[0];
      const optsArg = node.arguments[1];
      const path = extractStringOrTemplate(urlArg);
      let method = "GET";
      if (optsArg && optsArg.type === "ObjectExpression") {
        const methodStr = readObjectStringProp(optsArg, "method");
        if (methodStr) method = methodStr.toUpperCase();
      }
      if (path) {
        apiDetails.push({ type: "endpoint", method, path, line: lineOf(node), source: "fetch" });
      }
      return;
    }

    // createApi({ reducerPath, baseQuery, endpoints: (builder) => ({...}) }) - RTK Query
    if (calleeName === "createApi") {
      extractRtkQueryApi(node, apiDetails);
    }
  });

  // Fallback: regex matches for syntax the AST plugins didn't parse cleanly.
  if (apiDetails.length === 0) {
    const apiRegex = /(?:api|axios|client|http)\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = apiRegex.exec(code)) !== null) {
      apiDetails.push({
        type: "endpoint",
        method: match[1].toUpperCase(),
        path: match[2],
        line: null,
        source: "regex-fallback",
      });
    }
  }

  return apiDetails;
}

function extractRtkQueryApi(node, apiDetails) {
  const configArg = node.arguments[0];
  if (!configArg || configArg.type !== "ObjectExpression") return;

  const reducerPath = readObjectStringProp(configArg, "reducerPath") || "api";
  const baseQueryProp = configArg.properties.find((p) => p.key && p.key.name === "baseQuery");
  let baseURL = "RTK Query";
  if (baseQueryProp && baseQueryProp.value && baseQueryProp.value.type === "CallExpression") {
    const bqArg = baseQueryProp.value.arguments[0];
    const bqUrl = bqArg ? readObjectStringProp(bqArg, "baseUrl") : null;
    if (bqUrl) baseURL = bqUrl;
  }

  apiDetails.push({ type: "gateway", name: reducerPath, baseURL, line: lineOf(node), source: "rtk-query" });

  const endpointsProp = configArg.properties.find((p) => p.key && p.key.name === "endpoints");
  if (!endpointsProp || !endpointsProp.value) return;

  walk(endpointsProp.value, (n) => {
    if (n.type !== "ObjectProperty" || !n.value || n.value.type !== "CallExpression") return;

    const propertyName = getCalleeProperty(n.value.callee);
    if (propertyName !== "query" && propertyName !== "mutation") return;

    const isMutation = propertyName === "mutation";
    const cfgArg = n.value.arguments && n.value.arguments[0];
    const resolved = resolveRtkEndpointConfig(cfgArg);

    if (resolved.path) {
      apiDetails.push({
        type: "endpoint",
        method: resolved.method || (isMutation ? "POST" : "GET"),
        path: resolved.path,
        name: n.key && n.key.name,
        line: lineOf(n),
        source: "rtk-query",
      });
    }
  });
}

function resolveRtkEndpointConfig(cfgArg) {
  if (!cfgArg) return { path: null, method: null };

  if (cfgArg.type === "StringLiteral" || cfgArg.type === "TemplateLiteral") {
    return { path: extractStringOrTemplate(cfgArg), method: null };
  }

  if (cfgArg.type === "ObjectExpression") {
    const url = readObjectStringProp(cfgArg, "url");
    const method = readObjectStringProp(cfgArg, "method");
    return { path: url, method: method ? method.toUpperCase() : null };
  }

  if (cfgArg.type === "ArrowFunctionExpression" || cfgArg.type === "FunctionExpression") {
    const body = cfgArg.body;
    if (body.type === "StringLiteral" || body.type === "TemplateLiteral") {
      return { path: extractStringOrTemplate(body), method: null };
    }
    if (body.type === "ObjectExpression") {
      const url = readObjectStringProp(body, "url");
      const method = readObjectStringProp(body, "method");
      return { path: url, method: method ? method.toUpperCase() : null };
    }
  }

  return { path: null, method: null };
}

function readObjectStringProp(objectExpr, propName) {
  if (!objectExpr || objectExpr.type !== "ObjectExpression") return null;
  const prop = objectExpr.properties.find((p) => p.key && p.key.name === propName);
  if (!prop || !prop.value) return null;
  return extractStringOrTemplate(prop.value);
}

function lineOf(node) {
  return node.loc ? node.loc.start.line : null;
}
