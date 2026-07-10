import JSZip from "jszip";

/**
 * projectDetector.js
 *
 * Extracts structured project metadata from a directory handle, ZIP file,
 * or a raw package.json object.
 *
 * This module is the foundation for:
 *   Sprint 5  — React Flow visualisation (selectedProject drives the graph)
 *   Sprint 6  — AST parsing (detected paths feed the parser)
 *   Sprint 10 — AI analysis (detected stack informs the prompt)
 *
 * Detection is intentionally additive — every new sprint can add more
 * signals here without touching the import UI.
 */

// ---------------------------------------------------------------------------
// Signature tables
// ---------------------------------------------------------------------------

/** Maps a package name → display framework name */
const FRAMEWORK_SIGNATURES = [
  ["next",                "Next.js"],
  ["@remix-run/react",   "Remix"],
  ["remix",              "Remix"],
  ["gatsby",             "Gatsby"],
  ["astro",              "Astro"],
  ["expo",               "Expo"],
  ["react-native",       "React Native"],
  ["react-scripts",      "Create React App"],
];

/** Maps a package name → display build-tool name */
const BUILD_TOOL_SIGNATURES = [
  ["@vitejs/plugin-react",  "Vite"],
  ["@vitejs/plugin-react-swc", "Vite"],
  ["vite",                  "Vite"],
  ["@rspack/core",          "Rspack"],
  ["webpack",               "Webpack"],
  ["parcel",                "Parcel"],
  ["esbuild",               "esbuild"],
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a folder selected via the File System Access API and extracts metadata.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<DetectedProject>}
 */
export async function detectFromDirectoryHandle(dirHandle) {
  let pkg = null;

  try {
    const fileHandle = await dirHandle.getFileHandle("package.json");
    const file = await fileHandle.getFile();
    const text = await file.text();
    pkg = JSON.parse(text);
  } catch {
    // No package.json — fall back to folder name
  }

  const detected = pkg ? detectFromPackageJson(pkg) : fallback(dirHandle.name);

  return {
    ...detected,
    importMethod: "folder",
    folderName: dirHandle.name,
  };
}

/**
 * Extracts project metadata from a ZIP File object.
 * Reads the ZIP, locates package.json (either at root or inside a folder),
 * and parses it to retrieve accurate project metadata.
 *
 * @param {File} zipFile
 * @returns {Promise<DetectedProject>}
 */
export async function detectFromZip(zipFile) {
  const baseName = zipFile.name.replace(/\.zip$/i, "");
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // Look for package.json in the zip
    let pkgJsonFile = null;
    let pkgJsonPath = "";
    
    // Find the shallowest package.json
    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir && path.match(/(^|\/)package\.json$/)) {
        if (!pkgJsonFile || path.split('/').length < pkgJsonPath.split('/').length) {
          pkgJsonFile = file;
          pkgJsonPath = path;
        }
      }
    }

    if (pkgJsonFile) {
      const text = await pkgJsonFile.async("string");
      const pkg = JSON.parse(text);
      const detected = detectFromPackageJson(pkg);
      
      return {
        ...detected,
        importMethod: "zip",
        folderName: baseName,
        _zipParsePending: true, // consumed by Sprint 6
      };
    }
  } catch (err) {
    console.error("Failed to parse ZIP or package.json:", err);
  }

  // Fallback if no valid package.json was found
  return {
    ...fallback(baseName),
    importMethod: "zip",
    folderName: baseName,
    _zipParsePending: true, // consumed by Sprint 6
  };
}

/**
 * Pure function — derives metadata from a parsed package.json object.
 * Safe to call from tests, workers, or server contexts.
 *
 * @param {object} pkg  - parsed package.json
 * @returns {DetectedProject}
 */
export function detectFromPackageJson(pkg) {
  const all = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  // Framework
  let framework = "React";
  for (const [dep, label] of FRAMEWORK_SIGNATURES) {
    if (dep in all) {
      framework = label;
      break;
    }
  }

  // Build tool
  let buildTool = null;
  for (const [dep, label] of BUILD_TOOL_SIGNATURES) {
    if (dep in all) {
      buildTool = label;
      break;
    }
  }

  // React version — strip semver range operators
  const reactVersion = all["react"]
    ? all["react"].replace(/^[\^~>=<*]+/, "").split(" ")[0]
    : null;

  return {
    name:           formatName(pkg.name ?? ""),
    packageName:    pkg.name ?? null,
    description:    pkg.description ?? null,
    packageVersion: pkg.version ?? null,
    framework,
    buildTool,
    reactVersion,
    hasTypeScript:  "typescript" in all || !!(pkg.name ?? "").endsWith("-ts"),
    hasTailwind:    "tailwindcss" in all,
    hasRedux:       "@reduxjs/toolkit" in all || "redux" in all,
    hasRouter:      "react-router-dom" in all || "react-router" in all,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Minimal metadata object when no package.json is available */
function fallback(rawName) {
  return {
    name:           formatName(rawName) || "Unnamed Project",
    packageName:    null,
    description:    null,
    packageVersion: null,
    framework:      "React",
    buildTool:      null,
    reactVersion:   null,
    hasTypeScript:  false,
    hasTailwind:    false,
    hasRedux:       false,
    hasRouter:      false,
  };
}

/**
 * Converts a package/folder name to a human-readable title.
 * "@scope/my-cool-app" → "My Cool App"
 */
function formatName(raw) {
  return raw
    .replace(/^@[^/]+\//, "")        // strip npm scope
    .replace(/[-_./]/g, " ")          // separators → spaces
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // title-case
}

// ---------------------------------------------------------------------------
// JSDoc typedef (IDE only — not runtime)
// ---------------------------------------------------------------------------
/**
 * @typedef {object} DetectedProject
 * @property {string}       name
 * @property {string|null}  packageName
 * @property {string|null}  description
 * @property {string|null}  packageVersion
 * @property {string}       framework
 * @property {string|null}  buildTool
 * @property {string|null}  reactVersion
 * @property {boolean}      hasTypeScript
 * @property {boolean}      hasTailwind
 * @property {boolean}      hasRedux
 * @property {boolean}      hasRouter
 * @property {'folder'|'zip'} importMethod
 * @property {string}       folderName
 */
