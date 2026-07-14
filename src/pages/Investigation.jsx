import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import {
  ChevronDown, ChevronRight, ArrowLeft,
  Loader, Brain, Globe, GitBranch, FileText, Info,
  AlertTriangle
} from "lucide-react";

import {
  classifyIntent,
  getRequiredSlices,
  buildContext,
  buildPrompt,
  getSystemPrompt,
  geminiComplete,
  addMessage,
  getMessages,
  getHistory,
  resetConversation,
  ROLES
} from "@/engines/ai";

import MarkdownRenderer from "@/components/investigation/MarkdownRenderer";

// ─── Design Tokens ──────────────────────────────────────────────────────────────

const INTER = "'Inter', -apple-system, sans-serif";
const MONO  = "'JetBrains Mono', 'SF Mono', monospace";

const COLORS = {
  bg:          "#FAFBFC",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F8F9FB",
  border:      "#E8EAED",
  borderLight: "#F0F1F3",
  text:        "#1A1D23",
  textSecondary: "#6B7280",
  textMuted:   "#9CA3AF",
  accent:      "#6366F1",
  accentBg:    "#EEF2FF",
  accentText:  "#4338CA",
  success:     "#059669",
  successBg:   "#ECFDF5",
  warning:     "#D97706",
  warningBg:   "#FFFBEB",
  danger:      "#DC2626",
  dangerBg:    "#FEF2F2",
};

// ─── Helper Components ──────────────────────────────────────────────────────────

function ContextCard({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "box-shadow 0.2s ease",
    }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "none", border: "none",
          cursor: "pointer", fontFamily: INTER, fontSize: 12.5, fontWeight: 600,
          color: COLORS.text, textAlign: "left",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: COLORS.accentBg,
        }}>
          <Icon size={14} color={COLORS.accent} />
        </div>
        <span style={{ flex: 1 }}>{title}</span>
        <ChevronDown size={14} color={COLORS.textMuted}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", fontSize: 12, color: COLORS.textSecondary, fontFamily: INTER, lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function KVRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0" }}>
      <span style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: INTER }}>{label}</span>
      <span style={{ color: COLORS.text, fontSize: 11.5, fontWeight: 500, fontFamily: MONO, maxWidth: "60%", textAlign: "right", wordBreak: "break-word" }}>{value ?? "—"}</span>
    </div>
  );
}

function CollapsibleDetails({ metadata }) {
  const [open, setOpen] = useState(false);
  if (!metadata) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
          padding: "4px 8px", borderRadius: 6,
        }}
        className="hover:bg-neutral-50"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>Inspect Architect AI Details</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8, display: "flex", flexDirection: "column", gap: 10,
          padding: 16, background: COLORS.surfaceAlt,
          border: `1px solid ${COLORS.borderLight}`, borderRadius: 12,
        }}>
          {metadata.contextSnapshot?.projectOverview && (
            <ContextCard title="Project Overview" icon={Globe} defaultOpen>
              <KVRow label="Name" value={metadata.contextSnapshot.projectOverview.name} />
              <KVRow label="Framework" value={metadata.contextSnapshot.projectOverview.framework} />
              <KVRow label="Components" value={metadata.contextSnapshot.projectOverview.componentCount} />
              <KVRow label="Routes" value={metadata.contextSnapshot.projectOverview.routeCount} />
            </ContextCard>
          )}

          {metadata.contextSnapshot?.graphSummary && (
            <ContextCard title="Knowledge Graph Summary" icon={GitBranch}>
              <KVRow label="Total Nodes" value={metadata.contextSnapshot.graphSummary.totalNodes} />
              <KVRow label="Total Edges" value={metadata.contextSnapshot.graphSummary.totalEdges} />
            </ContextCard>
          )}

          {metadata.promptSnapshot && (
            <ContextCard title="Generated Prompt" icon={FileText}>
              <pre style={{
                fontSize: 10, fontFamily: MONO, lineHeight: 1.5,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                margin: 0, maxHeight: 180, overflow: "auto",
                background: COLORS.bg, padding: 8, borderRadius: 6,
                border: `1px solid ${COLORS.borderLight}`,
              }}>
                {metadata.promptSnapshot}
              </pre>
            </ContextCard>
          )}

          <ContextCard title="Metadata" icon={Info}>
            <KVRow label="Intent Classified" value={metadata.intentKey} />
            <KVRow label="Latency" value={metadata.latency} />
            <KVRow label="Est. Tokens" value={metadata.tokensUsed} />
          </ContextCard>
        </div>
      )}
    </div>
  );
}

function getArchitectAIErrorMessage(error) {
  const msg = (error?.message || String(error)).toLowerCase();

  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("resource_exhausted")) {
    return `**AI request limit reached.**\n\nYou've reached the current Architect AI request limit. Please wait a few moments before trying again.`;
  }
  if (msg.includes("503") || msg.includes("service unavailable") || msg.includes("temporarily unavailable")) {
    return `**Architect AI is temporarily unavailable.**\n\nThe AI service is currently unavailable. Please try again in a moment.`;
  }
  if (msg.includes("fetch") || msg.includes("network error") || msg.includes("dns") || msg.includes("connect") || msg.includes("connection") || msg.includes("failed to fetch")) {
    return `**Connection lost.**\n\nCouldn't connect to Architect AI. Please check your internet connection and try again.`;
  }
  if (msg.includes("empty response") || msg.includes("no response")) {
    return `**No response generated.**\n\nArchitect AI couldn't generate a response for that request. Try asking the question in a different way.`;
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("deadline exceeded")) {
    return `**Request timed out.**\n\nArchitect AI is taking longer than expected. Please try again.`;
  }

  return `**Something went wrong.**\n\nAn unexpected error occurred while contacting Architect AI. Please try again.`;
}

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════════

export default function Investigation() {
  const navigate = useNavigate();
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph  = useSelector((state) => state.graph.knowledgeGraph);
  const analysis        = useSelector((state) => state.analysis);
  const selectedId      = useSelector((state) => state.graph.selectedNodeId);

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() =>
    getMessages().filter(m => m.role !== ROLES.SYSTEM)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [providerError, setProviderError] = useState(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  // Redirect if no project
  useEffect(() => {
    if (!selectedProject) navigate("/hub");
  }, [selectedProject, navigate]);

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Escape key back shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        try {
          if (window.history.state && window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/workspace");
          }
        } catch {
          navigate("/workspace");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRunning, scrollToBottom]);

  // Project info for header
  const projectOverview = useMemo(() => {
    if (!knowledgeGraph || !selectedProject) return null;
    const nodes = knowledgeGraph.nodes ?? [];
    return {
      name:           selectedProject.name,
      componentCount: nodes.filter(n => n.kind === "component").length,
      routeCount:     nodes.filter(n => n.kind === "route").length,
      apiCount:       nodes.filter(n => n.kind === "api").length,
    };
  }, [knowledgeGraph, selectedProject]);

  // Currently selected node context (for suggestion label)
  const selectedNode = useMemo(() => {
    if (!knowledgeGraph || !selectedId) return null;
    return knowledgeGraph.nodes?.find(n => n.id === selectedId) ?? null;
  }, [knowledgeGraph, selectedId]);

  // ─── Run investigation ──────────────────────────────────────────────────────

  const handleInvestigate = useCallback(async (questionText) => {
    const q = (questionText ?? query).trim();
    if (!q || isRunning) return;

    if (!hasGeminiKey) {
      setProviderError("Google Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment (.env file).");
      return;
    }

    setQuery("");
    setProviderError(null);
    setIsRunning(true);

    try {
      // 1. Classify intent
      const intent = classifyIntent(q, { selectedNodeKind: selectedNode?.kind ?? null });

      // 2. Build context slice lazily
      const slices = getRequiredSlices(intent.key);
      const ctx = buildContext(slices, {
        knowledgeGraph,
        analysis,
        selectedId,
        selectedProject,
      });

      // 3. Build user prompt
      const generatedPrompt = buildPrompt(intent.key, q, ctx);

      // 4. Update conversation manager
      const sysPrompt = getSystemPrompt(ctx.projectOverview);
      const prevMessages = getMessages();
      if (prevMessages.length === 0) {
        addMessage(ROLES.SYSTEM, sysPrompt);
      }

      addMessage(ROLES.USER, q);
      setMessages(getMessages().filter(m => m.role !== ROLES.SYSTEM));

      const startTime = Date.now();
      const meta = {
        intentKey: intent.key,
        contextSnapshot: ctx,
        promptSnapshot: generatedPrompt,
        latency: "0s",
        tokensUsed: "—",
      };

      // Add Assistant placeholder message with "Thinking..." content
      const assistantMsg = addMessage(ROLES.ASSISTANT, "Thinking...", meta);
      setMessages(getMessages().filter(m => m.role !== ROLES.SYSTEM));

      // 5. Build contents history payload for Gemini API
      // Send last 3 turns + current prompt
      const contentsPayload = getHistory(3);

      // Call API
      const raw = await geminiComplete(sysPrompt, contentsPayload, (currentText) => {
        assistantMsg.content = currentText;
        setMessages(getMessages().filter(m => m.role !== ROLES.SYSTEM));
      });

      // Record metrics
      meta.latency = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      meta.tokensUsed = "~" + Math.ceil(generatedPrompt.length / 4 + raw.length / 4);

      assistantMsg.content = raw;
      setMessages(getMessages().filter(m => m.role !== ROLES.SYSTEM));
    } catch (err) {
      const friendlyMessage = getArchitectAIErrorMessage(err);
      const prevMsgs = getMessages();
      const lastMsg = prevMsgs[prevMsgs.length - 1];
      if (lastMsg && lastMsg.role === ROLES.ASSISTANT && lastMsg.content === "Thinking...") {
        lastMsg.content = friendlyMessage;
      } else {
        addMessage(ROLES.ASSISTANT, friendlyMessage);
      }
      setMessages(getMessages().filter(m => m.role !== ROLES.SYSTEM));
    } finally {
      setIsRunning(false);
    }
  }, [query, isRunning, knowledgeGraph, analysis, selectedId, selectedProject, selectedNode, hasGeminiKey]);

  const handleSuggestion = useCallback((suggestionLabel) => {
    handleInvestigate(suggestionLabel);
  }, [handleInvestigate]);

  const handleReset = useCallback(() => {
    resetConversation();
    setQuery("");
    setMessages([]);
    setProviderError(null);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInvestigate();
    }
  }, [handleInvestigate]);

  // Suggestions dynamic list
  const suggestionList = useMemo(() => {
    const defaultSuggestions = [
      "What does this project do?",
      selectedNode ? `Explain component ${selectedNode.name}` : "Explain component Dashboard",
      "Review architecture",
      "How does authentication work?",
      selectedNode ? `Can I safely delete ${selectedNode.name}?` : "Find dead code",
      "Recommend refactoring improvements"
    ];
    return defaultSuggestions;
  }, [selectedNode]);

  return (
    <div style={{
      height: "100vh",
      background: COLORS.bg,
      fontFamily: INTER,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => navigate("/workspace")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: COLORS.textSecondary, fontSize: 12, fontFamily: INTER, fontWeight: 500,
              padding: "4px 8px", borderRadius: 6,
            }}
            className="hover:bg-neutral-50"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div style={{ width: 1, height: 20, background: COLORS.borderLight }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${COLORS.accent}, #8B5CF6)`,
            }}>
              <Brain size={14} color="#FFF" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
              React Architect AI
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {projectOverview && (
            <span style={{ fontSize: 11.5, color: COLORS.textMuted, fontFamily: MONO }}>
              {projectOverview.name}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: hasGeminiKey ? COLORS.success : "#F59E0B",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontFamily: INTER }}>
              {hasGeminiKey ? "Google Gemini Active" : "Gemini Disconnected"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.success }} />
            <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontFamily: INTER }}>Workspace Active</span>
          </div>
        </div>
      </header>

      {/* Persistent warning banner if API key is missing */}
      {!hasGeminiKey && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 28px",
          background: COLORS.warningBg,
          borderBottom: `1px solid ${COLORS.warning}33`,
        }}>
          <AlertTriangle size={14} color={COLORS.warning} />
          <span style={{ fontSize: 12, color: COLORS.warning, fontFamily: INTER, fontWeight: 500 }}>
            Google Gemini API key is not configured. Please define <strong>VITE_GEMINI_API_KEY</strong> in your environment (.env file).
          </span>
        </div>
      )}

      {/* ─── Error Banner ─────────────────────────────────────────────────────── */}
      {providerError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 28px",
          background: COLORS.dangerBg,
          borderBottom: `1px solid #FECACA`,
        }}>
          <Info size={14} color={COLORS.danger} />
          <span style={{ fontSize: 12, color: COLORS.danger, fontFamily: INTER, fontWeight: 500 }}>{providerError}</span>
          <button onClick={() => setProviderError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: COLORS.danger, fontSize: 11, fontFamily: INTER }}>Dismiss</button>
        </div>
      )}

      {/* ─── Main Workspace Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Scrollable Conversation History */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px 20px" }}>
          
          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", minHeight: "55vh", gap: 20, textAlign: "center",
              maxWidth: 640, margin: "0 auto", padding: "0 20px",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${COLORS.accentBg}, #F5F3FF)`,
                boxShadow: `0 8px 24px ${COLORS.accent}12`,
              }}>
                <Brain size={26} color={COLORS.accent} />
              </div>
              <div>
                <h1 style={{ fontSize: 21, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.025em", margin: 0 }}>
                  Ask anything about your React architecture
                </h1>
                <p style={{ fontSize: 13.5, color: COLORS.textSecondary, marginTop: 8, lineHeight: 1.6 }}>
                  React Architect AI understands your codebase as a structured knowledge graph.
                  Ask about dependencies, routing, state flow, auth, or refactoring.
                </p>
              </div>
              <div style={{
                display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
                marginTop: 8,
              }}>
                {suggestionList.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(suggestion)}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      color: COLORS.text, fontSize: 12.5, fontFamily: INTER, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    }}
                    className="hover:bg-neutral-50 hover:border-neutral-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          {messages.length > 0 && (
            <div style={{ maxWidth: 768, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((message, idx) => {
                if (message.role === ROLES.USER) {
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        maxWidth: "75%",
                        background: COLORS.accentBg,
                        border: `1px solid ${COLORS.accent}14`,
                        borderRadius: "16px 16px 4px 16px",
                        padding: "12px 18px",
                        fontSize: 13.5, color: COLORS.text,
                        lineHeight: 1.5,
                        fontFamily: INTER,
                      }}>
                        {message.content}
                      </div>
                    </div>
                  );
                }

                // Assistant response
                const isThinking = message.content === "Thinking...";

                return (
                  <div key={idx} style={{ display: "flex", gap: 16 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `linear-gradient(135deg, ${COLORS.accent}, #8B5CF6)`,
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      <Brain size={16} color="#FFF" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                      {isThinking ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
                          <Loader size={14} color={COLORS.accent} style={{ animation: "spin 1.5s linear infinite" }} />
                          <span style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: INTER }}>
                            Analyzing architecture...
                          </span>
                        </div>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}

                      {/* Collapsible Details */}
                      {!isThinking && <CollapsibleDetails metadata={message.metadata} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Loader Thinking state */}
          {isRunning && messages.length > 0 && messages[messages.length - 1]?.role !== ROLES.ASSISTANT && (
            <div style={{ maxWidth: 768, margin: "16px auto", width: "100%", display: "flex", gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: COLORS.accentBg, flexShrink: 0,
              }}>
                <Loader size={14} color={COLORS.accent} style={{ animation: "spin 1.5s linear infinite" }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, fontFamily: INTER }}>
                  Analyzing architecture...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Persistent Input Console */}
        <div style={{
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          padding: "16px 20px 24px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 768, margin: "0 auto", width: "100%" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "flex-end", gap: 10,
              background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: "10px 14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your architecture..."
                disabled={isRunning}
                rows={1}
                style={{
                  flex: 1, border: "none", background: "none", outline: "none",
                  fontSize: 13.5, color: COLORS.text, fontFamily: INTER,
                  resize: "none", minHeight: 24, maxHeight: 120, lineHeight: 1.5,
                }}
              />
              <button
                onClick={() => handleInvestigate()}
                disabled={!query.trim() || isRunning}
                style={{
                  padding: "8px 16px",
                  background: (!query.trim() || isRunning) ? COLORS.borderLight : `linear-gradient(135deg, ${COLORS.accent}, #8B5CF6)`,
                  color: (!query.trim() || isRunning) ? COLORS.textMuted : "#FFFFFF",
                  border: "none", borderRadius: 10,
                  fontSize: 12.5, fontWeight: 600, fontFamily: INTER,
                  cursor: (!query.trim() || isRunning) ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  alignSelf: "flex-end",
                }}
              >
                {isRunning ? "Thinking..." : "Ask"}
              </button>
            </div>
          </div>

          {/* Inline suggestions below input (only if query is empty) */}
          {!query && (
            <div style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
              marginTop: 12, maxWidth: 768, marginLeft: "auto", marginRight: "auto",
            }}>
              {suggestionList.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(suggestion)}
                  style={{
                    padding: "5px 11px", borderRadius: 8,
                    background: COLORS.surface, border: `1px solid ${COLORS.borderLight}`,
                    color: COLORS.textSecondary, fontSize: 11, fontFamily: INTER,
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                  className="hover:bg-neutral-50 hover:border-neutral-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Conversation actions (Reset Conversation button shown if messages exist) */}
          {messages.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <button
                onClick={handleReset}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
                  padding: "4px 8px", borderRadius: 6,
                }}
                className="hover:bg-neutral-50"
              >
                Reset Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Keyframes ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
