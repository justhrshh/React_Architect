import { resolveModulePath, resolveComponentDeclaration } from "./importResolver.js";
import { createEdge } from "../graph/edgeFactory.js";

/**
 * Relationship Resolvers
 *
 * Connects isolated facts from parsing & extraction into Knowledge Graph edges.
 * Single responsibility: Resolves module targets, component render trees,
 * state subscriptions, action dispatches, API client calls, and data module dependencies.
 *
 * Phase 0 additions:
 *   USES_HOOK        — component calls a custom hook
 *   USES_CONTEXT     — component consumes a React Context via useContext()
 *   SUBSCRIBES_TO    — component subscribes to a Zustand store
 *   ASYNC_THUNK      — component dispatches an async thunk (createAsyncThunk)
 *   USES_API (fixed) — import-chain resolution replacing the heuristic auth-based matching
 */

export function resolveRelationshipEdges(nodes, edges, ctx, diagnostics) {
  const { fileMap, fileIndex, aliasMap, componentMap } = ctx;
  const componentNodes = nodes.filter((n) => n.kind === "component");
  const fileNodes = nodes.filter((n) => n.kind === "file");

  // 1. Component rendering & dependency edges
  componentNodes.forEach((parentCompNode) => {
    try {
      resolveSingleComponentEdges(parentCompNode, { fileMap, fileIndex, aliasMap, componentMap, nodes, edges });
    } catch (err) {
      diagnostics.push({ type: "GRAPH_BUILD_ERROR", message: `Failed to resolve edges for component: ${err.message}`, file: parentCompNode.file });
    }
  });

  // 2. Lazy component loading edges
  componentNodes
    .filter((n) => n.subtype === "lazy" && n.metadata.lazyImportSource)
    .forEach((lazyNode) => {
      const resolvedPath = resolveModulePath(lazyNode.file, lazyNode.metadata.lazyImportSource, fileIndex, aliasMap);
      if (!resolvedPath) {
        diagnostics.push({
          type: "UNRESOLVED_IMPORT",
          message: `lazy() import "${lazyNode.metadata.lazyImportSource}" could not be resolved to a file.`,
          file: lazyNode.file,
        });
        return;
      }
      const resolvedComponent = resolveComponentDeclaration(resolvedPath, "default", fileMap, fileIndex, aliasMap);
      const targetId = resolvedComponent ? `component:${resolvedComponent.file}:${resolvedComponent.name}` : `file:${resolvedPath}`;
      edges.push(createEdge({ type: "LAZY_LOADS", source: lazyNode.id, target: targetId, metadata: { dynamic: true } }));
    });

  // 3. File-level IMPORTS edges
  fileNodes.forEach((srcFileNode) => {
    const srcFileObj = fileMap.get(srcFileNode.file);
    if (!srcFileObj) return;

    (srcFileObj.summary.imports || []).forEach((imp) => {
      const resolvedPath = resolveModulePath(srcFileNode.file, imp.source, fileIndex, aliasMap);
      if (resolvedPath && fileMap.has(resolvedPath)) {
        edges.push(
          createEdge({
            type: "IMPORTS",
            source: srcFileNode.id,
            target: `file:${resolvedPath}`,
            metadata: { line: imp.line, dynamic: !!imp.dynamic },
          })
        );
      }
    });

    (srcFileObj.summary.exports || []).forEach((exp) => {
      if (exp.reExportFrom) {
        const resolvedPath = resolveModulePath(srcFileNode.file, exp.reExportFrom, fileIndex, aliasMap);
        if (resolvedPath && fileMap.has(resolvedPath)) {
          edges.push(
            createEdge({
              type: "IMPORTS",
              source: srcFileNode.id,
              target: `file:${resolvedPath}`,
              metadata: { line: exp.line, reExport: true },
            })
          );
        }
      }
    });
  });

  // 4. Function CALLS edges
  const fnNodesByName = new Map();
  nodes.filter((n) => n.kind === "function").forEach((fnNode) => {
    if (!fnNodesByName.has(fnNode.name)) fnNodesByName.set(fnNode.name, []);
    fnNodesByName.get(fnNode.name).push(fnNode);
  });

  fileNodes.forEach((srcFileNode) => {
    const srcFileObj = fileMap.get(srcFileNode.file);
    if (!srcFileObj) return;

    (srcFileObj.summary.functions || []).forEach((fn) => {
      const callerId = `function:${srcFileNode.file}:${fn.name}`;
      (fn.calledIdentifiers || []).forEach((calleeName) => {
        const targets = fnNodesByName.get(calleeName);
        if (targets && targets.length > 0) {
          const sameFileTarget = targets.find((t) => t.file === srcFileNode.file);
          const target = sameFileTarget || targets[0];
          edges.push(
            createEdge({
              type: "CALLS",
              source: callerId,
              target: target.id,
            })
          );
        }
      });
    });
  });

  // 5. Phase 0.7 — USES_HOOK edges (component → custom hook)
  resolveHookUsageEdges(componentNodes, nodes, fileMap, fileIndex, aliasMap, edges);

  // 6. Phase 0.8 — USES_CONTEXT edges (component → context state node)
  resolveContextUsageEdges(componentNodes, nodes, fileMap, fileIndex, aliasMap, edges);

  // 7. Phase 0.9 — SUBSCRIBES_TO edges (component → zustand store)
  resolveZustandSubscriptionEdges(componentNodes, nodes, edges);
}

function resolveSingleComponentEdges(parentCompNode, ctx) {
  const { fileMap, fileIndex, aliasMap, nodes, edges } = ctx;
  const parentFileObj = fileMap.get(parentCompNode.file);
  if (!parentFileObj) return;

  const childComponentNames = parentCompNode.metadata.children || [];
  childComponentNames.forEach((childName) => {
    const resolved = resolveChildComponent(childName, parentCompNode, parentFileObj, fileMap, fileIndex, aliasMap, nodes);
    if (resolved) {
      edges.push(
        createEdge({
          type: "RENDERS",
          source: parentCompNode.id,
          target: `component:${resolved.file}:${resolved.name}`,
        })
      );
    }
  });

  const isAuth = /login|signup|auth/.test(parentCompNode.name.toLowerCase());

  const explicitSlices = parentCompNode.metadata.reduxSlices || [];
  if (explicitSlices.length > 0) {
    const matchedSlices = nodes.filter((n) => n.kind === "state" && n.subtype === "slice");
    explicitSlices.forEach((sliceName) => {
      const targetSlice = matchedSlices.find((sl) => sl.name.toLowerCase().includes(sliceName.toLowerCase()));
      if (targetSlice) {
        edges.push(createEdge({ type: "STATE_CONSUMER", source: targetSlice.id, target: parentCompNode.id, metadata: { confidence: 1.0, method: "ast_selector" } }));
      }
    });
  }

  const dispatchedActions = parentCompNode.metadata.dispatchedActions || [];
  if (dispatchedActions.length > 0) {
    const matchedSlices = nodes.filter((n) => n.kind === "state" && n.subtype === "slice");
    dispatchedActions.forEach((item) => {
      const targetSlice = matchedSlices.find((sl) => sl.name.toLowerCase().includes(item.sliceName.toLowerCase()));
      if (targetSlice) {
        edges.push(
          createEdge({
            type: "DISPATCHES_ACTION",
            source: parentCompNode.id,
            target: targetSlice.id,
            metadata: { confidence: 1.0, method: "dispatch_action", actionName: item.actionName },
          })
        );
      }
    });
  }

  // Phase 0.10 — USES_API: import-chain resolution.
  // For each API call string in the component's metadata, we normalise the path and
  // look for a matching api endpoint node by method + path.  If no direct match is
  // found we follow the component's imports one level (service file) and try again.
  // This replaces the previous auth-vs-non-auth heuristic which created false many-to-many edges.
  const apiEndpoints = nodes.filter((n) => n.kind === "api" && n.subtype === "endpoint");
  const fileImportsForApi = parentFileObj.summary.imports || [];

  // Direct apiCalls metadata (strings like "/api/users" or "GET /api/users")
  (parentCompNode.metadata.apiCalls || []).forEach((callStr) => {
    const matched = matchApiEndpoint(callStr, apiEndpoints);
    if (matched) {
      edges.push(createEdge({ type: "USES_API", source: parentCompNode.id, target: matched.id, metadata: { method: matched.metadata?.method, path: matched.metadata?.path } }));
    }
  });

  // Indirect: follow imports to service files and check their apiCalls
  fileImportsForApi.forEach((imp) => {
    if (!imp || !imp.source) return;
    if (!imp.source.startsWith(".") && !imp.source.startsWith("@/") && !imp.source.startsWith("/")) return;
    const resolvedSvcFile = resolveModulePath(parentCompNode.file, imp.source, ctx.fileIndex, ctx.aliasMap);
    if (!resolvedSvcFile) return;
    const svcFileObj = fileMap.get(resolvedSvcFile);
    if (!svcFileObj) return;
    (svcFileObj.summary?.api || []).forEach((apiItem) => {
      if (apiItem.type !== "endpoint") return;
      const callStr = `${apiItem.method || "GET"} ${apiItem.path || ""}`;
      const matched = matchApiEndpoint(callStr, apiEndpoints);
      if (matched) {
        edges.push(createEdge({ type: "USES_API", source: parentCompNode.id, target: matched.id, metadata: { indirect: true, via: resolvedSvcFile, method: matched.metadata?.method, path: matched.metadata?.path } }));
      }
    });
  });

  // Phase 0.11 — ASYNC_THUNK: component dispatches an async thunk.
  // dispatchedActions already contains { sliceName, actionName } from reduxExtractor.
  // Cross-reference against the file's redux thunks to detect async dispatch.
  const thunkNames = new Set(
    (parentFileObj.summary?.redux || [])
      .filter((r) => r.type === "thunk")
      .map((r) => r.name)
  );
  // Also check imports — a thunk may be imported from a slice file.
  fileImportsForApi.forEach((imp) => {
    if (!imp || !imp.source) return;
    if (!imp.source.startsWith(".") && !imp.source.startsWith("@/")) return;
    const resolvedPath = resolveModulePath(parentCompNode.file, imp.source, ctx.fileIndex, ctx.aliasMap);
    if (!resolvedPath) return;
    const importedFileObj = fileMap.get(resolvedPath);
    if (!importedFileObj) return;
    (importedFileObj.summary?.redux || []).filter((r) => r.type === "thunk").forEach((thunk) => {
      thunkNames.add(thunk.name);
    });
  });

  const matchedSlicesAll = nodes.filter((n) => n.kind === "state" && n.subtype === "slice");
  const dispatchedActionsForThunk = parentCompNode.metadata.dispatchedActions || [];
  dispatchedActionsForThunk.forEach((item) => {
    const isThunk = [...thunkNames].some((tn) => tn.includes(item.actionName) || item.actionName.includes(tn.split("/")[1] || ""));
    if (isThunk) {
      const targetSlice = matchedSlicesAll.find((sl) => sl.name.toLowerCase().includes(item.sliceName.toLowerCase()));
      if (targetSlice) {
        edges.push(
          createEdge({
            type: "ASYNC_THUNK",
            source: parentCompNode.id,
            target: targetSlice.id,
            metadata: { thunkName: item.actionName, confidence: 0.9 },
          })
        );
      }
    }
  });

  const fileImports = parentFileObj.summary.imports || [];
  fileImports.forEach((imp) => {
    if (!imp || !imp.source) return;
    const source = imp.source;
    if (!source.startsWith(".") && !source.startsWith("@/") && !source.startsWith("/")) return;

    const resolvedFile = resolveModulePath(parentCompNode.file, source, ctx.fileIndex, ctx.aliasMap);
    if (resolvedFile) {
      const isDataTarget =
        /(constants?|data|configs?|mockData|schemas?|fixtures?)\.[jt]sx?$/i.test(resolvedFile) ||
        /(^|\/)(constants?|data|configs?|mockData|schemas?|fixtures?)\//i.test(resolvedFile);

      if (isDataTarget) {
        const dataNodeId = `data:${resolvedFile}`;
        const targetDataNode = nodes.find((n) => n.id === dataNodeId);
        if (targetDataNode) {
          edges.push(
            createEdge({
              type: "USES_DATA",
              source: parentCompNode.id,
              target: targetDataNode.id,
              metadata: { confidence: 1.0, method: "module_import" },
            })
          );
        }
      }
    }
  });
}

// Phase 0.11 (fix) — resolveChildComponent no longer accepts the global name fallback
// when the name is not unique across files. A component named "Button" in 5 different
// files must not be matched by coincidence — only via local declaration or explicit import.
function resolveChildComponent(childName, parentCompNode, parentFileObj, fileMap, fileIndex, aliasMap, nodes) {
  const localDecl = parentFileObj.summary.components.some((c) => c.name === childName);
  if (localDecl) return { file: parentCompNode.file, name: childName };

  const matchedImport = parentFileObj.summary.imports.find((imp) => imp.name === childName);
  if (matchedImport) {
    const resolvedPath = resolveModulePath(parentCompNode.file, matchedImport.source, fileIndex, aliasMap);
    if (resolvedPath) {
      const symbolToResolve = matchedImport.kind === "default" ? "default" : matchedImport.importedName;
      const declaration = resolveComponentDeclaration(resolvedPath, symbolToResolve, fileMap, fileIndex, aliasMap);
      if (declaration) return declaration;
    }
  }

  // Global name fallback — only use when the name is unique across the entire graph.
  // If two files declare a component with the same name, skip the fallback to avoid
  // creating incorrect edges.
  const candidates = nodes.filter((n) => n.kind === "component" && n.subtype !== "lazy" && n.name === childName);
  if (candidates.length === 1) return { file: candidates[0].file, name: childName };

  return null;
}

// ── Phase 0.7 — USES_HOOK: component → custom hook ─────────────────────────
// Reads the component's hooks[] metadata (all hook calls found by componentExtractor).
// Filters to hooks that have a matching kind:"hook" node in the graph (custom hooks).
// Resolves the hook node via the file's imports to get the correct file-scoped ID.
function resolveHookUsageEdges(componentNodes, nodes, fileMap, fileIndex, aliasMap, edges) {
  const hookNodesMap = new Map();
  nodes.filter((n) => n.kind === "hook").forEach((h) => {
    if (!hookNodesMap.has(h.name)) hookNodesMap.set(h.name, []);
    hookNodesMap.get(h.name).push(h);
  });

  componentNodes.forEach((compNode) => {
    const calledHooks = compNode.metadata?.hooks || [];
    const fileObj = fileMap.get(compNode.file);
    const fileImports = fileObj?.summary?.imports || [];

    calledHooks.forEach((hookName) => {
      const candidates = hookNodesMap.get(hookName);
      if (!candidates || candidates.length === 0) return;

      // Try to resolve via import
      const imp = fileImports.find((i) => i.name === hookName);
      if (imp) {
        const resolvedPath = resolveModulePath(compNode.file, imp.source, fileIndex, aliasMap);
        if (resolvedPath) {
          const exact = candidates.find((h) => h.file === resolvedPath);
          if (exact) {
            edges.push(createEdge({ type: "USES_HOOK", source: compNode.id, target: exact.id }));
            return;
          }
        }
      }

      // Fallback: unique name match
      if (candidates.length === 1) {
        edges.push(createEdge({ type: "USES_HOOK", source: compNode.id, target: candidates[0].id }));
      }
    });
  });
}

// ── Phase 0.8 — USES_CONTEXT: component → context state node ───────────────
// Reads the component's contexts[] metadata (populated by analyzeComponentBody
// when it detects useContext(XContext) calls).
// Matches against kind:"state", subtype:"context" nodes.
function resolveContextUsageEdges(componentNodes, nodes, fileMap, fileIndex, aliasMap, edges) {
  const contextNodes = nodes.filter((n) => n.kind === "state" && n.subtype === "context");
  if (contextNodes.length === 0) return;

  componentNodes.forEach((compNode) => {
    const usedContexts = compNode.metadata?.contexts || [];
    usedContexts.forEach((ctxName) => {
      const matched = contextNodes.find((c) => c.name === ctxName || c.name.replace(/Context$/i, "") === ctxName.replace(/Context$/i, ""));
      if (matched) {
        edges.push(createEdge({ type: "USES_CONTEXT", source: compNode.id, target: matched.id }));
      }
    });
  });
}

// ── Phase 0.9 — SUBSCRIBES_TO: component → zustand store ───────────────────
// When a component's hooks[] contains a name that matches a zustand-store node name,
// emit SUBSCRIBES_TO. Zustand store hooks follow the pattern: useXxxStore.
function resolveZustandSubscriptionEdges(componentNodes, nodes, edges) {
  const zustandStores = nodes.filter((n) => n.kind === "state" && n.subtype === "zustand-store");
  if (zustandStores.length === 0) return;

  componentNodes.forEach((compNode) => {
    const calledHooks = compNode.metadata?.hooks || [];
    calledHooks.forEach((hookName) => {
      const matched = zustandStores.find((s) => s.name === hookName || s.name.toLowerCase() === hookName.toLowerCase());
      if (matched) {
        edges.push(createEdge({ type: "SUBSCRIBES_TO", source: compNode.id, target: matched.id }));
      }
    });
  });
}

// ── Phase 0.10 helper — match a call string to an api endpoint node ──────────
// Accepts "GET /api/users", "/api/users", or a bare path.
// Returns the first matching api endpoint node or null.
function matchApiEndpoint(callStr, apiEndpoints) {
  if (!callStr || apiEndpoints.length === 0) return null;

  // Strip method prefix if present
  const methodMatch = callStr.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.*)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : null;
  const rawPath = (methodMatch ? methodMatch[2] : callStr).trim();

  // Normalise: strip origin, query string, trailing slash
  const normPath = rawPath.replace(/^https?:\/\/[^\/]+/, "").split("?")[0].replace(/\/$/, "") || "/";

  return apiEndpoints.find((end) => {
    const endPath = (end.metadata?.path || end.name || "").replace(/\/$/, "");
    const endMethod = end.metadata?.method ? end.metadata.method.toUpperCase() : null;

    if (method && endMethod && method !== endMethod) return false;

    if (normPath === endPath) return true;

    // Pattern: /api/items/:id should match /api/items/123
    try {
      const pattern = endPath.replace(/:[a-zA-Z0-9_]+/g, "[^/]+").replace(/\*\*/g, ".+");
      return new RegExp(`^${pattern}$`, "i").test(normPath);
    } catch {
      return false;
    }
  }) || null;
}
