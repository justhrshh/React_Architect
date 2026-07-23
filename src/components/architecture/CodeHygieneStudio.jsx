import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { selectNodeId } from "@/redux/slices/graphSlice";
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileText,
  Search,
  Copy,
  Check,
  Code,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ArrowRight,
  Filter
} from "lucide-react";
import { INTER, MONO } from "./constants";

export default function CodeHygieneStudio({ hygieneReport, knowledgeGraph, onInspectNode }) {
  const dispatch = useDispatch();

  const [activeCategory, setActiveCategory] = useState("all");
  const [safetyFilter, setSafetyFilter] = useState("all"); // "all" | "safe" | "review" | "uncertain"
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const findings = hygieneReport?.findings || [];
  const score = hygieneReport?.score ?? 95;
  const safeCount = hygieneReport?.safeToRemoveCount ?? 0;
  const reviewCount = hygieneReport?.reviewRequiredCount ?? 0;
  const uncertainCount = hygieneReport?.uncertainCount ?? 0;

  // Category Tabs Configuration
  const categories = [
    { key: "all", label: "All Items", count: findings.length },
    { key: "unusedComponents", label: "Unused Components", count: findings.filter(f => f.category === "unusedComponents").length },
    { key: "unusedFunctions", label: "Unused Functions", count: findings.filter(f => f.category === "unusedFunctions").length },
    { key: "unusedHooks", label: "Unused Hooks", count: findings.filter(f => f.category === "unusedHooks").length },
    { key: "unusedFiles", label: "Unused Files", count: findings.filter(f => f.category === "unusedFiles").length },
    { key: "documentationFiles", label: "Documentation Files (.md)", count: findings.filter(f => f.category === "documentationFiles").length },
    { key: "unusedImports", label: "Unused Imports", count: findings.filter(f => f.category === "unusedImports").length },
    { key: "unusedVariables", label: "Unused Variables", count: findings.filter(f => f.category === "unusedVariables").length },
    { key: "unusedExports", label: "Unused Exports", count: findings.filter(f => f.category === "unusedExports").length },
    { key: "orphanModules", label: "Orphan Modules", count: findings.filter(f => f.category === "orphanModules").length },
    { key: "duplicateUtilities", label: "Duplicate Utilities", count: findings.filter(f => f.category === "duplicateUtilities").length },
  ];

  // Filtered Findings
  const filtered = useMemo(() => {
    return findings.filter(f => {
      // Category Filter
      if (activeCategory !== "all" && f.category !== activeCategory) return false;
      // Safety Filter
      if (safetyFilter !== "all" && f.safety !== safetyFilter) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = f.name?.toLowerCase().includes(q);
        const fileMatch = f.file?.toLowerCase().includes(q);
        const reasonMatch = f.reason?.toLowerCase().includes(q);
        return nameMatch || fileMatch || reasonMatch;
      }
      return true;
    });
  }, [findings, activeCategory, safetyFilter, searchQuery]);

  const handleCopyPath = (path, id) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInspect = (nodeId) => {
    if (nodeId) {
      dispatch(selectNodeId(nodeId));
      if (onInspectNode) onInspectNode(nodeId);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", fontFamily: INTER }}>
      {/* ── Studio Header & Summary Dashboard ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 16 }}>
        {/* Clean Code Index Gauge */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid rgba(226, 232, 240, 0.8)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)",
        }}>
          <div style={{
            position: "relative",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `conic-gradient(${score >= 85 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'} ${score * 3.6}deg, #F1F5F9 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{score}%</span>
              <span style={{ fontSize: 8, color: "#94A3B8", fontWeight: 700, marginTop: 2 }}>CLEAN</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 9.5, fontWeight: 750, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              CODE HYGIENE STUDIO
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "2px 0 4px", letterSpacing: "-0.02em" }}>
              Dead Code Analysis
            </h3>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 450 }}>
              Knowledge Graph scan detected {findings.length} hygiene candidate(s).
            </span>
          </div>
        </div>

        {/* Metric 1: Safe to Remove */}
        <div style={{
          background: "#F0FDF4",
          borderRadius: 20,
          border: "1px solid #BBF7D0",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "between",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Safe To Remove
            </span>
            <ShieldCheck size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#14532D", margin: "8px 0 2px" }}>{safeCount}</div>
          <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 500 }}>High confidence (90%+)</span>
        </div>

        {/* Metric 2: Review Required */}
        <div style={{
          background: "#FFF7ED",
          borderRadius: 20,
          border: "1px solid #FED7AA",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "between",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#9A3412", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Review Before Removal
            </span>
            <ShieldAlert size={16} color="#EA580C" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#7C2D12", margin: "8px 0 2px" }}>{reviewCount}</div>
          <span style={{ fontSize: 10.5, color: "#9A3412", fontWeight: 500 }}>Medium confidence</span>
        </div>

        {/* Metric 3: Uncertain / Dynamic */}
        <div style={{
          background: "#FEF2F2",
          borderRadius: 20,
          border: "1px solid #FCA5A5",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "between",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Uncertain / Dynamic
            </span>
            <AlertTriangle size={16} color="#DC2626" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#7F1D1D", margin: "8px 0 2px" }}>{uncertainCount}</div>
          <span style={{ fontSize: 10.5, color: "#991B1B", fontWeight: 500 }}>Potential dynamic refs</span>
        </div>
      </div>

      {/* ── Toolbar: Search & Safety Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search symbol, file, or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 14px 8px 36px",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              fontSize: 12,
              color: "#0F172A",
              outline: "none",
            }}
          />
        </div>

        {/* Safety Filter Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", padding: 4, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          {[
            { key: "all", label: "All Safety Levels" },
            { key: "safe", label: "✅ Safe to Remove" },
            { key: "review", label: "⚠️ Review Required" },
            { key: "uncertain", label: "❌ Cannot Determine" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSafetyFilter(s.key)}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: safetyFilter === s.key ? "#FFFFFF" : "transparent",
                color: safetyFilter === s.key ? "#0F172A" : "#64748B",
                boxShadow: safetyFilter === s.key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Filter Tabs (Scrollable Bar) ── */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 99,
              border: `1px solid ${activeCategory === c.key ? "#2563EB" : "#E2E8F0"}`,
              background: activeCategory === c.key ? "#EFF6FF" : "#FFFFFF",
              color: activeCategory === c.key ? "#2563EB" : "#475569",
              fontSize: 11.5,
              fontWeight: 650,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>{c.label}</span>
            <span style={{
              fontSize: 9.5,
              fontWeight: 700,
              fontFamily: MONO,
              padding: "1px 6px",
              borderRadius: 99,
              background: activeCategory === c.key ? "#2563EB" : "#F1F5F9",
              color: activeCategory === c.key ? "#FFFFFF" : "#64748B",
            }}>
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Findings Grid Matrix ── */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid #E2E8F0",
          padding: "48px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <CheckCircle size={32} color="#10B981" />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>No Hygiene Issues Found</h4>
          <p style={{ fontSize: 12, color: "#64748B", margin: 0, maxWidth: 400 }}>
            {searchQuery ? "No findings match your search query." : "Your project code hygiene is clean for this category!"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {filtered.map(item => {
            const isSafe = item.safety === "safe";
            const isReview = item.safety === "review";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 18,
                  border: `1px solid ${isSafe ? "#BBF7D0" : isReview ? "#FED7AA" : "#FCA5A5"}`,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "0 4px 16px rgba(15,23,42,0.03)",
                }}
              >
                {/* Header: Category Badge & Safety Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 750,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: isSafe ? "#166534" : isReview ? "#9A3412" : "#991B1B",
                    background: isSafe ? "#F0FDF4" : isReview ? "#FFF7ED" : "#FEF2F2",
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: `1px solid ${isSafe ? "#BBF7D0" : isReview ? "#FED7AA" : "#FCA5A5"}`,
                  }}>
                    {item.categoryLabel}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: MONO,
                      background: "#F1F5F9",
                      color: "#475569",
                      padding: "2px 7px",
                      borderRadius: 99,
                    }}>
                      {item.confidence}% CONF
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>
                      {item.safetyBadge}
                    </span>
                  </div>
                </div>

                {/* Symbol Name & File Info */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: "0 0 4px", fontFamily: MONO, wordBreak: "break-all" }}>
                    {item.name}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#64748B", fontFamily: MONO }}>
                    <FileText size={12} color="#94A3B8" />
                    <span style={{ wordBreak: "break-all" }}>{item.file}</span>
                    {item.line > 1 && <span>(L{item.line})</span>}
                  </div>
                </div>

                {/* Why Flagged (Knowledge Graph Evidence) */}
                <div style={{
                  background: isSafe ? "#F8FAFC" : isReview ? "#FFFBEB" : "#FEF2F2",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  color: "#334155",
                }}>
                  <strong style={{ color: "#0F172A", display: "block", marginBottom: 2 }}>Knowledge Graph Evidence:</strong>
                  {item.reason}
                </div>

                {/* Recommendation & Actions */}
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10.5, color: "#475569", fontWeight: 500, flex: 1, paddingRight: 12 }}>
                    💡 {item.recommendation}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleCopyPath(item.file, item.id)}
                      title="Copy File Path"
                      style={{
                        background: "#F1F5F9",
                        border: "none",
                        borderRadius: 6,
                        padding: 5,
                        cursor: "pointer",
                        color: "#64748B",
                      }}
                    >
                      {copiedId === item.id ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    </button>

                    {item.nodeId && (
                      <button
                        onClick={() => handleInspect(item.nodeId)}
                        style={{
                          background: "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>Inspect</span>
                        <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
