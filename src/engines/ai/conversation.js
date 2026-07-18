/**
 * conversation.js
 * Module-scoped conversation state manager.
 * Tracks messages, provides multi-turn history for Gemini API.
 * Project-scoped conversation history is persisted in localStorage.
 */

import { store } from '../../redux/store.js';

/** @enum {string} */
export const ROLES = {
  SYSTEM:    'system',
  USER:      'user',
  ASSISTANT: 'assistant',
};

const GLOBAL_KEY = 'global';
const CACHE = {};

/**
 * Resolves the active project ID from the Redux store.
 * @returns {string}
 */
function getActiveProjectId() {
  try {
    const state = store.getState();
    return state?.hub?.selectedProjectId || GLOBAL_KEY;
  } catch {
    return GLOBAL_KEY;
  }
}

/**
 * Loads the project conversation state from cache or localStorage.
 * @param {string} projectId
 * @returns {{ messages: object[], turnCount: number }}
 */
function getProjectState(projectId) {
  if (CACHE[projectId]) {
    return CACHE[projectId];
  }

  try {
    const storageKey = `react-architect:ai-conversations:${projectId}`;
    const data = localStorage.getItem(storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.messages)) {
        CACHE[projectId] = {
          messages: parsed.messages,
          turnCount: typeof parsed.turnCount === 'number' ? parsed.turnCount : 0
        };
        return CACHE[projectId];
      }
    }
  } catch (e) {
    console.error('Failed to parse conversation from localStorage', e);
  }

  CACHE[projectId] = { messages: [], turnCount: 0 };
  return CACHE[projectId];
}

/**
 * Saves the project conversation state to cache and localStorage.
 * @param {string} projectId
 * @param {{ messages: object[], turnCount: number }} state
 */
function saveProjectState(projectId, state) {
  CACHE[projectId] = state;
  try {
    const storageKey = `react-architect:ai-conversations:${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save conversation to localStorage', e);
  }
}

/**
 * Add a message to the conversation.
 * @param {string} role
 * @param {string} content
 * @param {object} [metadata]
 * @returns {object} The message object (mutable reference for streaming updates)
 */
export function addMessage(role, content, metadata = null) {
  const projectId = getActiveProjectId();
  const state = getProjectState(projectId);

  const msg = {
    role,
    content,
    timestamp: Date.now(),
    turn: state.turnCount,
    metadata,
  };

  state.messages.push(msg);

  if (role === ROLES.USER) {
    state.turnCount++;
  }

  saveProjectState(projectId, state);

  return msg;
}

/**
 * Get all messages (shallow copy).
 * @returns {object[]}
 */
export function getMessages() {
  const projectId = getActiveProjectId();
  const state = getProjectState(projectId);
  // Persist current state to localStorage to capture any direct object mutations (e.g. streaming updates)
  saveProjectState(projectId, state);
  return [...state.messages];
}

/**
 * Get conversation history formatted for Gemini multi-turn API.
 * Returns the last N user+assistant pairs as Gemini contents[] objects.
 * @param {number} [maxTurns=3]
 * @returns {{ role: string, parts: { text: string }[] }[]}
 */
export function getHistory(maxTurns = 3) {
  const projectId = getActiveProjectId();
  const state = getProjectState(projectId);

  const conversational = state.messages.filter(
    m => m.role !== ROLES.SYSTEM && m.content !== 'Thinking...'
  );

  const recent = conversational.slice(-(maxTurns * 2));

  return recent.map(m => ({
    role: m.role === ROLES.ASSISTANT ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

/**
 * Get the turn count.
 * @returns {number}
 */
export function getTurnCount() {
  const projectId = getActiveProjectId();
  const state = getProjectState(projectId);
  return state.turnCount;
}

/**
 * Reset all conversation state.
 */
export function resetConversation() {
  const projectId = getActiveProjectId();
  const state = { messages: [], turnCount: 0 };
  saveProjectState(projectId, state);
}
