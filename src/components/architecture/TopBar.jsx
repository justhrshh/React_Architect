import { motion } from 'framer-motion';
import { ChevronRight, Folder } from 'lucide-react';
import { INTER } from './constants';

export default function TopBar({
  projectName,
  healthScore = 100,
  activeTab = 'flow',
  handleBack,
  isSidebarCollapsed = false,
  showInspector = false,
  leftOffset = 286,
  rightOffset = 350,
}) {
  const getHealthStatus = (score) => {
    if (score >= 85) return { text: 'Excellent', color: '#10B981', bg: '#ECFDF5' };
    if (score >= 70) return { text: 'Good', color: '#3B82F6', bg: '#EFF6FF' };
    if (score >= 55) return { text: 'Fair', color: '#F59E0B', bg: '#FEF3C7' };
    return { text: 'Needs Attention', color: '#EF4444', bg: '#FEF2F2' };
  };

  const health = getHealthStatus(healthScore);

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

      {/* ── Right: Project Health ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
