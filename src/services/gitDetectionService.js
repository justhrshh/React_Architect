/**
 * gitDetectionService.js
 *
 * Automatic Git Repository Detection Engine for React Architect.
 * Inspects imported local project folders (or ZIP archives) for Git metadata before analysis.
 *
 * Capabilities:
 * - Detects standalone, local Git, and remote Git repositories.
 * - Parses `.git/HEAD`, `.git/config`, `.git/refs` in browser or Electron environment.
 * - Extensible provider system (GitHub, GitLab, Bitbucket, Azure DevOps, Generic Git).
 * - Generates normalized GitMetadata object and dynamic feature enablement matrix.
 */

// ── Provider Registry ───────────────────────────────────────────────────────

export const GIT_PROVIDERS = {
  GITHUB: {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    match: (url) => url.toLowerCase().includes('github.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/github\.com[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  GITLAB: {
    id: 'gitlab',
    label: 'GitLab',
    icon: 'gitlab',
    match: (url) => url.toLowerCase().includes('gitlab.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/gitlab\.com[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  BITBUCKET: {
    id: 'bitbucket',
    label: 'Bitbucket',
    icon: 'bitbucket',
    match: (url) => url.toLowerCase().includes('bitbucket.org'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/bitbucket\.org[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  AZURE: {
    id: 'azure',
    label: 'Azure DevOps',
    icon: 'azure',
    match: (url) => url.toLowerCase().includes('dev.azure.com') || url.toLowerCase().includes('visualstudio.com'),
    parse: (url) => {
      const match = url.replace(/\.git\s*$/, '').match(/(?:dev\.azure\.com|visualstudio\.com)[:/]([^/]+)\/([^/]+)/i);
      return match ? { owner: match[1], repoName: match[2] } : null;
    },
  },
  GENERIC: {
    id: 'generic',
    label: 'Git Remote',
    icon: 'git',
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

export function detectGitProvider(remoteUrl) {
  if (!remoteUrl) return GIT_PROVIDERS.GENERIC;
  const urlLower = remoteUrl.toLowerCase();
  for (const key of ['GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE']) {
    if (GIT_PROVIDERS[key].match(urlLower)) {
      return GIT_PROVIDERS[key];
    }
  }
  return GIT_PROVIDERS.GENERIC;
}

// ── Feature Enablement Matrix ────────────────────────────────────────────────

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

// ── Git Config Parser ───────────────────────────────────────────────────────

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

// ── Main Git Detection Entry Point ──────────────────────────────────────────

/**
 * Detects Git repository status from a FileSystemDirectoryHandle (browser or Electron IPC).
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<object>} GitMetadata
 */
export async function detectGitRepository(dirHandle) {
  // 1. Check for Electron IPC Desktop integration
  if (typeof window !== 'undefined' && window.electronAPI?.detectGitRepo) {
    try {
      const ipcResult = await window.electronAPI.detectGitRepo(dirHandle.name);
      if (ipcResult) return ipcResult;
    } catch (ipcErr) {
      console.warn('[gitDetectionService] Electron IPC fallback to web FS handle:', ipcErr);
    }
  }

  if (!dirHandle || typeof dirHandle.getDirectoryHandle !== 'function') {
    return createStandaloneMetadata();
  }

  let gitDir = null;
  let isWorktree = false;

  // 2. Inspect for .git folder or .git file (worktree)
  try {
    gitDir = await dirHandle.getDirectoryHandle('.git');
  } catch {
    try {
      // Check if .git is a worktree file
      const gitFile = await dirHandle.getFileHandle('.git');
      if (gitFile) isWorktree = true;
    } catch {
      // No .git folder or file found
      return createStandaloneMetadata();
    }
  }

  if (!gitDir && !isWorktree) {
    return createStandaloneMetadata();
  }

  // 3. Read current branch from .git/HEAD
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

        // Attempt to read branch commit SHA from .git/refs/heads/{branch}
        try {
          const refsHandle = await gitDir.getDirectoryHandle('refs');
          const headsHandle = await refsHandle.getDirectoryHandle('heads');
          const branchFileHandle = await headsHandle.getFileHandle(currentBranch);
          const branchFile = await branchFileHandle.getFile();
          const shaText = (await branchFile.text()).trim();
          latestCommitHash = shaText.slice(0, 7);
        } catch {
          // Ref SHA reading optional
        }
      } else if (/^[0-[#a-fA-F0-9]{7,40}$/.test(headText)) {
        currentBranch = 'detached';
        latestCommitHash = headText.slice(0, 7);
      }
    }
  } catch (err) {
    console.warn('[gitDetectionService] Failed to read HEAD:', err);
  }

  // 4. Read remote config from .git/config
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
  } catch {
    // No .git/config or unreadable
  }

  // 5. Compute Repository Type & Provider
  let repoType = 'LOCAL_GIT';
  let providerObj = GIT_PROVIDERS.GENERIC;
  let owner = null;
  let repoName = null;

  if (remoteUrl) {
    repoType = 'REMOTE_GIT';
    providerObj = detectGitProvider(remoteUrl);
    const parsed = providerObj.parse(remoteUrl);
    if (parsed) {
      owner = parsed.owner;
      repoName = parsed.repoName;
    }
  }

  const enabledFeatures = computeEnabledFeatures(repoType);

  return {
    isGitRepo: true,
    isWorktree,
    repoType,
    statusLabel: repoType === 'REMOTE_GIT' ? 'Remote Git Repository' : 'Local Git Repository',
    provider: providerObj.id,
    providerLabel: providerObj.label,
    owner,
    repoName,
    remoteUrl,
    remoteName: remoteName || (remoteUrl ? 'origin' : null),
    currentBranch,
    latestCommitHash: latestCommitHash || 'HEAD',
    workingTreeStatus: 'clean',
    enabledFeatures,
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
