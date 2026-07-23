/**
 * gitImport.js
 * Source file retrieval engine (Zipball single-request, Selective Raw CDN stream, and batched fallback).
 */

import JSZip from 'jszip';
import { apiFetch, getProviderLabel } from './gitProvider';
import { GitCache } from './gitCache';
import { GitLogger } from './gitLogger';
import { isSourceFile, decodeBase64Utf8 } from './utils';
import { MAX_SOURCE_FILE_BYTES } from './gitConfig';

function buildAuthHeaders(token) {
  const headers = { 'Accept': 'application/json' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

export async function pullViaZipball(provider, owner, repo, ref, token = null, onProgress = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${ref}`;
  if (GitCache.zipballs.has(cacheKey)) {
    GitLogger.logRequest({ method: 'GET', url: `CACHE:zipball(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return GitCache.zipballs.get(cacheKey);
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

  const res = await fetch(zipUrl, { headers: buildAuthHeaders(token) });
  const durationMs = performance.now() - start;
  GitLogger.logRequest({ method: 'GET', url: zipUrl, status: res.status, durationMs, cached: false, provider });

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

    const parts = rawPath.split('/');
    parts.shift();
    const cleanPath = parts.join('/');

    if (cleanPath && isSourceFile(cleanPath)) {
      const content = await entry.async('string');
      if (content.length <= MAX_SOURCE_FILE_BYTES) {
        files.push({ path: cleanPath, content });
      }
    }
  }

  onProgress?.(90, `Extracted ${files.length} source files in 1 request`);
  GitCache.zipballs.set(cacheKey, files);
  return files;
}

export async function pullSelectiveRawFiles(provider, owner, repo, branch, token = null, onProgress = null) {
  onProgress?.(10, 'Fetching tree metadata (0 media bytes)…');

  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const data = await apiFetch(treeUrl, token, provider);
  const items = data.tree || [];

  const sourceItems = items.filter(item => item.type === 'blob' && isSourceFile(item.path) && (item.size || 0) < MAX_SOURCE_FILE_BYTES);

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
        GitLogger.logRequest({ method: 'GET', url: rawUrl, status: res.status, durationMs, cached: false, provider });
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
        if (GitCache.zipballs.has(fileCacheKey)) {
          return { path, content: GitCache.zipballs.get(fileCacheKey) };
        }
        const data = await apiFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, token, provider);
        const content = data.encoding === 'base64' ? decodeBase64Utf8(data.content) : (data.content || '');
        GitCache.zipballs.set(fileCacheKey, content);
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

export async function pullProjectFiles(provider, owner, repo, branch, token = null, onProgress = null, chosenStrategyId = null) {
  if (chosenStrategyId === 'SELECTIVE_RAW_STREAM') {
    try {
      return await pullSelectiveRawFiles(provider, owner, repo, branch, token, onProgress);
    } catch (err) {
      console.warn('[gitImport] Selective Raw Stream fallback:', err.message);
    }
  }

  try {
    return await pullViaZipball(provider, owner, repo, branch, token, onProgress);
  } catch (zipErr) {
    console.warn('[gitImport] Zipball extraction fallback:', zipErr.message);
    return await pullProjectFilesFallback(provider, owner, repo, branch, token, onProgress);
  }
}
