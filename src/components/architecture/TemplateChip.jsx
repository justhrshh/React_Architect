import React from "react";
import * as Icons from "lucide-react";

export default function TemplateChip({ template, isActive, onClick }) {
  if (!template) return null;

  const IconComponent = Icons[template.icon] || Icons.Workflow;

  return (
    <button
      type="button"
      onClick={() => onClick(template.id)}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
        isActive
          ? "bg-slate-800 text-white border border-slate-600 shadow-md scale-105"
          : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200"
      }`}
      style={{
        borderLeftColor: isActive ? template.chipColor : undefined,
        borderLeftWidth: isActive ? "3px" : undefined,
      }}
    >
      <IconComponent
        className="w-3.5 h-3.5"
        style={{ color: isActive ? template.chipColor : undefined }}
      />
      <span>{template.displayName}</span>
    </button>
  );
}
