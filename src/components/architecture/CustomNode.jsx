import { Handle, Position } from "@xyflow/react";
import { NW, NH, INTER, MONO, TYPE_CFG } from "./constants";

function NodeMetric({ value, label, accentColor }) {
  return (
    <span style={{
      fontSize: 10,
      color: accentColor ?? "#B0B7C3",
      fontFamily: INTER,
      display: "flex",
      gap: 3,
      alignItems: "center",
    }}>
      <span style={{ fontWeight: 600, color: accentColor ?? "#8A909E" }}>{value}</span>
      {label}
    </span>
  );
}

export default function CustomNode({ data }) {
  const { node, isSelected, isConnected } = data;
  
  let cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;
  if (node.kind === "route") {
    if (node.subtype === "router") {
      cfg = { label: "Router", color: "#8B5CF6", bg: "#F5F3FF", text: "#6D28D9" };
    } else {
      cfg = { label: "Route", color: "#EC4899", bg: "#FDF2F8", text: "#BE185D" };
    }
  } else if (node.kind === "api") {
    cfg = { label: "API", color: "#10B981", bg: "#ECFDF5", text: "#047857" };
  } else if (node.kind === "state") {
    cfg = { label: "State", color: "#EF4444", bg: "#FEF2F2", text: "#B91C1C" };
  } else if (node.subtype === "hook" || (node.kind === "component" && /^use[A-Z0-9]/.test(node.name))) {
    cfg = { label: "Hook", color: "#F59E0B", bg: "#FFFBEB", text: "#B45309" };
  }

  const shadow = isSelected
    ? `0 0 0 2px ${cfg.color}30, 0 4px 16px rgba(45, 42, 38, 0.08)`
    : isConnected
    ? `0 0 0 1.5px ${cfg.color}22, 0 3px 12px rgba(45, 42, 38, 0.05)`
    : "0 1px 3px rgba(45, 42, 38, 0.02), 0 3px 10px rgba(45, 42, 38, 0.03)";

  const borderColor = isSelected
    ? cfg.color + "99"
    : isConnected
    ? cfg.color + "44"
    : "rgba(139, 92, 26, 0.06)";

  const hookCount = node.metadata?.hooks?.length || 0;
  const childCount = node.metadata?.children?.length || 0;
  const apiCount = node.metadata?.apiCalls?.length || 0;

  return (
    <div style={{ position: "relative" }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: cfg.color, border: "none", width: 6, height: 6 }}
      />
      
      <div
        style={{
          width: NW,
          height: NH,
          background: "#FFFFFF",
          borderRadius: 12,
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderLeft: `3px solid ${cfg.color}`,
          boxShadow: shadow,
          display: "flex",
          flexDirection: "column",
          padding: "13px 14px 11px 15px",
          boxSizing: "border-box",
        }}
      >
        {/* Name + badge */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            letterSpacing: "-0.018em",
            lineHeight: 1.25,
            fontFamily: INTER,
          }}>
            {node.name}
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: cfg.text,
            background: cfg.bg,
            padding: "3px 6px",
            borderRadius: 4,
            flexShrink: 0,
            fontFamily: INTER,
            marginTop: 1,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* File path */}
        <div style={{
          fontSize: 9.5,
          color: "#B8BEC9",
          fontFamily: MONO,
          marginTop: 5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}>
          {node.file}
        </div>

        <div style={{ flex: 1 }} />

        {/* Metrics */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingTop: 8,
          borderTop: "1px solid #F3F4F6",
        }}>
          <NodeMetric value={hookCount} label="hooks" />
          <NodeMetric value={childCount} label="children" />
          {apiCount > 0 && (
            <NodeMetric value={apiCount} label="api" accentColor={cfg.color} />
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: cfg.color, border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}
