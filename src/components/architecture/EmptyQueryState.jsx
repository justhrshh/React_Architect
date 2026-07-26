import React from "react";
import * as Icons from "lucide-react";

export default function EmptyQueryState({
  emptyState,
  templates = [],
  onSelectTemplate,
}) {
  const isCustomEmpty = Boolean(emptyState && emptyState.heading);

  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] bg-slate-950/40 border border-slate-800/60 rounded-xl p-8 text-center my-4">
      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
        <Icons.Compass className="w-6 h-6" />
      </div>

      <h3 className="text-base font-semibold text-slate-200 mb-2">
        {isCustomEmpty ? emptyState.heading : "What would you like to explore?"}
      </h3>

      <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
        {isCustomEmpty
          ? emptyState.description
          : "Select an Architecture Template above or type a natural language query to generate a focused architectural diagram."}
      </p>

      {isCustomEmpty && emptyState.suggestions?.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Suggestions:</span>
          {emptyState.suggestions.map((sugName) => {
            const matchedTpl = templates.find(
              (t) => t.displayName.toLowerCase() === sugName.toLowerCase()
            );
            return (
              <button
                key={sugName}
                type="button"
                onClick={() => onSelectTemplate(matchedTpl ? matchedTpl.id : "execution-flow")}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-full text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Try {sugName}
              </button>
            );
          })}
        </div>
      )}

      {!isCustomEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
          {templates.slice(0, 3).map((tpl) => {
            const IconComp = Icons[tpl.icon] || Icons.Workflow;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelectTemplate(tpl.id)}
                className="flex flex-col items-start p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComp
                    className="w-4 h-4"
                    style={{ color: tpl.chipColor }}
                  />
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {tpl.displayName}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 line-clamp-2">
                  {tpl.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
