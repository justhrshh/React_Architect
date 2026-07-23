/**
 * deadCode.js
 *
 * React Architect — Dead Code & Code Hygiene Analysis Engine (v2.1)
 * =================================================================
 *
 * FIXES & ENHANCEMENTS IN v2.1:
 * ----------------------------
 * 1. Transitive Barrel Re-export Propagation: Resolves RE_EXPORTS / EXPORTS
 *    edges alongside IMPORTS so that re-exported sub-folder modules (like
 *    `src/engines/ai/provider/`) are correctly credited with external
 *    importers from barrel entry points (`src/engines/ai/index.js`).
 * 2. File-to-Symbol Dual Node Reachability: Ensures orphan module checks check
 *    reachability across both `file` nodes and associated `component/api` symbol
 *    nodes residing in that file.
 */

const CONFIG = {
  builtInHooks: new Set([
    "useState", "useEffect", "useLayoutEffect", "useRef", "useMemo",
    "useCallback", "useContext", "useReducer", "useImperativeHandle",
    "useDebugValue", "useId", "useTransition", "useDeferredValue",
    "useSyncExternalStore", "useInsertionEffect",
  ]),

  entryFilePattern: /(^|\/)(main|index|App|_app|_document)\.[jt]sx?$/i,
  barrelFilePattern: /(^|\/)index\.[jt]sx?$/i,
  testFilePattern: /\.(test|spec)\.[jt]sx?$/i,
  storyFilePattern: /\.stories\.[jt]sx?$/i,
  typeDeclFilePattern: /\.d\.ts$/i,
  configFilePattern: /(^|\/)(vite|webpack|next|jest|babel|tailwind|postcss)\.config\.[jt]s$/i,
  utilFolderPattern: /(^|\/)(utils?|helpers?|lib|shared)\//i,

  dynamicNameHintPattern: /(lazy|dynamic|register|registry|factory|loader|loadable|plugin|provider)/i,

  rootLikeSubtypes: new Set(["page", "layout", "provider", "context", "root", "entry", "route"]),

  structuralEdgeTypes: [
    "IMPORTS", "RENDERS", "USES_HOOK", "USES_CONTEXT", "STATE_CONSUMER",
    "USES_API", "ROUTE_PARENT", "RE_EXPORTS", "EXPORTS", "DYNAMIC_IMPORT",
    "REGISTERS", "CALLS", "FORWARDS_REF",
  ],

  weights: {
    unreachableFromRoots: 32,
    noDirectIncomingReference: 22,
    noHookOrRenderConsumption: 16,
    notReExportedThroughBarrel: 10,
    noDynamicNameRisk: 12,
    noStringLiteralNameMatch: 8,
    notTestOrStoryOnlyConsumer: 8,
    penaltyDynamicNameRisk: 45,
    penaltyBarrelReExport: 30,
    penaltyStringLiteralMatch: 35,
    penaltyRootLikeSubtype: 100,
    penaltyEntryFile: 100,
  },

  thresholds: {
    safeToRemove: 88,
    likelyUnused: 68,
    needsReview: 40,
  },
};

function indexNodesById(nodes) {
  const map = new Map();
  for (const n of nodes) map.set(n.id, n);
  return map;
}

function getNodesByKind(nodes, kind) {
  return nodes.filter(n => n && n.kind === kind);
}

function buildForwardAdjacency(edges, types) {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  const map = new Map();
  for (const e of edges) {
    if (!typeSet.has(e.type)) continue;
    if (!map.has(e.source)) map.set(e.source, []);
    map.get(e.source).push(e.target);
  }
  return map;
}

function buildReverseAdjacency(edges, types) {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  const map = new Map();
  for (const e of edges) {
    if (!typeSet.has(e.type)) continue;
    if (!map.has(e.target)) map.set(e.target, []);
    map.get(e.target).push(e.source);
  }
  return map;
}

function countIncoming(reverseAdjacency, id) {
  return (reverseAdjacency.get(id) || []).length;
}

function classifyFilePath(filePath) {
  const path = filePath || "";
  return {
    isEntry: CONFIG.entryFilePattern.test(path),
    isBarrel: CONFIG.barrelFilePattern.test(path),
    isTest: CONFIG.testFilePattern.test(path),
    isStory: CONFIG.storyFilePattern.test(path),
    isTypeDecl: CONFIG.typeDeclFilePattern.test(path),
    isConfig: CONFIG.configFilePattern.test(path),
    isUtil: CONFIG.utilFolderPattern.test(path),
  };
}

function hasDynamicNameRisk(name) {
  return typeof name === "string" && CONFIG.dynamicNameHintPattern.test(name);
}

function computeRootsAndDynamicRisk(nodes, routes) {
  const rootIds = new Set();
  const dynamicRiskIds = new Set();

  const routedComponentNames = new Set(
    routes.map(r => r.metadata?.componentName).filter(Boolean)
  );

  for (const n of nodes) {
    const pathInfo = classifyFilePath(n.file);
    const meta = n.metadata || {};

    const isEntryFile = pathInfo.isEntry;
    const isRootSubtype = CONFIG.rootLikeSubtypes.has(n.subtype);
    const isRoutedByName = routedComponentNames.has(n.name);
    const isExplicitEntry = meta.isEntryPoint === true;
    const isDynamicallyLoaded =
      meta.isLazy === true || meta.loadedDynamically === true || meta.subtype === "lazy";
    const isRegisteredSomewhere =
      Array.isArray(meta.registeredIn) && meta.registeredIn.length > 0;

    if (isEntryFile || isRootSubtype || isRoutedByName || isExplicitEntry) {
      rootIds.add(n.id);
    }

    if (isDynamicallyLoaded || isRegisteredSomewhere) {
      rootIds.add(n.id);
      dynamicRiskIds.add(n.id);
    }

    if (hasDynamicNameRisk(n.name) || pathInfo.isBarrel || pathInfo.isConfig) {
      dynamicRiskIds.add(n.id);
    }
  }

  return { rootIds, dynamicRiskIds, routedComponentNames };
}

function computeReachableSet(nodes, edges, rootIds) {
  const forward = buildForwardAdjacency(edges, CONFIG.structuralEdgeTypes);
  const reverse = buildReverseAdjacency(edges, CONFIG.structuralEdgeTypes);

  const nodesById = indexNodesById(nodes);

  const reachable = new Set();
  const queue = [];

  for (const rid of rootIds) {
    reachable.add(rid);
    queue.push(rid);
    const n = nodesById.get(rid);
    if (n && n.file) {
      const fileId = `file:${n.file}`;
      if (!reachable.has(fileId)) {
        reachable.add(fileId);
        queue.push(fileId);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.pop();
    const neighbors = (forward.get(current) || []).concat(reverse.get(current) || []);
    for (const next of neighbors) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
        const n = nodesById.get(next);
        if (n && n.file) {
          const fileId = `file:${n.file}`;
          if (!reachable.has(fileId)) {
            reachable.add(fileId);
            queue.push(fileId);
          }
        }
      }
    }
  }

  return reachable;
}

function evaluateEvidence(params) {
  const w = CONFIG.weights;
  const signals = [];
  let score = 0;

  if (params.isRootLike) {
    return { score: 0, signals: ["Node is a structural root (entry point, route target, or provider)."], hardException: true };
  }

  if (!params.reachable) {
    score += w.unreachableFromRoots;
    signals.push("Not reachable from any known application entry point, route, or provider tree.");
  }

  if (params.directIncoming === 0) {
    score += w.noDirectIncomingReference;
    signals.push("Zero direct incoming structural references (imports/renders/calls) anywhere in the project.");
  }

  if (params.hookOrRenderIncoming === 0) {
    score += w.noHookOrRenderConsumption;
    signals.push("Never consumed via RENDERS, USES_HOOK, or USES_CONTEXT edges.");
  }

  if (!params.reExportedByBarrel) {
    score += w.notReExportedThroughBarrel;
  } else {
    score -= w.penaltyBarrelReExport;
    signals.push("Re-exported through a barrel/index file — external consumers may import it by path through the barrel without a direct edge.");
  }

  if (!params.nameHasDynamicRisk) {
    score += w.noDynamicNameRisk;
  } else {
    score -= w.penaltyDynamicNameRisk;
    signals.push("Name matches dynamic/registry/factory/lazy-loading vocabulary — likely wired up outside the static import graph.");
  }

  if (!params.nameAppearsAsStringLiteral) {
    score += w.noStringLiteralNameMatch;
  } else {
    score -= w.penaltyStringLiteralMatch;
    signals.push("Symbol name appears as a string literal elsewhere in the project (possible dynamic/registry lookup).");
  }

  if (!params.onlyConsumedByTestsOrStories) {
    score += w.notTestOrStoryOnlyConsumer;
  } else {
    signals.push("Only consumers found are test/story files — real usage cannot be ruled out for exported utilities.");
  }

  return { score: Math.max(0, Math.min(100, score)), signals, hardException: false };
}

function classifyFromScore(evidence) {
  if (evidence.hardException) {
    return {
      classification: "Runtime Managed",
      safety: "runtime-managed",
      safetyBadge: "🔒 Runtime managed (structural root)",
      confidence: 0,
    };
  }

  const { score } = evidence;
  const t = CONFIG.thresholds;

  if (score >= t.safeToRemove) {
    return { classification: "Safe to Remove", safety: "safe", safetyBadge: "✅ Safe to remove", confidence: score };
  }
  if (score >= t.likelyUnused) {
    return { classification: "Likely Unused", safety: "review", safetyBadge: "⚠️ Likely unused — review", confidence: score };
  }
  if (score >= t.needsReview) {
    return { classification: "Needs Review", safety: "review", safetyBadge: "⚠️ Needs review", confidence: score };
  }
  return { classification: "Cannot Determine", safety: "uncertain", safetyBadge: "❌ Cannot determine safely", confidence: score };
}

function buildProjectContext(graph) {
  const { nodes = [], edges = [] } = graph;

  const nodesById = indexNodesById(nodes);
  const components = getNodesByKind(nodes, "component");
  const routes = getNodesByKind(nodes, "route").filter(n => n.subtype === "endpoint" || n.subtype === undefined);
  const contexts = components.filter(n => n.subtype === "provider" || n.subtype === "context");
  const apiEndpoints = getNodesByKind(nodes, "api").filter(n => n.subtype === "endpoint");
  const files = getNodesByKind(nodes, "file");

  const { rootIds, dynamicRiskIds, routedComponentNames } = computeRootsAndDynamicRisk(nodes, routes);
  const reachableSet = computeReachableSet(nodes, edges, rootIds);

  const reverseByType = {};
  for (const type of CONFIG.structuralEdgeTypes) {
    reverseByType[type] = buildReverseAdjacency(edges, type);
  }
  const combinedIncoming = buildReverseAdjacency(edges, CONFIG.structuralEdgeTypes);
  const hookRenderIncoming = buildReverseAdjacency(edges, ["RENDERS", "USES_HOOK", "USES_CONTEXT"]);

  const reExportedIds = new Set();
  for (const e of edges) {
    if (e.type === "RE_EXPORTS" || e.type === "EXPORTS") {
      const sourceNode = nodesById.get(e.source);
      if (sourceNode && classifyFilePath(sourceNode.file).isBarrel) {
        reExportedIds.add(e.target);
      }
    }
  }

  const stringLiteralHaystack = [];
  for (const n of nodes) {
    const literals = n.metadata?.stringLiterals || n.metadata?.stringReferences || [];
    if (Array.isArray(literals)) stringLiteralHaystack.push(...literals);
  }
  const stringLiteralSet = new Set(stringLiteralHaystack.filter(s => typeof s === "string"));

  return {
    nodes, edges, nodesById, components, routes, contexts, apiEndpoints, files,
    rootIds, dynamicRiskIds, routedComponentNames, reachableSet,
    reverseByType, combinedIncoming, hookRenderIncoming, reExportedIds,
    stringLiteralSet,
  };
}

function isOnlyConsumedByTestsOrStories(ctx, id) {
  const consumerIds = ctx.combinedIncoming.get(id) || [];
  if (consumerIds.length === 0) return false;
  return consumerIds.every(cid => {
    const consumer = ctx.nodesById.get(cid);
    if (!consumer) return false;
    const info = classifyFilePath(consumer.file);
    return info.isTest || info.isStory;
  });
}

function buildEvidenceInputForNode(ctx, node, { treatAsRootLike } = {}) {
  const pathInfo = classifyFilePath(node.file);
  const isFileNode = node.kind === "file";

  const isReachable = ctx.reachableSet.has(node.id) ||
    (isFileNode && ctx.nodes.some(n => n.file === node.file && ctx.reachableSet.has(n.id)));

  const directIncoming = countIncoming(ctx.combinedIncoming, node.id) +
    (isFileNode ? ctx.nodes.filter(n => n.file === node.file).reduce((acc, n) => acc + countIncoming(ctx.combinedIncoming, n.id), 0) : 0);

  const hookOrRenderIncoming = countIncoming(ctx.hookRenderIncoming, node.id) +
    (isFileNode ? ctx.nodes.filter(n => n.file === node.file).reduce((acc, n) => acc + countIncoming(ctx.hookRenderIncoming, n.id), 0) : 0);

  return {
    reachable: isReachable,
    dynamicRisk: ctx.dynamicRiskIds.has(node.id),
    directIncoming,
    hookOrRenderIncoming,
    reExportedByBarrel: ctx.reExportedIds.has(node.id),
    nameHasDynamicRisk: hasDynamicNameRisk(node.name),
    nameAppearsAsStringLiteral: ctx.stringLiteralSet.has(node.name),
    onlyConsumedByTestsOrStories: isOnlyConsumedByTestsOrStories(ctx, node.id),
    isRootLike:
      !!treatAsRootLike ||
      ctx.rootIds.has(node.id) ||
      pathInfo.isEntry ||
      CONFIG.rootLikeSubtypes.has(node.subtype) ||
      ctx.routedComponentNames.has(node.name),
  };
}

function buildFinding(base, evidence, classification) {
  return {
    id: base.id,
    name: base.name,
    category: base.category,
    categoryLabel: base.categoryLabel,
    file: base.file,
    line: base.line ?? 1,
    references: base.references ?? 0,
    confidence: classification.confidence,
    confidenceLabel: `${classification.confidence}% Confidence`,
    safety: classification.safety,
    safetyLabel: classification.classification,
    safetyBadge: classification.safetyBadge,
    reason: evidence.signals.join(" "),
    recommendation: base.recommendation,
    nodeId: base.nodeId,
    evidence: evidence.signals,
  };
}

function analyzeComponents(ctx) {
  const findings = [];
  for (const c of ctx.components) {
    const pathInfo = classifyFilePath(c.file);
    if (pathInfo.isEntry || CONFIG.rootLikeSubtypes.has(c.subtype) || ctx.routedComponentNames.has(c.name)) {
      continue;
    }

    const input = buildEvidenceInputForNode(ctx, c);
    const evidence = evaluateEvidence(input);
    if (evidence.hardException) continue;

    const classification = classifyFromScore(evidence);
    if (classification.safety === "safe" || classification.safety === "review") {
      findings.push(buildFinding({
        id: `comp-${c.id}`,
        name: c.name,
        category: "unusedComponents",
        categoryLabel: "Unused Component",
        file: c.file || "src/components",
        line: c.metadata?.line || 1,
        references: input.directIncoming,
        recommendation: classification.classification === "Safe to Remove"
          ? "No reachable render path, import, or dynamic-loading marker found across the project. Safe to remove."
          : "Some usage evidence is missing but not conclusively absent — confirm manually before deleting.",
        nodeId: c.id,
      }, evidence, classification));
    }
  }
  return findings;
}

function analyzeHooks(ctx) {
  const findings = [];

  const hookDeclaredIn = new Map();
  const hookReferenceCount = new Map();
  const hookReferencingFiles = new Map();

  for (const c of ctx.components) {
    const hooks = c.metadata?.hooks || [];
    for (const hook of hooks) {
      if (typeof hook !== "string") continue;
      hookReferenceCount.set(hook, (hookReferenceCount.get(hook) || 0) + 1);
      if (!hookReferencingFiles.has(hook)) hookReferencingFiles.set(hook, new Set());
      hookReferencingFiles.get(hook).add(c.file);
      if (!hookDeclaredIn.has(hook) && c.metadata?.declaresHook === hook) {
        hookDeclaredIn.set(hook, c.file);
      }
      if (!hookDeclaredIn.has(hook)) hookDeclaredIn.set(hook, c.file);
    }
  }

  for (const [hook, totalCount] of hookReferenceCount.entries()) {
    if (CONFIG.builtInHooks.has(hook) || !/^use[A-Z]/.test(hook)) continue;

    const referencingFiles = hookReferencingFiles.get(hook) || new Set();
    const usedOutsideDeclaringFile = referencingFiles.size > 1;

    const declaringFile = hookDeclaredIn.get(hook) || "src/hooks";
    const pseudoNode = { id: `hook::${hook}`, name: hook, file: declaringFile, subtype: "hook" };
    const input = {
      reachable: usedOutsideDeclaringFile,
      dynamicRisk: false,
      directIncoming: usedOutsideDeclaringFile ? referencingFiles.size - 1 : 0,
      hookOrRenderIncoming: usedOutsideDeclaringFile ? referencingFiles.size - 1 : 0,
      reExportedByBarrel: classifyFilePath(declaringFile).isBarrel,
      nameHasDynamicRisk: hasDynamicNameRisk(hook),
      nameAppearsAsStringLiteral: ctx.stringLiteralSet.has(hook),
      onlyConsumedByTestsOrStories: false,
      isRootLike: false,
    };

    const evidence = evaluateEvidence(input);
    const classification = classifyFromScore(evidence);
    if (classification.safety === "safe" || classification.safety === "review") {
      findings.push(buildFinding({
        id: `hook-${hook}`,
        name: `${hook}()`,
        category: "unusedHooks",
        categoryLabel: "Unused Custom Hook",
        file: declaringFile,
        line: 1,
        references: input.directIncoming,
        recommendation: "No external component or hook consumes this outside its own declaration. Confirm it isn't exported for public/library use before removing.",
        nodeId: pseudoNode.id,
      }, evidence, classification));
    }
  }

  return findings;
}

function analyzeFunctionsAndExports(ctx) {
  const findings = [];

  for (const c of ctx.components) {
    const meta = c.metadata || {};
    const pathInfo = classifyFilePath(c.file);

    const declaredFuncs = meta.functions || meta.methods || [];
    const lifecycleAndReservedNames = new Set([
      "render", "componentDidMount", "componentDidUpdate", "componentWillUnmount",
      "useEffect", "getDerivedStateFromProps", "shouldComponentUpdate",
    ]);

    for (const fn of declaredFuncs) {
      const fnName = typeof fn === "string" ? fn : fn?.name;
      if (!fnName || lifecycleAndReservedNames.has(fnName)) continue;

      const calledInternally = Array.isArray(meta.internalCallGraph) &&
        meta.internalCallGraph.some(call => call?.callee === fnName);
      const calledExternally = (ctx.combinedIncoming.get(`${c.id}::${fnName}`) || []).length > 0;

      const input = {
        reachable: calledInternally || calledExternally,
        dynamicRisk: hasDynamicNameRisk(fnName),
        directIncoming: (calledInternally ? 1 : 0) + (calledExternally ? 1 : 0),
        hookOrRenderIncoming: calledExternally ? 1 : 0,
        reExportedByBarrel: pathInfo.isBarrel,
        nameHasDynamicRisk: hasDynamicNameRisk(fnName),
        nameAppearsAsStringLiteral: ctx.stringLiteralSet.has(fnName),
        onlyConsumedByTestsOrStories: false,
        isRootLike: false,
      };

      const evidence = evaluateEvidence(input);
      const classification = classifyFromScore(evidence);
      if (classification.safety === "safe" || classification.safety === "review") {
        findings.push(buildFinding({
          id: `fn-${c.id}-${fnName}`,
          name: `${fnName}()`,
          category: "unusedFunctions",
          categoryLabel: "Unused Function",
          file: c.file,
          line: (typeof fn === "object" && fn.line) || meta.line || 1,
          references: input.directIncoming,
          recommendation: classification.classification === "Safe to Remove"
            ? "No internal call, external call, or dynamic-dispatch naming pattern detected."
            : "Function has weak usage evidence — confirm it isn't invoked dynamically (e.g. obj[name]()) before removing.",
        }, evidence, classification));
      }
    }

    const exportsList = meta.exports || [];
    for (const exp of exportsList) {
      if (!exp || exp === "default" || exp === c.name) continue;

      const importedElsewhere = (ctx.reverseByType.IMPORTS?.get(`${c.id}::${exp}`) || []).length > 0;
      const reExported = ctx.reExportedIds.has(`${c.id}::${exp}`) || pathInfo.isBarrel;

      const input = {
        reachable: importedElsewhere,
        dynamicRisk: false,
        directIncoming: importedElsewhere ? 1 : 0,
        hookOrRenderIncoming: 0,
        reExportedByBarrel: reExported,
        nameHasDynamicRisk: hasDynamicNameRisk(exp),
        nameAppearsAsStringLiteral: ctx.stringLiteralSet.has(exp),
        onlyConsumedByTestsOrStories: isOnlyConsumedByTestsOrStories(ctx, `${c.id}::${exp}`),
        isRootLike: false,
      };

      const evidence = evaluateEvidence(input);
      const classification = classifyFromScore(evidence);
      if (classification.classification === "Safe to Remove") {
        classification.classification = "Likely Unused";
        classification.safetyBadge = "⚠️ Likely unused — review";
        classification.safety = "review";
      }
      if (classification.safety === "review" || classification.safety === "uncertain") {
        findings.push(buildFinding({
          id: `exp-${c.id}-${exp}`,
          name: exp,
          category: "unusedExports",
          categoryLabel: "Unused Export",
          file: c.file,
          line: meta.line || 1,
          references: input.directIncoming,
          recommendation: "No matching import found for this named export. Named exports are a public surface — confirm no external package/app consumes it before removing.",
        }, evidence, classification));
      }
    }
  }

  return findings;
}

function analyzeFiles(ctx) {
  const findings = [];

  for (const f of ctx.files) {
    const pathInfo = classifyFilePath(f.file);
    if (pathInfo.isEntry || pathInfo.isConfig || pathInfo.isTypeDecl) continue;

    const input = buildEvidenceInputForNode(ctx, f);
    if (input.reachable) continue; // Reachable files are in active production use

    const evidence = evaluateEvidence(input);
    if (evidence.hardException) continue;

    if (pathInfo.isTest || pathInfo.isStory) continue;

    const isDocFile = f.file?.endsWith(".md") || pathInfo.isMarkdown;

    const classification = classifyFromScore(evidence);
    if (classification.safety === "safe" || classification.safety === "review") {
      findings.push(buildFinding({
        id: `file-${f.id}`,
        name: f.file?.split("/").pop() || f.name,
        category: isDocFile ? "documentationFiles" : "unusedFiles",
        categoryLabel: isDocFile ? "Documentation File" : "Unused File",
        file: f.file,
        line: 1,
        references: input.directIncoming,
        recommendation: isDocFile
          ? "Documentation Markdown file (.md) — kept for project reference. Review if obsolete before removing."
          : classification.classification === "Safe to Remove"
          ? "File is unreachable from every known entry point, route, and provider tree, and carries no dynamic-loading markers."
          : "File appears disconnected from the import graph but carries some risk signal — review before deleting.",
        nodeId: f.id,
      }, evidence, classification));
    }
  }

  return findings;
}

function analyzeOrphanModules(ctx) {
  const findings = [];
  const folderMap = new Map();

  for (const f of ctx.files) {
    const pathInfo = classifyFilePath(f.file);
    if (pathInfo.isEntry || !f.file) continue;
    const parts = f.file.split("/");
    if (parts.length <= 2) continue;
    parts.pop();
    const folder = parts.join("/");
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder).push(f);
  }

  for (const [folderPath, folderFiles] of folderMap.entries()) {
    if (folderFiles.length < 2) continue;

    // RULE FIX: Check reachability of file nodes AND associated symbol/component nodes
    const anyReachable = folderFiles.some(f => {
      if (ctx.reachableSet.has(f.id)) return true;
      // Also check any component nodes associated with this file
      return ctx.nodes.some(n => n.file === f.file && ctx.reachableSet.has(n.id));
    });
    if (anyReachable) continue;

    // RULE FIX: Check incoming edges across ALL structural edge types (including RE_EXPORTS & EXPORTS)
    const hasExternalImport = folderFiles.some(f => {
      const allImporters = ctx.combinedIncoming.get(f.id) || [];
      // Also include importers of component/symbol nodes declared in this file
      const symbolImporters = ctx.nodes
        .filter(n => n.file === f.file)
        .flatMap(n => ctx.combinedIncoming.get(n.id) || []);
      
      const combined = [...allImporters, ...symbolImporters];

      return combined.some(impId => {
        const impNode = ctx.nodesById.get(impId);
        return impNode && !impNode.file?.startsWith(folderPath);
      });
    });

    if (hasExternalImport) continue;

    const anyDynamicRisk = folderFiles.some(f => ctx.dynamicRiskIds.has(f.id) || hasDynamicNameRisk(f.name));

    const evidence = {
      score: anyDynamicRisk ? 45 : 82,
      signals: [
        `Group of ${folderFiles.length} files in '${folderPath}' has no reachable path from any entry point and no external importer.`,
        ...(anyDynamicRisk ? ["At least one file in the folder carries a dynamic-loading/registry naming pattern — treated conservatively."] : []),
      ],
      hardException: false,
    };
    const classification = classifyFromScore(evidence);
    if (classification.classification === "Safe to Remove") {
      classification.classification = "Needs Review";
      classification.safety = "review";
      classification.safetyBadge = "⚠️ Needs review";
    }

    findings.push(buildFinding({
      id: `module-${folderPath}`,
      name: `${folderPath.split("/").pop()}/ (${folderFiles.length} files)`,
      category: "orphanModules",
      categoryLabel: "Orphan Module Cluster",
      file: folderPath,
      line: 1,
      references: 0,
      recommendation: "Review the entire module folder as a unit — no reachable path or external import was found for any file in it.",
    }, evidence, classification));
  }

  return findings;
}

function analyzeVariablesAndImports(ctx) {
  const findings = [];

  for (const c of ctx.components) {
    const meta = c.metadata || {};

    (meta.unusedImports || []).forEach((imp, idx) => {
      const importName = typeof imp === "string" ? imp : imp?.name;
      const isSideEffectImport = typeof imp === "object" && imp?.sideEffectOnly;
      if (!importName || isSideEffectImport) return;

      findings.push({
        id: `imp-${c.id}-${idx}`,
        name: importName,
        category: "unusedImports",
        categoryLabel: "Unused Import",
        file: c.file,
        line: (typeof imp === "object" && imp.line) || meta.line || 1,
        references: 0,
        confidence: 96,
        confidenceLabel: "96% Confidence",
        safety: "safe",
        safetyLabel: "Safe to Remove",
        safetyBadge: "✅ Safe to remove",
        reason: "Import binding is declared but never referenced anywhere in this file's AST (verified at parse time, not by graph traversal).",
        recommendation: "Remove the unused import binding.",
        evidence: ["AST-level: no reference to this binding found within its own file."],
      });
    });

    (meta.unusedVars || []).forEach((varEntry, idx) => {
      const varName = typeof varEntry === "string" ? varEntry : varEntry?.name;
      const isDestructuredProp = typeof varEntry === "object" && varEntry?.isDestructuredProp;
      if (!varName) return;

      const confidence = isDestructuredProp ? 82 : 94;
      const safety = confidence >= 90 ? "safe" : "review";

      findings.push({
        id: `var-${c.id}-${idx}`,
        name: varName,
        category: "unusedVariables",
        categoryLabel: "Unused Variable",
        file: c.file,
        line: (typeof varEntry === "object" && varEntry.line) || meta.line || 1,
        references: 0,
        confidence,
        confidenceLabel: `${confidence}% Confidence`,
        safety,
        safetyLabel: safety === "safe" ? "Safe to Remove" : "Needs Review",
        safetyBadge: safety === "safe" ? "✅ Safe to remove" : "⚠️ Needs review",
        reason: isDestructuredProp
          ? "Destructured prop/variable never read directly — verify it isn't consumed via a rest spread (`{...rest}`) before removing."
          : "Variable declared but never read, called, or passed as a prop anywhere in this file.",
        recommendation: "Remove the unused declaration.",
        evidence: [isDestructuredProp
          ? "AST-level: binding unread, but object is spread elsewhere in scope — confirm rest-spread does not depend on it."
          : "AST-level: binding never read within its own file."],
      });
    });
  }

  return findings;
}

function analyzeDuplicateUtilities(ctx) {
  const findings = [];
  const utilNodes = ctx.components.filter(c => classifyFilePath(c.file).isUtil);

  const utilNamesMap = new Map();
  for (const u of utilNodes) {
    const normalized = u.name.toLowerCase().replace(/string|date|helper|util/g, "");
    if (normalized.length <= 2) continue;
    if (!utilNamesMap.has(normalized)) utilNamesMap.set(normalized, []);
    utilNamesMap.get(normalized).push(u);
  }

  for (const [norm, group] of utilNamesMap.entries()) {
    if (group.length <= 1) continue;

    findings.push({
      id: `dup-${norm}`,
      name: `${group.map(g => g.name).join(", ")}`,
      category: "duplicateUtilities",
      categoryLabel: "Duplicate Utility Candidate",
      file: group[0].file,
      line: 1,
      references: group.length,
      confidence: 55,
      confidenceLabel: "55% Confidence",
      safety: "uncertain",
      safetyLabel: "Cannot Determine",
      safetyBadge: "❌ Cannot determine safely",
      reason: `${group.length} utilities (${group.map(g => g.name).join(", ")}) share a normalized name pattern ("${norm}") and may implement overlapping logic.`,
      recommendation: "Inspect each implementation manually; consolidate only after confirming behavioral equivalence. Do not delete either without reviewing call sites.",
      evidence: ["Name-similarity heuristic only — no behavioral or usage comparison was performed."],
    });
  }

  return findings;
}

function computeLegacySummaries(ctx) {
  const unusedRoutes = ctx.routes.filter(r => {
    if (ctx.reachableSet.has(r.id)) return false;
    return countIncoming(ctx.reverseByType.ROUTE_PARENT, r.id) === 0;
  });

  const unusedContexts = ctx.contexts.filter(c => {
    if (ctx.reachableSet.has(c.id)) return false;
    return countIncoming(ctx.reverseByType.STATE_CONSUMER, c.id) === 0 &&
      countIncoming(ctx.reverseByType.USES_CONTEXT, c.id) === 0;
  });

  const unusedApiServices = ctx.apiEndpoints.filter(ep => {
    if (ctx.reachableSet.has(ep.id)) return false;
    return countIncoming(ctx.reverseByType.USES_API, ep.id) === 0;
  });

  return { unusedRoutes, unusedContexts, unusedApiServices };
}

function brief(node) {
  return { id: node.id, name: node.name, file: node.file };
}

export function analyze(graph) {
  const safeGraph = graph && typeof graph === "object" ? graph : { nodes: [], edges: [] };
  const ctx = buildProjectContext(safeGraph);

  const findings = [
    ...analyzeComponents(ctx),
    ...analyzeHooks(ctx),
    ...analyzeFunctionsAndExports(ctx),
    ...analyzeFiles(ctx),
    ...analyzeOrphanModules(ctx),
    ...analyzeVariablesAndImports(ctx),
    ...analyzeDuplicateUtilities(ctx),
  ];

  const safeToRemoveCount = findings.filter(f => f.safety === "safe").length;
  const reviewRequiredCount = findings.filter(f => f.safety === "review").length;
  const uncertainCount = findings.filter(f => f.safety === "uncertain" || f.safety === "runtime-managed").length;

  const hygieneScore = Math.max(
    0,
    100 - (safeToRemoveCount * 2 + reviewRequiredCount * 3 + uncertainCount * 1)
  );

  const { unusedRoutes, unusedContexts, unusedApiServices } = computeLegacySummaries(ctx);

  const unusedComponentsList = findings
    .filter(f => f.category === "unusedComponents")
    .map(f => ({ id: f.nodeId, name: f.name, file: f.file }));
  const unusedHooksList = findings
    .filter(f => f.category === "unusedHooks")
    .map(f => f.name.replace(/\(\)$/, ""));
  const orphanFilesList = findings
    .filter(f => f.category === "unusedFiles")
    .map(f => ({ id: f.nodeId, name: f.name, file: f.file }));

  return {
    score: hygieneScore,
    totalFindings: findings.length,
    safeToRemoveCount,
    reviewRequiredCount,
    uncertainCount,
    findings,
    unusedComponents: unusedComponentsList,
    unusedHooks: unusedHooksList,
    unusedRoutes: unusedRoutes.map(brief),
    unusedContexts: unusedContexts.map(brief),
    unusedApiServices: unusedApiServices.map(brief),
    orphanFiles: orphanFilesList,
  };
}