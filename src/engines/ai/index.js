/**
 * AI Engine — Public API
 * All consumers MUST import from this barrel.
 */

export { getSystemPrompt } from './system.js';
export { classifyIntent, getRequiredSlices, INTENTS } from './intent.js';
export {
  buildContext,
  buildProjectOverview,
  buildGraphSummary,
  buildAnalysisSummary,
  buildSelectionContext,
  getSourceCode,
} from './context.js';
export { buildPrompt } from './prompt.js';
export { complete as geminiComplete } from './provider/gemini.js';
export {
  addMessage,
  getMessages,
  getHistory,
  getTurnCount,
  resetConversation,
  ROLES,
} from './conversation.js';
