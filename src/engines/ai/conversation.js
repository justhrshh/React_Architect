/**
 * conversation.js
 * Module-scoped conversation state manager.
 * Tracks messages, provides multi-turn history for Gemini API.
 */

/** @enum {string} */
export const ROLES = {
  SYSTEM:    'system',
  USER:      'user',
  ASSISTANT: 'assistant',
};

let _messages = [];
let _turnCount = 0;

/**
 * Add a message to the conversation.
 * @param {string} role
 * @param {string} content
 * @param {object} [metadata]
 * @returns {object} The message object (mutable reference for streaming updates)
 */
export function addMessage(role, content, metadata = null) {
  const msg = {
    role,
    content,
    timestamp: Date.now(),
    turn: _turnCount,
    metadata,
  };

  _messages.push(msg);

  if (role === ROLES.USER) {
    _turnCount++;
  }

  return msg;
}

/**
 * Get all messages (shallow copy).
 * @returns {object[]}
 */
export function getMessages() {
  return [..._messages];
}

/**
 * Get conversation history formatted for Gemini multi-turn API.
 * Returns the last N user+assistant pairs as Gemini contents[] objects.
 * @param {number} [maxTurns=3]
 * @returns {{ role: string, parts: { text: string }[] }[]}
 */
export function getHistory(maxTurns = 3) {
  const conversational = _messages.filter(
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
  return _turnCount;
}

/**
 * Reset all conversation state.
 */
export function resetConversation() {
  _messages = [];
  _turnCount = 0;
}
