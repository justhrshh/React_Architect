import { useMemo } from 'react';

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
 * Parse inline markdown formatting (bold, italic, code, links).
 */
function parseInline(text) {
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
      elements.push(<strong key={key++} style={{ fontWeight: 600, color: COLORS.text }}>{parseInline(match[1])}</strong>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic
    match = remaining.match(/^\*(.+?)\*/);
    if (match) {
      elements.push(<em key={key++}>{parseInline(match[1])}</em>);
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

  return elements.length === 1 ? elements[0] : elements;
}

/**
 * MarkdownRenderer — Lightweight markdown to JSX renderer.
 * Supports: headings, bold, italic, inline code, code blocks,
 * bullet/numbered lists, links, blockquotes, horizontal rules.
 */
export default function MarkdownRenderer({ content, style }) {
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
            {parseInline(text)}
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
            {quoteLines.map((ql, qi) => <div key={qi}>{parseInline(ql)}</div>)}
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
                {parseInline(item)}
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
                {parseInline(item)}
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
          {parseInline(line)}
        </p>
      );
      i++;
    }

    return result;
  }, [content]);

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
