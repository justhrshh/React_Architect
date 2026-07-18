import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { selectNodeId } from "@/redux/slices/graphSlice";
import {
  ChevronDown, ChevronRight, ArrowLeft,
  Loader, Globe, GitBranch, FileText, Info,
  AlertTriangle, X, Code, ExternalLink
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
  ROLES,
  GEMINI_MODELS,
  getProviderSettings,
  saveProviderSettings
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
  text:        "#111827",
  textSecondary: "#1F2937",
  textMuted:   "#4B5563",
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

  if (error?.isModelUnavailable || msg.includes("model not found") || msg.includes("model unavailable")) {
    return `The selected model is unavailable for this API key.`;
  }
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
  const dispatch = useDispatch();
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph  = useSelector((state) => state.graph.knowledgeGraph);
  const analysis        = useSelector((state) => state.analysis);
  const selectedId      = useSelector((state) => state.graph.selectedNodeId);

  const handleOpenExplorer = useCallback((node) => {
    dispatch(selectNodeId(node.id));
  }, [dispatch]);

  const handleCloseExplorer = useCallback(() => {
    dispatch(selectNodeId(null));
  }, [dispatch]);

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() =>
    getMessages().filter(m => m.role !== ROLES.SYSTEM)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [providerError, setProviderError] = useState(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [aiSettings, setAiSettings] = useState(() => getProviderSettings());
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleSettingsChange = () => {
      setAiSettings(getProviderSettings());
    };
    window.addEventListener("react-architect:ai-settings-changed", handleSettingsChange);
    return () => {
      window.removeEventListener("react-architect:ai-settings-changed", handleSettingsChange);
    };
  }, []);

  const activeModel = useMemo(() => {
    return GEMINI_MODELS.find(m => m.id === aiSettings.model) || GEMINI_MODELS[0];
  }, [aiSettings.model]);

  const hasGeminiKey = useMemo(() => {
    const customKey = aiSettings.apiKey && aiSettings.apiKey.trim() !== "";
    const envKey = import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY.trim() !== "";
    return customKey || envKey;
  }, [aiSettings.apiKey]);

  // Redirect if no project
  useEffect(() => {
    if (!selectedProject) navigate("/hub");
  }, [selectedProject, navigate]);

  // Clear selection on mount of AI Studio to keep conversation clean
  useEffect(() => {
    dispatch(selectNodeId(null));
  }, [dispatch]);

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

    let meta = null;
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
      meta = {
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
      const isModelUnavailable = !!err.isModelUnavailable;
      const messageMetadata = {
        ...(meta || {}),
        isModelUnavailable,
      };

      if (lastMsg && lastMsg.role === ROLES.ASSISTANT && lastMsg.content === "Thinking...") {
        lastMsg.content = friendlyMessage;
        lastMsg.metadata = messageMetadata;
      } else {
        addMessage(ROLES.ASSISTANT, friendlyMessage, messageMetadata);
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
      backgroundImage: "linear-gradient(rgba(250, 251, 252, 0.40), rgba(250, 251, 252, 0.40)), url('/50ea6f333adf5baf1b1984d3d90420a5.gif')",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center center",
      backgroundSize: "cover",
      fontFamily: INTER,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 24px 8px",
        flexShrink: 0,
        zIndex: 50,
      }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 24px",
            background: "#FFFFFF",
            border: "1px solid rgba(139, 92, 26, 0.08)",
            borderRadius: 28,
            boxShadow: isHeaderHovered
              ? "0 14px 40px rgba(45, 42, 38, 0.08), 0 2px 8px rgba(45, 42, 38, 0.03)"
              : "0 8px 30px rgba(45, 42, 38, 0.05), 0 1px 4px rgba(45, 42, 38, 0.02)",
            transform: isHeaderHovered ? "translateY(-1px)" : "none",
            transition: "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s cubic-bezier(0.25, 1, 0.5, 1), background 0.25s ease",
            width: "100%",
            maxWidth: 1024,
            height: 48,
            boxSizing: "border-box",
          }}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate("/workspace")}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer",
                color: COLORS.textSecondary, fontSize: 11.5, fontFamily: INTER, fontWeight: 600,
                padding: "4px 8px", borderRadius: 14,
                transition: "background 0.15s ease",
              }}
              className="hover:bg-neutral-50"
            >
              <ArrowLeft size={13} strokeWidth={2.5} />
              <span>Esc</span>
            </button>

            <div style={{ width: 1, height: 16, background: "rgba(139, 92, 26, 0.08)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>
                React Architect AI
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {projectOverview && (
              <span style={{ fontSize: 11, color: COLORS.textSecondary, fontFamily: MONO, fontWeight: 500 }}>
                {projectOverview.name}
              </span>
            )}
            
            <div style={{ width: 1, height: 12, background: "rgba(139, 92, 26, 0.08)" }} />

            <div style={{ position: "relative" }}>
              <button
                onClick={() => hasGeminiKey && setShowModelDropdown(!showModelDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "none",
                  cursor: hasGeminiKey ? "pointer" : "default",
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "background 0.15s ease",
                }}
                className={hasGeminiKey ? "hover:bg-neutral-100" : ""}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: hasGeminiKey ? COLORS.success : "#F59E0B",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 10.5, color: COLORS.textSecondary, fontFamily: INTER, fontWeight: 500 }}>
                  {hasGeminiKey ? activeModel.label : "Disconnected"}
                </span>
                {hasGeminiKey && (
                  <span style={{ fontSize: 8, color: COLORS.textMuted, marginLeft: 2 }}>▼</span>
                )}
              </button>

              {showModelDropdown && (
                <>
                  <div
                    onClick={() => setShowModelDropdown(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 99,
                      background: "transparent",
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "#FFFFFF",
                    border: "1px solid rgba(139, 92, 26, 0.08)",
                    borderRadius: 8,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    zIndex: 100,
                    minWidth: 210,
                  }}>
                    {GEMINI_MODELS.map(m => {
                      const isSelected = m.id === activeModel.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            const currentSettings = getProviderSettings();
                            currentSettings.model = m.id;
                            saveProviderSettings(currentSettings);
                            setShowModelDropdown(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            border: "none",
                            background: isSelected ? COLORS.accentBg : "transparent",
                            color: isSelected ? COLORS.accentText : COLORS.text,
                            fontSize: 11,
                            fontWeight: isSelected ? 600 : 400,
                            borderRadius: 5,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                          className="hover:bg-neutral-50"
                        >
                          <span style={{ fontFamily: INTER }}>
                            {m.label} {m.recommended && "⭐"}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: 10, color: COLORS.accent }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success }} />
              <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontFamily: INTER }}>Active</span>
            </div>
          </div>
        </header>
      </div>

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
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* Left Column: Chat Area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          transition: "all 0.3s ease",
        }}>
          {/* Scrollable Conversation History */}
          <div style={{ flex: 1, overflow: "auto", padding: "28px 20px" }}>
            
            {/* Empty state */}
            {messages.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", minHeight: "55vh", gap: 20, textAlign: "center",
                maxWidth: 640, margin: "0 auto", padding: "0 20px",
              }}>
                <img
                  src="/react-architect-logo.jpg"
                  alt="React Architect Logo"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    objectFit: "cover",
                    boxShadow: "0 8px 30px rgba(45, 42, 38, 0.08), 0 2px 8px rgba(45, 42, 38, 0.04)",
                  }}
                />
                <div>
                  <h1 style={{ fontSize: 21, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.025em", margin: 0, textShadow: "0 1px 2px #FFFFFF, 0 1px 3px rgba(255, 255, 255, 0.9)" }}>
                    Ask anything about your React architecture
                  </h1>
                  <p style={{ fontSize: 13.5, color: COLORS.textSecondary, marginTop: 8, lineHeight: 1.6, textShadow: "0 1px 2px #FFFFFF, 0 1px 3px rgba(255, 255, 255, 0.9)" }}>
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
                      <img
                        src="/react-architect-logo.jpg"
                        alt="React Architect Logo"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          objectFit: "cover",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                        {isThinking ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
                            <Loader size={14} color={COLORS.accent} style={{ animation: "spin 1.5s linear infinite" }} />
                            <span style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: INTER }}>
                              Analyzing architecture...
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <MarkdownRenderer content={message.content} onEntityClick={handleOpenExplorer} />
                            {message.metadata?.isModelUnavailable && (
                              <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                padding: "12px",
                                background: "#FEF2F2",
                                border: "1px solid #FEE2E2",
                                borderRadius: 10,
                                alignSelf: "flex-start",
                                marginTop: 4,
                              }}>
                                <span style={{ fontSize: 11.5, color: "#991B1B", fontFamily: INTER, fontWeight: 500 }}>
                                  Select a different model to resume:
                                </span>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {GEMINI_MODELS.map(m => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        const currentSettings = getProviderSettings();
                                        currentSettings.model = m.id;
                                        saveProviderSettings(currentSettings);
                                        message.content = `Selected model switched to **${m.label}**. You can retry your query now.`;
                                        if (message.metadata) {
                                          message.metadata.isModelUnavailable = false;
                                        }
                                        setMessages([...getMessages().filter(msg => msg.role !== ROLES.SYSTEM)]);
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: 6,
                                        background: "#FFFFFF",
                                        border: "1px solid #EF444430",
                                        color: "#B91C1C",
                                        fontSize: 11,
                                        fontFamily: INTER,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                        transition: "all 0.15s ease",
                                      }}
                                      className="hover:bg-red-50 hover:border-red-300"
                                    >
                                      Use {m.label} {m.recommended && "⭐"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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
                <img
                  src="/react-architect-logo.jpg"
                  alt="React Architect Logo"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
                  <Loader size={14} color={COLORS.accent} style={{ animation: "spin 1.5s linear infinite" }} />
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: INTER }}>
                    Analyzing architecture...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Persistent Input Console */}
          <div style={{
            background: "transparent",
            padding: "16px 20px 64px",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 768, margin: "0 auto", width: "100%" }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "flex-end", gap: 10,
                background: COLORS.surface, border: "1px solid rgba(139, 92, 26, 0.08)",
                borderRadius: 14, padding: "10px 14px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
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

        {/* Right Column: Code Explorer Side Panel */}
        {selectedId && selectedNode && (
          <div style={{
            width: 480,
            borderLeft: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.04)",
            zIndex: 40,
            animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${COLORS.borderLight}`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Code size={16} color={COLORS.accent} />
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: "-0.01em" }}>
                    {selectedNode.name}
                  </h3>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: COLORS.accentText,
                    background: COLORS.accentBg,
                    padding: "2px 6px",
                    borderRadius: 4,
                    marginTop: 4,
                    display: "inline-block",
                  }}>
                    {selectedNode.kind === "api" ? "API Gate" : selectedNode.kind === "state" ? "State Slice" : selectedNode.kind}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseExplorer}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.textMuted,
                  padding: 4,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {/* Secondary navigation action */}
              <button
                onClick={() => {
                  navigate("/architecture", { state: { focusNode: selectedId, fromAI: true } });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${COLORS.accent}, #8B5CF6)`,
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: INTER,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                  marginBottom: 20,
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <ExternalLink size={13} />
                Open in Architecture Studio
              </button>

              {/* File details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {selectedNode.file && (
                  <div>
                    <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>FILE PATH</span>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: COLORS.text, background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}`, marginTop: 4, wordBreak: "break-all" }}>
                      {selectedNode.file}
                    </div>
                  </div>
                )}

                {/* Specs depending on entity type */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {selectedNode.metadata?.loc && (
                    <div style={{ background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ fontSize: 9.5, color: COLORS.textMuted, fontWeight: 600 }}>LINES OF CODE</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{selectedNode.metadata.loc}</div>
                    </div>
                  )}

                  {selectedNode.metadata?.line && (
                    <div style={{ background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ fontSize: 9.5, color: COLORS.textMuted, fontWeight: 600 }}>DECLARATION LINE</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>L{selectedNode.metadata.line}</div>
                    </div>
                  )}

                  {selectedNode.metadata?.method && (
                    <div style={{ background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ fontSize: 9.5, color: COLORS.textMuted, fontWeight: 600 }}>HTTP METHOD</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accentText, marginTop: 2 }}>{selectedNode.metadata.method}</div>
                    </div>
                  )}

                  {selectedNode.metadata?.endpoint && (
                    <div style={{ background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}`, gridColumn: "span 2" }}>
                      <span style={{ fontSize: 9.5, color: COLORS.textMuted, fontWeight: 600 }}>API ENDPOINT</span>
                      <div style={{ fontSize: 11, fontFamily: MONO, color: COLORS.text, marginTop: 2, wordBreak: "break-all" }}>{selectedNode.metadata.endpoint}</div>
                    </div>
                  )}

                  {selectedNode.metadata?.path && (
                    <div style={{ background: COLORS.surfaceAlt, padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}`, gridColumn: "span 2" }}>
                      <span style={{ fontSize: 9.5, color: COLORS.textMuted, fontWeight: 600 }}>ROUTE PATH</span>
                      <div style={{ fontSize: 11, fontFamily: MONO, color: COLORS.text, marginTop: 2 }}>{selectedNode.metadata.path}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Props (if applicable) */}
              {selectedNode.metadata?.props && selectedNode.metadata.props.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>PROPS</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {selectedNode.metadata.props.map((p, pi) => {
                      const name = typeof p === "string" ? p : (p?.name || "");
                      const type = typeof p === "object" && p?.type ? `: ${p.type}` : "";
                      const req = typeof p === "object" && p?.required ? "*" : "";
                      return (
                        <span key={pi} style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.accentText, background: COLORS.accentBg, padding: "2px 8px", borderRadius: 6 }}>
                          {name}{req}{type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hooks (if applicable) */}
              {selectedNode.metadata?.hooks && selectedNode.metadata.hooks.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>HOOKS CALLED</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {selectedNode.metadata.hooks.map((h, hi) => {
                      const name = typeof h === "string" ? h : (h?.name || JSON.stringify(h));
                      return (
                        <span key={hi} style={{ fontFamily: MONO, fontSize: 10.5, color: "#0D9488", background: "#CCFBF1", padding: "2px 8px", borderRadius: 6 }}>
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Imports */}
              {selectedNode.metadata?.imports && selectedNode.metadata.imports.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>IMPORTS</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, maxHeight: 150, overflow: "auto", background: COLORS.surfaceAlt, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.borderLight}` }}>
                    {selectedNode.metadata.imports.map((imp, impIdx) => {
                      const impText = typeof imp === "string" ? imp : (imp?.name || JSON.stringify(imp));
                      return (
                        <div key={impIdx} style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.text, whiteSpace: "nowrap" }}>
                          {impText}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Exports */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>EXPORTS</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.text, background: COLORS.surfaceAlt, padding: "4px 8px", borderRadius: 6, border: `1px solid ${COLORS.borderLight}` }}>
                    {selectedNode.metadata?.isDefaultExport ? `default export ${selectedNode.name}` : `export ${selectedNode.name}`}
                  </span>
                </div>
              </div>

              {/* Related Files (connections) */}
              {(() => {
                const incomingEdges = knowledgeGraph?.edges?.filter(e => e.target === selectedId) || [];
                const outgoingEdges = knowledgeGraph?.edges?.filter(e => e.source === selectedId) || [];

                const incomingNodes = incomingEdges
                  .map(e => knowledgeGraph.nodes.find(n => n.id === e.source))
                  .filter(Boolean);

                const outgoingNodes = outgoingEdges
                  .map(e => knowledgeGraph.nodes.find(n => n.id === e.target))
                  .filter(Boolean);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                    {incomingNodes.length > 0 && (
                      <div>
                        <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>DEPENDENTS (USED BY)</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                          {incomingNodes.slice(0, 10).map((n, ni) => (
                            <span
                              key={ni}
                              onClick={() => dispatch(selectNodeId(n.id))}
                              style={{
                                fontFamily: INTER, fontSize: 11, fontWeight: 500,
                                color: "#3B82F6", background: "rgba(59, 130, 246, 0.05)",
                                border: "1px dashed rgba(59, 130, 246, 0.2)",
                                padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = "#2563EB";
                                e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                                e.currentTarget.style.borderStyle = "solid";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = "#3B82F6";
                                e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)";
                                e.currentTarget.style.borderStyle = "dashed";
                              }}
                            >
                              {n.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {outgoingNodes.length > 0 && (
                      <div>
                        <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>DEPENDENCIES (USES)</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                          {outgoingNodes.slice(0, 10).map((n, ni) => (
                            <span
                              key={ni}
                              onClick={() => dispatch(selectNodeId(n.id))}
                              style={{
                                fontFamily: INTER, fontSize: 11, fontWeight: 500,
                                color: "#3B82F6", background: "rgba(59, 130, 246, 0.05)",
                                border: "1px dashed rgba(59, 130, 246, 0.2)",
                                padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = "#2563EB";
                                e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                                e.currentTarget.style.borderStyle = "solid";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = "#3B82F6";
                                e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)";
                                e.currentTarget.style.borderStyle = "dashed";
                              }}
                            >
                              {n.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Source Code */}
              {(() => {
                const file = knowledgeGraph?.rawFiles?.find(f => f.path === selectedNode.file);
                const codeContent = file?.content || "// Source code not found in scanned files";
                return (
                  <div>
                    <span style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>SOURCE CODE</span>
                    <pre style={{
                      background: "#1E1E2E",
                      color: "#E4E4E7",
                      padding: "16px",
                      borderRadius: 10,
                      fontFamily: MONO,
                      fontSize: 12,
                      lineHeight: 1.6,
                      overflowX: "auto",
                      maxHeight: 400,
                      margin: "6px 0 0",
                      border: "1px solid #2E2E3E",
                    }}>
                      <code>{codeContent}</code>
                    </pre>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ─── Keyframes ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
