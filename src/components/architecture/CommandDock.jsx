import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Search, Focus, Sparkles, Copy, Download, X, Box, Check } from 'lucide-react';
import { INTER, MONO } from './constants';

const DOCK_ITEMS = [
  { id: 'graph',      label: 'Graph',      icon: GitBranch },
  { id: 'search',     label: 'Search',     icon: Search    },
  { id: 'focus',      label: 'Focus',      icon: Focus     },
  { id: 'ai-explain', label: 'AI Explain', icon: Sparkles  },
  { id: 'copy-path',  label: 'Copy Path',  icon: Copy      },
  { id: 'export',     label: 'Export',     icon: Download  },
];

export default function CommandDock({
  activeItem = 'graph',
  onGraph,
  onFocus,
  onAIExplain,
  onOpenAIStudio,
  onCopyPath,
  onExport,
  onSelectSearchNode,
  knowledgeGraph,
  selectedNodeFile,
}) {
  const [showSearchDropup, setShowSearchDropup] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isExpanded = isHovered || showSearchDropup;
  const searchInputRef = useRef(null);

  // Auto-hide toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Keyboard shortcuts: Space for AI, Ctrl+S / Cmd+S for Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
                      document.activeElement.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSearchDropup(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
        return;
      }

      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        if (onOpenAIStudio) onOpenAIStudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAIExplain]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !knowledgeGraph?.nodes) return [];
    const q = searchQuery.toLowerCase();
    return knowledgeGraph.nodes
      .filter(n => n.name?.toLowerCase().includes(q) || n.file?.toLowerCase().includes(q))
      .map(n => {
        let typeLabel = 'Component', color = '#6366F1';
        if (n.kind === 'state')        { typeLabel = 'Store';   color = '#8B5CF6'; }
        if (n.kind === 'api')          { typeLabel = 'Service'; color = '#F59E0B'; }
        if (n.kind === 'route')        { typeLabel = 'Route';   color = '#3B82F6'; }
        if (n.subtype === 'page')      { typeLabel = 'Page';    color = '#3B82F6'; }
        if (n.subtype === 'hook')      { typeLabel = 'Hook';    color = '#06B6D4'; }
        if (n.subtype === 'layout')    { typeLabel = 'Layout';  color = '#8B5CF6'; }
        return {
          id: n.id,
          name: n.name,
          typeLabel,
          color,
          file: n.file?.replace(/\\/g, '/').split('/').slice(-2).join('/') || '',
        };
      })
      .slice(0, 15);
  }, [searchQuery, knowledgeGraph]);

  const handleDockItemClick = (id) => {
    if (id === 'graph') {
      if (onGraph) onGraph();
    } else if (id === 'search') {
      setShowSearchDropup(prev => !prev);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (id === 'focus') {
      if (onFocus) onFocus();
    } else if (id === 'ai-explain') {
      if (onAIExplain) onAIExplain();
    } else if (id === 'copy-path') {
      if (onCopyPath) {
        onCopyPath();
        setCopied(true);
        setToastMessage('Path copied to clipboard!');
      } else if (selectedNodeFile) {
        navigator.clipboard.writeText(selectedNodeFile).then(() => {
          setCopied(true);
          setToastMessage(`Copied: ${selectedNodeFile}`);
        });
      } else {
        setToastMessage('Select a component to copy path');
      }
    } else if (id === 'export') {
      if (onExport) onExport();
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', padding: '8px 12px' }}
    >

      {/* Toast Notice */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            style={{
              position: 'absolute',
              bottom: 90,
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: 11.5,
              fontFamily: INTER,
              fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(8px)',
              zIndex: 110,
              whiteSpace: 'nowrap',
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search Dropup Menu ── */}
      <AnimatePresence>
        {showSearchDropup && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              bottom: 84,
              width: 320,
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.04)',
              border: '1px solid rgba(226,232,240,0.8)',
              padding: 12,
              zIndex: 100,
            }}
          >
            {/* Input Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8FAFC',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12,
              padding: '7px 12px',
            }}>
              <Search size={14} color="#6366F1" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search architecture nodes..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 12,
                  fontFamily: INTER,
                  color: '#0F172A',
                  width: '100%',
                }}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={13} color="#94A3B8" />
                </button>
              ) : (
                <span style={{ fontSize: 9.5, fontFamily: MONO, color: '#94A3B8', background: '#E2E8F0', padding: '1px 5px', borderRadius: 4 }}>
                  Ctrl+S
                </span>
              )}
            </div>

            {/* Results List */}
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (onSelectSearchNode) onSelectSearchNode(r.id);
                      setShowSearchDropup(false);
                      setSearchQuery('');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 8px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Box size={13} color={r.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0F172A', fontFamily: INTER, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </div>
                      {r.file && (
                        <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: MONO }}>
                          {r.file}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: r.color, background: `${r.color}15`, padding: '1px 5px', borderRadius: 99, fontFamily: INTER, fontWeight: 600 }}>
                      {r.typeLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: '#94A3B8', fontFamily: INTER }}>
                No matching architecture entities found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Floating Dock (Sleek Radiant Line -> Expands on Hover) ── */}
      <motion.div
        layout
        initial={false}
        animate={{
          width: isExpanded ? 'auto' : 160,
          height: isExpanded ? 64 : 6,
          padding: isExpanded ? '0 12px' : '0 0px',
        }}
        transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 0.9 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isExpanded
            ? 'rgba(255,255,255,0.88)'
            : 'linear-gradient(90deg, #6366F1 0%, #EC4899 35%, #8B5CF6 70%, #06B6D4 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 9999,
          boxShadow: isExpanded
            ? '0 16px 40px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.8)'
            : '0 0 18px rgba(99,102,241,0.65), 0 2px 8px rgba(15,23,42,0.15)',
          border: isExpanded ? '1px solid rgba(255,255,255,0.7)' : 'none',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, delay: 0.04, ease: "easeOut" }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {DOCK_ITEMS.map(({ id, label, icon: Icon }) => {
                const isItemActive = id === activeItem || (id === 'search' && showSearchDropup);
                const isCopyItem = id === 'copy-path';
                const CurIcon = isCopyItem && copied ? Check : Icon;

                return (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleDockItemClick(id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '9px 16px',
                      borderRadius: 12,
                      border: 'none',
                      background: isItemActive ? 'linear-gradient(180deg, rgba(238,242,255,0.85) 0%, rgba(224,231,255,0.45) 100%)' : 'transparent',
                      color: isItemActive ? '#6366F1' : '#64748B',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      boxShadow: isItemActive ? '0 4px 14px rgba(99,102,241,0.08)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isItemActive) {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.color = '#0F172A';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isItemActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748B';
                      }
                    }}
                  >
                    <CurIcon size={18} strokeWidth={isItemActive ? 2.1 : 1.75} color={isItemActive ? '#6366F1' : isCopyItem && copied ? '#10B981' : '#64748B'} />
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: isItemActive ? 600 : 500,
                      fontFamily: INTER,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      color: isItemActive ? '#6366F1' : isCopyItem && copied ? '#10B981' : '#64748B',
                    }}>
                      {isCopyItem && copied ? 'Copied!' : label}
                    </span>

                    {/* Sleek thin gradient indicator line */}
                    {isItemActive && (
                      <motion.div
                        layoutId="dock-active-pill"
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          width: 24,
                          height: 2,
                          borderRadius: 99,
                          background: 'linear-gradient(90deg, transparent 0%, #818CF8 30%, #6366F1 50%, #818CF8 70%, transparent 100%)',
                          boxShadow: '0 0 6px rgba(99,102,241,0.5)',
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-radiant-line"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #6366F1 0%, #EC4899 35%, #8B5CF6 70%, #06B6D4 100%)',
                borderRadius: 9999,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
