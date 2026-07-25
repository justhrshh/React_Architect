import { resolveModulePath, resolveComponentDeclaration } from "./importResolver.js";
import { createEdge } from "../graph/edgeFactory.js";

/**
 * Relationship Resolvers
 *
 * Connects isolated facts from parsing & extraction into Knowledge Graph edges.
 * Single responsibility: Resolves module targets, component render trees,
 * state subscriptions, action dispatches, API client calls, and data module dependencies.
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

  const hasApiCall =
    parentCompNode.metadata.apiCalls.length > 0 ||
    parentCompNode.metadata.hooks.some((h) => h.toLowerCase().includes("fetch") || h.toLowerCase().includes("api"));
  if (hasApiCall) {
    const apiEndpoints = nodes.filter((n) => n.kind === "api" && n.subtype === "endpoint");
    apiEndpoints.forEach((end) => {
      const isAuthEnd = /login|signup|auth/.test(end.name);
      if ((isAuth && isAuthEnd) || (!isAuth && !isAuthEnd)) {
        edges.push(createEdge({ type: "USES_API", source: parentCompNode.id, target: end.id }));
      }
    });
  }

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

  const fallbackComp = nodes.find(n => n.kind === "component" && n.subtype !== "lazy" && n.name === childName);
  if (fallbackComp) return { file: fallbackComp.file, name: childName };

  return null;
}
