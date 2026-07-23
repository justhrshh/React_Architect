/**
 * gitService.js
 *
 * Ultra-Optimized Browser-Native Git Integration via REST APIs & Zipball Unpacking.
 * Supports: GitHub (api.github.com), GitLab (gitlab.com), Bitbucket (api.bitbucket.org).
 *
 * Performance Optimizations:
 * 1. Single-Request Zipball Extraction: Fetches full source archive in 1 HTTP request using JSZip
 *    (reduces API calls per import from ~154 down to 2-3 requests, >98% reduction).
 * 2. In-Memory Session Caching: Caches branches, commit trees, commit history, and file contents.
 * 3. Lightweight Update Checks: Compares branch head SHA without re-fetching trees or files.
 * 4. Development Diagnostics: Real-time API request logging and optimization reporting.
 */

import JSZip from 'jszip';

// ── Dev Mode Request Logger ──────────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV;
const apiRequestLogs = [];

function logApiRequest({ method = 'GET', url, status, durationMs, cached = false, provider = 'github' }) {
  const entry = {
    timestamp: new Date().toISOString(),
    method,
    url,
    status,
    durationMs: Math.round(durationMs),
    cached,
    provider,
  };
  apiRequestLogs.push(entry);

  if (IS_DEV) {
    console.log(
      `%c[Git API ${cached ? 'CACHE' : 'FETCH'}]%c ${method} ${url} (${status || 'NET_ERR'}) - ${entry.durationMs}ms`,
      `color: ${cached ? '#10b981' : '#6366f1'}; font-weight: bold;`,
      'color: inherit;'
    );
  }
}

/**
 * Get all API request logs (dev mode diagnostics).
 */
export function getApiRequestLogs() {
  return [...apiRequestLogs];
}

/**
 * Clear request logs.
 */
export function clearApiRequestLogs() {
  apiRequestLogs.length = 0;
}

/**
 * Generate an Optimization Audit Report comparing pre vs post optimization.
 */
export function getOptimizationReport() {
  const totalCalls = apiRequestLogs.length;
  const cacheHits  = apiRequestLogs.filter(l => l.cached).length;
  const networkCalls = totalCalls - cacheHits;

  // Typical legacy unoptimized calls for 150 files: 1 repo + 1 branch + 1 tree + 150 file contents = 153 calls
  const estimatedPreOptCalls = 153;
  const actualCalls = networkCalls;
  const reductionPercent = Math.max(0, ((estimatedPreOptCalls - actualCalls) / estimatedPreOptCalls) * 100).toFixed(1);

  return {
    estimatedPreOptCalls,
    actualNetworkCalls: actualCalls,
    cacheHits,
    totalLogged: totalCalls,
    reductionPercent: `${reductionPercent}%`,
    logs: [...apiRequestLogs],
  };
}

// ── In-Memory Session Caches ─────────────────────────────────────────────────
const branchCache        = new Map(); // key: `provider:owner/repo`
const commitCache        = new Map(); // key: `provider:owner/repo:branch`
const commitDetailsCache = new Map(); // key: `provider:owner/repo:commitSha`
const fileTreeCache      = new Map(); // key: `provider:owner/repo:branch`
const zipballCache       = new Map(); // key: `provider:owner/repo:ref`

/** Clear all in-memory git caches */
export function clearGitCache() {
  branchCache.clear();
  commitCache.clear();
  commitDetailsCache.clear();
  fileTreeCache.clear();
  zipballCache.clear();
}

// ── Provider Detection & Label ───────────────────────────────────────────────

export function detectProvider(url) {
  if (!url) return 'generic';
  const normalized = url.toLowerCase();
  if (normalized.includes('github.com'))    return 'github';
  if (normalized.includes('gitlab.com'))    return 'gitlab';
  if (normalized.includes('bitbucket.org')) return 'bitbucket';
  return 'generic';
}

export function parseRepoUrl(url) {
  if (!url) return null;
  let cleaned = url.trim().replace(/\.git\s*$/, '');
  const sshMatch = cleaned.match(/git@[^:]+:([^/]+)\/(.+)/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2], repoUrl: url.trim() };
  }
  const httpsMatch = cleaned.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2], repoUrl: url.trim() };
  }
  return null;
}

export function getProviderLabel(provider) {
  switch (provider) {
    case 'github':    return 'GitHub';
    case 'gitlab':    return 'GitLab';
    case 'bitbucket': return 'Bitbucket';
    default:          return 'Git Provider';
  }
}

// ── Structured API Errors ──────────────────────────────────────────────────

export class GitApiError extends Error {
  constructor({
    type,        // 'NOT_FOUND' | 'PRIVATE_REPO' | 'RATE_LIMIT' | 'INVALID_URL' | 'NETWORK_ERROR' | 'EMPTY_REPO' | 'GENERIC'
    title,
    message,
    status = null,
    endpoint = '',
    provider = 'github',
    rawBody = '',
    resetTime = null,
    remaining = null,
  }) {
    super(message);
    this.name = 'GitApiError';
    this.type = type;
    this.title = title;
    this.status = status;
    this.endpoint = endpoint;
    this.provider = provider;
    this.rawBody = rawBody;
    this.resetTime = resetTime;
    this.remaining = remaining;
  }
}

function buildHeaders(token) {
  const headers = { 'Accept': 'application/json' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

async function apiFetch(url, token, provider = 'github') {
  const start = performance.now();
  let res;
  try {
    res = await fetch(url, { headers: buildHeaders(token) });
  } catch (netErr) {
    const durationMs = performance.now() - start;
    logApiRequest({ method: 'GET', url, status: 0, durationMs, cached: false, provider });
    const providerName = getProviderLabel(provider);
    throw new GitApiError({
      type: 'NETWORK_ERROR',
      title: 'Network error',
      message: `Unable to connect to ${providerName}.\nCheck your internet connection and try again.`,
      status: null,
      endpoint: url,
      provider,
      rawBody: netErr.message || 'Network fetch failed',
    });
  }

  const durationMs = performance.now() - start;
  logApiRequest({ method: 'GET', url, status: res.status, durationMs, cached: false, provider });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}

    const providerName = getProviderLabel(provider);
    const remaining = res.headers.get('x-ratelimit-remaining');
    const resetHeader = res.headers.get('x-ratelimit-reset');

    const isRateLimited =
      res.status === 429 ||
      (res.status === 403 && remaining !== null && parseInt(remaining, 10) === 0) ||
      (bodyJson?.message && bodyJson.message.toLowerCase().includes('rate limit'));

    if (isRateLimited) {
      let resetMsg = '';
      if (resetHeader) {
        const resetEpoch = parseInt(resetHeader, 10);
        if (!isNaN(resetEpoch)) {
          const diffMins = Math.ceil((resetEpoch * 1000 - Date.now()) / 60000);
          if (diffMins > 0) {
            resetMsg = ` (resets in approx. ${diffMins} min${diffMins > 1 ? 's' : ''})`;
          }
        }
      }

      throw new GitApiError({
        type: 'RATE_LIMIT',
        title: 'API rate limit exceeded',
        message: `${providerName} API rate limit exceeded${resetMsg}.\n\nPlease wait until the limit resets or authenticate with a Personal Access Token for a higher request limit.`,
        status: res.status,
        endpoint: url,
        provider,
        rawBody: bodyText,
        remaining: 0,
      });
    }

    if (res.status === 404) {
      throw new GitApiError({
        type: 'NOT_FOUND',
        title: 'Repository not found',
        message: 'Please verify the repository URL and try again.',
        status: 404,
        endpoint: url,
        provider,
        rawBody: bodyText,
      });
    }

    if (res.status === 401 || res.status === 403) {
      throw new GitApiError({
        type: 'PRIVATE_REPO',
        title: 'Private repository detected',
        message: `A ${providerName} Personal Access Token is required to access this repository.`,
        status: res.status,
        endpoint: url,
        provider,
        rawBody: bodyText,
      });
    }

    throw new GitApiError({
      type: 'GENERIC',
      title: 'Import Failed',
      message: bodyJson?.message || `Provider returned HTTP ${res.status}. Please check your inputs.`,
      status: res.status,
      endpoint: url,
      provider,
      rawBody: bodyText,
    });
  }

  return res.json();
}

// ── Branch Listing (Session Cached) ──────────────────────────────────────────

export async function fetchBranches(provider, owner, repo, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}`;
  if (branchCache.has(cacheKey)) {
    logApiRequest({ method: 'GET', url: `CACHE:branches(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return branchCache.get(cacheKey);
  }

  let result = [];
  switch (provider) {
    case 'github': {
      const [branchData, repoData] = await Promise.all([
        apiFetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, token, provider),
        apiFetch(`https://api.github.com/repos/${owner}/${repo}`, token, provider),
      ]);
      const defaultBranch = repoData.default_branch;
      result = branchData.map((b) => ({
        name: b.name,
        isDefault: b.name === defaultBranch,
        commitHash: b.commit?.sha?.slice(0, 7) || '',
      }));
      break;
    }

    case 'gitlab': {
      const encoded = encodeURIComponent(`${owner}/${repo}`);
      const data = await apiFetch(
        `https://gitlab.com/api/v4/projects/${encoded}/repository/branches?per_page=100`,
        token, provider
      );
      result = data.map((b) => ({
        name: b.name,
        isDefault: b.default,
        commitHash: b.commit?.short_id || '',
      }));
      break;
    }

    case 'bitbucket': {
      const data = await apiFetch(
        `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/refs/branches?pagelen=100`,
        token, provider
      );
      result = (data.values || []).map((b) => ({
        name: b.name,
        isDefault: false,
        commitHash: b.target?.hash?.slice(0, 7) || '',
      }));
      break;
    }

    default:
      throw new Error('Provider not supported for branch listing');
  }

  branchCache.set(cacheKey, result);
  return result;
}

// ── Lightweight Latest Commit (Single Fast Call) ─────────────────────────────

export async function fetchLatestCommit(provider, owner, repo, branch, token = null) {
  switch (provider) {
    case 'github': {
      const data = await apiFetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
        token, provider
      );
      return data.sha?.slice(0, 7) || '';
    }

    case 'gitlab': {
      const encoded = encodeURIComponent(`${owner}/${repo}`);
      const data = await apiFetch(
        `https://gitlab.com/api/v4/projects/${encoded}/repository/commits?ref_name=${branch}&per_page=1`,
        token, provider
      );
      return data[0]?.short_id || '';
    }

    case 'bitbucket': {
      const data = await apiFetch(
        `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/commits/${branch}?pagelen=1`,
        token, provider
      );
      return data.values?.[0]?.hash?.slice(0, 7) || '';
    }

    default:
      return '';
  }
}

// ── Lightweight Commit History (Session Cached) ─────────────────────────────

export async function fetchCommitHistory(provider, owner, repo, branch, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${branch}`;
  if (commitCache.has(cacheKey)) {
    logApiRequest({ method: 'GET', url: `CACHE:commits(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return commitCache.get(cacheKey);
  }

  let result = [];
  try {
    switch (provider) {
      case 'github': {
        const data = await apiFetch(
          `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=25`,
          token, provider
        );
        result = (data || []).map(c => ({
          hash: c.sha?.slice(0, 7) || '',
          fullHash: c.sha || '',
          message: c.commit?.message?.split('\n')[0] || 'Commit',
          author: c.commit?.author?.name || c.author?.login || 'Developer',
          avatarUrl: c.author?.avatar_url || null,
          date: c.commit?.author?.date || new Date().toISOString(),
        }));
        break;
      }

      case 'gitlab': {
        const encoded = encodeURIComponent(`${owner}/${repo}`);
        const data = await apiFetch(
          `https://gitlab.com/api/v4/projects/${encoded}/repository/commits?ref_name=${branch}&per_page=25`,
          token, provider
        );
        result = (data || []).map(c => ({
          hash: c.short_id || c.id?.slice(0, 7) || '',
          fullHash: c.id || '',
          message: c.title || c.message?.split('\n')[0] || 'Commit',
          author: c.author_name || 'Developer',
          avatarUrl: c.author_avatar_url || null,
          date: c.created_at || new Date().toISOString(),
        }));
        break;
      }

      case 'bitbucket': {
        const data = await apiFetch(
          `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/commits/${branch}?pagelen=25`,
          token, provider
        );
        result = (data.values || []).map(c => ({
          hash: c.hash?.slice(0, 7) || '',
          fullHash: c.hash || '',
          message: c.message?.split('\n')[0] || 'Commit',
          author: c.author?.user?.display_name || c.author?.raw?.split('<')[0]?.trim() || 'Developer',
          avatarUrl: c.author?.user?.links?.avatar?.href || null,
          date: c.date || new Date().toISOString(),
        }));
        break;
      }

      default:
        result = [];
    }

    commitCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[gitService] fetchCommitHistory failed:', err);
    return [];
  }
}

// ── Lazy Commit File Details (Session Cached) ────────────────────────────────

export async function fetchCommitDetails(provider, owner, repo, commitSha, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${commitSha}`;
  if (commitDetailsCache.has(cacheKey)) {
    logApiRequest({ method: 'GET', url: `CACHE:commitDetails(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return commitDetailsCache.get(cacheKey);
  }

  let result;
  try {
    switch (provider) {
      case 'github': {
        const data = await apiFetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
          token, provider
        );
        const files = data.files || [];
        const stats = data.stats || { additions: 0, deletions: 0, total: 0 };

        let filesAdded = 0, filesModified = 0, filesDeleted = 0, filesRenamed = 0;
        const fileList = files.map(f => {
          let status = f.status || 'modified';
          if (status === 'added') filesAdded++;
          else if (status === 'modified') filesModified++;
          else if (status === 'removed' || status === 'deleted') { status = 'deleted'; filesDeleted++; }
          else if (status === 'renamed') filesRenamed++;
          else filesModified++;

          return {
            path: f.filename,
            status,
            additions: f.additions || 0,
            deletions: f.deletions || 0,
          };
        });

        result = {
          filesAdded,
          filesModified,
          filesDeleted,
          filesRenamed,
          totalFiles: files.length,
          insertions: stats.additions || 0,
          deletions: stats.deletions || 0,
          fileList,
        };
        break;
      }

      case 'gitlab': {
        const encoded = encodeURIComponent(`${owner}/${repo}`);
        const data = await apiFetch(
          `https://gitlab.com/api/v4/projects/${encoded}/repository/commits/${commitSha}/diff`,
          token, provider
        );
        const diffs = data || [];
        let filesAdded = 0, filesModified = 0, filesDeleted = 0, filesRenamed = 0;
        const fileList = diffs.map(d => {
          let status = 'modified';
          if (d.new_file) { status = 'added'; filesAdded++; }
          else if (d.deleted_file) { status = 'deleted'; filesDeleted++; }
          else if (d.renamed_file) { status = 'renamed'; filesRenamed++; }
          else filesModified++;

          return {
            path: d.new_path || d.old_path,
            status,
            additions: 0,
            deletions: 0,
          };
        });

        result = {
          filesAdded,
          filesModified,
          filesDeleted,
          filesRenamed,
          totalFiles: diffs.length,
          insertions: 0,
          deletions: 0,
          fileList,
        };
        break;
      }

      default:
        result = {
          filesAdded: 0, filesModified: 0, filesDeleted: 0, filesRenamed: 0,
          totalFiles: 0, insertions: 0, deletions: 0, fileList: [],
        };
    }

    commitDetailsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[gitService] fetchCommitDetails failed:', err);
    return {
      filesAdded: 0, filesModified: 0, filesDeleted: 0, filesRenamed: 0,
      totalFiles: 0, insertions: 0, deletions: 0, fileList: [],
    };
  }
}

export function inferCommitType(message = '') {
  const msg = message.toLowerCase().trim();
  if (/^(feat|feature|add|implement|create|new)/i.test(msg) || msg.includes('feature')) {
    return { type: 'feature', label: 'Feature', icon: '✨', color: '#10b981', bg: '#ecfdf5' };
  }
  if (/^(fix|bug|patch|resolve|repair|issue)/i.test(msg) || msg.includes('fix') || msg.includes('bug')) {
    return { type: 'bugfix', label: 'Bug Fix', icon: '🐛', color: '#ef4444', bg: '#fef2f2' };
  }
  if (/^(refactor|clean|restructure|modular|rewrite)/i.test(msg) || msg.includes('refactor')) {
    return { type: 'refactor', label: 'Refactor', icon: '♻️', color: '#8b5cf6', bg: '#f5f3ff' };
  }
  if (/^(docs|readme|changelog|comment)/i.test(msg) || msg.includes('docs') || msg.includes('readme')) {
    return { type: 'docs', label: 'Docs', icon: '📝', color: '#0284c7', bg: '#f0f9ff' };
  }
  if (/^(ui|style|css|layout|theme|design)/i.test(msg) || msg.includes('ui') || msg.includes('style')) {
    return { type: 'ui', label: 'UI', icon: '🎨', color: '#ec4899', bg: '#fdf2f8' };
  }
  if (/^(perf|optimize|speed|fast)/i.test(msg) || msg.includes('perf')) {
    return { type: 'perf', label: 'Performance', icon: '⚡', color: '#f59e0b', bg: '#fef3c7' };
  }
  if (/^(chore|config|build|deps|setup|package)/i.test(msg) || msg.includes('chore') || msg.includes('config')) {
    return { type: 'config', label: 'Config', icon: '🔧', color: '#64748b', bg: '#f8fafc' };
  }
  if (/^(remove|delete|drop|cleanup)/i.test(msg) || msg.includes('remove') || msg.includes('delete')) {
    return { type: 'removal', label: 'Cleanup', icon: '🔥', color: '#f97316', bg: '#fff7ed' };
  }
  return { type: 'general', label: 'Commit', icon: '📦', color: '#6366f1', bg: '#eef2ff' };
}

// ── Ultra-Optimized Source File Fetching (Zipball First -> 1 HTTP Call) ──────

function isSourceFile(path) {
  const p = path.toLowerCase();
  return (
    (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.json')) &&
    !p.includes('node_modules/') &&
    !p.includes('dist/') &&
    !p.includes('build/')
  );
}

function decodeBase64Utf8(str) {
  if (!str) return '';
  try {
    const clean = str.replace(/[\r\n\s]/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return atob(str.replace(/[\r\n\s]/g, ''));
    } catch {
      return str;
    }
  }
}

/**
 * Single-Request Zipball Extractor:
 * Downloads repository archive in 1 GZIP-compressed HTTP call and extracts only source files in memory using JSZip.
 * Non-source files (images, videos, binaries, build artifacts) are ignored during extraction.
 */
async function pullViaZipball(provider, owner, repo, ref, token = null, onProgress = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${ref}`;
  if (zipballCache.has(cacheKey)) {
    logApiRequest({ method: 'GET', url: `CACHE:zipball(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return zipballCache.get(cacheKey);
  }

  onProgress?.(15, 'Downloading compressed source archive (1 request)…');
  const start = performance.now();

  let zipUrl;
  if (provider === 'github') {
    zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
  } else if (provider === 'gitlab') {
    const encoded = encodeURIComponent(`${owner}/${repo}`);
    zipUrl = `https://gitlab.com/api/v4/projects/${encoded}/repository/archive.zip?sha=${ref}`;
  } else {
    throw new Error('Zipball not supported for provider');
  }

  const res = await fetch(zipUrl, { headers: buildHeaders(token) });
  const durationMs = performance.now() - start;
  logApiRequest({ method: 'GET', url: zipUrl, status: res.status, durationMs, cached: false, provider });

  if (!res.ok) {
    throw new Error(`Zipball download returned HTTP ${res.status}`);
  }

  onProgress?.(45, 'Filtering and extracting React source code in memory…');
  const buffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const files = [];
  const entries = Object.keys(zip.files);

  for (const rawPath of entries) {
    const entry = zip.files[rawPath];
    if (entry.dir) continue;

    // Strip top-level directory wrapper (e.g. `facebook-react-123456/src/App.jsx` -> `src/App.jsx`)
    const parts = rawPath.split('/');
    parts.shift();
    const cleanPath = parts.join('/');

    // FILTER IN MEMORY: Only extract source code (.js, .jsx, .ts, .tsx, .json)
    // Ignore images (.png, .jpg), videos (.mp4), binaries (.wasm, .zip), build output
    if (cleanPath && isSourceFile(cleanPath)) {
      const content = await entry.async('string');
      // Ignore huge compiled bundles (> 300KB)
      if (content.length <= 350000) {
        files.push({ path: cleanPath, content });
      }
    }
  }

  onProgress?.(90, `Extracted ${files.length} source files in 1 request`);
  zipballCache.set(cacheKey, files);
  return files;
}

/**
 * Bandwidth-Aware Selective Fetcher:
 * For repositories with large committed assets (>25MB), uses GitHub Raw CDN to stream ONLY source text files,
 * bypassing image/video/binary downloads completely while keeping rate limit usage minimal.
 */
export async function pullSelectiveRawFiles(provider, owner, repo, branch, token = null, onProgress = null) {
  onProgress?.(10, 'Fetching tree metadata (0 media bytes)…');

  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const data = await apiFetch(treeUrl, token, provider);
  const items = data.tree || [];

  // Filter ONLY source code files (ignore all images, videos, binaries)
  const sourceItems = items.filter(item => item.type === 'blob' && isSourceFile(item.path) && (item.size || 0) < 300000);

  onProgress?.(25, `Found ${sourceItems.length} source code files. Streaming text…`);
  const files = [];

  for (let i = 0; i < sourceItems.length; i += 10) {
    const batch = sourceItems.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        const start = performance.now();
        const res = await fetch(rawUrl);
        const durationMs = performance.now() - start;
        logApiRequest({ method: 'GET', url: rawUrl, status: res.status, durationMs, cached: false, provider });
        if (!res.ok) return null;
        const content = await res.text();
        return { path: item.path, content };
      })
    );

    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        files.push(r.value);
      }
    });

    const percent = Math.min(88, Math.round(25 + (i / sourceItems.length) * 60));
    onProgress?.(percent, `Streamed ${files.length}/${sourceItems.length} text files…`);
  }

  return files;
}

/**
 * Fallback File-by-File Fetcher (used only if Zipball is unavailable or fails).
 */
export async function pullProjectFilesFallback(provider, owner, repo, branch, token = null, onProgress = null) {
  onProgress?.(10, 'Fetching file tree…');

  const treeUrl = provider === 'github'
    ? `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    : `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/tree?ref=${branch}&recursive=true&per_page=1000`;

  const data = await apiFetch(treeUrl, token, provider);
  const items = data.tree || data || [];
  const paths = items.filter(item => (item.type === 'blob' || item.type === 'file') && isSourceFile(item.path || item.name)).map(item => item.path || item.name).slice(0, 100);

  onProgress?.(25, `Fetching ${paths.length} source files…`);
  const files = [];

  for (let i = 0; i < paths.length; i += 10) {
    const batch = paths.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        const fileCacheKey = `${provider}:${owner}/${repo}:${branch}:${path}`;
        if (zipballCache.has(fileCacheKey)) {
          return { path, content: zipballCache.get(fileCacheKey) };
        }
        const data = await apiFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, token, provider);
        const content = data.encoding === 'base64' ? decodeBase64Utf8(data.content) : (data.content || '');
        zipballCache.set(fileCacheKey, content);
        return { path, content };
      })
    );

    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.content) {
        files.push(r.value);
      }
    });

    const percent = Math.min(85, Math.round(25 + (i / paths.length) * 60));
    onProgress?.(percent, `Fetched ${files.length}/${paths.length} files…`);
  }

  return files;
}

import { evaluateImportStrategy } from '@/engines/import/importStrategyEngine';

/**
 * Pre-Import Strategy Analysis Step:
 * Queries repository size and file tree structure to evaluate and select the optimal strategy.
 */
export async function runImportAnalysis(provider, owner, repo, ref, token = null) {
  try {
    let repoSizeKb = 0;
    let treeItems = [];

    if (provider === 'github') {
      const repoData = await apiFetch(`https://api.github.com/repos/${owner}/${repo}`, token, provider).catch(() => null);
      if (repoData?.size) repoSizeKb = repoData.size;

      const treeData = await apiFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`, token, provider).catch(() => null);
      if (treeData?.tree) treeItems = treeData.tree;
    }

    return evaluateImportStrategy({
      provider,
      owner,
      repo,
      ref,
      treeItems,
      repoSizeKb,
    });
  } catch (err) {
    console.warn('[gitService] Strategy analysis fallback:', err);
    return evaluateImportStrategy({ provider, owner, repo, ref });
  }
}

/**
 * Main Source File Orchestrator:
 * Executes the strategy selected by ImportStrategyEngine (e.g. SELECTIVE_RAW_STREAM vs ZIPBALL_EXTRACT).
 */
export async function pullProjectFiles(provider, owner, repo, branch, token = null, onProgress = null, chosenStrategyId = null) {
  if (chosenStrategyId === 'SELECTIVE_RAW_STREAM') {
    try {
      return await pullSelectiveRawFiles(provider, owner, repo, branch, token, onProgress);
    } catch (err) {
      console.warn('[gitService] Selective Raw Stream fallback to Zipball:', err.message);
    }
  }

  try {
    return await pullViaZipball(provider, owner, repo, branch, token, onProgress);
  } catch (zipErr) {
    console.warn('[gitService] Zipball extraction fallback to batched API:', zipErr.message);
    return await pullProjectFilesFallback(provider, owner, repo, branch, token, onProgress);
  }
}

// ── Lightweight Update Check (1 Single HTTP Request) ────────────────────────

export async function checkRemoteUpdates(provider, owner, repo, branch, localCommitHash, token = null) {
  try {
    const latestHash = await fetchLatestCommit(provider, owner, repo, branch, token);
    const hasUpdates = !!latestHash && !!localCommitHash && !latestHash.startsWith(localCommitHash) && !localCommitHash.startsWith(latestHash);
    return { hasUpdates, latestHash };
  } catch (err) {
    console.warn('[gitService] Update check failed:', err);
    return { hasUpdates: false, latestHash: localCommitHash };
  }
}
