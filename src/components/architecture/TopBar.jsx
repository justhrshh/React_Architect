import { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronRight, Folder, GitBranch, RefreshCw, Check } from 'lucide-react';
import { INTER } from './constants';
import { selectSelectedProject } from '@/redux/slices/hubSlice';
import { startProjectAnalysis } from '@/services/analysisService';

const MONO = "'JetBrains Mono', 'Fira Code', monospace";

export default function TopBar({
  projectName,
  healthScore = 100,
  activeTab = 'flow',
  handleBack,
  isSidebarCollapsed = false,
  showInspector = false,
  leftOffset = 286,
  rightOffset = 350,
  gitMeta = null,
}) {
  const dispatch = useDispatch();
  const selectedProject = useSelector(selectSelectedProject);
  const analysisStatus  = useSelector((state) => state.analysis.status);
  const lastAnalyzedAt  = useSelector((state) => state.analysis.lastAnalyzedAt);

  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const isAnalyzing = isReanalyzing || analysisStatus === 'analyzing';

  const handleReanalyze = useCallback(async () => {
    if (isAnalyzing || !selectedProject) return;

    setIsReanalyzing(true);
    setJustCompleted(false);

    // Yield to main thread so React can paint the 'Analyzing...' button state immediately
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      await dispatch(
        startProjectAnalysis({
          projectId: selectedProject.id,
          project: selectedProject,
        })
      ).unwrap();

      setIsReanalyzing(false);
      setJustCompleted(true);
      setTimeout(() => {
        setJustCompleted(false);
      }, 2500);
    } catch (err) {
      console.error('Reanalysis failed:', err);
      setIsReanalyzing(false);
    }
  }, [isAnalyzing, selectedProject, dispatch]);

  const formattedTime = useMemo(() => {
    const timestamp = lastAnalyzedAt || Date.now();
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [lastAnalyzedAt]);

  const getHealthStatus = (score) => {
    if (score >= 85) return { text: 'Excellent', color: '#10B981', bg: '#ECFDF5' };
    if (score >= 70) return { text: 'Good', color: '#3B82F6', bg: '#EFF6FF' };
    if (score >= 55) return { text: 'Fair', color: '#F59E0B', bg: '#FEF3C7' };
    return { text: 'Needs Attention', color: '#EF4444', bg: '#FEF2F2' };
  };

  const health = getHealthStatus(healthScore);

  // Time ago helper
  const timeAgo = (dateString) => {
    if (!dateString) return null;
    const diff = Date.now() - new Date(dateString).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const isGitProject = !!gitMeta;
  const hasUpdates   = isGitProject && (gitMeta.remoteAheadBy || 0) > 0;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        top: 16,
        left: leftOffset,
        right: rightOffset,
        height: 56,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(15,23,42,0.04)',
        border: '1px solid rgba(255,255,255,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 30,
        boxSizing: 'border-box',
        transition: 'left 0.3s ease, right 0.3s ease',
      }}
    >
      {/* ── Left: Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Folder size={13} color="#94A3B8" />
        <button
          onClick={handleBack}
          style={{
            fontSize: 11.5, fontWeight: 500, color: '#475569', fontFamily: INTER,
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 0
          }}
        >
          {projectName || 'Acme Dashboard'}
        </button>

        <ChevronRight size={11} color="#CBD5E1" strokeWidth={2} />

        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: '#6366F1',
          fontFamily: INTER,
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }}>
          Architecture Studio
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366F1' }} />
        </span>
      </div>

      {/* ── Right: Git chip + Reanalyze + Health ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Git status chip — only for git projects */}
        {isGitProject && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 99,
            background: hasUpdates ? 'rgba(245,158,11,0.08)' : '#F8FAFC',
            border: `1px solid ${hasUpdates ? 'rgba(245,158,11,0.25)' : 'rgba(226,232,240,0.8)'}`,
          }}>
            <GitBranch size={11} color={hasUpdates ? '#d97706' : '#64748B'} />
            <span style={{ fontSize: 10, fontFamily: MONO, color: hasUpdates ? '#d97706' : '#64748B', fontWeight: 600 }}>
              {gitMeta.activeBranch || gitMeta.defaultBranch || 'main'}
            </span>
            {gitMeta.latestCommitHash && gitMeta.latestCommitHash !== 'unknown' && (
              <>
                <span style={{ color: '#CBD5E1', fontSize: 10 }}>·</span>
                <span style={{ fontSize: 10, fontFamily: MONO, color: '#94A3B8' }}>
                  {gitMeta.latestCommitHash}
                </span>
              </>
            )}
            {gitMeta.lastSyncedAt && (
              <>
                <span style={{ color: '#CBD5E1', fontSize: 10 }}>·</span>
                <span style={{ fontSize: 9.5, color: '#94A3B8', fontFamily: INTER }}>
                  {timeAgo(gitMeta.lastSyncedAt)}
                </span>
              </>
            )}
            {hasUpdates && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                color: '#d97706', background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: 4,
              }}>
                ↑ Updates
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
          <span style={{ fontSize: 8.5, color: '#94A3B8', fontFamily: INTER, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Last Analysis
          </span>
          <span style={{ fontSize: 10, color: '#475569', fontFamily: MONO, fontWeight: 600 }}>
            {formattedTime}
          </span>
        </div>

        {/* Reanalyze Button */}
        <button
          onClick={handleReanalyze}
          disabled={isAnalyzing}
          title="Re-scan source files and rebuild Knowledge Graph"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 11px',
            borderRadius: 99,
            border: `1px solid ${justCompleted ? '#A7F3D0' : isAnalyzing ? '#C7D2FE' : 'rgba(226,232,240,0.9)'}`,
            background: justCompleted ? '#ECFDF5' : isAnalyzing ? '#EEF2FF' : '#FFFFFF',
            color: justCompleted ? '#059669' : isAnalyzing ? '#4338CA' : '#334155',
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: INTER,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            transition: 'all 0.2s ease',
          }}
        >
          {justCompleted ? (
            <>
              <Check size={11} color="#059669" />
              <span>Updated just now</span>
            </>
          ) : isAnalyzing ? (
            <>
              <RefreshCw size={11} className="animate-spin" color="#4338CA" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <RefreshCw size={11} color="#64748B" />
              <span>Reanalyze</span>
            </>
          )}
        </button>

        {/* Vertical Separator */}
        <div style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 2px' }} />

        {/* Project Health badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: INTER, fontWeight: 500 }}>
            Project Health
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: health.bg,
            color: health.color,
            padding: '2px 7px',
            borderRadius: 99,
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: INTER,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: health.color }} />
            {health.text}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
