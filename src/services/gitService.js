/**
 * gitService.js
 * Backward-compatibility wrapper for the modular Git subsystem.
 * Re-exports the unified GitService facade and modular methods from @/services/git.
 */

export * from './git';
import GitService from './git';
export default GitService;
