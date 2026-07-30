import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { Search, History, RotateCcw, ChevronDown, Layers, Package, GitBranch, Cpu, Network, ShieldCheck } from "lucide-react";
import { ALL_TEMPLATES } from "@/engines/templates";

const LENS_ICONS = {
  "composed-architecture": Package,
  "component-hierarchy": Layers,
  "execution-flow": Cpu,
  "navigation-flow": GitBranch,
  "request-lifecycle": ShieldCheck,
};

export default function QueryResultHeader({
  queryMeta = {},
  template,
  focus,
  onReset,
  onSearchQuery,
  onSelectLens,
  onToggleHistory,
  historyCount = 0,
}) {
  const [searchValue, setSearchValue] = useState(focus || "");
  const [isLensOpen, setIsLensOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync local input when external focus prop changes (e.g. after a new query resolves)
  useEffect(() => {
    setSearchValue(focus || "");
  }, [focus]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLensOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!queryMeta) return null;

  const IconComponent = template?.icon ? Icons[template.icon] || Icons.Workflow : Icons.Workflow;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim() && onSearchQuery) {
      onSearchQuery(searchValue.trim());
    }
  };

  const handleLensSelect = (tplId) => {
    setIsLensOpen(false);
    if (onSelectLens) {
      onSelectLens(tplId);
    } else if (onSearchQuery) {
      onSearchQuery(tplId);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200/90 shadow-sm rounded-xl px-4 py-2.5 mb-3 text-xs gap-4 selection:bg-purple-100 relative z-30">
      {/* Left Section: Icon, Interactive Lens Switcher & Inline Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <div
          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/80 shrink-0"
          style={{ color: template?.chipColor || "#6366F1" }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Interactive Lens Switcher Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsLensOpen((prev) => !prev)}
            className="flex items-center gap-1.5 font-bold text-slate-800 tracking-tight hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 px-2.5 py-1.5 rounded-lg cursor-pointer"
            title="Click to switch Architectural Lens"
          >
            <span className="text-slate-900">{template?.displayName || "Execution Flow"}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isLensOpen ? "rotate-180 text-indigo-600" : ""}`} />
            {focus && <span className="text-indigo-600 font-medium ml-1">({focus})</span>}
          </button>

          {/* Floating Dropdown Menu */}
          {isLensOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Architectural Lens
              </div>
              <div className="divide-y divide-slate-100">
                {ALL_TEMPLATES.map((tpl) => {
                  const LensIcon = LENS_ICONS[tpl.id] || Icons[tpl.icon] || Icons.Workflow;
                  const isActive = tpl.id === template?.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleLensSelect(tpl.id)}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${
                        isActive ? "bg-indigo-50/80 text-indigo-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <LensIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tpl.chipColor || "#6366F1" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{tpl.displayName}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[10.5px] text-slate-500 line-clamp-1 font-normal mt-0.5">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {queryMeta.classification?.type && (
          <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0 hidden md:inline-block">
            {queryMeta.classification.type}
          </span>
        )}

        {/* Integrated White Inline Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[180px] relative">
          <div className="flex items-center bg-slate-100/70 hover:bg-slate-100 border border-slate-200/70 rounded-lg px-2.5 py-1 transition-all focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
              placeholder="Search architecture (e.g. 'Dashboard', 'auth flow')..."
              className="w-full bg-transparent text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none border-none ring-0"
            />
            {searchValue.trim() && (
              <button
                type="submit"
                className="ml-2 shrink-0 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] font-bold transition-colors"
              >
                Go
              </button>
            )}
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
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors text-xs cursor-pointer"
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
            className="flex items-center gap-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors text-xs cursor-pointer"
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

