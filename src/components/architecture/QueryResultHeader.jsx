import React from "react";
import * as Icons from "lucide-react";

export default function QueryResultHeader({
  queryMeta = {},
  template,
  focus,
  onReset,
}) {
  if (!queryMeta) return null;

  const IconComponent = template?.icon ? Icons[template.icon] || Icons.Workflow : Icons.Workflow;

  return (
    <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-lg px-4 py-2.5 mb-4 text-xs">
      <div className="flex items-center gap-3">
        <div
          className="p-1.5 rounded-md bg-slate-800 text-white"
          style={{ color: template?.chipColor }}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-slate-200">
            {template?.displayName || "Query Result"}
          </span>
          {focus && <span className="text-blue-400 font-medium ml-1.5">— {focus}</span>}
        </div>
      </div>

      <div className="flex items-center gap-4 text-slate-400">
        <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-mono">
          {queryMeta.nodeCount || 0} nodes
        </span>
        <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-mono">
          {queryMeta.edgeCount || 0} edges
        </span>
        <span className="text-slate-500 font-mono">{queryMeta.executionMs || 0}ms</span>
        {onReset && (
          <button
            onClick={onReset}
            className="text-slate-400 hover:text-white transition-colors underline ml-2"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
