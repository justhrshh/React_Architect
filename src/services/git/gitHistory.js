/**
 * gitHistory.js
 * Branch listing, commit timeline, lazy commit details, and remote update checking.
 */

import { apiFetch } from './gitProvider';
import { GitCache } from './gitCache';
import { GitLogger } from './gitLogger';
import { evaluateImportStrategy } from './importStrategy';

export async function fetchBranches(provider, owner, repo, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}`;
  if (GitCache.branches.has(cacheKey)) {
    GitLogger.logRequest({ method: 'GET', url: `CACHE:branches(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return GitCache.branches.get(cacheKey);
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

  GitCache.branches.set(cacheKey, result);
  return result;
}

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

export async function fetchCommitHistory(provider, owner, repo, branch, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${branch}`;
  if (GitCache.commits.has(cacheKey)) {
    GitLogger.logRequest({ method: 'GET', url: `CACHE:commits(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return GitCache.commits.get(cacheKey);
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

    GitCache.commits.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[gitHistory] fetchCommitHistory error:', err);
    return [];
  }
}

export async function fetchCommitDetails(provider, owner, repo, commitSha, token = null) {
  const cacheKey = `${provider}:${owner}/${repo}:${commitSha}`;
  if (GitCache.commitDetails.has(cacheKey)) {
    GitLogger.logRequest({ method: 'GET', url: `CACHE:commitDetails(${cacheKey})`, status: 200, durationMs: 1, cached: true, provider });
    return GitCache.commitDetails.get(cacheKey);
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

    GitCache.commitDetails.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[gitHistory] fetchCommitDetails error:', err);
    return {
      filesAdded: 0, filesModified: 0, filesDeleted: 0, filesRenamed: 0,
      totalFiles: 0, insertions: 0, deletions: 0, fileList: [],
    };
  }
}

export async function checkRemoteUpdates(provider, owner, repo, branch, localCommitHash, token = null) {
  try {
    const latestHash = await fetchLatestCommit(provider, owner, repo, branch, token);
    const hasUpdates = !!latestHash && !!localCommitHash && !latestHash.startsWith(localCommitHash) && !localCommitHash.startsWith(latestHash);
    return { hasUpdates, latestHash };
  } catch (err) {
    console.warn('[gitHistory] checkRemoteUpdates error:', err);
    return { hasUpdates: false, latestHash: localCommitHash };
  }
}

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
    console.warn('[gitHistory] runImportAnalysis fallback:', err);
    return evaluateImportStrategy({ provider, owner, repo, ref });
  }
}
