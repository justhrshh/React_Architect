import { stripJsonComments } from "../parser/astUtils.js";

/**
 * Detects path aliases (e.g. "@/components" -> "src/components") from config files.
 *
 * @param {Array<{path: string, content: string}>} files
 * @returns {Map<string,string>} aliasMap
 */
const CONFIG_FILE_PATTERN = /(^|\/)(tsconfig|jsconfig)(\.\w+)?\.json$/;
const VITE_CONFIG_PATTERN = /(^|\/)vite\.config\.(js|ts|mjs|cjs)$/;

export function buildAliasMap(files) {
  const aliasMap = new Map();

  const tsconfig = files.find((f) => CONFIG_FILE_PATTERN.test(f.path));
  if (tsconfig) {
    try {
      applyTsconfigAliases(tsconfig.content, aliasMap);
    } catch (err) {
      console.warn(`aliasResolver: failed to parse ${tsconfig.path}: ${err.message}`);
    }
  }

  const viteConfig = files.find((f) => VITE_CONFIG_PATTERN.test(f.path));
  if (viteConfig) {
    try {
      applyViteAliases(viteConfig.content, aliasMap);
    } catch (err) {
      console.warn(`aliasResolver: failed to parse ${viteConfig.path}: ${err.message}`);
    }
  }

  if (!aliasMap.has("@")) {
    aliasMap.set("@", "src");
  }

  return aliasMap;
}

function applyTsconfigAliases(rawContent, aliasMap) {
  const clean = stripJsonComments(rawContent);
  const parsed = JSON.parse(clean);
  const compilerOptions = parsed.compilerOptions || {};
  const baseUrl = compilerOptions.baseUrl ? normalizeDir(compilerOptions.baseUrl) : "";
  const paths = compilerOptions.paths || {};

  Object.entries(paths).forEach(([key, targets]) => {
    if (!Array.isArray(targets) || targets.length === 0) return;
    const aliasKey = key.replace(/\/\*$/, "");
    const rawTarget = targets[0].replace(/\/\*$/, "");
    const resolvedTarget = baseUrl ? joinPaths(baseUrl, rawTarget) : normalizeDir(rawTarget);
    aliasMap.set(aliasKey, resolvedTarget);
  });
}

function applyViteAliases(rawContent, aliasMap) {
  const aliasEntryRegex =
    /(?:find\s*:\s*)?['"]([^'"]+)['"]\s*(?:,\s*replacement\s*:\s*|:\s*)(?:path\.(?:resolve|join)\([^)]*?['"]([^'"]+)['"]\s*\)|['"]([^'"]+)['"])/g;

  let match;
  while ((match = aliasEntryRegex.exec(rawContent)) !== null) {
    const key = match[1];
    const value = (match[2] || match[3] || "").replace(/^\.?\//, "");
    if (!key || !value || key.includes(" ") || value.includes(" ")) continue;
    if (!aliasMap.has(key)) {
      aliasMap.set(key, normalizeDir(value));
    }
  }
}

function normalizeDir(dir) {
  return dir.replace(/^\.\//, "").replace(/\/$/, "");
}

function joinPaths(...parts) {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

export function resolveAlias(importSource, aliasMap) {
  const sortedAliases = Array.from(aliasMap.entries()).sort((a, b) => b[0].length - a[0].length);

  for (const [alias, target] of sortedAliases) {
    if (importSource === alias) return target;
    if (importSource.startsWith(`${alias}/`)) {
      return `${target}${importSource.slice(alias.length)}`;
    }
  }
  return null;
}

export function isConfigFile(path) {
  return CONFIG_FILE_PATTERN.test(path) || VITE_CONFIG_PATTERN.test(path) || /(^|\/)package\.json$/.test(path);
}
