import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectNodeId } from '@/redux/slices/graphSlice';

const INTER = "'Inter', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";

const COLORS = {
  text: '#111827',
  textSecondary: '#1F2937',
  textMuted: '#4B5563',
  accent: '#6366F1',
  accentBg: '#EEF2FF',
  accentText: '#4338CA',
  border: '#E8EAED',
  borderLight: '#F0F1F3',
  surfaceAlt: '#F8F9FB',
  codeBg: '#1E1E2E',
  codeText: '#E4E4E7',
};

/**
 * Helper to wrap matched entity names inside strings or code elements as clickable links.
 */
function makeEntitiesInteractive(elements, nodeMap, handleEntityClick) {
  if (!elements || !nodeMap || !handleEntityClick) return elements;

  function linkifyString(str) {
    if (typeof str !== "string" || !str) return str;

    const sortedNames = Array.from(nodeMap.keys()).sort((a, b) => b.length - a.length);
    if (sortedNames.length === 0) return str;

    const escapedNames = sortedNames.map(name => {
      return name.split('').map(char => {
        if ('-\\^$*+?.()|[]{}'.includes(char) || char === '/') {
          return '\\' + char;
        }
        return char;
      }).join('');
    });
    const regex = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'g');

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(str.substring(lastIndex, matchIndex));
      }

      const node = nodeMap.get(matchText);
      parts.push(
        <span
          key={`entity-${node.id}-${matchIndex}`}
          onClick={() => handleEntityClick(node)}
          style={{
            color: '#3B82F6',
            cursor: 'pointer',
            borderBottom: '1px dashed #3B82F680',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#2563EB';
            e.currentTarget.style.borderBottomStyle = 'solid';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#3B82F6';
            e.currentTarget.style.borderBottomStyle = 'dashed';
          }}
        >
          {matchText}
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? parts : str;
  }

  if (Array.isArray(elements)) {
    return elements.map((el, index) => {
      if (typeof el === "string") {
        return linkifyString(el);
      }
      if (el && el.type === "code") {
        const codeText = el.props.children;
        if (typeof codeText === "string" && nodeMap.has(codeText)) {
          const node = nodeMap.get(codeText);
          return (
            <code
              key={`code-${node.id}-${index}`}
              onClick={() => handleEntityClick(node)}
              style={{
                ...el.props.style,
                cursor: 'pointer',
                borderColor: '#3B82F650',
                color: '#3B82F6',
                background: 'rgba(59, 130, 246, 0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#2563EB';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#3B82F6';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
              }}
            >
              {codeText}
            </code>
          );
        }
      }
      if (el && (el.type === "strong" || el.type === "em")) {
        const children = el.props.children;
        const linkedChildren = makeEntitiesInteractive(children, nodeMap, handleEntityClick);
        return {
          ...el,
          props: {
            ...el.props,
            children: linkedChildren
          }
        };
      }
      return el;
    });
  }

  if (typeof elements === "string") {
    return linkifyString(elements);
  }

  return elements;
}

/**
 * Parse inline markdown formatting (bold, italic, code, links).
 */
function parseInline(text, nodeMap, handleEntityClick) {
  if (!text) return text;
  const elements = [];
  let remaining = String(text);
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    let match = remaining.match(/^`([^`]+)`/);
    if (match) {
      elements.push(
        <code key={key++} style={{
          fontFamily: MONO, fontSize: '0.88em',
          background: COLORS.surfaceAlt, border: `1px solid ${COLORS.borderLight}`,
          padding: '1px 5px', borderRadius: 4, color: COLORS.accentText,
        }}>
          {match[1]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Bold
    match = remaining.match(/^\*\*(.+?)\*\*/);
    if (match) {
      elements.push(<strong key={key++} style={{ fontWeight: 600, color: COLORS.text }}>{parseInline(match[1], nodeMap, handleEntityClick)}</strong>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic
    match = remaining.match(/^\*(.+?)\*/);
    if (match) {
      elements.push(<em key={key++}>{parseInline(match[1], nodeMap, handleEntityClick)}</em>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      elements.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer"
          style={{ color: COLORS.accent, textDecoration: 'none', borderBottom: `1px solid ${COLORS.accent}40` }}>
          {match[1]}
        </a>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text — consume until next special character
    const nextSpecial = remaining.search(/[`*[]/);
    if (nextSpecial === -1) {
      elements.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      elements.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  const interactive = makeEntitiesInteractive(elements, nodeMap, handleEntityClick);
  return interactive.length === 1 ? interactive[0] : interactive;
}

/**
 * MarkdownRenderer — Lightweight markdown to JSX renderer.
 * Supports: headings, bold, italic, inline code, code blocks,
 * bullet/numbered lists, links, blockquotes, horizontal rules.
 */
export default function MarkdownRenderer({ content, style, onEntityClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const nodes = useMemo(() => knowledgeGraph?.nodes || [], [knowledgeGraph]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    // Prioritize components, routes, state, api kinds over files
    const sortedNodes = [...nodes].sort((a, b) => {
      const priority = { component: 1, route: 2, state: 3, api: 4, file: 5 };
      return (priority[a.kind] || 10) - (priority[b.kind] || 10);
    });
    for (const n of sortedNodes) {
      if (n.name && !map.has(n.name)) {
        map.set(n.name, n);
      }
    }
    return map;
  }, [nodes]);

  const handleEntityClick = useCallback((node) => {
    if (onEntityClick) {
      onEntityClick(node);
      return;
    }
    // Default navigation behavior
    dispatch(selectNodeId(node.id));
    navigate("/architecture", { state: { focusNode: node.id } });
  }, [onEntityClick, dispatch, navigate]);

  const elements = useMemo(() => {
    if (!content) return null;

    const lines = content.split('\n');
    const result = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      const codeMatch = line.match(/^```(\w*)/);
      if (codeMatch) {
        const lang = codeMatch[1];
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```

        result.push(
          <div key={key++} style={{ margin: '12px 0', position: 'relative' }}>
            {lang && (
              <div style={{
                position: 'absolute', top: 8, right: 12,
                fontSize: 10, color: '#71717A', fontFamily: MONO,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {lang}
              </div>
            )}
            <pre style={{
              background: COLORS.codeBg, color: COLORS.codeText,
              padding: '16px 18px', borderRadius: 10,
              fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6,
              overflowX: 'auto', margin: 0, border: '1px solid #2E2E3E',
            }}>
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const sizes = { 1: 20, 2: 17, 3: 14.5, 4: 13 };
        const weights = { 1: 800, 2: 700, 3: 650, 4: 600 };
        const margins = { 1: '20px 0 10px', 2: '18px 0 8px', 3: '14px 0 6px', 4: '12px 0 4px' };

        result.push(
          <div key={key++} style={{
            fontSize: sizes[level], fontWeight: weights[level],
            color: COLORS.text, fontFamily: INTER,
            margin: i === 1 ? `0 0 ${level <= 2 ? 10 : 6}px` : margins[level],
            letterSpacing: level <= 2 ? '-0.02em' : 0,
            lineHeight: 1.3,
          }}>
            {parseInline(text, nodeMap, handleEntityClick)}
          </div>
        );
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        result.push(
          <hr key={key++} style={{
            border: 'none', borderTop: `1px solid ${COLORS.border}`,
            margin: '16px 0',
          }} />
        );
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        result.push(
          <blockquote key={key++} style={{
            borderLeft: `3px solid ${COLORS.accent}`,
            margin: '12px 0', padding: '8px 16px',
            color: COLORS.textSecondary, fontStyle: 'italic',
            background: COLORS.accentBg + '60', borderRadius: '0 8px 8px 0',
          }}>
            {quoteLines.map((ql, qi) => <div key={qi}>{parseInline(ql, nodeMap, handleEntityClick)}</div>)}
          </blockquote>
        );
        continue;
      }

      // Unordered list
      if (/^\s*[-*]\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s/, ''));
          i++;
        }
        result.push(
          <ul key={key++} style={{
            margin: '8px 0', paddingLeft: 20,
            listStyleType: 'disc', color: COLORS.textSecondary,
          }}>
            {items.map((item, ii) => (
              <li key={ii} style={{ marginBottom: 4, lineHeight: 1.6 }}>
                {parseInline(item, nodeMap, handleEntityClick)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s/, ''));
          i++;
        }
        result.push(
          <ol key={key++} style={{
            margin: '8px 0', paddingLeft: 20,
            color: COLORS.textSecondary,
          }}>
            {items.map((item, ii) => (
              <li key={ii} style={{ marginBottom: 4, lineHeight: 1.6 }}>
                {parseInline(item, nodeMap, handleEntityClick)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph
      result.push(
        <p key={key++} style={{
          margin: '6px 0', lineHeight: 1.7,
          color: COLORS.textSecondary,
        }}>
          {parseInline(line, nodeMap, handleEntityClick)}
        </p>
      );
      i++;
    }

    return result;
  }, [content, nodeMap, handleEntityClick]);

  return (
    <div style={{
      fontFamily: INTER, fontSize: 13.5,
      textShadow: "0 1px 2px #FFFFFF, 0 1px 3px rgba(255, 255, 255, 0.9)",
      ...style,
    }}>
      {elements}
    </div>
  );
}
