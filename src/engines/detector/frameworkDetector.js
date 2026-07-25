import { defaultPluginRegistry } from "../plugins/pluginRegistry.js";

/**
 * Framework Detector
 *
 * Scans raw files and package dependencies, returning detected framework plugins.
 *
 * @param {Array<{name: string, path: string, content: string}>} rawFiles
 * @param {PluginRegistry} [registry=defaultPluginRegistry]
 * @returns {object} detectionResult
 */
export function detectFrameworks(rawFiles = [], registry = defaultPluginRegistry) {
  let hasReact = false;
  let hasNext = false;
  let hasRedux = false;
  let hasRouter = false;
  let hasExpress = false;
  let hasNest = false;
  let hasTailwind = false;
  let hasTypeScript = false;

  const pkgFile = rawFiles.find((f) => f.name === "package.json" || f.path === "package.json");
  if (pkgFile && pkgFile.content) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (deps.react) hasReact = true;
      if (deps.next) hasNext = true;
      if (deps["@reduxjs/toolkit"] || deps.redux) hasRedux = true;
      if (deps["react-router-dom"] || deps["react-router"]) hasRouter = true;
      if (deps.express) hasExpress = true;
      if (deps["@nestjs/core"]) hasNest = true;
      if (deps.tailwindcss) hasTailwind = true;
      if (deps.typescript) hasTypeScript = true;
    } catch {
      // Ignore JSON parse errors defensively
    }
  }

  rawFiles.forEach((f) => {
    const p = (f.path || "").replace(/\\/g, "/");
    if (p.endsWith(".tsx") || p.endsWith(".ts")) hasTypeScript = true;
    if (/(^|\/)pages\//.test(p) || /(^|\/)app\//.test(p)) hasNext = true;
    if (/(^|\/)components\//.test(p) || /\.jsx$/.test(p)) hasReact = true;
    if (/(^|\/)(redux|slices?|stores?)\//.test(p)) hasRedux = true;
  });

  const detectionState = {
    hasReact,
    hasNext,
    hasRedux,
    hasRouter,
    hasExpress,
    hasNest,
    hasTailwind,
    hasTypeScript,
    primaryFramework: hasNext ? "Next.js" : hasReact ? "React" : hasExpress ? "Express" : hasNest ? "NestJS" : "JavaScript",
  };

  const activePlugins = registry.detectActivePlugins(rawFiles, detectionState);

  return {
    ...detectionState,
    activePlugins,
  };
}
