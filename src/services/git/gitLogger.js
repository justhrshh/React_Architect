/**
 * gitLogger.js
 * Centralized logging & dev-mode diagnostic reporting for Git API requests.
 */

const IS_DEV = import.meta.env.DEV;
const logs = [];

export const GitLogger = {
  logRequest({ method = 'GET', url, status, durationMs, cached = false, provider = 'github' }) {
    const entry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      durationMs: Math.round(durationMs),
      cached,
      provider,
    };
    logs.push(entry);

    if (IS_DEV) {
      console.log(
        `%c[Git API ${cached ? 'CACHE' : 'FETCH'}]%c ${method} ${url} (${status || 'NET_ERR'}) - ${entry.durationMs}ms`,
        `color: ${cached ? '#10b981' : '#6366f1'}; font-weight: bold;`,
        'color: inherit;'
      );
    }
  },

  getLogs() {
    return [...logs];
  },

  clearLogs() {
    logs.length = 0;
  },

  getAuditReport() {
    const totalCalls = logs.length;
    const cacheHits  = logs.filter(l => l.cached).length;
    const networkCalls = totalCalls - cacheHits;
    const estimatedPreOptCalls = 153;
    const reductionPercent = Math.max(0, ((estimatedPreOptCalls - networkCalls) / estimatedPreOptCalls) * 100).toFixed(1);

    return {
      estimatedPreOptCalls,
      actualNetworkCalls: networkCalls,
      cacheHits,
      totalLogged: totalCalls,
      reductionPercent: `${reductionPercent}%`,
      logs: [...logs],
    };
  },
};
