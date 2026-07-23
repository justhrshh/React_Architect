/**
 * gitConfig.js
 * Centralized configuration & thresholds for Git integration.
 */

export const SUPPORTED_SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

export const IGNORED_DIRECTORIES = ['node_modules/', 'dist/', 'build/', '.next/', '.git/'];

export const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.mov',
  '.pdf', '.zip', '.tar', '.gz', '.wasm', '.exe', '.mp3', '.wav', '.ico'
];

export const MAX_SOURCE_FILE_BYTES = 350000; // 350 KB per text file limit

export const LARGE_REPO_MB_THRESHOLD = 25; // 25 MB

export const HIGH_BINARY_RATIO_THRESHOLD = 0.35; // 35% binary files

export const API_BASES = {
  github: 'https://api.github.com',
  gitlab: 'https://gitlab.com/api/v4',
  bitbucket: 'https://api.bitbucket.org/2.0',
};
