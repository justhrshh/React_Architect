/**
 * gitCache.js
 * In-memory session cache manager for Git API responses (branches, commits, trees, zip archives).
 */

class GitCacheManager {
  constructor() {
    this.branches = new Map();
    this.commits = new Map();
    this.commitDetails = new Map();
    this.trees = new Map();
    this.zipballs = new Map();
  }

  clearAll() {
    this.branches.clear();
    this.commits.clear();
    this.commitDetails.clear();
    this.trees.clear();
    this.zipballs.clear();
  }
}

export const GitCache = new GitCacheManager();
