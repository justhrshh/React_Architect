async function runStage1Audit(owner = 'abhishekdeveloper12', repo = 'vastra', branch = 'main') {
  console.log(`================================================================`);
  console.log(`  STAGE 1 AUDIT — GIT IMPORT & SCANNER HANDOFF`);
  console.log(`  Target: https://github.com/${owner}/${repo}/tree/${branch}`);
  console.log(`================================================================\n`);

  // Stage 1: GitHub Tree API
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(treeUrl);
  if (!res.ok) {
    console.error(`HTTP Error ${res.status} fetching tree from GitHub API`);
    return;
  }

  const data = await res.json();
  const allTreeEntries = data.tree || [];

  const directories = allTreeEntries.filter(item => item.type === 'tree');
  const blobFiles = allTreeEntries.filter(item => item.type === 'blob');

  console.log(`[STAGE 1.1] GitHub Tree Entries Returned: ${allTreeEntries.length}`);
  console.log(`First 30 GitHub Tree Paths:`);
  allTreeEntries.slice(0, 30).forEach((t, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. [${t.type}] ${t.path}`));
  console.log('----------------------------------------------------------------\n');

  console.log(`[STAGE 1.2] Directories Discovered: ${directories.length}`);
  console.log(`First 30 Directory Paths:`);
  directories.slice(0, 30).forEach((d, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${d.path}`));
  console.log('----------------------------------------------------------------\n');

  console.log(`[STAGE 1.3] Blob Files Discovered: ${blobFiles.length}`);
  console.log(`First 30 Discovered Blob File Paths:`);
  blobFiles.slice(0, 30).forEach((b, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${b.path}`));
  console.log('----------------------------------------------------------------\n');

  // Stage 1.4: Filtering & Reasons
  const SUPPORTED_SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];
  const IGNORED_DIRECTORIES = ['node_modules/', 'dist/', 'build/', '.next/', '.git/'];
  const MAX_SOURCE_FILE_BYTES = 350000; // 350 KB

  const filteredFiles = [];
  const acceptedFiles = [];

  blobFiles.forEach(b => {
    const pathLower = (b.path || '').toLowerCase();
    const ext = '.' + pathLower.split('.').pop();

    const isIgnoredDir = IGNORED_DIRECTORIES.some(dir => pathLower.includes(dir));
    const isSupportedExt = SUPPORTED_SOURCE_EXTENSIONS.some(e => pathLower.endsWith(e));
    const isOversized = (b.size || 0) > MAX_SOURCE_FILE_BYTES;

    if (isIgnoredDir) {
      filteredFiles.push({ path: b.path, reason: `Ignored Directory (${IGNORED_DIRECTORIES.find(d => pathLower.includes(d))})` });
    } else if (!isSupportedExt) {
      filteredFiles.push({ path: b.path, reason: `Unsupported File Extension (${ext || 'no-extension'})` });
    } else if (isOversized) {
      filteredFiles.push({ path: b.path, reason: `Oversized File (${(b.size / 1024).toFixed(1)} KB > 350 KB limit)` });
    } else {
      acceptedFiles.push(b);
    }
  });

  console.log(`[STAGE 1.4] Files Filtered: ${filteredFiles.length}`);
  console.log(`Filtered File Breakdown:`);
  const reasonCounts = {};
  filteredFiles.forEach(f => {
    reasonCounts[f.reason] = (reasonCounts[f.reason] || 0) + 1;
  });
  Object.entries(reasonCounts).forEach(([r, count]) => console.log(`  - ${r}: ${count} files`));
  console.log(`\nFirst 30 Filtered File Paths & Reasons:`);
  filteredFiles.slice(0, 30).forEach((f, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${f.path} -> ${f.reason}`));
  console.log('----------------------------------------------------------------\n');

  // Stage 1.5: Files Downloaded
  console.log(`[STAGE 1.5] Downloading Accepted Source Files (${acceptedFiles.length} files)...`);
  const downloadedFiles = [];
  for (let i = 0; i < acceptedFiles.length; i += 10) {
    const batch = acceptedFiles.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return null;
        const content = await res.text();
        return { path: item.path, content };
      })
    );
    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value) downloadedFiles.push(r.value);
    });
  }

  console.log(`[STAGE 1.5] Files Downloaded: ${downloadedFiles.length}`);
  console.log(`First 30 Downloaded File Paths:`);
  downloadedFiles.slice(0, 30).forEach((d, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${d.path}`));
  console.log('----------------------------------------------------------------\n');

  // Stage 1.6: Final Array Passed to Scanner
  const scannerInputArray = downloadedFiles.map(f => ({
    name: f.path.split('/').pop(),
    path: f.path,
    content: f.content,
  }));

  console.log(`[STAGE 1.6] Final Array Passed to Scanner: ${scannerInputArray.length} items`);
  console.log(`First 30 Paths Passed to Scanner:`);
  scannerInputArray.slice(0, 30).forEach((s, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${s.path}`));
  console.log('================================================================\n');

  // Check unexpected file count decreases
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`  1. GitHub Tree Entries: ${allTreeEntries.length}`);
  console.log(`  2. Directories: ${directories.length}`);
  console.log(`  3. Blob Files Discovered: ${blobFiles.length}`);
  console.log(`  4. Files Filtered: ${filteredFiles.length}`);
  console.log(`  5. Source Files Accepted: ${acceptedFiles.length}`);
  console.log(`  6. Files Downloaded: ${downloadedFiles.length}`);
  console.log(`  7. Final Scanner Array: ${scannerInputArray.length}`);
  console.log(`----------------------------------------------------------------`);

  if (acceptedFiles.length === downloadedFiles.length && downloadedFiles.length === scannerInputArray.length) {
    console.log(`✅ SCANNER HANDOFF PROOF: Scanner receives 100% of downloaded source files (${scannerInputArray.length}/${acceptedFiles.length}).`);
  } else {
    console.log(`🚨 UNEXPECTED DECREASE: File count dropped during download or scanner handoff!`);
  }
}

runStage1Audit();
