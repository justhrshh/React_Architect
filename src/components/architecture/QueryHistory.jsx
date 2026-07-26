import React from "react";
import { History, ChevronRight, X } from "lucide-react";

export default function QueryHistory({
  isOpen = false,
  onClose,
  history = [],
  onReplay,
}) {
  if (!isOpen) return null;

  return (
    <aside className="absolute top-4 right-4 bottom-6 w-[340px] max-w-[calc(100vw-32px)] bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 selection:bg-purple-100">
      {/* Floating Card Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/80 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/80">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
              Query History
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Last 10 executed queries</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          title="Close History Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Card Body */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2">
        {!history || history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200/90">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <History className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-1">No Query History</p>
            <p className="text-[11px] text-slate-400 max-w-[180px]">
              Execute architecture queries or select templates to build history.
            </p>
          </div>
        ) : (
          history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                onReplay(entry);
                if (onClose) onClose();
              }}
              className="group flex items-center justify-between w-full p-3 bg-slate-50/80 hover:bg-indigo-50/70 border border-slate-200/70 hover:border-indigo-200/90 rounded-xl text-left transition-all shadow-xs"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate mb-1">
                  {entry.displayLabel}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span className="bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                    {entry.queryMeta?.nodeCount || 0} nodes
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200/80 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
