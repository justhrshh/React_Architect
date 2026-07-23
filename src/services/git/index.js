/**
 * index.js
 * Clean Public API Facade (GitService) for the entire Git subsystem.
 * Exposes focused, readable methods while hiding internal modular complexity.
 */

import { detectProvider, parseRepoUrl, getProviderLabel } from './gitProvider';
import { detectGitRepository } from './gitDetection';
import { evaluateImportStrategy, IMPORT_STRATEGIES } from './importStrategy';
import { pullProjectFiles } from './gitImport';
import {
  fetchBranches,
  fetchLatestCommit,
  fetchCommitHistory,
  fetchCommitDetails,
  checkRemoteUpdates,
  runImportAnalysis,
} from './gitHistory';
import { GitCache } from './gitCache';
import { GitLogger } from './gitLogger';
import { GitError, GitApiError } from './gitErrors';
import { inferCommitType, isSourceFile, decodeBase64Utf8 } from './utils';

/**
 * Unified Public API Facade
 */
export const GitService = {
  detectProvider,
  parseRepoUrl,
  getProviderLabel,
  detectRepository: detectGitRepository,
  analyzeStrategy: runImportAnalysis,
  pullFiles: pullProjectFiles,
  getBranches: fetchBranches,
  getLatestCommit: fetchLatestCommit,
  getHistory: fetchCommitHistory,
  getDetails: fetchCommitDetails,
  checkUpdates: checkRemoteUpdates,
  clearCache: () => GitCache.clearAll(),
  getLogger: () => GitLogger,
};

// Direct export of all subsystem methods & types for full backward compatibility
export {
  detectProvider,
  parseRepoUrl,
  getProviderLabel,
  detectGitRepository,
  evaluateImportStrategy,
  IMPORT_STRATEGIES,
  pullProjectFiles,
  fetchBranches,
  fetchLatestCommit,
  fetchCommitHistory,
  fetchCommitDetails,
  checkRemoteUpdates,
  runImportAnalysis,
  GitError,
  GitApiError,
  GitLogger,
  GitCache,
  inferCommitType,
  isSourceFile,
  decodeBase64Utf8,
};

export function clearGitCache() {
  GitCache.clearAll();
}

export function getApiRequestLogs() {
  return GitLogger.getLogs();
}

export function clearApiRequestLogs() {
  GitLogger.clearLogs();
}

export function getOptimizationReport() {
  return GitLogger.getAuditReport();
}

export default GitService;
