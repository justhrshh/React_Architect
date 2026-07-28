import React, { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import TemplateChip from "./TemplateChip";
import { resolveTemplate } from "@/engines/templates";

export default function QueryBar({
  templates = [],
  onQuery,
  activeTemplateId,
  isLoading = false,
  conversationalNotice,
  onClearNotice,
  ambiguousCandidates = [],
  onSelectCandidate,
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = inputValue.trim();
    if (!clean && activeTemplateId) {
      onQuery(activeTemplateId, null);
      return;
    }

    const match = await resolveTemplate(clean);
    if (match) {
      onQuery(match.templateId, match.focusTerm, match.secondaryTerm, match);
    } else {
      // Fast path fallback -> execution-flow with focus
      onQuery("execution-flow", clean, null, { isArchitectural: true });
    }
  };

  const handleChipClick = (templateId) => {
    const clean = inputValue.trim();
    onQuery(templateId, clean || null);
  };

  const handleClear = () => {
    setInputValue("");
  };

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md mb-4">
      <form onSubmit={handleSubmit} className="relative flex items-center mb-3">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask or search architecture (e.g. 'auth flow', 'redux state', 'routes', 'Dashboard')..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-24 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-20 text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLoading ? "Running..." : "Query"}</span>
        </button>
      </form>

      {conversationalNotice && (
        <div className="mb-3 px-3.5 py-2 bg-purple-500/15 border border-purple-500/30 rounded-lg flex items-center justify-between text-xs text-purple-200 font-medium shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-purple-400">💬</span>
            <span>{conversationalNotice}</span>
          </div>
          {onClearNotice && (
            <button
              type="button"
              onClick={onClearNotice}
              className="text-purple-400 hover:text-purple-200 p-0.5 ml-2 font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {ambiguousCandidates && ambiguousCandidates.length > 0 && (
        <div className="mb-3 p-3.5 bg-indigo-950/90 border border-indigo-500/40 rounded-xl shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-sm">❓</span>
              <span className="text-xs font-bold text-slate-200 tracking-tight">
                Multiple architectural entities found. Which one would you like to explore?
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ambiguousCandidates.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => onSelectCandidate && onSelectCandidate(cand)}
                className="flex flex-col items-start p-2.5 bg-slate-900/90 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500/60 rounded-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                    {cand.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                    {cand.kind}
                  </span>
                </div>
                {cand.file && (
                  <span className="text-[10px] text-slate-400 truncate max-w-full font-mono">
                    {cand.file}
                  </span>
                )}
                <div className="mt-1.5 text-[10px] text-indigo-400 font-medium">
                  Confidence: {Math.round((cand.confidence || 0) * 100)}%
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
          Templates:
        </span>
        {templates.map((tpl) => (
          <TemplateChip
            key={tpl.id}
            template={tpl}
            isActive={tpl.id === activeTemplateId}
            onClick={handleChipClick}
          />
        ))}
      </div>
    </div>
  );
}
