import React from 'react';
import { INTER, MONO } from './constants';

export default function ArchitectureDnaCard({
  reduxNodes = [],
  reduxFiles = [],
  knowledgeGraph,
  summaryMetrics = {},
  onFullStatsClick,
}) {
  const rawFiles = knowledgeGraph?.rawFiles || reduxFiles || [];
  
  // Collect all unique file objects or file paths
  const fileMap = new Map();
  
  if (Array.isArray(rawFiles) && rawFiles.length > 0) {
    rawFiles.forEach(f => {
      const filePath = f.path || f.file || f.name;
      if (filePath && !fileMap.has(filePath)) {
        fileMap.set(filePath, { path: filePath, name: f.name || filePath.split('/').pop(), content: f.content });
      }
    });
  }
  
  // Fallback if rawFiles is not available: collect unique file nodes or file references from knowledgeGraph.nodes
  if (fileMap.size === 0 && Array.isArray(knowledgeGraph?.nodes)) {
    knowledgeGraph.nodes.forEach(n => {
      if (n.file && !fileMap.has(n.file)) {
        fileMap.set(n.file, { path: n.file, name: n.file.split('/').pop() });
      }
    });
  }

  const uniqueFiles = Array.from(fileMap.values());
  const totalFiles = uniqueFiles.length || reduxFiles?.length || reduxNodes.length || 0;
  const totalLoc = summaryMetrics.totalLoc || reduxNodes.reduce((acc, n) => acc + (n.metadata?.loc || 0), 0);

  // File Classification Logic (Every file classified ONCE into a universal architectural category)
  function classifyFile(filePath) {
    const p = (filePath || "").replace(/\\/g, '/');
    const filename = p.split('/').pop();

    // 1. Pages
    if (/(^|\/)pages\//i.test(p) || /Page\.[jt]sx?$/i.test(filename)) {
      return 'page';
    }

    // 2. Routes
    if (/(^|\/)routes?\//i.test(p) || /Router\.[jt]sx?$/i.test(filename) || /route/i.test(filename)) {
      return 'route';
    }

    // 3. State
    if (/(^|\/)(redux|slices?|stores?|contexts?)\//i.test(p) || /(Slice|Store|Context)\.[jt]sx?$/i.test(filename)) {
      return 'state';
    }

    // 4. Services (APIs / Network / Service files)
    if (/(^|\/)(services?|api)\//i.test(p) || /(Service|Api|Client)\.[jt]sx?$/i.test(filename)) {
      return 'service';
    }

    // 5. Hooks
    if (/(^|\/)hooks\//i.test(p) || /^use[A-Z].*\.[jt]sx?$/.test(filename)) {
      return 'hook';
    }

    // 6. Components
    if (/(^|\/)components\//i.test(p) || /\.[jt]sx$/.test(filename)) {
      return 'comp';
    }

    // 7. Utilities (Includes helpers, constants, engines, adapters, lib)
    return 'util';
  }

  const categoryCounts = {
    comp: 0,
    hook: 0,
    service: 0,
    state: 0,
    page: 0,
    route: 0,
    util: 0,
  };

  uniqueFiles.forEach(f => {
    const cat = classifyFile(f.path);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Also check if custom hooks are declared as AST nodes in knowledgeGraph
  const customHookNodesCount = (knowledgeGraph?.nodes || []).filter(n => n.kind === 'hook' || n.subtype === 'hook').length;
  if (categoryCounts.hook === 0 && customHookNodesCount > 0) {
    categoryCounts.hook = customHookNodesCount;
  }

  const entityCategories = [
    { id: 'comp',    label: 'Comp',    fullLabel: 'Components', count: categoryCounts.comp },
    { id: 'hook',    label: 'Hook',    fullLabel: 'Hooks',      count: categoryCounts.hook },
    { id: 'service', label: 'Api',     fullLabel: 'Services',   count: categoryCounts.service },
    { id: 'state',   label: 'State',   fullLabel: 'Stores',     count: categoryCounts.state },
    { id: 'page',    label: 'Page',    fullLabel: 'Pages',      count: categoryCounts.page },
    { id: 'route',   label: 'Route',   fullLabel: 'Routes',     count: categoryCounts.route },
    { id: 'util',    label: 'Util',    fullLabel: 'Utils',      count: categoryCounts.util },
  ];

  const counts = entityCategories.map(c => c.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts, 1);
  const avgCount = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);

  // Compute average line position (0% top to 100% bottom)
  const avgRatio = Math.min(0.85, Math.max(0.15, avgCount / maxCount));
  const avgLineTopPct = Math.round((1 - avgRatio) * 100);

  // Top 2 spotlight modules for bottom readings
  const sortedNodes = [...reduxNodes].sort((a, b) => (b.metadata?.loc || 0) - (a.metadata?.loc || 0));
  const largestNode = sortedNodes[0] || { name: 'App.jsx', metadata: { loc: 0 } };
  const secondLargest = sortedNodes[1] || { name: 'Layout.jsx', metadata: { loc: 0 } };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 24,
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.03)',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        fontFamily: INTER,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
          Architecture DNA
        </span>
        <button
          onClick={onFullStatsClick}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 8,
            padding: '5px 11px',
            fontSize: 10.5,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            fontFamily: INTER,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          Full stats &rarr;
        </button>
      </div>

      {/* ── HEADLINE STAT ── */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', fontFamily: INTER }}>
          {totalFiles}
        </span>
        <span style={{ fontSize: 24, fontWeight: 300, color: '#94A3B8', marginLeft: 6, fontFamily: INTER }}>
          files
        </span>
      </div>

      {/* ── SUBTITLE ── */}
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500, marginBottom: 20 }}>
        {totalLoc.toLocaleString()} total lines of code analyzed
      </div>

      {/* ── DYNAMIC BAR CHART VISUALIZER ── */}
      <div style={{ position: 'relative', height: 100, marginBottom: 20, padding: '0 4px' }}>
        {/* Dynamic Average Line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${avgLineTopPct}%`,
            height: '1.5px',
            background: '#E2E8F0',
            zIndex: 1,
          }}
        />

        {/* Dynamic Average Label Badge */}
        <div
          style={{
            position: 'absolute',
            top: `calc(${avgLineTopPct}% - 22px)`,
            right: 0,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: MONO,
            zIndex: 3,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          }}
        >
          Avg. {avgCount}
        </div>

        {/* 7 Bars Container for 7 Entity Categories */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100%', position: 'relative', zIndex: 2 }}>
          {entityCategories.map((item) => {
            const heightPx = Math.max(14, Math.min(74, Math.round((item.count / maxCount) * 74)));
            const isHighest = item.count === maxCount;
            const isLowest = item.count === minCount;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                  cursor: 'pointer',
                }}
                title={`${item.fullLabel}: ${item.count} items`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <div
                    style={{
                      width: 22,
                      height: `${heightPx}px`,
                      background: 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
                      borderRadius: 11,
                      position: 'relative',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {/* Top indicator dot on highest bar */}
                    {isHighest && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          background: '#FFFFFF',
                          border: '1.5px solid #6366F1',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: -4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}
                    {/* Bottom indicator dot on lowest bar */}
                    {isLowest && !isHighest && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          background: '#FFFFFF',
                          border: '1.5px solid #6366F1',
                          borderRadius: '50%',
                          position: 'absolute',
                          bottom: -4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 9.5, color: '#64748B', fontWeight: 600, fontFamily: INTER }}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM READINGS / SPOTLIGHT ROWS ── */}
      <div style={{ borderTop: '1.5px solid #F1F5F9', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ fontSize: 10.5, color: '#64748B', fontFamily: INTER }}>
            Largest ({largestNode.name || 'App.jsx'})
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: MONO }}>
            {largestNode.metadata?.loc || 0} LOC
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
          <span style={{ fontSize: 10.5, color: '#64748B', fontFamily: INTER }}>
            Second ({secondLargest.name || 'Layout.jsx'})
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: MONO }}>
            {secondLargest.metadata?.loc || 0} LOC
          </span>
        </div>
      </div>
    </div>
  );
}
