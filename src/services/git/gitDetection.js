/**
 * gitDetection.js
 * Automatic local repository inspection (.git, HEAD, config, worktrees, remotes).
 */

import { detectProvider, getProviderLabel } from './gitProvider';

export const GIT_PROVIDERS = {
  GITHUB: {
    id: 'github',
    label: 'GitHub',
    match: (url) => url.toLowerCase().includes('github.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/github\.com[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  GITLAB: {
    id: 'gitlab',
    label: 'GitLab',
    match: (url) => url.toLowerCase().includes('gitlab.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/gitlab\.com[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  BITBUCKET: {
    id: 'bitbucket',
    label: 'Bitbucket',
    match: (url) => url.toLowerCase().includes('bitbucket.org'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/bitbucket\.org[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  AZURE: {
    id: 'azure',
    label: 'Azure DevOps',
    match: (url) => url.toLowerCase().includes('dev.azure.com') || url.toLowerCase().includes('visualstudio.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/(?:dev\.azure\.com|visualstudio\.com)[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  GENERIC: {
    id: 'generic',
    label: 'Git Remote',
    match: () => true,
    parse: (url) => {
      const clean = url.replace(/\.git\s*$/, '');
      const parts = clean.split(/[/:]/).filter(Boolean);
      const repoName = parts.pop() || 'repository';
      const owner = parts.pop() || 'remote';
      return { owner, repoName };
    },
  },
};

export function computeEnabledFeatures(repoType) {
  switch (repoType) {
    case 'REMOTE_GIT':
      return {
        architectureAnalysis: true,
        knowledgeGraph: true,
        aiInvestigation: true,
        historyStudio: true,
        localCommitTimeline: true,
        branchSwitching: true,
        updateDetection: true,
        pullChanges: true,
        repositoryTimeline: true,
      };
    case 'LOCAL_GIT':
      return {
        architectureAnalysis: true,
        knowledgeGraph: true,
        aiInvestigation: true,
        historyStudio: true,
        localCommitTimeline: true,
        branchSwitching: true,
        updateDetection: false,
        pullChanges: false,
        repositoryTimeline: true,
      };
    case 'STANDALONE':
    default:
      return {
        architectureAnalysis: true,
        knowledgeGraph: true,
        aiInvestigation: true,
        historyStudio: false,
        localCommitTimeline: false,
        branchSwitching: false,
        updateDetection: false,
        pullChanges: false,
        repositoryTimeline: false,
      };
  }
}

export function parseGitConfig(configText) {
  if (!configText) return { remoteUrl: null, remoteName: null };
  const lines = configText.split('\n');
  let currentSection = '';
  let remoteUrl = null;
  let remoteName = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      if (currentSection.startsWith('remote ')) {
        const match = currentSection.match(/remote "(.*?)"/);
        if (match) remoteName = match[1];
      }
    } else if (trimmed.includes('=')) {
      const [key, val] = trimmed.split('=').map(s => s.trim());
      if (key === 'url') {
        remoteUrl = val;
      }
    }
  }

  return { remoteUrl, remoteName: remoteName || (remoteUrl ? 'origin' : null) };
}

export async function detectGitRepository(dirHandle) {
  if (typeof window !== 'undefined' && window.electronAPI?.detectGitRepo) {
    try {
      const ipcResult = await window.electronAPI.detectGitRepo(dirHandle.name);
      if (ipcResult) return ipcResult;
    } catch (ipcErr) {
      console.warn('[gitDetection] Electron IPC fallback:', ipcErr);
    }
  }

  if (!dirHandle || typeof dirHandle.getDirectoryHandle !== 'function') {
    return createStandaloneMetadata();
  }

  let gitDir = null;
  let isWorktree = false;

  try {
    gitDir = await dirHandle.getDirectoryHandle('.git');
  } catch {
    try {
      const gitFile = await dirHandle.getFileHandle('.git');
      if (gitFile) isWorktree = true;
    } catch {
      return createStandaloneMetadata();
    }
  }

  if (!gitDir && !isWorktree) {
    return createStandaloneMetadata();
  }

  let currentBranch = 'main';
  let latestCommitHash = null;

  try {
    if (gitDir) {
      const headHandle = await gitDir.getFileHandle('HEAD');
      const headFile = await headHandle.getFile();
      const headText = (await headFile.text()).trim();

      if (headText.startsWith('ref:')) {
        const refPath = headText.replace('ref:', '').trim();
        currentBranch = refPath.split('/').pop() || 'main';

        try {
          const refsHandle = await gitDir.getDirectoryHandle('refs');
          const headsHandle = await refsHandle.getDirectoryHandle('heads');
          const branchFileHandle = await headsHandle.getFileHandle(currentBranch);
          const branchFile = await branchFileHandle.getFile();
          const shaText = (await branchFile.text()).trim();
          latestCommitHash = shaText.slice(0, 7);
        } catch {}
      } else if (/^[0-9a-fA-F]{7,40}$/.test(headText)) {
        currentBranch = 'detached';
        latestCommitHash = headText.slice(0, 7);
      }
    }
  } catch (err) {
    console.warn('[gitDetection] Failed to read HEAD:', err);
  }

  let remoteUrl = null;
  let remoteName = null;

  try {
    if (gitDir) {
      const configHandle = await gitDir.getFileHandle('config');
      const configFile = await configHandle.getFile();
      const configText = await configFile.text();
      const parsed = parseGitConfig(configText);
      remoteUrl = parsed.remoteUrl;
      remoteName = parsed.remoteName;
    }
  } catch {}

  let repoType = 'LOCAL_GIT';
  let providerId = detectProvider(remoteUrl);
  let providerLabel = getProviderLabel(providerId);
  let owner = null;
  let repoName = null;

  if (remoteUrl) {
    repoType = 'REMOTE_GIT';
    const providerObj = GIT_PROVIDERS[providerId.toUpperCase()] || GIT_PROVIDERS.GENERIC;
    const parsed = providerObj.parse(remoteUrl);
    if (parsed) {
      owner = parsed.owner;
      repoName = parsed.repoName;
    }
  }

  return {
    isGitRepo: true,
    isWorktree,
    repoType,
    statusLabel: repoType === 'REMOTE_GIT' ? 'Remote Git Repository' : 'Local Git Repository',
    provider: providerId,
    providerLabel,
    owner,
    repoName,
    remoteUrl,
    remoteName: remoteName || (remoteUrl ? 'origin' : null),
    currentBranch,
    latestCommitHash: latestCommitHash || 'HEAD',
    workingTreeStatus: 'clean',
    enabledFeatures: computeEnabledFeatures(repoType),
  };
}

function createStandaloneMetadata() {
  return {
    isGitRepo: false,
    isWorktree: false,
    repoType: 'STANDALONE',
    statusLabel: 'Standalone Project',
    provider: null,
    providerLabel: null,
    owner: null,
    repoName: null,
    remoteUrl: null,
    remoteName: null,
    currentBranch: null,
    latestCommitHash: null,
    workingTreeStatus: null,
    enabledFeatures: computeEnabledFeatures('STANDALONE'),
  };
}
