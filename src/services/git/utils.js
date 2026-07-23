/**
 * utils.js
 * Pure utility functions for file path inspection, UTF-8 base64 decoding, and commit type inference.
 */

import { SUPPORTED_SOURCE_EXTENSIONS, IGNORED_DIRECTORIES } from './gitConfig';

export function isSourceFile(path) {
  if (!path) return false;
  const p = path.toLowerCase();

  const isSupportedExt = SUPPORTED_SOURCE_EXTENSIONS.some(ext => p.endsWith(ext));
  const isIgnoredDir  = IGNORED_DIRECTORIES.some(dir => p.includes(dir));

  return isSupportedExt && !isIgnoredDir;
}

export function decodeBase64Utf8(str) {
  if (!str) return '';
  try {
    const clean = str.replace(/[\r\n\s]/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return atob(str.replace(/[\r\n\s]/g, ''));
    } catch {
      return str;
    }
  }
}

export function inferCommitType(message = '') {
  const msg = message.toLowerCase().trim();
  if (/^(feat|feature|add|implement|create|new)/i.test(msg) || msg.includes('feature')) {
    return { type: 'feature', label: 'Feature', icon: '✨', color: '#10b981', bg: '#ecfdf5' };
  }
  if (/^(fix|bug|patch|resolve|repair|issue)/i.test(msg) || msg.includes('fix') || msg.includes('bug')) {
    return { type: 'bugfix', label: 'Bug Fix', icon: '🐛', color: '#ef4444', bg: '#fef2f2' };
  }
  if (/^(refactor|clean|restructure|modular|rewrite)/i.test(msg) || msg.includes('refactor')) {
    return { type: 'refactor', label: 'Refactor', icon: '♻️', color: '#8b5cf6', bg: '#f5f3ff' };
  }
  if (/^(docs|readme|changelog|comment)/i.test(msg) || msg.includes('docs') || msg.includes('readme')) {
    return { type: 'docs', label: 'Docs', icon: '📝', color: '#0284c7', bg: '#f0f9ff' };
  }
  if (/^(ui|style|css|layout|theme|design)/i.test(msg) || msg.includes('ui') || msg.includes('style')) {
    return { type: 'ui', label: 'UI', icon: '🎨', color: '#ec4899', bg: '#fdf2f8' };
  }
  if (/^(perf|optimize|speed|fast)/i.test(msg) || msg.includes('perf')) {
    return { type: 'perf', label: 'Performance', icon: '⚡', color: '#f59e0b', bg: '#fef3c7' };
  }
  if (/^(chore|config|build|deps|setup|package)/i.test(msg) || msg.includes('chore') || msg.includes('config')) {
    return { type: 'config', label: 'Config', icon: '🔧', color: '#64748b', bg: '#f8fafc' };
  }
  if (/^(remove|delete|drop|cleanup)/i.test(msg) || msg.includes('remove') || msg.includes('delete')) {
    return { type: 'removal', label: 'Cleanup', icon: '🔥', color: '#f97316', bg: '#fff7ed' };
  }
  return { type: 'general', label: 'Commit', icon: '📦', color: '#6366f1', bg: '#eef2ff' };
}
