import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Layers, ChevronRight, GitBranch, Search, Share2, Settings, X } from "lucide-react";
import { INTER, SERIF, MONO } from "./constants";

export default function TopBar({ nodeCount, projectName, handleBack, activeTab, onSelectNode, knowledgeGraph }) {
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

      {/* Premium Search Bar */}
      <div ref={searchRef} style={{ position: "relative", marginRight: 16 }}>
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}>
          <Search size={13} style={{ position: "absolute", left: 10, color: isFocused ? "#3B82F6" : "#9CA3AF", transition: "color 0.15s" }} />
          <input
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
              border: isFocused ? "1px solid #3B82F6" : "1px solid #E8EAED",
              background: isFocused ? "#FFFFFF" : "#F3F4F6",
              color: "#1F2937",
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
            border: "1px solid #E5E7EB",
            boxShadow: "0 12px 30px -4px rgba(0,0,0,0.12), 0 4px 12px -2px rgba(0,0,0,0.06)",
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
