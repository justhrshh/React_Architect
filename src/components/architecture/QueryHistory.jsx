import React from "react";
import { History, ChevronRight } from "lucide-react";

export default function QueryHistory({ history = [], onReplay }) {
  if (!history || history.length === 0) {
    return (
      <div className="w-56 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-500 flex flex-col items-center justify-center min-h-[200px]">
        <History className="w-5 h-5 mb-1.5 text-slate-600" />
        <span>No recent queries for this project</span>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 shadow-lg flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/80 text-xs font-semibold text-slate-400">
        <History className="w-4 h-4 text-blue-400" />
        <span>Query History (Last 10)</span>
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[400px] pr-1">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onReplay(entry)}
            className="group flex items-center justify-between w-full p-2 bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/60 rounded-md text-left transition-all"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                {entry.displayLabel}
              </span>
              <span className="text-[10px] text-slate-500">
                {entry.queryMeta?.nodeCount || 0} nodes • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
