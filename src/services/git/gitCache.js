/**
 * gitCache.js
 * In-memory session cache manager for Git API responses (repos, branches, commits, trees, zip archives).
 */

class GitCacheManager {
  constructor() {
    this.repos = new Map();
    this.branches = new Map();
    this.commits = new Map();
    this.commitDetails = new Map();
    this.trees = new Map();
    this.zipballs = new Map();
  }

  clearAll() {
    this.repos.clear();
    this.branches.clear();
    this.commits.clear();
    this.commitDetails.clear();
    this.trees.clear();
    this.zipballs.clear();
  }
}

export const GitCache = new GitCacheManager();
