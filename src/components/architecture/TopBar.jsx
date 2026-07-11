import { ArrowLeft, Layers, ChevronRight, GitBranch, Search, Share2, Settings } from "lucide-react";
import { INTER, SERIF } from "./constants";

export default function TopBar({ nodeCount, projectName, handleBack, activeTab }) {
  const getSubTitle = () => {
    if (activeTab === "flow") {
      return "Architecture Flow — Automatically Generated Flow Chart";
    }
    if (activeTab === "explore") {
      return "Explorer — Project Directory View";
    }
    if (activeTab === "graph") {
      return "Graph — Node dependency networks";
    }
    return "Architecture Studio — Component Nesting Hierarchy";
  };

  const getBadgeLabel = () => {
    if (activeTab === "flow") return "Architecture Flow";
    if (activeTab === "explore") return "Explorer View";
    if (activeTab === "graph") return "Graph View";
    return "Parent-Child Nesting Tree";
  };

  return (
    <header style={{
      height: 52,
      background: "#FFFFFF",
      borderBottom: "1px solid #E8EAED",
      display: "flex",
      alignItems: "center",
      padding: "0 16px 0 18px",
      flexShrink: 0,
      gap: 0,
      zIndex: 20,
    }}>
      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(0,0,0,0.03)",
          color: "#374151",
          fontSize: 11,
          fontFamily: INTER,
          fontWeight: 600,
          cursor: "pointer",
          marginRight: 16,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
      >
        <ArrowLeft size={13} strokeWidth={2.5} />
        Command Center
      </button>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30,
          height: 30,
          background: "#111827",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Layers size={14} color="white" />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#111827",
            letterSpacing: "-0.03em",
            fontFamily: SERIF,
            lineHeight: 1.15,
          }}>
            React<span style={{ color: "#00E5FF", fontWeight: 700 }}>/</span>Architect
          </div>
          <div style={{
            fontSize: 8,
            color: "#B8BEC9",
            fontFamily: INTER,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 1,
          }}>
            {getSubTitle()}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: "#E8EAED", margin: "0 16px" }} />

      {/* Project path */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#A8B0BF", fontFamily: INTER }}>{projectName || "react-project"}</span>
        <ChevronRight size={11} color="#D1D5DB" />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GitBranch size={11} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#374151", fontFamily: INTER, fontWeight: 500 }}>main</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Nesting Hierarchy Info Badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#EFF6FF",
        borderRadius: 6,
        border: "1px solid #BFDBFE",
      }}>
        <span style={{ fontSize: 10, color: "#1D4ED8", fontFamily: INTER, fontWeight: 650 }}>
          {getBadgeLabel()}
        </span>
      </div>

      {/* Component count pill */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#F8F9FB",
        borderRadius: 6,
        border: "1px solid #E8EAED",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
        <span style={{ fontSize: 11, color: "#6B7280", fontFamily: INTER }}>
          {nodeCount} components
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
        {[
          { Icon: Search, label: "Search" },
          { Icon: Share2, label: "Share" },
          { Icon: Settings, label: "Settings" },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            title={label}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 7,
              background: "transparent",
              border: "none",
              color: "#B8BEC9",
              cursor: "pointer",
              transition: "background 0.14s, color 0.14s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#F3F4F6";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#B8BEC9";
            }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </header>
  );
}
