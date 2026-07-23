import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addProject } from "@/redux/slices/hubSlice";
import {
  detectFromDirectoryHandle,
  detectFromZip,
} from "@/lib/projectDetector";
import { saveProjectHandle } from "@/lib/analysis/projectStore";
import {
  detectProvider,
  parseRepoUrl,
  fetchBranches,
  fetchLatestCommit,
  pullProjectFiles,
  getProviderLabel,
  runImportAnalysis,
  GitApiError,
} from "@/services/gitService";
import { IMPORT_STRATEGIES } from "@/engines/import/importStrategyEngine";

// ---------------------------------------------------------------------------
// Icon components (inline SVG — no extra dep)
// ---------------------------------------------------------------------------
const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
  </svg>
);

const ZipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6M12 18v-2M12 14v-2M12 10V8"/>
  </svg>
);

const GitIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <path d="M6 9v6M15.7 6.7 8.3 17.3"/>
  </svg>
);

const GithubIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const GitLabIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="m21.97 9.36-.02-.06L18.64 1.2a.47.47 0 0 0-.91.01L15.22 9H8.78L6.27 1.21a.47.47 0 0 0-.91 0L2.05 9.3l-.02.06A3.27 3.27 0 0 0 3.1 13.1l.02.01 6.1 4.56 3.04 2.29 1.85 1.4a.59.59 0 0 0 .71 0l1.85-1.4 3.04-2.29 6.12-4.57.02-.01a3.27 3.27 0 0 0 1.12-3.73z"/>
  </svg>
);

const BitbucketIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-neutral-850">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const BranchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Tech badges
// ---------------------------------------------------------------------------
const TechBadge = ({ label, active }) => (
  active ? (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widestest px-3 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm">
      <span className="text-neutral-500"><CheckIcon /></span> {label}
    </span>
  ) : null
);

// ---------------------------------------------------------------------------
// Provider Icon helper
// ---------------------------------------------------------------------------
const ProviderIcon = ({ provider, size = 16 }) => {
  switch (provider) {
    case 'github':    return <GithubIcon size={size} />;
    case 'gitlab':    return <GitLabIcon size={size} />;
    case 'bitbucket': return <BitbucketIcon size={size} />;
    default:          return <GitIcon />;
  }
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
const STATES = {
  IDLE:             "idle",              // show option tiles
  ZIP_DROP:         "zip-drop",          // show ZIP dropzone
  DETECTING:        "detecting",         // reading + analysing local folder/zip
  REVIEW:           "review",            // show detected summary, confirm
  IMPORTING:        "importing",         // simulated fetching/processing
  ERROR:            "error",             // show error
  GIT_INPUT:        "git-input",         // git URL + token input
  GIT_BRANCHES:     "git-branches",      // branch selector
  STRATEGY_ANALYSIS:"strategy-analysis", // pre-import strategy & repository analysis report
  GIT_CLONING:      "git-cloning",       // fetching remote files + analyzing
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
const ImportProjectModal = ({ onClose }) => {
  const dispatch = useDispatch();

  const [view, setView]               = useState(STATES.IDLE);
  const [detected, setDetected]       = useState(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const [isDragging, setIsDragging]   = useState(false);

  // Git state
  const [gitUrl, setGitUrl]                 = useState("");
  const [gitToken, setGitToken]             = useState("");
  const [showToken, setShowToken]           = useState(false);
  const [gitProvider, setGitProvider]       = useState(null);
  const [parsedRepo, setParsedRepo]         = useState(null);
  const [branches, setBranches]             = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [strategyReport, setStrategyReport] = useState(null);
  const [analyzingStrategy, setAnalyzingStrategy] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [gitProgress, setGitProgress]       = useState(0);
  const [gitProgressLabel, setGitProgressLabel] = useState("");

  const zipInputRef = useRef();

  // Live provider detection as URL is typed
  useEffect(() => {
    if (!gitUrl.trim()) { setGitProvider(null); setParsedRepo(null); return; }
    const provider = detectProvider(gitUrl);
    const parsed   = parseRepoUrl(gitUrl);
    setGitProvider(provider !== 'generic' ? provider : null);
    setParsedRepo(parsed);
  }, [gitUrl]);

  // Folder selection
  const handleSelectFolder = useCallback(async () => {
    if (!("showDirectoryPicker" in window)) {
      setErrorMsg(
        "Your browser does not support the File System Access API.\n" +
        "Please use Chrome or Edge 86+ to import a local folder."
      );
      setView(STATES.ERROR);
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "read" });
      setView(STATES.DETECTING);
      const result = await detectFromDirectoryHandle(dirHandle);
      
      const projectId = crypto.randomUUID();
      result.id = projectId;

      if (!window.projectHandles) window.projectHandles = {};
      window.projectHandles[projectId] = dirHandle;
      await saveProjectHandle(projectId, dirHandle);

      setDetected(result);
      setView(STATES.REVIEW);
    } catch (err) {
      if (err.name === "AbortError") {
        setView(STATES.IDLE);
        return;
      }
      setErrorMsg(err.message ?? "Failed to read the selected folder.");
      setView(STATES.ERROR);
    }
  }, []);

  // ZIP import
  const processZip = useCallback(async (file) => {
    if (!file || !file.name.endsWith(".zip")) {
      setErrorMsg("Please select a valid .zip archive.");
      setView(STATES.ERROR);
      return;
    }
    setView(STATES.DETECTING);
    try {
      const result = await detectFromZip(file);
      
      const projectId = crypto.randomUUID();
      result.id = projectId;

      if (!window.projectZipFiles) window.projectZipFiles = {};
      window.projectZipFiles[projectId] = file;
      await saveProjectHandle(projectId, file);

      setDetected(result);
      setView(STATES.REVIEW);
    } catch (err) {
      setErrorMsg(err.message ?? "Failed to process ZIP archive.");
      setView(STATES.ERROR);
    }
  }, []);

  const handleZipInputChange = (e) => processZip(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processZip(e.dataTransfer.files?.[0]);
  };

  // Confirm local import
  const handleConfirm = () => {
    if (!detected) return;
    setView(STATES.IMPORTING);
    setTimeout(() => {
      dispatch(addProject(detected));
      onClose();
    }, 1800);
  };

  // ── Git flow ──────────────────────────────────────────────────────────────

  const handleGitConnect = useCallback(async () => {
    if (!parsedRepo) {
      setErrorMsg(new GitApiError({
        type: 'INVALID_URL',
        title: 'Invalid repository URL',
        message: 'Please enter a valid GitHub repository URL.\n\nExamples:\nhttps://github.com/facebook/react\nhttps://github.com/user/project',
        provider: detectProvider(gitUrl),
      }));
      setView(STATES.ERROR);
      return;
    }
    setFetchingBranches(true);
    try {
      const provider = detectProvider(gitUrl);
      const { owner, repo } = parsedRepo;
      const token = gitToken.trim() || null;

      const fetchedBranches = await fetchBranches(provider, owner, repo, token);

      setBranches(fetchedBranches);
      const defaultBranch = fetchedBranches.find((b) => b.isDefault) || fetchedBranches[0];
      setSelectedBranch(defaultBranch?.name || 'main');
      setView(STATES.GIT_BRANCHES);
    } catch (err) {
      setErrorMsg(err);
      setView(STATES.ERROR);
    } finally {
      setFetchingBranches(false);
    }
  }, [gitUrl, gitToken, parsedRepo]);

  const handleRunStrategyAnalysis = useCallback(async () => {
    if (!parsedRepo || !selectedBranch) return;
    const { owner, repo } = parsedRepo;
    const provider = detectProvider(gitUrl);
    const token = gitToken.trim() || null;

    setAnalyzingStrategy(true);
    setView(STATES.STRATEGY_ANALYSIS);

    try {
      const report = await runImportAnalysis(provider, owner, repo, selectedBranch, token);
      setStrategyReport(report);
      setSelectedStrategyId(report.chosenStrategy.id);
    } catch (err) {
      console.warn('[ImportModal] Strategy analysis fallback:', err);
    } finally {
      setAnalyzingStrategy(false);
    }
  }, [gitUrl, gitToken, parsedRepo, selectedBranch]);

  const handleGitImport = useCallback(async () => {
    if (!parsedRepo || !selectedBranch) return;

    const { owner, repo, repoUrl } = parsedRepo;
    const provider = detectProvider(gitUrl);
    const token    = gitToken.trim() || null;

    setView(STATES.GIT_CLONING);
    setGitProgress(5);
    setGitProgressLabel("Connecting to repository…");

    try {
      // 1. Get latest commit hash
      setGitProgress(8);
      setGitProgressLabel("Fetching branch info…");
      const commitHash = await fetchLatestCommit(provider, owner, repo, selectedBranch, token);

      // 2. Pull source files executing the chosen strategy
      const files = await pullProjectFiles(
        provider, owner, repo, selectedBranch, token,
        (progress, label) => {
          setGitProgress(progress);
          setGitProgressLabel(label);
        },
        selectedStrategyId
      );

      if (!files || files.length === 0) {
        throw new GitApiError({
          type: 'EMPTY_REPO',
          title: 'Empty repository',
          message: 'This repository contains no source files to analyze.',
          provider,
        });
      }

      setGitProgress(92);
      setGitProgressLabel("Detecting project structure…");

      // 3. Detect project metadata from fetched files
      const { detectFromFiles } = await import("@/lib/projectDetector");
      let projectMeta;
      try {
        projectMeta = await detectFromFiles(files);
      } catch {
        // Fallback detection from file list
        const hasTs    = files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.ts'));
        const hasTw    = files.some(f => f.content?.includes('tailwind'));
        const hasRedux = files.some(f => f.content?.includes('@reduxjs') || f.content?.includes('createSlice'));
        const hasRouter= files.some(f => f.content?.includes('react-router'));
        const pkgFile  = files.find(f => f.path === 'package.json');
        let pkgJson = {};
        try { pkgJson = JSON.parse(pkgFile?.content || '{}'); } catch {}
        projectMeta = {
          name:          pkgJson.name || repo,
          description:   pkgJson.description || `Repository: ${owner}/${repo}`,
          framework:     'React',
          buildTool:     pkgJson.devDependencies?.vite ? 'Vite' : pkgJson.devDependencies?.webpack ? 'Webpack' : null,
          reactVersion:  pkgJson.dependencies?.react?.replace(/[^0-9.]/g, '') || null,
          packageVersion:pkgJson.version || null,
          hasTypeScript: hasTs,
          hasTailwind:   hasTw,
          hasRedux,
          hasRouter,
        };
      }

      setGitProgress(95);
      setGitProgressLabel("Preparing workspace…");

      // 4. Build project record
      const projectId = crypto.randomUUID();

      // Cache files in-memory for analysisService to pick up
      if (!window.projectGitFiles) window.projectGitFiles = {};
      window.projectGitFiles[projectId] = files;

      const projectRecord = {
        id:              projectId,
        name:            projectMeta.name || repo,
        description:     projectMeta.description || null,
        framework:       projectMeta.framework || 'React',
        buildTool:       projectMeta.buildTool || null,
        reactVersion:    projectMeta.reactVersion || null,
        packageVersion:  projectMeta.packageVersion || null,
        hasTypeScript:   projectMeta.hasTypeScript || false,
        hasTailwind:     projectMeta.hasTailwind || false,
        hasRedux:        projectMeta.hasRedux || false,
        hasRouter:       projectMeta.hasRouter || false,
        importMethod:    'git',
        folderName:      repo,
        // Git metadata
        gitProvider:     provider,
        repoUrl,
        defaultBranch:   branches.find(b => b.isDefault)?.name || selectedBranch,
        activeBranch:    selectedBranch,
        latestCommitHash:commitHash,
        lastSyncedAt:    new Date().toISOString(),
        remoteAheadBy:   0,
      };

      setGitProgress(100);
      setGitProgressLabel("Done!");

      await new Promise((r) => setTimeout(r, 600));

      dispatch(addProject(projectRecord));
      onClose();
    } catch (err) {
      setErrorMsg(err);
      setView(STATES.ERROR);
    }
  }, [parsedRepo, selectedBranch, gitUrl, gitToken, branches, dispatch, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" onClick={onClose}>
      <style>{`
        @keyframes modal3dEnter {
          0% {
            opacity: 0;
            transform: perspective(1400px) rotateX(12deg) translateY(35px) translateZ(-100px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: perspective(1400px) rotateX(0deg) translateY(0) translateZ(0) scale(1);
          }
        }
        .modal-3d-enter {
          animation: modal3dEnter 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        .progress-pulse { animation: progressPulse 1.4s ease-in-out infinite; }
        .branch-item:hover { background: #f9fafb; }
      `}</style>

      {/* Dark overlay backdrop to emphasize the light premium modal */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm transition-opacity duration-300" />

      <div
        className="relative w-full max-w-lg modal-3d-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Panel */}
        <div className="bg-white border border-neutral-200/80 rounded-[28px] overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.5)]">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-neutral-100 bg-white">
            <div>
              <h2 className="font-display text-2xl font-[900] text-neutral-900 tracking-tightest leading-none">
                {view === STATES.REVIEW           ? "Review Import"
                 : view === STATES.GIT_INPUT      ? "Git Repository"
                 : view === STATES.GIT_BRANCHES   ? "Select Branch"
                 : view === STATES.STRATEGY_ANALYSIS ? "Import Strategy Analysis"
                 : view === STATES.GIT_CLONING    ? "Importing Repository"
                 : "Import Project"}
              </h2>
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400 mt-2">
                {view === STATES.REVIEW            ? "Confirm detected project details"
                 : view === STATES.GIT_INPUT       ? "Connect any public or private repository"
                 : view === STATES.GIT_BRANCHES    ? "Choose the branch to analyze"
                 : view === STATES.STRATEGY_ANALYSIS ? "Optimal strategy selected for repository"
                 : view === STATES.GIT_CLONING     ? "Fetching and analyzing repository…"
                 : "React Architect will discover your project automatically"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 bg-neutral-50 transition-colors font-mono text-[11px] flex-shrink-0 font-bold"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-8 py-7 bg-neutral-50/65">
            {view === STATES.IDLE        && <IdleView onFolder={handleSelectFolder} onZip={() => setView(STATES.ZIP_DROP)} onGit={() => setView(STATES.GIT_INPUT)} />}
            {view === STATES.ZIP_DROP    && <ZipDropView zipInputRef={zipInputRef} isDragging={isDragging} setIsDragging={setIsDragging} onDrop={handleDrop} onInputChange={handleZipInputChange} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.DETECTING   && <DetectingView />}
            {view === STATES.IMPORTING   && <ImportingView />}
            {view === STATES.REVIEW      && <ReviewView detected={detected} onConfirm={handleConfirm} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.ERROR && (
              <ErrorView
                error={errorMsg}
                onBack={() => { setErrorMsg(null); setView(STATES.IDLE); }}
                onAddToken={() => { setView(STATES.GIT_INPUT); setShowToken(true); }}
              />
            )}
            {view === STATES.GIT_INPUT   && (
              <GitInputView
                gitUrl={gitUrl}
                setGitUrl={setGitUrl}
                gitToken={gitToken}
                setGitToken={setGitToken}
                showToken={showToken}
                setShowToken={setShowToken}
                gitProvider={gitProvider}
                parsedRepo={parsedRepo}
                onConnect={handleGitConnect}
                onBack={() => setView(STATES.IDLE)}
                fetchingBranches={fetchingBranches}
              />
            )}
            {view === STATES.GIT_BRANCHES && (
              <GitBranchView
                branches={branches}
                selectedBranch={selectedBranch}
                setSelectedBranch={setSelectedBranch}
                gitProvider={gitProvider}
                parsedRepo={parsedRepo}
                onImport={handleRunStrategyAnalysis}
                onBack={() => setView(STATES.GIT_INPUT)}
              />
            )}
            {view === STATES.STRATEGY_ANALYSIS && (
              <StrategyAnalysisView
                strategyReport={strategyReport}
                analyzingStrategy={analyzingStrategy}
                selectedStrategyId={selectedStrategyId}
                setSelectedStrategyId={setSelectedStrategyId}
                onStartImport={handleGitImport}
                onBack={() => setView(STATES.GIT_BRANCHES)}
              />
            )}
            {view === STATES.GIT_CLONING && (
              <GitCloningView progress={gitProgress} label={gitProgressLabel} />
            )}
          </div>

          {/* Footer note */}
          {view === STATES.IDLE && (
            <div className="px-8 pb-8 bg-neutral-50/65">
              <div className="border-t border-neutral-200/80 pt-6">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-950 font-[900] mb-3">
                  Auto-detect from your project
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Project Name", "Framework", "React Version", "Build Tool", "TypeScript", "Tailwind", "Redux"].map((t) => (
                    <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-2.5 py-1 rounded border border-neutral-250 bg-white text-neutral-500 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

const IdleView = ({ onFolder, onZip, onGit }) => (
  <div className="flex flex-col gap-4">
    <ImportOption
      icon={<FolderIcon />}
      title="Select Local Folder"
      desc="Choose an existing React project on your machine"
      accent="#00B8D9"
      onClick={onFolder}
    />

    <ImportOption
      icon={<ZipIcon />}
      title="Import ZIP Archive"
      desc="Drop or select a zipped React project"
      accent="#7F56D9"
      onClick={onZip}
    />

    <ImportOption
      icon={<GitIcon />}
      title="Git Repository"
      desc="Connect GitHub, GitLab, or Bitbucket — public or private"
      accent="#10b981"
      onClick={onGit}
    />
  </div>
);

// ── Git Input View ─────────────────────────────────────────────────────────

const GitInputView = ({
  gitUrl, setGitUrl, gitToken, setGitToken,
  showToken, setShowToken, gitProvider, parsedRepo,
  onConnect, onBack, fetchingBranches,
}) => {
  const isValid = !!parsedRepo;

  return (
    <div className="flex flex-col gap-5">
      {/* URL Input */}
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-2 block">
          Repository URL
        </label>
        <div className="relative">
          <input
            type="url"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full px-4 py-3.5 pr-10 rounded-xl border border-neutral-200 bg-white font-mono text-[12px] text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
            autoFocus
          />
          {gitProvider && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
              <ProviderIcon provider={gitProvider} size={16} />
            </div>
          )}
        </div>
        {parsedRepo && (
          <p className="font-mono text-[9px] text-emerald-600 mt-2 flex items-center gap-1.5">
            <span>✓</span>
            <span>{getProviderLabel(gitProvider || 'generic')} · {parsedRepo.owner}/{parsedRepo.repo}</span>
          </p>
        )}
        {gitUrl && !parsedRepo && (
          <p className="font-mono text-[9px] text-amber-500 mt-2">
            Enter a valid repository URL to continue
          </p>
        )}
      </div>

      {/* Token Input */}
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-2 flex items-center gap-1.5">
          <LockIcon />
          Personal Access Token
          <span className="text-neutral-300 font-normal normal-case tracking-normal">— optional, for private repos</span>
        </label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={gitToken}
            onChange={(e) => setGitToken(e.target.value)}
            placeholder="ghp_••••••••••••••••"
            className="w-full px-4 py-3.5 pr-16 rounded-xl border border-neutral-200 bg-white font-mono text-[12px] text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors font-bold"
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <p className="font-mono text-[9px] text-neutral-400 mt-1.5">
          Stored in memory only — never persisted or sent to any server.
        </p>
      </div>

      {/* Supported providers */}
      <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-neutral-100 bg-white">
        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Supports</span>
        <div className="flex items-center gap-3 ml-1">
          {[
            { id: 'github', label: 'GitHub' },
            { id: 'gitlab', label: 'GitLab' },
            { id: 'bitbucket', label: 'Bitbucket' },
          ].map(({ id, label }) => (
            <div key={id} className={`flex items-center gap-1.5 font-mono text-[9px] text-neutral-600 transition-colors ${gitProvider === id ? 'text-neutral-900 font-bold' : ''}`}>
              <ProviderIcon provider={id} size={13} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300 font-bold"
        >
          ← Back
        </button>
        <button
          onClick={onConnect}
          disabled={!isValid || fetchingBranches}
          className={`flex-2 flex-1 py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 ${
            isValid && !fetchingBranches
              ? "bg-neutral-950 text-white hover:bg-neutral-800 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
          }`}
        >
          {fetchingBranches ? (
            <span className="flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Connecting…
            </span>
          ) : "Connect →"}
        </button>
      </div>
    </div>
  );
};

// ── Git Branch View ────────────────────────────────────────────────────────

const GitBranchView = ({ branches, selectedBranch, setSelectedBranch, gitProvider, parsedRepo, onImport, onBack }) => (
  <div className="flex flex-col gap-5">
    {/* Repo info */}
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-neutral-100 bg-white">
      <ProviderIcon provider={gitProvider} size={15} />
      <div>
        <p className="font-mono text-[11px] text-neutral-900 font-bold">{parsedRepo?.owner}/{parsedRepo?.repo}</p>
        <p className="font-mono text-[9px] text-neutral-400">{branches.length} branch{branches.length !== 1 ? 'es' : ''} found</p>
      </div>
    </div>

    {/* Branch list */}
    <div>
      <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-2 flex items-center gap-1.5">
        <BranchIcon /> Select Branch
      </label>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden max-h-52 overflow-y-auto">
        {branches.map((branch, i) => (
          <button
            key={branch.name}
            onClick={() => setSelectedBranch(branch.name)}
            className={`branch-item w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
              i > 0 ? "border-t border-neutral-100" : ""
            } ${selectedBranch === branch.name ? "bg-neutral-950 text-white hover:bg-neutral-950" : "text-neutral-700 hover:bg-neutral-50"}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`font-mono text-[11px] font-bold ${selectedBranch === branch.name ? "text-white" : "text-neutral-900"}`}>
                {branch.name}
              </span>
              {branch.isDefault && (
                <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded border ${
                  selectedBranch === branch.name
                    ? "border-white/20 text-white/70"
                    : "border-neutral-200 text-neutral-400"
                }`}>
                  default
                </span>
              )}
            </div>
            {branch.commitHash && (
              <span className={`font-mono text-[9px] ${selectedBranch === branch.name ? "text-white/60" : "text-neutral-400"}`}>
                {branch.commitHash}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-300 font-bold"
      >
        ← Back
      </button>
      <button
        onClick={onImport}
        disabled={!selectedBranch}
        className="flex-1 py-3.5 rounded-xl bg-neutral-950 text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      >
        Analyze Strategy →
      </button>
    </div>
  </div>
);

// ── Git Cloning View ───────────────────────────────────────────────────────

const GitCloningView = ({ progress, label }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-6">
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="4"/>
        <circle
          cx="32" cy="32" r="28" fill="none" stroke="#111827" strokeWidth="4"
          strokeDasharray={`${2 * Math.PI * 28}`}
          strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[11px] font-bold text-neutral-900">{Math.round(progress)}%</span>
      </div>
    </div>

    <div className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 font-bold progress-pulse">
        {label || "Importing…"}
      </p>
    </div>

    <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-neutral-900 rounded-full"
        style={{ width: `${progress}%`, transition: "width 0.4s ease" }}
      />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Shared import option card
// ---------------------------------------------------------------------------

const ImportOption = ({ icon, title, desc, accent, onClick, comingSoon }) => {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (comingSoon || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    
    setCoords({ x: rotateY, y: rotateX });
  };

  const getStyle = () => {
    if (comingSoon) {
      return {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)",
        boxShadow: "none",
        transformStyle: "preserve-3d",
      };
    }

    if (isHovered) {
      return {
        transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg) scale3d(1.025, 1.025, 1.025) translateY(-8px) translateZ(24px)`,
        boxShadow: "0 30px 60px rgba(0, 0, 0, 0.08), 0 5px 15px rgba(0, 0, 0, 0.02)",
        transition: "transform 100ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms ease-out",
        transformStyle: "preserve-3d",
      };
    }

    return {
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(-3px) translateZ(6px)",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.01)",
      transition: "transform 500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 500ms ease-out",
      transformStyle: "preserve-3d",
    };
  };

  return (
    <button
      ref={cardRef}
      onClick={comingSoon ? undefined : onClick}
      disabled={comingSoon}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !comingSoon && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCoords({ x: 0, y: 0 }); }}
      style={getStyle()}
      className={`w-full flex items-center gap-4.5 p-5.5 rounded-2xl border text-left group select-none ${
        comingSoon
          ? "border-neutral-150 opacity-40 bg-neutral-100/50 cursor-not-allowed"
          : "border-neutral-200/80 bg-white hover:border-neutral-350 cursor-pointer"
      }`}
    >
      <span 
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border transition-all duration-300"
        style={!comingSoon ? { 
          color: accent, 
          borderColor: `${accent}35`, 
          background: `${accent}08`, 
          transform: isHovered ? "translateZ(20px)" : "translateZ(0px)" 
        } : { color: "#98A2B3", borderColor: "#E4E7EC", background: "#F2F4F7" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0" style={{ transform: isHovered ? "translateZ(12px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[15px] font-[800] text-neutral-900 tracking-tightest">{title}</span>
          {comingSoon && (
            <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-200 bg-neutral-100 text-neutral-400">
              Coming soon
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-neutral-400 mt-1">{desc}</p>
      </div>
      {!comingSoon && (
        <span 
          className="text-neutral-300 group-hover:text-neutral-700 transition-all text-base font-semibold ml-1"
          style={{ transform: isHovered ? "translateZ(25px)" : "translateZ(0px)", transition: "transform 300ms ease" }}
        >
          →
        </span>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Other sub-views (unchanged)
// ---------------------------------------------------------------------------

const ZipDropView = ({ zipInputRef, isDragging, setIsDragging, onDrop, onInputChange, onBack }) => {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 8;
    const rotateY = (x / (rect.width / 2)) * 8;
    setCoords({ x: rotateY, y: rotateX });
  };

  const style = isHovered
    ? {
        transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg) scale3d(1.015, 1.015, 1.015) translateZ(8px)`,
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05)",
        transition: "transform 100ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms ease-out",
        transformStyle: "preserve-3d",
      }
    : {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)",
        boxShadow: "none",
        transition: "transform 500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 500ms ease-out",
        transformStyle: "preserve-3d",
      };

  return (
    <div className="flex flex-col gap-4.5">
      <div
        ref={containerRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setCoords({ x: 0, y: 0 }); }}
        style={style}
        className={`border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging 
            ? "border-neutral-900 bg-white shadow-[inset_0_0_15px_rgba(0,0,0,0.02)]" 
            : "border-neutral-250 hover:border-neutral-350 bg-white hover:shadow-sm"
        }`}
        onClick={() => zipInputRef.current?.click()}
      >
        <span className="text-neutral-400" style={{ transform: isHovered ? "translateZ(15px)" : "translateZ(0px)", transition: "transform 300ms ease" }}><ZipIcon /></span>
        <p className="font-display text-sm font-[800] text-neutral-900 mt-4.5" style={{ transform: isHovered ? "translateZ(10px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>Drop your ZIP here</p>
        <p className="font-mono text-[10px] text-neutral-400 mt-1" style={{ transform: isHovered ? "translateZ(5px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>or click to browse</p>
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      <button
        onClick={onBack}
        className="py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-300 text-center font-bold"
      >
        ← Back
      </button>
    </div>
  );
};

const DetectingView = () => (
  <div className="flex flex-col items-center justify-center py-14 gap-4.5">
    <SpinnerIcon />
    <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">
      Analysing project structure…
    </p>
  </div>
);

const ImportingView = () => (
  <div className="flex flex-col items-center justify-center py-14 gap-4.5">
    <SpinnerIcon />
    <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-500 font-bold animate-pulse">
      Fetching &amp; indexing project source…
    </p>
  </div>
);

const ReviewView = ({ detected, onConfirm, onBack }) => (
  <div className="flex flex-col gap-6">
    <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 mb-1">
        Detected Identity
      </p>
      <h3 className="font-display text-2xl font-[900] text-neutral-900 tracking-tightest leading-none">
        {detected.name}
      </h3>
      {detected.description && (
        <p className="font-mono text-[10px] text-neutral-500 mt-2 leading-relaxed">
          {detected.description}
        </p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-3.5">
      <MetaRow label="Framework"    value={detected.framework} />
      <MetaRow label="Build Tool"   value={detected.buildTool ?? "—"} />
      <MetaRow label="React Version" value={detected.reactVersion ? `v${detected.reactVersion}` : "—"} />
      <MetaRow label="Package Version" value={detected.packageVersion ? `v${detected.packageVersion}` : "—"} />
    </div>

    <div className="flex flex-wrap gap-2 pt-1">
      <TechBadge label="TypeScript" active={detected.hasTypeScript} />
      <TechBadge label="Tailwind"   active={detected.hasTailwind} />
      <TechBadge label="Redux"      active={detected.hasRedux} />
      <TechBadge label="Router"     active={detected.hasRouter} />
    </div>

    {detected._zipParsePending && (
      <p className="font-mono text-[9px] text-neutral-400 border border-neutral-200 rounded-xl px-4 py-3 bg-white">
        Full ZIP analysis (dependencies, routes, components) will be available in Sprint 6.
      </p>
    )}

    <div className="flex gap-3.5 pt-2">
      <button
        onClick={onBack}
        className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-300 font-bold"
      >
        ← Back
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-3.5 rounded-xl bg-neutral-950 text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-850 hover:shadow-md transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      >
        Import Project
      </button>
    </div>
  </div>
);

const MetaRow = ({ label, value }) => (
  <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 shadow-sm">
    <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 mb-0.5">{label}</p>
    <p className="font-mono text-[12px] text-neutral-900 font-bold">{value}</p>
  </div>
);

const StrategyAnalysisView = ({
  strategyReport,
  analyzingStrategy,
  selectedStrategyId,
  setSelectedStrategyId,
  onStartImport,
  onBack,
}) => {
  if (analyzingStrategy || !strategyReport) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <SpinnerIcon />
        <p className="font-display text-sm font-[800] text-neutral-900">
          Analyzing Repository Characteristics…
        </p>
        <p className="font-mono text-[10px] text-neutral-400">
          Evaluating repository size, file tree, media ratio, and bandwidth efficiency
        </p>
      </div>
    );
  }

  const { chosenStrategy, repoSizeMb, sourceFileCount, binaryAssetCount, estimatedDownloadMb, rationale } = strategyReport;

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm text-center">
          <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">Repo Size</p>
          <p className="font-mono text-[12px] font-[800] text-neutral-900">{repoSizeMb} MB</p>
        </div>
        <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm text-center">
          <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">Source Files</p>
          <p className="font-mono text-[12px] font-[800] text-emerald-600">{sourceFileCount}</p>
        </div>
        <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm text-center">
          <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">Binary Assets</p>
          <p className="font-mono text-[12px] font-[800] text-neutral-500">{binaryAssetCount}</p>
        </div>
        <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm text-center">
          <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">Est. Download</p>
          <p className="font-mono text-[12px] font-[800] text-indigo-600">~{estimatedDownloadMb} MB</p>
        </div>
      </div>

      {/* Strategy Card */}
      <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{chosenStrategy.icon}</span>
            <div>
              <p className="font-display text-sm font-[800] text-neutral-900 leading-tight">
                {chosenStrategy.label}
              </p>
              <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider font-bold">
                Auto-Selected Import Strategy
              </p>
            </div>
          </div>

          <span
            className="font-mono text-[9.5px] font-bold px-2.5 py-1 rounded-full border"
            style={{ color: chosenStrategy.color, backgroundColor: chosenStrategy.bg, borderColor: `${chosenStrategy.color}40` }}
          >
            Optimal Strategy
          </span>
        </div>

        <p className="font-mono text-[10.5px] text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
          {rationale}
        </p>

        {/* Strategy Manual Selector / Override */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider">
            Strategy Override:
          </span>
          <select
            value={selectedStrategyId || chosenStrategy.id}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="font-mono text-[10px] font-bold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            {Object.values(IMPORT_STRATEGIES).map(st => (
              <option key={st.id} value={st.id}>
                {st.icon} {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 transition-all font-bold"
        >
          ← Change Branch
        </button>
        <button
          onClick={onStartImport}
          className="flex-1 py-3.5 rounded-xl bg-neutral-950 text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>Start Import</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

const ErrorView = ({ error, onBack, onAddToken }) => {
  const [showDetails, setShowDetails] = useState(false);

  const isObj    = error && typeof error === 'object';
  const title    = isObj ? (error.title || "Import Failed") : "Import Failed";
  const message  = isObj ? (error.message || String(error)) : String(error);
  const type     = isObj ? error.type : 'GENERIC';
  const status   = isObj ? error.status : null;
  const endpoint = isObj ? error.endpoint : null;
  const provider = isObj ? error.provider : null;
  const rawBody  = isObj ? error.rawBody : null;

  const showAddToken = type === 'PRIVATE_REPO' || type === 'RATE_LIMIT';

  // Icon mapping
  const iconEmoji =
    type === 'PRIVATE_REPO' ? '🔒' :
    type === 'RATE_LIMIT'   ? '⏳' :
    type === 'NOT_FOUND'    ? '🔍' :
    type === 'INVALID_URL'  ? '🌐' :
    type === 'NETWORK_ERROR'? '📡' :
    type === 'EMPTY_REPO'   ? '📂' : '!';

  const iconBg =
    type === 'PRIVATE_REPO' || type === 'RATE_LIMIT'
      ? 'bg-amber-50 border-amber-200 text-amber-600'
      : 'bg-red-50 border-red-200 text-red-500';

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold border ${iconBg}`}>
        {iconEmoji}
      </div>

      <div className="max-w-md mx-auto">
        <p className="font-display text-lg font-[800] text-neutral-900 mb-2">{title}</p>
        <p className="font-mono text-[11px] text-neutral-600 leading-relaxed whitespace-pre-line text-left bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          {message}
        </p>
      </div>

      {/* Developer Diagnostics Expandable Section */}
      {(status || endpoint || provider || rawBody) && (
        <div className="w-full max-w-md mt-1 text-left">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors flex items-center gap-1 font-bold mx-auto"
          >
            <span>{showDetails ? "Hide Developer Details ▲" : "View Developer Details ▼"}</span>
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-[10px] text-neutral-700 flex flex-col gap-1.5 shadow-sm">
              {provider && (
                <div className="flex justify-between border-b border-neutral-100 pb-1">
                  <span className="text-neutral-400 uppercase font-bold">Provider:</span>
                  <span className="font-bold text-neutral-900">{getProviderLabel(provider)}</span>
                </div>
              )}
              {status && (
                <div className="flex justify-between border-b border-neutral-100 pb-1">
                  <span className="text-neutral-400 uppercase font-bold">HTTP Status Code:</span>
                  <span className="font-bold text-red-600">{status}</span>
                </div>
              )}
              {endpoint && (
                <div className="flex flex-col gap-0.5 border-b border-neutral-100 pb-1">
                  <span className="text-neutral-400 uppercase font-bold">Endpoint Called:</span>
                  <span className="text-neutral-800 break-all text-[9.5px] bg-neutral-50 p-1 rounded">{endpoint}</span>
                </div>
              )}
              {rawBody && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-neutral-400 uppercase font-bold">Provider Response:</span>
                  <span className="text-neutral-700 break-all text-[9.5px] bg-neutral-50 p-1.5 rounded border border-neutral-100 max-h-24 overflow-y-auto">{rawBody}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-2 w-full max-w-sm">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 transition-all font-bold"
        >
          ← Try Again
        </button>
        {showAddToken && onAddToken && (
          <button
            onClick={onAddToken}
            className="flex-1 py-3.5 rounded-xl bg-neutral-950 text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-800 transition-all shadow-md"
          >
            🔒 Add Token
          </button>
        )}
      </div>
    </div>
  );
};

export default ImportProjectModal;
