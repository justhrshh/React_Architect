/**
 * intent.js
 * Lightweight intent classifier for React Architect AI.
 */

/** Intent keys */
export const INTENTS = {
  GREETING:  'greeting',
  IDENTITY:  'identity',
  PROJECT:   'project',
  EXPLAIN:   'explain',
  REVIEW:    'review',
  IMPACT:    'impact',
  PLAN:      'plan',
  SEARCH:    'search',
  GENERAL:   'general',
};

/**
 * Intent configuration: context slices required and whether selection is needed.
 */
const INTENT_CONFIG = {
  [INTENTS.GREETING]:  { context: [],                                                     requiresSelection: false },
  [INTENTS.IDENTITY]:  { context: [],                                                     requiresSelection: false },
  [INTENTS.PROJECT]:   { context: ['projectOverview', 'graphSummary'],                     requiresSelection: false },
  [INTENTS.EXPLAIN]:   { context: ['selection', 'sourceCode'],                             requiresSelection: true  },
  [INTENTS.REVIEW]:    { context: ['projectOverview', 'graphSummary', 'analysisSummary'],   requiresSelection: false },
  [INTENTS.IMPACT]:    { context: ['selection', 'sourceCode', 'analysisSummary'],           requiresSelection: true  },
  [INTENTS.PLAN]:      { context: ['projectOverview', 'analysisSummary'],                  requiresSelection: false },
  [INTENTS.SEARCH]:    { context: ['graphSummary', 'analysisSummary'],                     requiresSelection: false },
  [INTENTS.GENERAL]:   { context: ['projectOverview', 'graphSummary'],                     requiresSelection: false },
};

/**
 * Classification rules — evaluated in order, first match wins.
 * Each rule is [regex, intentKey, confidence].
 */
const RULES = [
  [/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i, INTENTS.GREETING, 0.95],
  [/\b(who\s+are\s+you|what\s+are\s+you|introduce\s+yourself|what\s+can\s+you\s+do|your\s+capabilities)\b/i, INTENTS.IDENTITY, 0.95],
  [/\b(safe\s*(ly)?\s*delete|safe\s+to\s+remove|what\s+breaks|blast\s+radius|impact\s+(of|analysis|if)|downstream\s+effects?)\b/i, INTENTS.IMPACT, 0.9],
  [/\b(dead\s+code|unused\s+(component|file|hook|import|export)|find\s+(all|unused|orphan|dead))\b/i, INTENTS.SEARCH, 0.9],
  [/\b(plan\s+(a|the|this)\s+feature|how\s+(to|would\s+I|should\s+I)\s+(add|implement|build|create|refactor)|recommend\s*(improvements|refactor))\b/i, INTENTS.PLAN, 0.85],
  [/\b(review\s+(the\s+)?(project|architecture|app|codebase)|architecture\s+(health|overview|quality)|code\s+quality|health\s+(check|score|report))\b/i, INTENTS.REVIEW, 0.9],
  [/\b(tell\s+me\s+about\s+(this\s+)?(project|app|codebase)|project\s+overview|what\s+(does|is)\s+this\s+(project|app)|describe\s+(the\s+)?(project|app))\b/i, INTENTS.PROJECT, 0.9],
  [/\b(explain|describe|what\s+(does|is)|how\s+does|tell\s+me\s+about|walk\s+me\s+through)\b/i, INTENTS.EXPLAIN, 0.7],
];

/**
 * Classify user question into an intent.
 * @param {string} question
 * @param {{ selectedNodeKind?: string|null }} [options]
 * @returns {{ key: string, confidence: number, context: string[], requiresSelection: boolean }}
 */
export function classifyIntent(question, { selectedNodeKind } = {}) {
  const q = (question ?? '').trim();

  for (const [pattern, intentKey, confidence] of RULES) {
    if (pattern.test(q)) {
      const config = INTENT_CONFIG[intentKey];
      return { key: intentKey, confidence, ...config };
    }
  }

  // Fallback: if a node is selected, treat as explain
  if (selectedNodeKind) {
    const config = INTENT_CONFIG[INTENTS.EXPLAIN];
    return { key: INTENTS.EXPLAIN, confidence: 0.5, ...config };
  }

  // Default: general
  const config = INTENT_CONFIG[INTENTS.GENERAL];
  return { key: INTENTS.GENERAL, confidence: 0.3, ...config };
}

/**
 * Get the context slices required for a given intent key.
 * @param {string} intentKey
 * @returns {string[]}
 */
export function getRequiredSlices(intentKey) {
  return INTENT_CONFIG[intentKey]?.context ?? INTENT_CONFIG[INTENTS.GENERAL].context;
}
