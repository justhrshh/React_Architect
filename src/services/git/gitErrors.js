/**
 * gitErrors.js
 * Centralized error class and error mapper for Git operations.
 */

export class GitError extends Error {
  constructor({
    type = 'GENERIC',
    title = 'Import Failed',
    message,
    status = null,
    endpoint = '',
    provider = 'github',
    rawBody = '',
    resetTime = null,
    remaining = null,
  }) {
    super(message);
    this.name = 'GitError';
    this.type = type;
    this.title = title;
    this.status = status;
    this.endpoint = endpoint;
    this.provider = provider;
    this.rawBody = rawBody;
    this.resetTime = resetTime;
    this.remaining = remaining;
  }

  static rateLimit(endpoint, provider, resetHeader, rawBody) {
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
    return new GitError({
      type: 'RATE_LIMIT',
      title: 'API rate limit exceeded',
      message: `API rate limit exceeded${resetMsg}.\n\nPlease wait until the limit resets or authenticate with a Personal Access Token for a higher request limit.`,
      status: 429,
      endpoint,
      provider,
      rawBody,
      remaining: 0,
    });
  }

  static notFound(endpoint, provider, rawBody) {
    return new GitError({
      type: 'NOT_FOUND',
      title: 'Repository not found',
      message: 'Please verify the repository URL and try again.',
      status: 404,
      endpoint,
      provider,
      rawBody,
    });
  }

  static privateRepo(endpoint, provider, status = 403, rawBody = '') {
    return new GitError({
      type: 'PRIVATE_REPO',
      title: 'Private repository detected',
      message: 'A Personal Access Token is required to access this repository.',
      status,
      endpoint,
      provider,
      rawBody,
    });
  }

  static networkError(endpoint, provider, message) {
    return new GitError({
      type: 'NETWORK_ERROR',
      title: 'Network error',
      message: `Unable to connect to Git provider.\nCheck your internet connection and try again.`,
      status: null,
      endpoint,
      provider,
      rawBody: message,
    });
  }

  static invalidUrl(url, provider) {
    return new GitError({
      type: 'INVALID_URL',
      title: 'Invalid repository URL',
      message: 'Please enter a valid repository URL.\n\nExamples:\nhttps://github.com/facebook/react\nhttps://github.com/user/project',
      provider,
    });
  }

  static emptyRepo(provider) {
    return new GitError({
      type: 'EMPTY_REPO',
      title: 'Empty repository',
      message: 'This repository contains no source files to analyze.',
      provider,
    });
  }

  static generic(message, status = null, endpoint = '', provider = 'github', rawBody = '') {
    return new GitError({
      type: 'GENERIC',
      title: 'Import Failed',
      message: message || 'Provider request failed. Please check your inputs.',
      status,
      endpoint,
      provider,
      rawBody,
    });
  }
}

// Backward compatibility alias
export const GitApiError = GitError;
