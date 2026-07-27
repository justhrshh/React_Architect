import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Search, History, RotateCcw } from "lucide-react";

export default function QueryResultHeader({
  queryMeta = {},
  template,
  focus,
  onReset,
  onSearchQuery,
  onToggleHistory,
  historyCount = 0,
}) {
  const [searchValue, setSearchValue] = useState(focus || "");

  if (!queryMeta) return null;

  const IconComponent = template?.icon ? Icons[template.icon] || Icons.Workflow : Icons.Workflow;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim() && onSearchQuery) {
      onSearchQuery(searchValue.trim());
    }
  };

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200/90 shadow-sm rounded-xl px-4 py-2.5 mb-3 text-xs gap-4 selection:bg-purple-100">
      {/* Left Section: Icon, Title & Inline Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div
          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/80 shrink-0"
          style={{ color: template?.chipColor || "#6366F1" }}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="shrink-0 font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span>{template?.displayName || "Execution Flow"}</span>
          {focus && <span className="text-indigo-600 font-medium">({focus})</span>}
          {queryMeta.classification?.type && (
            <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {queryMeta.classification.type}
            </span>
          )}
        </div>

        {/* Integrated White Inline Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
          <div className="flex items-center bg-slate-100/70 hover:bg-slate-100 border border-slate-200/70 rounded-lg px-2.5 py-1.5 transition-all focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search or filter architecture..."
              className="w-full bg-transparent text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none border-none ring-0"
            />
          </div>
        </form>
      </div>

      {/* Right Section: Stats Badges, History Button & Reset Button */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-md text-slate-600 font-semibold font-mono text-[11px]">
          {queryMeta.nodeCount || 0} nodes
        </span>
        <span className="bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-md text-slate-600 font-semibold font-mono text-[11px]">
          {queryMeta.edgeCount || 0} edges
        </span>
        <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
          {queryMeta.executionMs || 0}ms
        </span>

        {/* Query History Drawer Toggle Button */}
        {onToggleHistory && (
          <button
            onClick={onToggleHistory}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors text-xs"
            title="Open Query History"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>
        )}

        {/* Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors text-xs"
            title="Reset Architecture View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
