import React, { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import TemplateChip from "./TemplateChip";
import { resolveTemplate } from "@/engines/templates";

export default function QueryBar({
  templates = [],
  onQuery,
  activeTemplateId,
  isLoading = false,
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = inputValue.trim();
    if (!clean && activeTemplateId) {
      onQuery(activeTemplateId, null);
      return;
    }

    const match = resolveTemplate(clean);
    if (match.templateId) {
      onQuery(match.templateId, match.focusTerm);
    } else {
      // Fast path fallback -> execution-flow with focus
      onQuery("execution-flow", clean);
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
