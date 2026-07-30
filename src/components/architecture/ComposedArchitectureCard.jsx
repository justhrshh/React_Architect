import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Layout, Sliders, Layers, Database, Zap, Globe, Compass,
  Grid, Server, Wrench, FileText, Activity, ChevronRight,
  Plus, Minus, FileCode, Box, Hash, GitBranch
} from "lucide-react";
import { INTER, MONO } from "./constants";

const ICON_MAP = {
  Layout, Sliders, Layers, Database, Zap, Globe, Compass,
  Grid, Server, Wrench, FileText, Activity, FileCode
};

// Per-kind icon for child nodes
const KIND_ICON = {
  hook: Zap,
  "context-hook": Layers,
  "data-hook": Globe,
  "redux-hook": Database,
  state: Hash,
  route: GitBranch,
  navigator: Compass,
  endpoint: Globe,
  service: Server,
  component: Box,
  utility: Wrench,
};

// Per-kind short badge label
const KIND_BADGE = {
  hook: "hook",
  "context-hook": "ctx",
  "data-hook": "data",
  "redux-hook": "redux",
  state: "state",
  route: "route",
  navigator: "nav",
  endpoint: "api",
  service: "svc",
  component: "ui",
  utility: "util",
  section: "view",
};

export function ComposedArchitectureCard({
  node,
  isSelected,
  onSelect,
  onToggleExpand,
  onDrillDown,
}) {
  const clickTimerRef = useRef(null);

  const isCenter = node.isCenterNode;
  const isCategory = node.isCategoryNode;
  const isChild = node.isChildNode;

  // ── 1. Center Target Node ──────────────────────────────────────────────────
  if (isCenter) {
    return (
      <motion.div
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(node);
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: 230,
          height: 110,
          boxSizing: "border-box",
          padding: "14px 16px",
          borderRadius: "20px",
          background: "#FFFFFF",
          border: isSelected ? "2.5px solid #6366F1" : "2px solid #C7D2FE",
          boxShadow: isSelected
            ? "0 12px 32px rgba(99, 102, 241, 0.25), 0 0 0 2px rgba(99, 102, 241, 0.1)"
            : "0 10px 28px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)",
          cursor: "pointer",
          color: "#0F172A",
          fontFamily: INTER,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
            flexShrink: 0,
          }}>
            <Layout size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: "#0F172A",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {node.name}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, marginTop: 1 }}>
              {node.kind === "page" ? "Page Component" : "Root Component"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
          <span style={{
            fontSize: "10px",
            fontFamily: MONO,
            fontWeight: 700,
            color: "#6366F1",
            background: "#EEF2FF",
            padding: "2px 8px",
            borderRadius: "8px",
            border: "1px solid #E0E7FF",
          }}>
            ✦ Core
          </span>
          <span style={{ fontSize: "10.5px", color: "#94A3B8", fontFamily: MONO }}>
            LOC: <strong style={{ color: "#334155" }}>{node.loc || 240}</strong>
          </span>
        </div>
      </motion.div>
    );
  }

  // ── 2. Category Node ───────────────────────────────────────────────────────
  if (isCategory) {
    const IconComp = ICON_MAP[node.icon] || Layout;
    const catColor = node.color || "#6366F1";

    return (
      <motion.div
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleExpand) onToggleExpand(node.categoryId);
        }}
        whileHover={{ scale: 1.04, boxShadow: `0 6px 20px ${catColor}30` }}
        whileTap={{ scale: 0.96 }}
        style={{
          width: 160,
          height: 44,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px 6px 8px",
          borderRadius: "14px",
          background: "#FFFFFF",
          border: node.isExpanded ? `2px solid ${catColor}` : "1.5px solid #E2E8F0",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
          cursor: "pointer",
          color: "#0F172A",
          fontFamily: INTER,
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: `${catColor}15`,
            border: `1px solid ${catColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: catColor,
            flexShrink: 0,
          }}>
            <IconComp size={15} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: "11.5px",
              fontWeight: "700",
              color: "#0F172A",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {node.name}
            </div>
            <div style={{ fontSize: "9.5px", color: "#64748B", fontFamily: MONO }}>
              {node.itemCount} {node.itemCount === 1 ? "item" : "items"}
            </div>
          </div>
        </div>

        {node.itemCount > 0 && (
          <div style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: node.isExpanded ? catColor : "#F1F5F9",
            color: node.isExpanded ? "#FFFFFF" : "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {node.isExpanded ? <Minus size={11} /> : <Plus size={11} />}
          </div>
        )}
      </motion.div>
    );
  }

  // ── 3. Child Inventory Node ────────────────────────────────────────────────
  const nodeColor = node.color || "#6366F1";
  const kindKey = node.kind || "component";
  const KindIcon = KIND_ICON[kindKey] || FileCode;
  const badgeLabel = KIND_BADGE[kindKey] || kindKey;
  const canDrillDown = (kindKey === "component" || kindKey === "hook" || kindKey === "context-hook") && onDrillDown;

  const handleClick = (e) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      // Second click within window → double click
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (canDrillDown) onDrillDown(node);
    } else {
      // First click — wait to see if a second arrives
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        if (onSelect) onSelect(node);
      }, 220);
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.04 }}
      title={canDrillDown ? `Click: inspect · Double-click: explore ${node.name}` : undefined}
      style={{
        width: 150,
        height: 36,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px 4px 8px",
        borderRadius: "10px",
        background: "#FFFFFF",
        border: `1.5px solid ${nodeColor}35`,
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        color: "#0F172A",
        fontFamily: INTER,
        fontSize: "11px",
        cursor: "pointer",
      }}
    >
      {/* Kind icon */}
      <KindIcon size={12} style={{ color: nodeColor, flexShrink: 0 }} />

      {/* Name with multiplicity */}
      <span style={{
        fontWeight: "600",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: "#1E293B",
        flex: 1,
        minWidth: 0,
      }}>
        {node.displayName || node.name}
      </span>

      {/* Kind badge */}
      <span style={{
        fontSize: "8.5px",
        fontFamily: MONO,
        fontWeight: 700,
        color: nodeColor,
        background: `${nodeColor}12`,
        padding: "1px 5px",
        borderRadius: "5px",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}>
        {badgeLabel}
      </span>
    </motion.div>
  );
}
