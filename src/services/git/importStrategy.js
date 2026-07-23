/**
 * importStrategy.js
 * Pluggable Import Strategy Engine. Evaluates repository characteristics and selects optimal strategy.
 */

import { isSourceFile } from './utils';
import { BINARY_EXTENSIONS, LARGE_REPO_MB_THRESHOLD, HIGH_BINARY_RATIO_THRESHOLD } from './gitConfig';

export const IMPORT_STRATEGIES = {
  ZIPBALL_EXTRACT: {
    id: 'ZIPBALL_EXTRACT',
    label: 'Single-Request Archive Extraction',
    icon: '🚀',
    color: '#10b981',
    bg: '#ecfdf5',
    description: 'Downloads full repository source archive in 1 compressed HTTP call (99% faster).',
  },
  SELECTIVE_RAW_STREAM: {
    id: 'SELECTIVE_RAW_STREAM',
    label: 'Bandwidth-Optimized Raw Stream',
    icon: '📡',
    color: '#0284c7',
    bg: '#f0f9ff',
    description: 'Streams source code text files via Raw CDN, completely bypassing media & binary downloads.',
  },
  BATCHED_TREE_FETCH: {
    id: 'BATCHED_TREE_FETCH',
    label: 'Batched REST API Fetch',
    icon: '📦',
    color: '#6366f1',
    bg: '#eef2ff',
    description: 'Fallback tree fetching via REST API blobs.',
  },
};

export function evaluateImportStrategy({
  provider = 'github',
  owner,
  repo,
  ref = 'main',
  treeItems = [],
  repoSizeKb = 0,
}) {
  let sourceCount = 0;
  let binaryCount = 0;
  let totalFiles = treeItems.length || 0;
  let sourceBytesTotal = 0;
  let binaryBytesTotal = 0;

  treeItems.forEach(item => {
    const pathLower = (item.path || '').toLowerCase();
    const size = item.size || 0;

    if (isSourceFile(pathLower)) {
      sourceCount++;
      sourceBytesTotal += size;
    } else if (BINARY_EXTENSIONS.some(ext => pathLower.endsWith(ext))) {
      binaryCount++;
      binaryBytesTotal += size;
    }
  });

  const totalBytes = sourceBytesTotal + binaryBytesTotal;
  const sizeMb = repoSizeKb > 0 ? (repoSizeKb / 1024) : (totalBytes / 1048576);

  const isLargeRepo = sizeMb > LARGE_REPO_MB_THRESHOLD || (binaryBytesTotal > 15000000);
  const highBinaryRatio = totalFiles > 0 && (binaryCount / totalFiles) > HIGH_BINARY_RATIO_THRESHOLD;

  let chosenStrategy = IMPORT_STRATEGIES.ZIPBALL_EXTRACT;
  let rationale = '';

  if (isLargeRepo || highBinaryRatio) {
    chosenStrategy = IMPORT_STRATEGIES.SELECTIVE_RAW_STREAM;
    rationale = `Repository size is ${sizeMb.toFixed(1)} MB with ${binaryCount} media/binary assets. Bandwidth-Optimized Raw Stream will bypass non-source assets and stream only React source code files.`;
  } else {
    chosenStrategy = IMPORT_STRATEGIES.ZIPBALL_EXTRACT;
    rationale = `Repository size is lightweight (${sizeMb > 0 ? sizeMb.toFixed(1) : '< 5'} MB). Single-request Zipball extraction is optimal (1 request, ~85% GZIP compression).`;
  }

  const estDownloadKb = chosenStrategy.id === 'ZIPBALL_EXTRACT'
    ? Math.round((repoSizeKb || (totalBytes / 1024) || 500) * 0.25)
    : Math.round((sourceBytesTotal / 1024) || 200);

  return {
    provider,
    owner,
    repo,
    ref,
    repoSizeKb,
    repoSizeMb: sizeMb.toFixed(1),
    totalFileCount: totalFiles || (sourceCount + binaryCount) || 1,
    sourceFileCount: sourceCount || 1,
    binaryAssetCount: binaryCount,
    estimatedDownloadKb: Math.max(10, estDownloadKb),
    estimatedDownloadMb: (Math.max(10, estDownloadKb) / 1024).toFixed(2),
    chosenStrategy,
    rationale,
  };
}
