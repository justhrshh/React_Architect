import { stripJsonComments } from "./astUtils.js";

/**
 * aliasResolver.js
 *
 * Detects path aliases (e.g. "@/components" -> "src/components") from the
 * project's own config files, instead of hardcoding a single "@/ -> src/"
 * mapping. Real-world projects define aliases in tsconfig.json/jsconfig.json
 * (`compilerOptions.paths`) or vite.config.js (`resolve.alias`), and often
 * use more than one alias (e.g. "@components", "@lib", "@/*").
 *
 * This is intentionally best-effort: vite.config.js is parsed with a regex
 * rather than executed (we have no build-time environment), since aliases
 * are almost always simple string-to-path literals. If nothing is found,
 * we fall back to the previous behavior of assuming "@/ -> src/", which
 * covers the majority of Vite + React starter templates.
 */

const CONFIG_FILE_PATTERN = /(^|\/)(tsconfig|jsconfig)(\.\w+)?\.json$/;
const VITE_CONFIG_PATTERN = /(^|\/)vite\.config\.(js|ts|mjs|cjs)$/;

/**
 * @param {Array<{path: string, content: string}>} files - full scanned file list,
 *   including config files (tsconfig.json, vite.config.js, etc).
 * @returns {Map<string,string>} aliasMap - alias prefix (no trailing "/*") -> target dir
 */
export function buildAliasMap(files) {
  const aliasMap = new Map();

  const tsconfig = files.find((f) => CONFIG_FILE_PATTERN.test(f.path));
  if (tsconfig) {
    try {
      applyTsconfigAliases(tsconfig.content, aliasMap);
    } catch (err) {
      // Malformed tsconfig should never break the whole scan.
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

  // Sensible default for the very common Vite/CRA convention, only if
  // nothing more specific was already discovered.
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
  // Matches entries like:
  //   '@': path.resolve(__dirname, 'src')
  //   "@components": "/src/components"
  //   { find: '@', replacement: path.resolve(__dirname, './src') }
  const aliasEntryRegex =
    /(?:find\s*:\s*)?['"]([^'"]+)['"]\s*(?:,\s*replacement\s*:\s*|:\s*)(?:path\.(?:resolve|join)\([^)]*?['"]([^'"]+)['"]\s*\)|['"]([^'"]+)['"])/g;

  let match;
  while ((match = aliasEntryRegex.exec(rawContent)) !== null) {
    const key = match[1];
    const value = (match[2] || match[3] || "").replace(/^\.?\//, "");
    // Skip obvious false positives from unrelated string pairs in the file.
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

/**
 * Resolves an import specifier against the alias map. Longest alias match wins
 * (so "@components" is preferred over "@" when both are registered).
 *
 * @param {string} importSource
 * @param {Map<string,string>} aliasMap
 * @returns {string|null} resolved path (still needs extension/index resolution), or null if no alias matches
 */
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
