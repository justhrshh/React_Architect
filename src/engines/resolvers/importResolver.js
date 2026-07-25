import { resolveAlias } from "./aliasResolver.js";

const RESOLVABLE_EXTENSIONS = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const INDEX_BASENAMES = ["index.js", "index.jsx", "index.ts", "index.tsx", "index.mjs"];

export function buildFileIndex(filePaths) {
  const index = new Map();
  filePaths.forEach((p) => {
    const noExt = p.replace(/\.[^/.]+$/, "");
    if (!index.has(noExt)) index.set(noExt, p);
    index.set(p, p);
  });
  return index;
}

export function resolveModulePath(currentFile, importSource, fileIndex, aliasMap) {
  if (!importSource) return null;

  let candidatePath;

  if (importSource.startsWith(".")) {
    candidatePath = joinRelative(currentFile, importSource);
  } else {
    const aliasTarget = resolveAlias(importSource, aliasMap);
    if (aliasTarget === null) return null;
    candidatePath = aliasTarget;
  }

  for (const ext of RESOLVABLE_EXTENSIONS) {
    const attempt = `${candidatePath}${ext}`;
    if (fileIndex.has(attempt)) return fileIndex.get(attempt);
  }

  for (const indexFile of INDEX_BASENAMES) {
    const attempt = normalizeSlashes(`${candidatePath}/${indexFile}`);
    if (fileIndex.has(attempt)) return fileIndex.get(attempt);
    const attemptNoExt = attempt.replace(/\.[^/.]+$/, "");
    if (fileIndex.has(attemptNoExt)) return fileIndex.get(attemptNoExt);
  }

  return null;
}

export function resolveComponentDeclaration(filePath, symbolName, fileMap, fileIndex, aliasMap, visited = new Set()) {
  const visitKey = `${filePath}::${symbolName}`;
  if (visited.has(visitKey) || visited.size > 12) return null;
  visited.add(visitKey);

  const fileObj = fileMap.get(filePath);
  if (!fileObj || !fileObj.summary) return null;

  const isDefaultLookup = symbolName === "default";

  const localComponent = fileObj.summary.components.find((c) =>
    isDefaultLookup ? c.isDefaultExport : c.name === symbolName
  );
  if (localComponent) {
    return { file: filePath, name: localComponent.name };
  }

  const exportEntries = fileObj.summary.exports || [];
  const reExport = exportEntries.find((exp) => {
    if (!exp.reExportFrom) return false;
    if (exp.exportedName === "*") return true;
    if (isDefaultLookup) return exp.isDefault;
    return exp.exportedName === symbolName;
  });

  if (reExport) {
    const nextPath = resolveModulePath(filePath, reExport.reExportFrom, fileIndex, aliasMap);
    if (nextPath) {
      const nextSymbol = reExport.exportedName === "*" ? symbolName : reExport.originalName || symbolName;
      return resolveComponentDeclaration(nextPath, nextSymbol, fileMap, fileIndex, aliasMap, visited);
    }
  }

  return null;
}

function joinRelative(currentFile, importPath) {
  const parts = currentFile.split("/");
  parts.pop();

  importPath.split("/").forEach((segment) => {
    if (segment === "." || segment === "") return;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  });

  return parts.join("/");
}

function normalizeSlashes(p) {
  return p.replace(/\/+/g, "/");
}
