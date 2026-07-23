import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectSelectedProject, updateGitMeta } from '@/redux/slices/hubSlice';
import { selectSnapshotIndex } from '@/redux/slices/gitSlice';
import { loadSnapshotIndex, takeSnapshot } from '@/services/snapshotService';
import {
  fetchBranches,
  fetchCommitHistory,
  fetchCommitDetails,
  fetchLatestCommit,
  checkRemoteUpdates,
  getProviderLabel,
  pullProjectFiles,
  parseRepoUrl,
  inferCommitType,
} from '@/services/gitService';
import { getSnapshots } from '@/lib/analysis/snapshotStore';
import { computeArchDiff } from '@/engines/diff/archDiffEngine';

// ── Fonts ──────────────────────────────────────────────────────────────────
const INTER = "'Inter', 'SF Pro Display', system-ui, sans-serif";
const MONO  = "'JetBrains Mono', 'Fira Code', monospace";

// ── Icons (inline SVG) ─────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const BranchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>
);

const CommitIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
  </svg>
);

const SyncIcon = ({ spinning }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-3.6"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateString) {
  if (!dateString) return '—';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function scoreColor(score) {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

function ProviderDot({ provider }) {
  const colors = { github: '#24292f', gitlab: '#fc6d26', bitbucket: '#0052cc', generic: '#64748b' };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: colors[provider] || colors.generic,
      display: 'inline-block', flexShrink: 0,
    }} />
  );
}

function FileStatusBadge({ status }) {
  const styles = {
    added:    { bg: '#ecfdf5', color: '#059669', label: 'Added' },
    modified: { bg: '#f0f9ff', color: '#0284c7', label: 'Modified' },
    deleted:  { bg: '#fef2f2', color: '#dc2626', label: 'Deleted' },
    renamed:  { bg: '#f5f3ff', color: '#7c3aed', label: 'Renamed' },
  };
  const conf = styles[status] || styles.modified;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, fontFamily: MONO,
      color: conf.color, background: conf.bg,
      padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
    }}>
      {conf.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function HistoryStudio() {
  const dispatch = useDispatch();
  const project  = useSelector(selectSelectedProject);
  const snapshotIndex = useSelector(selectSnapshotIndex);

  // Repository & Commits state
  const [branches, setBranches]             = useState([]);
  const [activeBranch, setActiveBranch]     = useState(project?.activeBranch || project?.defaultBranch || 'main');
  const [commitList, setCommitList]         = useState([]);
  const [commitDetailsMap, setCommitDetailsMap] = useState({}); // { [hash]: commitDetails }
  const [rawSnapshots, setRawSnapshots]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [analyzingHash, setAnalyzingHash]   = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterAuthor, setFilterAuthor]     = useState('all');
  const [filterType, setFilterType]         = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all'); // 'all' | 'analyzed' | 'unanalyzed'

  // Expandable cards state: { [hash]: boolean }
  const [expandedCards, setExpandedCards]   = useState({});

  // Selected commit for Right Panel
  const [selectedCommitHash, setSelectedCommitHash] = useState(null);
  const [compareMode, setCompareMode]       = useState('previous'); // 'previous' | 'baseline' | 'current'

  // Load branches
  useEffect(() => {
    if (!project?.gitProvider || !project?.repoUrl) return;
    const parsed = parseRepoUrl(project.repoUrl);
    if (!parsed) return;
    fetchBranches(project.gitProvider, parsed.owner, parsed.repo, null)
      .then(bList => setBranches(bList))
      .catch(err => console.warn('[HistoryStudio] Failed to load branches:', err));
  }, [project?.gitProvider, project?.repoUrl]);

  // Load commits & snapshots whenever activeBranch changes
  const refreshHistory = useCallback(async () => {
    if (!project?.id) return;
    setLoadingHistory(true);

    try {
      // 1. Load Redux index + full IDB snapshots for this branch
      await loadSnapshotIndex(project.id, activeBranch, dispatch);
      const snaps = await getSnapshots(project.id, activeBranch);
      setRawSnapshots(snaps);

      // 2. Fetch real commit history from provider
      let remoteCommits = [];
      if (project.gitProvider && project.repoUrl) {
        const parsed = parseRepoUrl(project.repoUrl);
        if (parsed) {
          remoteCommits = await fetchCommitHistory(
            project.gitProvider, parsed.owner, parsed.repo, activeBranch, null
          );
        }
      }

      setCommitList(remoteCommits);

      // Default selection to first commit or analyzed commit
      if (snaps.length > 0) {
        setSelectedCommitHash(snaps[0].commitHash);
      } else if (remoteCommits.length > 0) {
        setSelectedCommitHash(remoteCommits[0].hash);
      }
    } catch (err) {
      console.warn('[HistoryStudio] History load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [project?.id, project?.gitProvider, project?.repoUrl, activeBranch, dispatch]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Lazy-fetch commit details (file stats & file list) for selected/expanded commit
  const fetchDetailsForCommit = useCallback(async (hash, fullHash) => {
    if (commitDetailsMap[hash] || commitDetailsMap[fullHash]) return;
    if (!project?.gitProvider || !project?.repoUrl) return;
    const parsed = parseRepoUrl(project.repoUrl);
    if (!parsed) return;

    try {
      const details = await fetchCommitDetails(
        project.gitProvider, parsed.owner, parsed.repo, fullHash || hash, null
      );
      setCommitDetailsMap(prev => ({
        ...prev,
        [hash]: details,
        [fullHash]: details,
      }));
    } catch (err) {
      console.warn('[HistoryStudio] Failed to fetch commit details:', err);
    }
  }, [project?.gitProvider, project?.repoUrl, commitDetailsMap]);

  // Handle branch change
  const handleBranchChange = (newBranch) => {
    setActiveBranch(newBranch);
    dispatch(updateGitMeta({ id: project.id, activeBranch: newBranch }));
  };

  // Handle Check for Updates / Sync
  const handleCheckUpdates = async () => {
    if (!project?.gitProvider || !project?.repoUrl) return;
    setCheckingUpdates(true);
    try {
      const parsed = parseRepoUrl(project.repoUrl);
      if (!parsed) return;
      const { hasUpdates, latestHash } = await checkRemoteUpdates(
        project.gitProvider, parsed.owner, parsed.repo, activeBranch,
        project.latestCommitHash, null
      );
      dispatch(updateGitMeta({
        id:               project.id,
        remoteAheadBy:    hasUpdates ? 1 : 0,
        latestCommitHash: hasUpdates ? latestHash : project.latestCommitHash,
        lastSyncedAt:     new Date().toISOString(),
      }));
      await refreshHistory();
    } catch (err) {
      console.warn('[HistoryStudio] Update check failed:', err);
    } finally {
      setCheckingUpdates(false);
    }
  };

  // Analyze unanalyzed commit
  const handleAnalyzeCommit = async (commitHashOrItem) => {
    const item = typeof commitHashOrItem === 'object' ? commitHashOrItem : { hash: commitHashOrItem, fullHash: commitHashOrItem };
    const targetHash = item.fullHash || item.hash;
    const shortHash  = item.hash || targetHash.slice(0, 7);

    if (!project || analyzingHash) return;
    setAnalyzingHash(shortHash);
    try {
      const parsed = parseRepoUrl(project.repoUrl);
      if (!parsed) throw new Error("Invalid repository URL");

      // Pull files at commit
      const files = await pullProjectFiles(
        project.gitProvider, parsed.owner, parsed.repo, targetHash, null
      );

      if (!files || files.length === 0) {
        throw new Error(`No source files found in commit ${shortHash}`);
      }

      if (!window.projectGitFiles) window.projectGitFiles = {};
      window.projectGitFiles[project.id] = files;

      // Build KG & run analysis
      const { buildKnowledgeGraph } = await import('@/engines/graph/buildKnowledgeGraph');
      const { layoutGraphNodes }   = await import('@/engines/layout/layoutEngine');
      const { runAnalysis }        = await import('@/engines/analysis');

      const kg = buildKnowledgeGraph(files, project);
      kg.nodes = layoutGraphNodes(kg.nodes, kg.edges);
      kg.rawFiles = files;

      const analysisResults = runAnalysis(kg);
      kg.analysis = analysisResults;

      // Take Snapshot
      await takeSnapshot({
        projectId:       project.id,
        branch:          activeBranch,
        commitHash:      shortHash,
        knowledgeGraph:  kg,
        analysisResults: analysisResults,
        healthScore:     analysisResults?.healthScore || 85,
        dispatch,
      });

      await refreshHistory();
      setSelectedCommitHash(shortHash);
    } catch (err) {
      console.error('[HistoryStudio] Commit analysis failed:', err);
      alert(`Commit analysis failed: ${err.message || err}`);
    } finally {
      setAnalyzingHash(null);
    }
  };

  // Toggle card expansion
  const toggleExpandCard = (hash, fullHash) => {
    setExpandedCards(prev => {
      const next = !prev[hash];
      if (next) fetchDetailsForCommit(hash, fullHash);
      return { ...prev, [hash]: next };
    });
  };

  // Unique list of authors for filter dropdown
  const authorsList = useMemo(() => {
    const set = new Set(commitList.map(c => c.author));
    return Array.from(set).filter(Boolean);
  }, [commitList]);

  // Combine remote commits & snapshot data into an enriched Timeline Events array
  const enrichedTimeline = useMemo(() => {
    if (commitList.length > 0) {
      return commitList.map(c => {
        const snap = rawSnapshots.find(s =>
          s.commitHash === c.hash ||
          s.commitHash === c.fullHash ||
          (s.commitHash && c.fullHash && c.fullHash.startsWith(s.commitHash)) ||
          (s.commitHash && c.hash && s.commitHash.startsWith(c.hash))
        );
        const commitType = inferCommitType(c.message);

        return {
          hash:        c.hash,
          fullHash:    c.fullHash,
          message:     c.message,
          author:      c.author,
          avatarUrl:   c.avatarUrl,
          date:        c.date,
          branch:      activeBranch,
          typeInfo:    commitType,
          snapshot:    snap || null,
          isAnalyzed:  !!snap,
        };
      });
    }

    // Fallback: if no remote commits (offline/demo), build timeline strictly from local snapshots
    return rawSnapshots.map(s => {
      const commitType = inferCommitType(s.aiSummary || '');
      return {
        hash:        s.commitHash,
        fullHash:    s.commitHash,
        message:     s.aiSummary ? s.aiSummary.slice(0, 45) + '...' : `Architectural Checkpoint ${s.commitHash}`,
        author:      'React Architect Engine',
        avatarUrl:   null,
        date:        s.timestamp,
        branch:      s.branch || activeBranch,
        typeInfo:    commitType,
        snapshot:    s,
        isAnalyzed:  true,
      };
    });
  }, [commitList, rawSnapshots, activeBranch]);

  // Filtered timeline based on search, author, type, status
  const filteredTimeline = useMemo(() => {
    return enrichedTimeline.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMsg    = item.message?.toLowerCase().includes(q);
        const matchHash   = item.hash?.toLowerCase().includes(q) || item.fullHash?.toLowerCase().includes(q);
        const matchAuthor = item.author?.toLowerCase().includes(q);
        if (!matchMsg && !matchHash && !matchAuthor) return false;
      }
      // Author filter
      if (filterAuthor !== 'all' && item.author !== filterAuthor) return false;
      // Type filter
      if (filterType !== 'all' && item.typeInfo.type !== filterType) return false;
      // Status filter
      if (filterStatus === 'analyzed' && !item.isAnalyzed) return false;
      if (filterStatus === 'unanalyzed' && item.isAnalyzed) return false;

      return true;
    });
  }, [enrichedTimeline, searchQuery, filterAuthor, filterType, filterStatus]);

  // Selected item & details
  const selectedItem = useMemo(() => {
    const found = enrichedTimeline.find(item => item.hash === selectedCommitHash || item.fullHash === selectedCommitHash);
    return found || enrichedTimeline[0] || null;
  }, [enrichedTimeline, selectedCommitHash]);

  // Auto fetch details for selected commit
  useEffect(() => {
    if (selectedItem) {
      fetchDetailsForCommit(selectedItem.hash, selectedItem.fullHash);
    }
  }, [selectedItem, fetchDetailsForCommit]);

  const selectedDetails = selectedItem ? (commitDetailsMap[selectedItem.hash] || commitDetailsMap[selectedItem.fullHash] || null) : null;

  // Computed Architecture Diff for Right Panel
  const computedDiff = useMemo(() => {
    if (!selectedItem?.snapshot) return null;

    const currentSnap = selectedItem.snapshot;
    const analyzedItems = enrichedTimeline.filter(t => t.isAnalyzed && t.snapshot);
    const currentIndex = analyzedItems.findIndex(t => t.hash === selectedItem.hash || t.fullHash === selectedItem.fullHash);

    let baseSnap = null;
    if (compareMode === 'baseline') {
      baseSnap = analyzedItems[analyzedItems.length - 1]?.snapshot;
    } else if (compareMode === 'current') {
      baseSnap = analyzedItems[0]?.snapshot;
    } else {
      baseSnap = analyzedItems[currentIndex + 1]?.snapshot || null;
    }

    if (!baseSnap || baseSnap.id === currentSnap.id) {
      return currentSnap.archDiff || null;
    }

    return computeArchDiff(baseSnap.knowledgeGraph, currentSnap.knowledgeGraph, baseSnap.healthScore, currentSnap.healthScore);
  }, [selectedItem, compareMode, enrichedTimeline]);

  if (!project || project.importMethod !== 'git') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32 }}>
        <ClockIcon />
        <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: INTER, textAlign: 'center' }}>
          Repository History is available for Git-imported projects.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: '#FAFAFA', fontFamily: INTER,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .history-card { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .history-card:hover { border-color: #CBD5E1 !important; transform: translateY(-1px); }
        .history-card.active { border-color: #6366F1 !important; background: #FFFFFF !important; box-shadow: 0 4px 16px rgba(99,102,241,0.08) !important; }
        .history-filter-select { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-family: ${INTER}; font-size: 11px; font-weight: 500; color: #334155; padding: 5px 8px; outline: none; cursor: pointer; }
        .history-filter-select:focus { border-color: #6366F1; }
      `}</style>

      {/* ── 1. COMPACT PERSISTENT GIT HEADER ── */}
      <div style={{
        padding: '12px 24px', background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, gap: 16, boxSizing: 'border-box',
      }}>
        {/* Left: Provider + Repository + Branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ProviderDot provider={project.gitProvider} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: INTER }}>
              {getProviderLabel(project.gitProvider)}
            </span>
          </div>

          <span style={{ fontSize: 12, color: '#CBD5E1' }}>/</span>

          <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 600, color: '#334155' }}>
            {project.repoUrl?.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '') || project.name}
          </span>

          <span style={{ fontSize: 12, color: '#CBD5E1' }}>/</span>

          {/* Branch Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', padding: '4px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <BranchIcon />
            <select
              value={activeBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="history-filter-select"
              style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 700 }}
            >
              {branches.length > 0 ? (
                branches.map(b => (
                  <option key={b.name} value={b.name}>
                    {b.name} {b.isDefault ? '(default)' : ''}
                  </option>
                ))
              ) : (
                <option value={activeBranch}>{activeBranch}</option>
              )}
            </select>
          </div>
        </div>

        {/* Right: Commit hash, Sync info, Pull Changes button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {project.latestCommitHash && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: MONO, color: '#64748B' }}>
              <CommitIcon />
              <span>{project.latestCommitHash}</span>
            </div>
          )}

          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            Synced {timeAgo(project.lastSyncedAt)}
          </span>

          <button
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: '#0F172A', color: '#FFFFFF',
              border: 'none', cursor: checkingUpdates ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: INTER,
              transition: 'all 0.15s ease', boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
            }}
          >
            <SyncIcon spinning={checkingUpdates} />
            {checkingUpdates ? 'Syncing…' : 'Pull Changes'}
          </button>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTERS CONTROL BAR ── */}
      <div style={{
        padding: '10px 24px', background: '#FFFFFF',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, gap: 12, boxSizing: 'border-box',
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commits, message, hash, author…"
            style={{
              width: '100%', padding: '6px 10px 6px 30px',
              borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#F8FAFC', fontSize: 11, fontFamily: INTER,
              color: '#0F172A', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Commit Type filter */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="history-filter-select">
            <option value="all">All Types</option>
            <option value="feature">✨ Features</option>
            <option value="bugfix">🐛 Bug Fixes</option>
            <option value="refactor">♻️ Refactors</option>
            <option value="ui">🎨 UI &amp; Style</option>
            <option value="docs">📝 Documentation</option>
            <option value="perf">⚡ Performance</option>
            <option value="config">🔧 Config &amp; Deps</option>
            <option value="removal">🔥 Removals</option>
          </select>

          {/* Author filter */}
          {authorsList.length > 1 && (
            <select value={filterAuthor} onChange={(e) => setFilterAuthor(e.target.value)} className="history-filter-select">
              <option value="all">All Authors</option>
              {authorsList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {/* Status filter */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="history-filter-select">
            <option value="all">All Checkpoints</option>
            <option value="analyzed">✓ Snapshot Available</option>
            <option value="unanalyzed">● Not Analyzed Yet</option>
          </select>

          <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: MONO }}>
            {filteredTimeline.length} commit{filteredTimeline.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── 3. TWO-COLUMN WORKSPACE: TIMELINE & INSPECTOR ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT: REPOSITORY HISTORY TIMELINE ── */}
        <div style={{
          flex: '1 1 58%', overflowY: 'auto',
          padding: '24px 28px', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 16,
          borderRight: '1px solid #E2E8F0',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Repository History
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
              Real Git commits enriched with file change stats and architectural intelligence.
            </p>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 12, fontFamily: MONO }}>
              Loading repository commit history…
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 12 }}>
              No commits match the selected filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredTimeline.map((item, idx) => {
                const isSelected  = selectedItem?.hash === item.hash || selectedItem?.fullHash === item.fullHash;
                const snap        = item.snapshot;
                const isAnalyzing = analyzingHash === item.hash || analyzingHash === item.fullHash;
                const isExpanded  = !!expandedCards[item.hash];
                const details     = commitDetailsMap[item.hash] || commitDetailsMap[item.fullHash] || null;

                return (
                  <div
                    key={item.hash || idx}
                    className={`history-card${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedCommitHash(item.hash);
                      fetchDetailsForCommit(item.hash, item.fullHash);
                    }}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 16,
                      border: isSelected ? '1px solid #6366F1' : '1px solid rgba(226,232,240,0.9)',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 20px rgba(99,102,241,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                  >
                    {/* Top Row: Type Badge + Commit Hash + Author + Date */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Type Indicator Badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: INTER,
                          color: item.typeInfo.color, background: item.typeInfo.bg,
                          padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <span>{item.typeInfo.icon}</span>
                          <span>{item.typeInfo.label}</span>
                        </span>

                        <span style={{ fontSize: 11, fontFamily: MONO, color: '#64748B', fontWeight: 600 }}>
                          Commit {item.hash}
                        </span>
                      </div>

                      {/* Author & Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569', fontFamily: INTER }}>
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                          ) : (
                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#EEF2FF', color: '#6366F1', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyCenter: 'center' }}>
                              {item.author.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span style={{ fontWeight: 600 }}>{item.author}</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: MONO }}>
                          {formatDate(item.date)}
                        </span>
                      </div>
                    </div>

                    {/* Commit Message */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: INTER, lineHeight: 1.3 }}>
                      {item.message}
                    </div>

                    {/* File Changes Summary Bar */}
                    {details && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                        fontSize: 10.5, fontFamily: MONO, color: '#64748B',
                        padding: '6px 0', borderTop: '1px solid #F8FAFC',
                      }}>
                        {details.filesAdded > 0 && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>+ {details.filesAdded} added</span>
                        )}
                        {details.filesModified > 0 && (
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>~ {details.filesModified} modified</span>
                        )}
                        {details.filesDeleted > 0 && (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>- {details.filesDeleted} deleted</span>
                        )}
                        {details.insertions > 0 && (
                          <span style={{ color: '#10b981', fontWeight: 700 }}>+{details.insertions}</span>
                        )}
                        {details.deletions > 0 && (
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>-{details.deletions}</span>
                        )}

                        {/* Expand file details toggle button */}
                        {details.fileList?.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpandCard(item.hash, item.fullHash); }}
                            style={{
                              marginLeft: 'auto', border: 'none', background: 'transparent',
                              color: '#6366F1', fontSize: 10, fontWeight: 700, fontFamily: INTER,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <span>{isExpanded ? 'Hide files' : `View ${details.totalFiles} files`}</span>
                            <ChevronDownIcon open={isExpanded} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expandable File List */}
                    {isExpanded && details?.fileList && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 4,
                        padding: '10px 12px', background: '#F8FAFC', borderRadius: 10,
                        border: '1px solid #E2E8F0', marginTop: 2,
                      }}>
                        {details.fileList.map((f, fi) => (
                          <div key={fi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, fontFamily: MONO }}>
                            <span style={{ color: '#334155', wordBreak: 'break-all' }}>{f.path}</span>
                            <FileStatusBadge status={f.status} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Architectural Snapshot Status */}
                    <div style={{
                      paddingTop: 10, borderTop: '1px solid #F1F5F9', marginTop: 2,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      {item.isAnalyzed && snap ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em' }}>
                                Architecture Health
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MONO, color: scoreColor(snap.healthScore) }}>
                                {snap.healthScore}
                              </span>
                              {snap.archDiff?.healthDelta !== undefined && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, fontFamily: MONO,
                                  color: snap.archDiff.healthDelta >= 0 ? '#10B981' : '#EF4444',
                                  background: snap.archDiff.healthDelta >= 0 ? '#ECFDF5' : '#FEF2F2',
                                  padding: '1px 6px', borderRadius: 4,
                                }}>
                                  {snap.archDiff.healthDelta >= 0 ? `+${snap.archDiff.healthDelta}` : snap.archDiff.healthDelta}
                                </span>
                              )}
                            </div>

                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#10B981', fontFamily: MONO }}>
                              <CheckCircleIcon /> Snapshot Available
                            </span>
                          </div>

                          {/* AI Summary snippet */}
                          {snap.aiSummary && (
                            <div style={{
                              fontSize: 11.5, color: '#475569', lineHeight: 1.5,
                              background: '#F8FAFC', padding: '8px 12px', borderRadius: 8,
                              borderLeft: '3px solid #6366F1',
                            }}>
                              <strong style={{ color: '#6366F1' }}>AI Summary: </strong>
                              {snap.aiSummary}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', display: 'block' }}>
                              Architecture Snapshot
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                              Not analyzed yet
                            </span>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleAnalyzeCommit(item); }}
                            disabled={isAnalyzing}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 8,
                              background: isAnalyzing ? '#94A3B8' : '#EEF2FF',
                              color: isAnalyzing ? '#FFFFFF' : '#6366F1',
                              border: '1px solid rgba(99,102,241,0.2)',
                              cursor: isAnalyzing ? 'default' : 'pointer',
                              fontSize: 11, fontWeight: 700, fontFamily: INTER,
                              transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(99,102,241,0.1)',
                            }}
                          >
                            <SparklesIcon />
                            {isAnalyzing ? 'Analyzing…' : 'Analyze Architecture'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: HISTORY INSPECTOR PANEL ── */}
        <div style={{
          flex: '1 1 42%', overflowY: 'auto',
          padding: '24px 28px', boxSizing: 'border-box',
          background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {selectedItem ? (
            <>
              {/* Selected Commit Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, fontFamily: INTER,
                    color: selectedItem.typeInfo.color, background: selectedItem.typeInfo.bg,
                    padding: '2px 7px', borderRadius: 5,
                  }}>
                    {selectedItem.typeInfo.icon} {selectedItem.typeInfo.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', fontFamily: INTER }}>
                    HISTORY INSPECTOR
                  </span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0, fontFamily: INTER }}>
                  Commit {selectedItem.hash}
                </h3>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', margin: '4px 0 0', fontFamily: INTER, lineHeight: 1.4 }}>
                  {selectedItem.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 10.5, color: '#64748B', fontFamily: MONO }}>
                  <span>{selectedItem.author}</span>
                  <span>·</span>
                  <span>{formatDate(selectedItem.date)}</span>
                  <span>·</span>
                  <span>{selectedItem.branch}</span>
                </div>
              </div>

              {/* File Changes Stat Box */}
              {selectedDetails && (
                <div style={{ padding: '14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
                    Repository Change Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    <div style={{ padding: '6px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#059669' }}>+{selectedDetails.filesAdded}</div>
                      <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>Added</div>
                    </div>
                    <div style={{ padding: '6px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#0284c7' }}>~{selectedDetails.filesModified}</div>
                      <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>Modified</div>
                    </div>
                    <div style={{ padding: '6px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#dc2626' }}>-{selectedDetails.filesDeleted}</div>
                      <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>Deleted</div>
                    </div>
                  </div>

                  {/* File List in Inspector */}
                  {selectedDetails.fileList?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                      {selectedDetails.fileList.map((f, fi) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontFamily: MONO, padding: '3px 6px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #F1F5F9' }}>
                          <span style={{ color: '#334155', wordBreak: 'break-all' }}>{f.path}</span>
                          <FileStatusBadge status={f.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compare Mode Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8FAFC', padding: 4, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                {[
                  { id: 'previous', label: 'vs Previous' },
                  { id: 'baseline', label: 'vs Baseline' },
                  { id: 'current',  label: 'vs Current' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setCompareMode(mode.id)}
                    style={{
                      flex: 1, padding: '6px 0', border: 'none', borderRadius: 7,
                      background: compareMode === mode.id ? '#FFFFFF' : 'transparent',
                      color: compareMode === mode.id ? '#0F172A' : '#64748B',
                      fontSize: 10.5, fontWeight: compareMode === mode.id ? 700 : 500,
                      fontFamily: INTER, cursor: 'pointer',
                      boxShadow: compareMode === mode.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Architecture Diff Panel */}
              {computedDiff ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Health Delta Badge */}
                  <div style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: computedDiff.healthDelta >= 0 ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${computedDiff.healthDelta >= 0 ? '#A7F3D0' : '#FECACA'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                      Architecture Health Change
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 800, fontFamily: MONO,
                      color: computedDiff.healthDelta >= 0 ? '#059669' : '#DC2626',
                    }}>
                      {computedDiff.healthDelta >= 0 ? `+${computedDiff.healthDelta}` : computedDiff.healthDelta} pts
                    </span>
                  </div>

                  {/* Changes Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#10B981' }}>
                        {computedDiff.componentsAdded?.length || 0}
                      </div>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#64748B', marginTop: 1 }}>Components Added</div>
                    </div>

                    <div style={{ padding: '10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#EF4444' }}>
                        {computedDiff.componentsRemoved?.length || 0}
                      </div>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#64748B', marginTop: 1 }}>Components Removed</div>
                    </div>

                    <div style={{ padding: '10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#6366F1' }}>
                        {computedDiff.hooksAdded?.length || 0}
                      </div>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#64748B', marginTop: 1 }}>Hooks Added</div>
                    </div>

                    <div style={{ padding: '10px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: '#F59E0B' }}>
                        {computedDiff.circularsRemoved?.length || 0}
                      </div>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: '#64748B', marginTop: 1 }}>Circulars Resolved</div>
                    </div>
                  </div>

                  {/* AI Architectural Summary */}
                  <div style={{
                    padding: '16px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))',
                    border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366F1', fontSize: 11, fontWeight: 700 }}>
                      <SparklesIcon /> AI Architectural Analysis
                    </div>
                    <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                      {computedDiff.summary || selectedItem.snapshot?.aiSummary || "Architectural checkpoint analysis complete."}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: 12, background: '#F8FAFC', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                  <span>Architecture Snapshot not generated for this commit yet.</span>
                  <button
                    onClick={() => handleAnalyzeCommit(selectedItem)}
                    disabled={analyzingHash === selectedItem.hash}
                    style={{
                      padding: '8px 16px', borderRadius: 8, background: '#6366F1', color: '#FFFFFF',
                      border: 'none', fontWeight: 700, fontSize: 11, fontFamily: INTER, cursor: 'pointer',
                    }}
                  >
                    {analyzingHash === selectedItem.hash ? 'Analyzing…' : 'Analyze Architecture'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
              Select a commit from the history timeline to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
