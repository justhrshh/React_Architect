/**
 * projectClassifier.js
 *
 * Determines the project type (frontend / backend / fullstack / library / monorepo / unknown)
 * from a set of parsed files and optional package.json content.
 *
 * Classification is signal-based: each detected signal contributes a weight to a category
 * score. The category with the highest score wins. Confidence is normalized to [0, 1].
 *
 * Called once during buildKnowledgeGraph and stored in graph.project.classification.
 */

/**
 * @typedef {"frontend"|"backend"|"fullstack"|"library"|"monorepo"|"unknown"} ProjectType
 */

/**
 * @typedef {{ type: ProjectType, confidence: number, signals: Array<{signal: string, weight: number, detected: boolean}> }} Classification
 */

const SIGNALS = [
  // ── Frontend signals ───────────────────────────────────────────────────────
  { id: "pkg_react",         category: "frontend", weight: 3,  test: ({ pkg }) => hasDep(pkg, "react") },
  { id: "pkg_react_dom",     category: "frontend", weight: 3,  test: ({ pkg }) => hasDep(pkg, "react-dom") },
  { id: "jsx_syntax",        category: "frontend", weight: 3,  test: ({ files }) => files.some(f => /\.[jt]sx$/.test(f.path)) },
  { id: "react_import",      category: "frontend", weight: 2,  test: ({ files }) => files.some(f => contentIncludes(f, "from 'react'") || contentIncludes(f, 'from "react"')) },
  { id: "react_dom_render",  category: "frontend", weight: 4,  test: ({ files }) => files.some(f => contentIncludes(f, "createRoot") || contentIncludes(f, "ReactDOM.render")) },
  { id: "vite_config",       category: "frontend", weight: 2,  test: ({ files }) => files.some(f => /vite\.config\.[jt]s/.test(f.path)) },
  { id: "cra_config",        category: "frontend", weight: 2,  test: ({ files }) => files.some(f => /react-scripts/.test(f.content || "")) },

  // ── Backend signals ────────────────────────────────────────────────────────
  { id: "express_import",    category: "backend",  weight: 4,  test: ({ files }) => files.some(f => contentIncludes(f, "from 'express'") || contentIncludes(f, "require('express')") || contentIncludes(f, 'require("express")') || contentIncludes(f, 'from "express"')) },
  { id: "app_listen",        category: "backend",  weight: 5,  test: ({ files }) => files.some(f => contentIncludes(f, "app.listen(") || contentIncludes(f, "server.listen(")) },
  { id: "nestjs_import",     category: "backend",  weight: 4,  test: ({ files }) => files.some(f => contentIncludes(f, "@nestjs/core") || contentIncludes(f, "@nestjs/common")) },
  { id: "fastify_import",    category: "backend",  weight: 4,  test: ({ files }) => files.some(f => contentIncludes(f, "from 'fastify'") || contentIncludes(f, "require('fastify')") || contentIncludes(f, 'require("fastify")')) },
  { id: "koa_import",        category: "backend",  weight: 4,  test: ({ files }) => files.some(f => contentIncludes(f, "from 'koa'") || contentIncludes(f, "require('koa')")) },
  { id: "pkg_express",       category: "backend",  weight: 3,  test: ({ pkg }) => hasDep(pkg, "express") },
  { id: "pkg_nestjs",        category: "backend",  weight: 3,  test: ({ pkg }) => hasDep(pkg, "@nestjs/core") },
  { id: "pkg_fastify",       category: "backend",  weight: 3,  test: ({ pkg }) => hasDep(pkg, "fastify") },
  { id: "server_file",       category: "backend",  weight: 2,  test: ({ files }) => files.some(f => /\/(server|index)\.[jt]s$/.test(f.path) && !f.path.includes("src/") && !f.path.includes("app/")) },

  // ── Full-stack signals (additive with frontend + backend) ──────────────────
  { id: "nextjs_pkg",        category: "fullstack", weight: 3, test: ({ pkg }) => hasDep(pkg, "next") },
  { id: "nextjs_config",     category: "fullstack", weight: 3, test: ({ files }) => files.some(f => /next\.config\.[jt]sx?$/.test(f.path) || /next\.config\.mjs$/.test(f.path)) },
  { id: "nextjs_api_pages",  category: "fullstack", weight: 4, test: ({ files }) => files.some(f => /\/pages\/api\//.test(f.path)) },
  { id: "nextjs_app_api",    category: "fullstack", weight: 4, test: ({ files }) => files.some(f => /\/app\/.*\/route\.[jt]sx?$/.test(f.path)) },
  { id: "remix_pkg",         category: "fullstack", weight: 4, test: ({ pkg }) => hasDep(pkg, "@remix-run/react") || hasDep(pkg, "@remix-run/node") },

  // ── Library signals ────────────────────────────────────────────────────────
  { id: "pkg_main_dist",     category: "library",  weight: 2,  test: ({ pkg }) => typeof pkg?.main === "string" && pkg.main.includes("dist/") },
  { id: "no_entry_point",    category: "library",  weight: 2,  test: ({ files }) => !files.some(f => /\/(main|index|App|server)\.[jt]sx?$/.test(f.path)) },
  { id: "pkg_peerDeps",      category: "library",  weight: 3,  test: ({ pkg }) => pkg && Object.keys(pkg.peerDependencies || {}).length > 0 },
  { id: "rollup_config",     category: "library",  weight: 2,  test: ({ files }) => files.some(f => /rollup\.config\./.test(f.path)) },

  // ── Monorepo signals ───────────────────────────────────────────────────────
  { id: "turbo_json",        category: "monorepo", weight: 5,  test: ({ files }) => files.some(f => /turbo\.json$/.test(f.path)) },
  { id: "nx_json",           category: "monorepo", weight: 5,  test: ({ files }) => files.some(f => /nx\.json$/.test(f.path)) },
  { id: "packages_dir",      category: "monorepo", weight: 3,  test: ({ files }) => files.filter(f => /\/packages\/[^/]+\/package\.json$/.test(f.path)).length >= 2 },
  { id: "workspaces_pkg",    category: "monorepo", weight: 4,  test: ({ pkg }) => Array.isArray(pkg?.workspaces) && pkg.workspaces.length > 0 },
  { id: "lerna_json",        category: "monorepo", weight: 4,  test: ({ files }) => files.some(f => /lerna\.json$/.test(f.path)) },
];

/**
 * Classify the project from parsed files and optional package.json.
 *
 * @param {Array<{name: string, path: string, content: string}>} files
 * @param {object|null} packageJson
 * @returns {Classification}
 */
export function classifyProject(files, packageJson = null) {
  const pkg = packageJson || extractPackageJson(files);
  const ctx = { files, pkg };

  const scores = { frontend: 0, backend: 0, fullstack: 0, library: 0, monorepo: 0 };
  const detectedSignals = [];

  for (const signal of SIGNALS) {
    let detected = false;
    try {
      detected = !!signal.test(ctx);
    } catch {
      detected = false;
    }
    detectedSignals.push({ signal: signal.id, weight: signal.weight, detected });
    if (detected) {
      scores[signal.category] = (scores[signal.category] || 0) + signal.weight;
    }
  }

  // Monorepo takes precedence if strongly signaled
  if (scores.monorepo >= 5) {
    return makeResult("monorepo", scores.monorepo, 10, detectedSignals);
  }

  // Fullstack: both frontend and backend signals present, or explicit fullstack signals
  const bothPresent = scores.frontend > 0 && scores.backend > 0;
  const fullstackScore = scores.fullstack + (bothPresent ? Math.min(scores.frontend, scores.backend) : 0);

  if (fullstackScore >= 4 && bothPresent) {
    return makeResult("fullstack", fullstackScore, 14, detectedSignals);
  }

  // Dominant between frontend and backend
  if (scores.frontend > 0 || scores.backend > 0) {
    if (scores.frontend >= scores.backend) {
      return makeResult("frontend", scores.frontend, 14, detectedSignals);
    } else {
      return makeResult("backend", scores.backend, 14, detectedSignals);
    }
  }

  // Library fallback
  if (scores.library >= 4) {
    return makeResult("library", scores.library, 8, detectedSignals);
  }

  return makeResult("unknown", 0, 1, detectedSignals);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeResult(type, score, maxScore, signals) {
  return {
    type,
    confidence: Math.min(1.0, score / maxScore),
    signals,
  };
}

function hasDep(pkg, name) {
  if (!pkg) return false;
  return !!(
    (pkg.dependencies && pkg.dependencies[name]) ||
    (pkg.devDependencies && pkg.devDependencies[name]) ||
    (pkg.peerDependencies && pkg.peerDependencies[name])
  );
}

function contentIncludes(file, substr) {
  return typeof file.content === "string" && file.content.includes(substr);
}

function extractPackageJson(files) {
  const pkgFile = files.find(f => /(?:^|\/)package\.json$/.test(f.path) && !/node_modules/.test(f.path));
  if (!pkgFile || !pkgFile.content) return null;
  try {
    return JSON.parse(pkgFile.content);
  } catch {
    return null;
  }
}
