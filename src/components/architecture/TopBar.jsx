import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, ChevronRight, GitBranch, Search, X } from "lucide-react";
import { INTER, SERIF, MONO } from "./constants";

export default function TopBar({ nodeCount, projectName, handleBack, activeTab, onSelectNode, knowledgeGraph, backText }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery || !knowledgeGraph?.nodes) return [];
    const query = debouncedQuery.toLowerCase();

    return knowledgeGraph.nodes.filter(node => {
      if (node.subtype === "router" || (node.subtype === "gateway" && node.name.includes("Routes"))) {
        return false;
      }
      const matchesName = node.name?.toLowerCase().includes(query);
      const matchesFile = node.file?.toLowerCase().includes(query);
      if (!matchesName && !matchesFile) return false;

      if (node.kind === "component" ||
          (node.kind === "state" && (node.subtype === "slice" || node.subtype === "store")) ||
          (node.kind === "route" && node.subtype !== "router") ||
          node.kind === "api") {
        return true;
      }
      if (node.kind === "file" && (node.file.endsWith(".js") || node.file.endsWith(".ts") || node.file.endsWith(".jsx") || node.file.endsWith(".tsx"))) {
        const hasRepresentation = knowledgeGraph.nodes.some(n =>
          n.id !== node.id &&
          n.file === node.file &&
          (n.kind === "component" || n.kind === "state" || n.kind === "api")
        );
        return !hasRepresentation;
      }
      return false;
    }).map(node => {
      let typeLabel = "Component";
      let iconColor = "#10B981";

      if (node.kind === "component") {
        if (node.subtype === "page") {
          typeLabel = "Page";
          iconColor = "#3B82F6";
        } else if (node.subtype === "layout") {
          typeLabel = "Layout";
          iconColor = "#7C3AED";
        } else if (node.subtype === "hook") {
          typeLabel = "Hook";
          iconColor = "#06B6D4";
        } else if (node.subtype === "provider" || node.subtype === "context") {
          typeLabel = "Context Provider";
          iconColor = "#DB2777";
        }
      } else if (node.kind === "state") {
        typeLabel = "Redux Slice";
        iconColor = "#9B7AE8";
      } else if (node.kind === "route") {
        typeLabel = "Route";
        iconColor = "#6366F1";
      } else if (node.kind === "api") {
        typeLabel = "API Service";
        iconColor = "#F59E0B";
      } else if (node.kind === "file") {
        typeLabel = "Utility Module";
        iconColor = "#6B7280";
      }

      const relativePath = node.file ? node.file.replace(/\\/g, "/") : "";
      return {
        id: node.id,
        name: node.name,
        typeLabel,
        iconColor,
        relativePath
      };
    }).slice(0, 30);
  }, [debouncedQuery, knowledgeGraph]);

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
      borderBottom: "1px solid rgba(139, 92, 26, 0.05)",
      display: "flex",
      alignItems: "center",
      padding: "0 16px 0 18px",
      flexShrink: 0,
      gap: 0,
      zIndex: 20,
      boxShadow: "0 1px 2px rgba(45, 42, 38, 0.01)",
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
          border: "1px solid rgba(139, 92, 26, 0.08)",
          background: "#FAF9F6",
          color: "#2E2D2B",
          fontSize: 11,
          fontFamily: INTER,
          fontWeight: 600,
          cursor: "pointer",
          marginRight: 16,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#F5F3EF"}
        onMouseLeave={e => e.currentTarget.style.background = "#FAF9F6"}
      >
        <ArrowLeft size={13} strokeWidth={2.5} />
        {backText || "Command Center"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src="/react-architect-logo.jpg"
          alt="React Architect Logo"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#111827",
            letterSpacing: "-0.03em",
            fontFamily: SERIF,
            lineHeight: 1.15,
          }}>
            React<span style={{ color: "#8B7E66", fontWeight: 700 }}>/</span>Architect
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

      {/* Premium Search Bar */}
      <div ref={searchRef} style={{ position: "relative", marginRight: 16 }}>
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}>
          <Search size={13} style={{ position: "absolute", left: 10, color: isFocused ? "#8B7E66" : "#8C867C", transition: "color 0.15s" }} />
          <input
            id="architecture-search-input"
            type="text"
            placeholder="Search files, hooks, components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            style={{
              width: isFocused || searchQuery ? 250 : 160,
              height: 32,
              padding: "0 28px 0 30px",
              fontSize: 11.5,
              borderRadius: 8,
              border: isFocused ? "1px solid #8B7E66" : "1px solid rgba(139, 92, 26, 0.06)",
              background: isFocused ? "#FFFFFF" : "#F5F3EF",
              color: "#2E2D2B",
              outline: "none",
              fontFamily: INTER,
              transition: "width 0.22s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.15s, background 0.15s",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                border: "none",
                background: "transparent",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
              }}
              className="hover:bg-neutral-200"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isFocused && searchQuery && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 380,
            maxHeight: 320,
            overflowY: "auto",
            background: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid rgba(139, 92, 26, 0.06)",
            boxShadow: "0 8px 24px rgba(45, 42, 38, 0.06)",
            zIndex: 100,
            padding: "6px 0",
            display: "flex",
            flexDirection: "column",
          }}>
            {results.length > 0 ? (
              results.map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectNode(res.id);
                    setIsFocused(false);
                    setSearchQuery("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 14px",
                    cursor: "pointer",
                    gap: 10,
                    transition: "background 0.1s",
                  }}
                  className="hover:bg-blue-50/50 group"
                >
                  {/* Semantic colored circle */}
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: res.iconColor,
                    flexShrink: 0
                  }} />

                  {/* Name and path details */}
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1F2937",
                        fontFamily: MONO,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {res.name}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "1.5px 5px",
                        borderRadius: 4,
                        background: "#F3F4F6",
                        color: "#4B5563",
                        fontFamily: INTER,
                        letterSpacing: "0.02em",
                        flexShrink: 0
                      }}>
                        {res.typeLabel}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      fontFamily: MONO,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2
                    }} title={res.relativePath}>
                      {res.relativePath}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              /* Premium elegant empty state */
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                textAlign: "center"
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#F9FAFB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9CA3AF",
                  marginBottom: 8
                }}>
                  <Search size={14} />
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily: INTER
                }}>
                  No results found
                </span>
                <span style={{
                  fontSize: 10.5,
                  color: "#9CA3AF",
                  fontFamily: INTER,
                  marginTop: 2,
                  maxWidth: 240
                }}>
                  We couldn't find any architectural element matching "{searchQuery}"
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nesting Hierarchy Info Badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#FAF9F6",
        borderRadius: 6,
        border: "1px solid rgba(139, 92, 26, 0.08)",
      }}>
        <span style={{ fontSize: 10, color: "#8B7E66", fontFamily: INTER, fontWeight: 650 }}>
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
        background: "#FAF9F6",
        borderRadius: 6,
        border: "1px solid rgba(139, 92, 26, 0.08)",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
        <span style={{ fontSize: 11, color: "#8C867C", fontFamily: INTER }}>
          {nodeCount} components
        </span>
      </div>


    </header>
  );
}
