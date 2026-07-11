import { Share2, GitBranch, ChevronRight } from "lucide-react";
import { INTER, MONO } from "./constants";

export default function TreeNode({ node, selectedId, onSelect, expandedNodes, toggleExpand }) {
  const isExpanded = !!expandedNodes[node.id];
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = () => {
    if (node.kind === "category") return null;
    if (node.kind === "route") {
      if (node.subtype === "router") return <div style={{ color: "#3B82F6", marginTop: 2 }}><Share2 size={11} /></div>;
      return <div style={{ color: "#6366F1", marginTop: 2 }}><GitBranch size={11} /></div>;
    }
    if (node.kind === "component") {
      if (node.subtype === "page") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} />;
      if (node.subtype === "layout") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", flexShrink: 0 }} />;
      if (node.subtype === "provider" || node.subtype === "context") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#DB2777", flexShrink: 0 }} />;
      return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", flexShrink: 0 }} />;
    }
    if (node.kind === "state") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4F46E5", flexShrink: 0 }} />;
    if (node.kind === "api") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />;
    return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", flexShrink: 0 }} />;
  };

  const getSubtypeLabel = () => {
    if (node.kind === "category") return null;
    if (node.kind === "route") return node.subtype === "router" ? "Router" : "Route";
    if (node.kind === "component") return node.subtype || "component";
    return node.kind;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (node.kind !== "category") {
      onSelect(node.id);
    } else {
      toggleExpand(node.id);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingLeft: node.kind === "category" ? 0 : 8 }}>
      {/* Node Row */}
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "5px 8px",
          borderRadius: 6,
          cursor: "pointer",
          background: isSelected ? "#EFF6FF" : "transparent",
          border: isSelected ? "1px solid #BFDBFE" : "1px solid transparent",
          transition: "background 0.12s, border-color 0.12s",
          gap: 6,
          userSelect: "none"
        }}
        className={!isSelected && node.kind !== "category" ? "hover:bg-neutral-100/70" : ""}
      >
        {/* Toggle Arrow for folders/categories */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: 14,
              height: 14,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.12s"
            }}
          >
            <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        ) : (
          <div style={{ width: 14 }} />
        )}

        {/* Semantic dot color indicator */}
        {getIcon()}

        {/* Name */}
        <span
          style={{
            fontSize: node.kind === "category" ? 10.5 : 12,
            fontFamily: node.kind === "category" ? INTER : MONO,
            fontWeight: node.kind === "category" ? 750 : isSelected ? 650 : 500,
            color: node.kind === "category" ? "#8A909E" : isSelected ? "#1D4ED8" : "#374151",
            letterSpacing: node.kind === "category" ? "0.06em" : "-0.015em",
            textTransform: node.kind === "category" ? "uppercase" : "none"
          }}
        >
          {node.name}
          {node.isLoop && <span style={{ color: "#EF4444", fontSize: 9, marginLeft: 4, fontWeight: 700 }}>[loop]</span>}
        </span>

        {/* Subtype tag */}
        {getSubtypeLabel() && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "1px 5px",
              borderRadius: 4,
              fontFamily: INTER,
              letterSpacing: "0.03em",
              marginLeft: "auto",
              background: isSelected ? "#DBEAFE" : "#F3F4F6",
              color: isSelected ? "#1e40af" : "#4B5563",
              flexShrink: 0
            }}
          >
            {getSubtypeLabel()}
          </span>
        )}
      </div>

      {/* Children Nodes */}
      {hasChildren && isExpanded && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E5E7EB",
          marginLeft: 14,
          paddingLeft: 4,
          marginTop: 2,
          gap: 2
        }}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
