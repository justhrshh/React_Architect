import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle, AlertTriangle, ShieldAlert, Loader } from 'lucide-react';
import { INTER, MONO } from './constants';
import { geminiComplete, buildContext, getSystemPrompt } from '@/engines/ai';
import { calculateMaintainability } from '@/engines/analysis/modules/maintainability';

export default function AIArchitecturalAdvisorModal({
  isOpen,
  onClose,
  node,
  knowledgeGraph,
  analysis,
  selectedProject,
}) {
  const [roleText, setRoleText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !node || !knowledgeGraph) return;
    setRoleText('');
    setLoading(true);

    const fetchAdvisorData = async () => {
      try {
        const ctx = buildContext(['selection', 'sourceCode', 'analysisSummary'], {
          knowledgeGraph,
          analysis,
          selectedId: node.id,
          selectedProject,
        });
        const sys = getSystemPrompt(ctx.projectOverview);
        const prompt = `Analyze '${node.name}' (${node.kind}) for an architectural report. In 2-3 sentences, describe its exact System Role in the application tree structure.`;
        await geminiComplete(sys, [{ role: 'user', parts: [{ text: prompt }] }], txt => setRoleText(txt));
      } catch (e) {
        setRoleText(`The component '${node.name}' acts as a core interface/logic component in the project tree structure. Resides in '${node.file || 'src'}'.`);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisorData();
  }, [isOpen, node, knowledgeGraph, analysis, selectedProject]);

  if (!isOpen || !node) return null;

  // Derived metrics
  const loc = node.metadata?.loc || 50;
  const maintainability = (calculateMaintainability && node) ? calculateMaintainability(node) : null;
  const score = maintainability?.score ?? 90;
  const qualityGrade = score >= 85 ? 'excellent quality' : score >= 70 ? 'good quality' : 'needs refactoring';

  // Dependency impact
  const outgoingCount = knowledgeGraph?.edges?.filter(e => e.source === node.id).length || 0;
  const incomingCount = knowledgeGraph?.edges?.filter(e => e.target === node.id).length || 0;
  const blastRadius   = outgoingCount + incomingCount;
  const riskLevel     = blastRadius > 8 ? 'Critical Risk' : blastRadius > 4 ? 'Moderate Risk' : 'Low Risk';

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 520,
            background: '#FFFFFF',
            borderRadius: 22,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.06)',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxHeight: '85vh',
            overflowY: 'auto',
            fontFamily: INTER,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#2563EB" />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                AI Architectural Advisor
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: '#94A3B8', padding: 4, borderRadius: 6, display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Component Title Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Analyzing Component
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', fontFamily: INTER }}>
              {node.name}
            </h2>
            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: MONO }}>
              {selectedProject?.name ? `${selectedProject.name}/` : ''}{node.file || `src/components/${node.name}.jsx`}
            </span>
          </div>

          {/* Section 1: System Role Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
              System Role Description
            </span>
            <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                  <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing architectural role...
                </span>
              ) : roleText || (
                `The component '${node.name}' acts as a key module in the project tree structure. Resides in '${node.file || 'src'}'.`
              )}
            </p>
          </div>

          {/* Section 2: Maintainability & Complexity Review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
              Maintainability & Complexity Review
            </span>
            <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              Score: <strong>{score}/100</strong> ({qualityGrade}). The file has {loc} lines of code. {score >= 80 ? 'No urgent structural updates required. The component is highly modular and cohesive.' : 'Consider splitting logic into smaller sub-components or custom hooks.'}
            </p>
          </div>

          {/* Section 3: Project Impact & Usage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
              Project Impact & Usage
            </span>
            <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              Project Impact is classified as '<strong>{riskLevel}</strong>'. This component is referenced by {incomingCount} components and relies on {outgoingCount} sub-components/services ({blastRadius} total connected items across your application). Modifying its props or API may affect dependent features.
            </p>
          </div>

          {/* Section 4: Recommended Refactoring Roadmap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
              Recommended Refactoring Roadmap
            </span>
            <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              Adhere to clean coding standards: run prettier, keep props typed, and write tests for edge-cases.
            </p>
          </div>

          {/* Footer Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '9px 22px',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: INTER,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Dismiss Report
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
