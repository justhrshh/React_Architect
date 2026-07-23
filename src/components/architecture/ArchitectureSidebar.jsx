import { motion } from 'framer-motion';
import {
  LayoutGrid, FolderTree, GitBranch, Clock, Settings,
  ChevronLeft, ChevronRight, Cpu, Sparkles
} from 'lucide-react';
import { INTER, MONO } from './constants';

const NAV_ITEMS = [
  { id: 'summary',  label: 'Summary',  subtitle: 'Architectural briefing', icon: LayoutGrid },
  { id: 'explore',  label: 'Explore',  subtitle: 'Files & structure',     icon: FolderTree },
  { id: 'flow',     label: 'Flow',     subtitle: 'Dependency graph',       icon: GitBranch  },
  { id: 'settings', label: 'Settings', subtitle: 'Workspace',              icon: Settings   },
];

export default function ArchitectureSidebar({
  activeTab = 'flow',
  onTabChange,
  isCollapsed = false,
  onToggleCollapse,
}) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        left: 16,
        top: 16,
        bottom: 16,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(15,23,42,0.04)',
        border: '1px solid rgba(255,255,255,0.7)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        boxSizing: 'border-box',
        zIndex: 40,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        padding: '0 6px',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img
            src="/react-architect-logo.jpg"
            alt="React Architect Logo"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
            }}
          />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ minWidth: 0, whiteSpace: 'nowrap' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: INTER, lineHeight: 1.25 }}>
                React Architect
              </div>
              <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: INTER, fontWeight: 500, marginTop: 1 }}>
                v1.4.0
              </div>
            </motion.div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            style={{
              width: 22, height: 22,
              borderRadius: 6,
              border: 'none',
              background: '#F8FAFC',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#6366F1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* ── Expand button when collapsed ── */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          title="Expand Sidebar"
          style={{
            margin: '0 auto 16px',
            width: 26, height: 26,
            borderRadius: 7,
            border: 'none',
            background: '#F8FAFC',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#6366F1'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* ── Nav Items ── */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {NAV_ITEMS.map(({ id, label, subtitle, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={isCollapsed ? `${label} — ${subtitle}` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: 12,
                padding: isCollapsed ? '10px 0' : '10px 12px',
                borderRadius: 14,
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' : 'transparent',
                color: isActive ? '#6366F1' : '#64748B',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 8px 20px rgba(99,102,241,0.18), 0 2px 6px rgba(99,102,241,0.1)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F8FAFC';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {/* Icon Container */}
              {isActive ? (
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(99,102,241,0.35)',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color="#FFFFFF" strokeWidth={2.2} />
                </div>
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} strokeWidth={1.75} color="#64748B" />
                </div>
              )}

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? '#6366F1' : '#0F172A', fontFamily: INTER, lineHeight: 1.2 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10.5, color: isActive ? '#6366F1' : '#94A3B8', fontFamily: INTER, fontWeight: 500, lineHeight: 1.2, opacity: isActive ? 0.85 : 1 }}>
                    {subtitle}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Shortcuts Section ── */}
      {!isCollapsed && (
        <div style={{
          marginTop: 'auto',
          padding: '12px 12px',
          background: '#F8FAFC',
          borderRadius: 14,
          border: '1px solid rgba(226,232,240,0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontFamily: INTER, marginBottom: 2 }}>
            Shortcuts
          </div>
          {[
            { key: 'Space', desc: 'Architect AI' },
            { key: 'Ctrl+S', desc: 'Search' },
            { key: 'Tab', desc: 'Toggle Sidebar' },
            { key: 'F', desc: 'Fullscreen' },
            { key: 'Esc', desc: 'Close / Back' },
          ].map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: '#475569', fontFamily: INTER, fontWeight: 500 }}>{s.desc}</span>
              <kbd style={{
                fontSize: 9, fontFamily: MONO, color: '#6366F1', background: '#EEF2FF',
                padding: '2px 6px', borderRadius: 5, fontWeight: 700, border: '1px solid rgba(99,102,241,0.15)'
              }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      )}
    </motion.aside>
  );
}
