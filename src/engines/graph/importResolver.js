import { resolveAlias } from "../parser/aliasResolver";

/**
 * importResolver.js
 *
 * Single source of truth for turning an import specifier written in source
 * code into an actual file path in the scanned project. This replaces three
 * near-duplicate ad-hoc implementations that previously lived inline in
 * buildKnowledgeGraph.js (one for child-component resolution, one for file
 * IMPORTS edges, one implicitly via componentMap fallback).
 *
 * Centralizing this also makes it cheap to do correctly, since resolution
 * now happens against a pre-built index (O(1) lookups) rather than looping
 * over every known file path for every import (previously O(files * imports)).
 */

const RESOLVABLE_EXTENSIONS = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const INDEX_BASENAMES = ["index.js", "index.jsx", "index.ts", "index.tsx", "index.mjs"];

/**
 * @param {Array<string>} filePaths - all known source file paths (already normalized to "/")
 * @returns {Map<string,string>} index - every "extension-less" and exact path variant maps to the real file path
 */
export function buildFileIndex(filePaths) {
  const index = new Map();
  filePaths.forEach((p) => {
    const noExt = p.replace(/\.[^/.]+$/, "");
    // Don't let a shorter accidental match win over an already-registered exact file.
    if (!index.has(noExt)) index.set(noExt, p);
    index.set(p, p);
  });
  return index;
}

/**
 * Resolves a relative or aliased import specifier to a concrete file path.
 *
 * @param {string} currentFile - path of the file containing the import
 * @param {string} importSource - the raw import specifier, e.g. "./Button" or "@/components/Button"
 * @param {Map<string,string>} fileIndex - from buildFileIndex()
 * @param {Map<string,string>} aliasMap - from aliasResolver.buildAliasMap()
 * @returns {string|null} resolved file path, or null if unresolvable (npm package, or genuinely missing file)
 */
export function resolveModulePath(currentFile, importSource, fileIndex, aliasMap) {
  if (!importSource) return null;

  let candidatePath;

  if (importSource.startsWith(".")) {
    candidatePath = joinRelative(currentFile, importSource);
  } else {
    const aliasTarget = resolveAlias(importSource, aliasMap);
    if (aliasTarget === null) return null; // external npm package - not our concern
    candidatePath = aliasTarget;
  }

  // 1. Direct file match, trying each known source extension.
  for (const ext of RESOLVABLE_EXTENSIONS) {
    const attempt = `${candidatePath}${ext}`;
    if (fileIndex.has(attempt)) return fileIndex.get(attempt);
  }

  // 2. Directory import -> resolve to an index file inside that directory.
  for (const indexFile of INDEX_BASENAMES) {
    const attempt = normalizeSlashes(`${candidatePath}/${indexFile}`);
    if (fileIndex.has(attempt)) return fileIndex.get(attempt);
    const attemptNoExt = attempt.replace(/\.[^/.]+$/, "");
    if (fileIndex.has(attemptNoExt)) return fileIndex.get(attemptNoExt);
  }

  return null;
}

/**
 * Given a file and a symbol imported from it (or "default"), determines the
 * *actual* declaring file/name - following barrel re-exports
 * (`export { Button } from './Button'`, `export * from './Button'`) up to a
 * shallow depth. This lets `import { Button } from '@/components'` resolve
 * all the way through `src/components/index.js` to `src/components/Button.jsx`.
 *
 * @param {string} filePath - file to start resolution from (e.g. a barrel index)
 * @param {string} symbolName - "default" or a named export
 * @param {Map<string,{summary:object}>} fileMap - path -> parsed file record
 * @param {Map<string,string>} fileIndex
 * @param {Map<string,string>} aliasMap
 * @param {Set<string>} [visited] - internal recursion guard against circular barrels
 * @returns {{file:string, name:string}|null}
 */
export function resolveComponentDeclaration(filePath, symbolName, fileMap, fileIndex, aliasMap, visited = new Set()) {
  const visitKey = `${filePath}::${symbolName}`;
  if (visited.has(visitKey) || visited.size > 12) return null; // guard against circular/deep barrel chains
  visited.add(visitKey);

  const fileObj = fileMap.get(filePath);
  if (!fileObj || !fileObj.summary) return null;

  const isDefaultLookup = symbolName === "default";

  // 1. Is the symbol declared directly in this file?
  const localComponent = fileObj.summary.components.find((c) =>
    isDefaultLookup ? c.isDefaultExport : c.name === symbolName
  );
  if (localComponent) {
    return { file: filePath, name: localComponent.name };
  }

  // 2. Is it a barrel re-export pointing somewhere else?
  const exportEntries = fileObj.summary.exports || [];
  const reExport = exportEntries.find((exp) => {
    if (!exp.reExportFrom) return false;
    if (exp.exportedName === "*") return true; // export * from './x' - could contain anything, worth following
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
  parts.pop(); // drop filename, keep directory

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
