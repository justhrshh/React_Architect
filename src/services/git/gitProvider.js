/**
 * gitProvider.js
 * Provider detection, URL parsing, header construction, and low-level API fetcher.
 */

import { GitError } from './gitErrors';
import { GitLogger } from './gitLogger';

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
    case 'azure':     return 'Azure DevOps';
    default:          return 'Git Provider';
  }
}

function buildHeaders(token) {
  const headers = { 'Accept': 'application/json' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

export async function apiFetch(url, token, provider = 'github') {
  const start = performance.now();
  let res;
  try {
    res = await fetch(url, { headers: buildHeaders(token) });
  } catch (netErr) {
    const durationMs = performance.now() - start;
    GitLogger.logRequest({ method: 'GET', url, status: 0, durationMs, cached: false, provider });
    throw GitError.networkError(url, provider, netErr.message || 'Network fetch failed');
  }

  const durationMs = performance.now() - start;
  GitLogger.logRequest({ method: 'GET', url, status: res.status, durationMs, cached: false, provider });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}

    const remaining = res.headers.get('x-ratelimit-remaining');
    const resetHeader = res.headers.get('x-ratelimit-reset');

    const isRateLimited =
      res.status === 429 ||
      (res.status === 403 && remaining !== null && parseInt(remaining, 10) === 0) ||
      (bodyJson?.message && bodyJson.message.toLowerCase().includes('rate limit'));

    if (isRateLimited) {
      throw GitError.rateLimit(url, provider, resetHeader, bodyText);
    }
    if (res.status === 404) {
      throw GitError.notFound(url, provider, bodyText);
    }
    if (res.status === 401 || res.status === 403) {
      throw GitError.privateRepo(url, provider, res.status, bodyText);
    }

    throw GitError.generic(bodyJson?.message, res.status, url, provider, bodyText);
  }

  return res.json();
}
