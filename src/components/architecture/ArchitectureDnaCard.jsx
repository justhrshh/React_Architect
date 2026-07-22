import React from 'react';
import { INTER, MONO } from './constants';

export default function ArchitectureDnaCard({
  reduxNodes = [],
  reduxFiles = [],
  knowledgeGraph,
  summaryMetrics = {},
  onFullStatsClick,
}) {
  const totalFiles = reduxFiles?.length || reduxNodes.length || 0;
  const totalLoc = summaryMetrics.totalLoc || reduxNodes.reduce((acc, n) => acc + (n.metadata?.loc || 0), 0);
  const allNodes = knowledgeGraph?.nodes || reduxNodes;

  // 1. Dynamic Entity Counts from Knowledge Graph, File Paths, and Node Subtypes
  const compCount = allNodes.filter(n => n.kind === 'component' || !n.kind).length || 1;

  // Aggregate custom hook nodes + unique hooks declared across file paths & component metadata
  const hookNodes = allNodes.filter(n =>
    n.kind === 'hook' ||
    n.subtype === 'hook' ||
    (n.file && n.file.toLowerCase().includes('hook')) ||
    (n.name && /^use[A-Z]/.test(n.name))
  );
  const uniqueMetadataHooks = new Set();
  allNodes.forEach(n => {
    if (Array.isArray(n.metadata?.hooks)) {
      n.metadata.hooks.forEach(h => {
        if (typeof h === 'string') uniqueMetadataHooks.add(h);
        else if (h?.name) uniqueMetadataHooks.add(h.name);
      });
    }
  });
  const hookCount = Math.max(hookNodes.length, uniqueMetadataHooks.size) || 1;

  const apiCount = allNodes.filter(n =>
    n.kind === 'api' ||
    n.kind === 'service' ||
    n.subtype === 'service' ||
    n.subtype === 'api' ||
    (n.file && (n.file.includes('api') || n.file.includes('service') || n.file.includes('engine')))
  ).length || 1;

  const stateCount = allNodes.filter(n =>
    n.kind === 'state' ||
    n.kind === 'store' ||
    n.subtype === 'slice' ||
    n.subtype === 'store' ||
    (n.file && (n.file.includes('store') || n.file.includes('slice') || n.file.includes('redux')))
  ).length || 1;

  const pageCount = allNodes.filter(n =>
    n.subtype === 'page' ||
    (n.file && n.file.toLowerCase().includes('pages')) ||
    (n.name && n.name.endsWith('Page'))
  ).length || 1;

  const routeCount = allNodes.filter(n =>
    n.kind === 'route' ||
    n.subtype === 'router' ||
    (n.file && n.file.toLowerCase().includes('route'))
  ).length || 1;

  const utilCount = allNodes.filter(n =>
    n.kind === 'util' ||
    n.kind === 'helper' ||
    (n.file && (n.file.includes('util') || n.file.includes('constants') || n.file.includes('helper') || n.file.includes('adapter')))
  ).length || 1;

  const entityCategories = [
    { id: 'comp',  label: 'Comp',  fullLabel: 'Components', count: compCount },
    { id: 'hook',  label: 'Hook',  fullLabel: 'Hooks',      count: hookCount },
    { id: 'api',   label: 'Api',   fullLabel: 'Services',   count: apiCount },
    { id: 'state', label: 'State', fullLabel: 'Stores',     count: stateCount },
    { id: 'page',  label: 'Page',  fullLabel: 'Pages',      count: pageCount },
    { id: 'route', label: 'Route', fullLabel: 'Routes',     count: routeCount },
    { id: 'util',  label: 'Util',  fullLabel: 'Utils',      count: utilCount },
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

      {/* ── HEADLINE STAT RANGE ── */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', fontFamily: INTER }}>
          {minCount}-{maxCount}
        </span>
        <span style={{ fontSize: 24, fontWeight: 300, color: '#94A3B8', marginLeft: 6, fontFamily: INTER }}>
          entities
        </span>
      </div>

      {/* ── SUBTITLE / DATE-RANGE EQUIVALENT ── */}
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500, marginBottom: 20 }}>
        {totalFiles} modules &middot; {totalLoc.toLocaleString()} total lines of code
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
