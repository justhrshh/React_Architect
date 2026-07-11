import { useMemo } from "react";
import { motion } from "framer-motion";
import { Info, CheckCircle, AlertTriangle, XCircle, GitBranch } from "lucide-react";
import { calculateMaintainability } from "@/engines/analysis/modules/maintainability";
import { analyzeImpact } from "@/engines/analysis";
import { INTER, MONO, TYPE_CFG, BUILTIN_HOOKS } from "./constants";

function SectionLabel({ children }) {
  return (
    <h3 style={{
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#9CA3AF",
      fontFamily: INTER,
      margin: "0 0 10px",
    }}>
      {children}
    </h3>
  );
}

function Sep() {
  return <div style={{ height: 1, background: "#E5E7EB", margin: "20px 0" }} />;
}

const RISK_STYLE = {
  low: { text: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Low Risk" },
  medium: { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "Medium Risk" },
  high: { text: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "High Risk" },
};

function ImpactGroup({ label, items, tone, onNavigate }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 5px" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.slice(0, 6).map(item => (
          <span
            key={`${label}-${item.id}`}
            onClick={() => onNavigate?.(item.id)}
            title={item.file}
            style={{
              fontSize: 10.5,
              fontFamily: MONO,
              color: tone.text,
              background: tone.bg,
              padding: "2px 6px",
              borderRadius: 4,
              cursor: "pointer",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </span>
        ))}
        {items.length > 6 && (
          <span style={{ fontSize: 10.5, fontFamily: MONO, color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>
            +{items.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}

export default function InspectorPanel({ node, onNavigate, knowledgeGraph, treeNode }) {
  // Query Parent and Children nodes from graph edges
  const parentNodes = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "RENDERS" && e.target === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.source))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  const childNodes = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "RENDERS" && e.source === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Query API endpoint connections
  const apiCalls = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "USES_API" && e.source === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Query Redux slices consumed
  const consumedStates = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "STATE_CONSUMER" && e.target === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.source))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Check if component has cycle/circular renderings
  const isCyclic = useMemo(() => {
    if (!knowledgeGraph || !node) return false;
    const cycles = knowledgeGraph.validation?.warnings?.filter(w => w.type === "CIRCULAR_REFERENCE" && w.file === node.file) || [];
    return cycles.length > 0;
  }, [knowledgeGraph, node]);

  const maintainability = useMemo(() => {
    if (!node || node.kind !== "component") return null;
    return calculateMaintainability(node, knowledgeGraph);
  }, [node, knowledgeGraph]);

  const impact = useMemo(() => {
    if (!node || !knowledgeGraph) return null;
    return analyzeImpact(knowledgeGraph, node.id);
  }, [knowledgeGraph, node]);

  // Generate architectural recommendations
  const recommendations = useMemo(() => {
    if (!node) return [];
    if (node.kind === "component") {
      const list = [...(maintainability?.recommendations || [])];
      if (isCyclic) {
        list.push("Component is flagged inside a circular rendering loop. Refactor tree structure to break dependencies.");
      }
      return list;
    }
    const list = [];
    if (node.kind === "route") {
      list.push("Ensure routing parameters are validated at the page component level.");
    } else if (node.kind === "state") {
      list.push("Keep slice reducers side-effect free. Use middleware or thunks for async logic.");
    } else if (node.kind === "api") {
      list.push("Centralize API calls in service modules. Avoid importing axios/fetch directly into UI components.");
    }
    if (list.length === 0) {
      list.push("Node complies with project architecture standards.");
    }
    return list;
  }, [node, maintainability, isCyclic]);

  if (!node) {
    return (
      <aside style={{
        width: 308,
        background: "#FFFFFF",
        borderLeft: "1px solid #E8EAED",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid #F1F3F5" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8CDD8", fontFamily: INTER }}>
            Architectural Inspector
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <Info size={24} className="text-neutral-300 mb-2" />
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: INTER, fontWeight: 500 }}>Select a component to inspect its architecture</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;
  const propsList = node.metadata?.props || [];
  const hooksList = node.metadata?.hooks || [];
  const importsList = node.metadata?.imports || [];

  // Derive Component Architectural Role Label
  const getRoleLabel = () => {
    if (node.kind === "route") {
      return node.subtype === "router" ? "Application Router" : "Route Endpoint";
    }
    if (node.subtype === "layout") return "Layout Template Wrapper";
    if (node.subtype === "page") return "Page View Controller";
    if (node.subtype === "provider") return "React Context Provider";
    if (node.subtype === "context") return "React Context Definition";
    return "User Interface Component";
  };

  return (
    <aside style={{
      width: 308,
      background: "#FFFFFF",
      borderLeft: "1px solid #E8EAED",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid #F1F3F5", flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8CDD8", fontFamily: INTER }}>
          Architectural Specs
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: "18px 20px 28px" }}
        >
          {/* Component Identity */}
          <div>
            <span style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: cfg.text,
              background: cfg.bg,
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: INTER,
            }}>
              {cfg.label}
            </span>
            <h2 style={{
              fontSize: 20,
              fontWeight: 650,
              color: "#111827",
              letterSpacing: "-0.035em",
              margin: "6px 0 3px",
              lineHeight: 1.2,
              fontFamily: INTER,
            }}>
              {node.name}
            </h2>
            <p style={{
              fontSize: 10,
              color: "#6B7280",
              fontFamily: INTER,
              margin: "0 0 8px",
              fontWeight: 500,
            }}>
              {getRoleLabel()}
            </p>
            <p style={{
              fontSize: 9.5,
              color: "#A0A8B4",
              fontFamily: MONO,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }} title={node.file}>
              {node.file}
            </p>
          </div>

          <Sep />

          {/* Route Info */}
          {node.kind === "route" && (
            <>
              <SectionLabel>Routing Metadata</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Router Type</span>
                  <span style={{ fontSize: 11.5, color: "#111827", fontFamily: MONO, fontWeight: 600 }}>{treeNode?.metadata?.routerType || node.metadata?.source || "Router"}</span>
                </div>
                {node.subtype === "endpoint" && node.metadata?.componentName && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Target Component</span>
                    <span style={{ fontSize: 11.5, color: "#2563EB", fontFamily: MONO, fontWeight: 600 }}>{node.metadata.componentName}</span>
                  </div>
                )}
              </div>
              <Sep />
            </>
          )}
          {treeNode?.metadata?.entryRoute && (
            <>
              <SectionLabel>Routing Entry</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Entry Route</span>
                  <span style={{ fontSize: 11.5, color: "#111827", fontFamily: MONO, fontWeight: 600 }}>{treeNode.metadata.entryRoute}</span>
                </div>
                {treeNode.metadata.routerType && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Router Type</span>
                    <span style={{ fontSize: 11.5, color: "#111827", fontFamily: MONO, fontWeight: 600 }}>{treeNode.metadata.routerType}</span>
                  </div>
                )}
              </div>
              <Sep />
            </>
          )}

          {/* Architectural Health */}
          {node.kind === "component" && maintainability && (
            <>
              <SectionLabel>Architecture Health</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Maintainability Score</span>
                  <span style={{
                    fontSize: 12.5,
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: maintainability.score >= 85 ? "#059669" : maintainability.score >= 70 ? "#D97706" : "#DC2626"
                  }}>
                    {maintainability.score} / 100
                  </span>
                </div>
                
                {/* Complexity Drivers */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <p style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: INTER, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 2px" }}>Complexity Drivers</p>
                  {maintainability.drivers.map((drv, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#4B5563", fontFamily: INTER }}>
                      {drv.type === "success" ? (
                        <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      )}
                      <span>{drv.text}</span>
                    </div>
                  ))}
                  {isCyclic && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#DC2626", fontFamily: INTER }}>
                      <XCircle size={11} className="text-red-500 shrink-0" />
                      <span>Cyclic Render Loop detected</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px dashed #F1F3F5", paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontFamily: INTER }}>Complexity (LOC)</span>
                  <span style={{ fontSize: 11, color: "#4B5563", fontFamily: MONO }}>{maintainability.loc} lines</span>
                </div>
              </div>
              <Sep />
            </>
          )}

          {/* Impact Analysis */}
          {impact && (
            <>
              <SectionLabel>Impact Analysis</SectionLabel>
              <div style={{
                border: `1px solid ${RISK_STYLE[impact.riskLevel]?.border || "#E5E7EB"}`,
                background: RISK_STYLE[impact.riskLevel]?.bg || "#F9FAFB",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <GitBranch size={13} style={{ color: RISK_STYLE[impact.riskLevel]?.text || "#4B5563", flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: "#374151", fontFamily: INTER, fontWeight: 650 }}>
                      Blast Radius
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, color: RISK_STYLE[impact.riskLevel]?.text || "#111827", fontFamily: MONO, fontWeight: 800, lineHeight: 1 }}>
                      {impact.blastRadius}
                    </span>
                    <span style={{ fontSize: 9.5, color: "#6B7280", fontFamily: INTER, fontWeight: 600 }}>
                      nodes
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[
                    ["Components", impact.affectedByKind.component, "#2563EB"],
                    ["Routes", impact.affectedByKind.route, "#0891B2"],
                    ["State", impact.affectedByKind.state, "#4F46E5"],
                    ["APIs", impact.affectedByKind.api, "#D97706"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.72)", borderRadius: 8, padding: "6px 7px" }}>
                      <div style={{ fontSize: 12, color, fontFamily: MONO, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: 9.5, color: "#6B7280", fontFamily: INTER, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  alignSelf: "flex-start",
                  color: RISK_STYLE[impact.riskLevel]?.text || "#4B5563",
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${RISK_STYLE[impact.riskLevel]?.border || "#E5E7EB"}`,
                  borderRadius: 999,
                  padding: "3px 8px",
                  fontSize: 9.5,
                  fontFamily: MONO,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  {RISK_STYLE[impact.riskLevel]?.label || "Unknown Risk"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <ImpactGroup
                  label="Used By"
                  items={impact.direct.usedBy}
                  tone={{ text: "#2563EB", bg: "#EFF6FF" }}
                  onNavigate={onNavigate}
                />
                <ImpactGroup
                  label="Uses"
                  items={impact.direct.uses}
                  tone={{ text: "#4B5563", bg: "#F3F4F6" }}
                  onNavigate={onNavigate}
                />
              </div>

              <div className="flex gap-2 p-2.5 rounded-xl border border-neutral-100 bg-[#F9FAFB] text-[10.5px] text-neutral-600 font-sans leading-relaxed mt-3">
                {impact.riskLevel === "high" ? (
                  <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
                ) : impact.riskLevel === "medium" ? (
                  <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span>
                  {impact.riskLevel === "high"
                    ? "Review every dependent node before renaming, moving, or deleting this element."
                    : impact.riskLevel === "medium"
                      ? "Inspect direct dependents before refactoring this element."
                      : "This element has a narrow dependency surface and is likely safe to refactor carefully."}
                </span>
              </div>
              <Sep />
            </>
          )}

          {/* Hierarchy Connections */}
          <SectionLabel>Hierarchy Connections</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Parents list */}
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 5px" }}>Rendered By (Parents)</p>
              {parentNodes.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Entry point)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parentNodes.map(p => (
                    <span
                      key={p.id}
                      onClick={() => onNavigate(p.id)}
                      style={{ fontSize: 10.5, fontFamily: MONO, color: "#4B5563", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-neutral-200"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Children list */}
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", margin: "5px 0 5px" }}>Renders (Children)</p>
              {childNodes.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Leaf Component)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {childNodes.map(c => (
                    <span
                      key={c.id}
                      onClick={() => onNavigate(c.id)}
                      style={{ fontSize: 10.5, fontFamily: MONO, color: "#2563EB", background: "#EFF6FF", padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-blue-100"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Sep />

          {/* Props Specs */}
          {propsList.length > 0 && (
            <>
              <SectionLabel>Properties (Props)</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {propsList.map(prop => (
                  <div
                    key={prop.name}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: prop.required ? "#3B82F6" : "#9CA3AF",
                      }} />
                      <span style={{ fontSize: 11.5, color: "#374151", fontFamily: MONO, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {prop.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 10.5, color: "#9CA3AF", fontFamily: MONO }}>
                      {prop.type || "any"}
                    </span>
                  </div>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* State Slices Consumed */}
          {consumedStates.length > 0 && (
            <>
              <SectionLabel>Consumed State Slices</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {consumedStates.map(state => (
                  <span
                    key={state.id}
                    style={{ fontSize: 10.5, fontFamily: MONO, color: "#4F46E5", background: "#EEF2FF", padding: "2px 6px", borderRadius: 4 }}
                  >
                    {state.name}
                  </span>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* API endpoints used */}
          {apiCalls.length > 0 && (
            <>
              <SectionLabel>API Services Consumed</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                {apiCalls.map(api => (
                  <div
                    key={api.id}
                    style={{ fontSize: 10.5, fontFamily: MONO, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: 4, border: "1px solid #FDE68A" }}
                  >
                    {api.name}
                  </div>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* Custom hooks */}
          {hooksList.length > 0 && (
            <>
              <SectionLabel>Hooks Used</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {hooksList.map(hook => {
                  const builtin = BUILTIN_HOOKS.has(hook);
                  return (
                    <span
                      key={hook}
                      style={{
                        fontSize: 10.5,
                        fontFamily: MONO,
                        color: builtin ? "#6B7280" : "#059669",
                        background: builtin ? "#F3F4F6" : "#ECFDF5",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}
                    >
                      {hook}
                    </span>
                  );
                })}
              </div>
              <Sep />
            </>
          )}

          {/* Recommendations */}
          <SectionLabel>Architecture Recommendations</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {recommendations.map((rec, i) => {
              const isInfo = rec.toLowerCase().includes("consider") || rec.toLowerCase().includes("split") || rec.toLowerCase().includes("decompose") || rec.toLowerCase().includes("separate");
              return (
                <div key={i} className="flex gap-2 p-2.5 rounded-xl border border-neutral-100 bg-[#F9FAFB] text-[10.5px] text-neutral-600 font-sans leading-relaxed">
                  {isInfo ? (
                    <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span>{rec}</span>
                </div>
              );
            })}
          </div>

          {/* Imports */}
          {importsList.length > 0 && (
            <>
              <Sep />
              <SectionLabel>Imports</SectionLabel>
              <p style={{
                fontSize: 10,
                color: "#A8B0BF",
                fontFamily: MONO,
                letterSpacing: "-0.02em",
                lineHeight: 1.9,
                margin: 0,
                whiteSpace: "pre-wrap"
              }}>
                {importsList.join(",\n")}
              </p>
            </>
          )}
        </motion.div>
      </div>
    </aside>
  );
}
