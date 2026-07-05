import JSZip from "jszip";

const SUPPORTED_EXTENSIONS = new Set(["js", "jsx", "ts", "tsx", "md"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git", ".next", "out"]);
const IGNORE_DIR_SEGMENTS = ["node_modules/", "dist/", "build/", "coverage/", ".git/", ".next/", "out/"];

// Config files are scanned and their content is made available to the
// alias resolver and file-based route extractor, but they are intentionally
// excluded from Knowledge Graph node creation (a project's tsconfig.json
// isn't part of its component architecture). See buildKnowledgeGraph.js,
// which filters on `isConfig`.
const CONFIG_FILENAME_PATTERN = /^(tsconfig(\.\w+)?\.json|jsconfig(\.\w+)?\.json|vite\.config\.(js|ts|mjs|cjs)|package\.json)$/;

// Defensive upper bound so a single accidentally-included minified vendor
// file or lockfile-like artifact can't blow up parse time or memory. Real
// hand-written source files are essentially never this large.
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Recursively scans a FileSystemDirectoryHandle for supported JS/TS/MD files
 * plus known config files used for path-alias resolution.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} path - current path prefix
 * @returns {Promise<Array<{name: string, path: string, content: string, isConfig?: boolean}>>}
 */
export async function scanDirectory(dirHandle, path = "") {
  const files = [];

  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;

    if (entry.kind === "file") {
      const ext = entry.name.split(".").pop().toLowerCase();
      const isConfig = CONFIG_FILENAME_PATTERN.test(entry.name);

      if (SUPPORTED_EXTENSIONS.has(ext) || isConfig) {
        try {
          const file = await entry.getFile();
          if (file.size > MAX_FILE_SIZE_BYTES) {
            console.warn(`Skipping oversized file (${(file.size / 1024).toFixed(0)}KB): ${entryPath}`);
            continue;
          }
          const content = await file.text();
          files.push({ name: entry.name, path: entryPath, content, isConfig: isConfig || undefined });
        } catch (err) {
          console.warn(`Failed to read file: ${entryPath}`, err);
        }
      }
    } else if (entry.kind === "directory") {
      if (!IGNORE_DIRS.has(entry.name)) {
        try {
          const subFiles = await scanDirectory(entry, entryPath);
          files.push(...subFiles);
        } catch (err) {
          // A single unreadable/permission-denied subdirectory shouldn't abort the whole scan.
          console.warn(`Failed to scan directory: ${entryPath}`, err);
        }
      }
    }
  }
  return files;
}

/**
 * Scans a ZIP File object for supported JS/TS/MD files plus known config files.
 *
 * @param {File} zipFile
 * @returns {Promise<Array<{name: string, path: string, content: string, isConfig?: boolean}>>}
 */
export async function scanZip(zipFile) {
  const files = [];

  let zip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch (err) {
    console.error("Failed to parse ZIP file", err);
    throw new Error(`The uploaded ZIP archive could not be read (${err.message}). It may be corrupted or not a valid ZIP file.`, { cause: err });
  }

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const shouldIgnore = IGNORE_DIR_SEGMENTS.some((ignored) => relativePath.includes(ignored));
    if (shouldIgnore) continue;

    const fileName = zipEntry.name.split("/").pop();
    const ext = relativePath.split(".").pop().toLowerCase();
    const isConfig = CONFIG_FILENAME_PATTERN.test(fileName);

    if (SUPPORTED_EXTENSIONS.has(ext) || isConfig) {
      try {
        const content = await zipEntry.async("string");
        if (content.length > MAX_FILE_SIZE_BYTES) {
          console.warn(`Skipping oversized file (${(content.length / 1024).toFixed(0)}KB): ${relativePath}`);
          continue;
        }
        files.push({ name: fileName, path: relativePath, content, isConfig: isConfig || undefined });
      } catch (err) {
        // A single corrupted entry inside an otherwise-valid ZIP shouldn't abort the whole import.
        console.warn(`Failed to read ZIP entry: ${relativePath}`, err);
      }
    }
  }

  return files;
}
