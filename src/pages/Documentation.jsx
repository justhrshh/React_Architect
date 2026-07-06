import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import gsap from "gsap";
import {
  ArrowLeft, ChevronRight, GitBranch, FileText, BookOpen
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INTER = "'Inter', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Fraunces', Georgia, serif";

// ─── Simple Custom Markdown Parser Component ──────────────────────────────────

function MarkdownViewer({ content }) {
  const parsedElements = useMemo(() => {
    if (!content) return [];
    
    const lines = content.split("\n");
    const elements = [];
    let inCodeBlock = false;
    let codeContent = [];
    let codeLang = "";

    lines.forEach((line, idx) => {
      // Code Block check
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          // Close block
          inCodeBlock = false;
          elements.push({
            type: "code",
            lang: codeLang,
            text: codeContent.join("\n"),
            key: `code-${idx}`,
          });
          codeContent = [];
        } else {
          // Open block
          inCodeBlock = true;
          codeLang = line.replace("```", "").trim() || "javascript";
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push({ type: "h1", text: line.replace("# ", "").trim(), key: `h1-${idx}` });
      } else if (line.startsWith("## ")) {
        elements.push({ type: "h2", text: line.replace("## ", "").trim(), key: `h2-${idx}` });
      } else if (line.startsWith("### ")) {
        elements.push({ type: "h3", text: line.replace("### ", "").trim(), key: `h3-${idx}` });
      }
      // List items
      else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        elements.push({ type: "list", text: line.replace(/^[\s*-]+/, "").trim(), key: `list-${idx}` });
      }
      // Blockquotes
      else if (line.trim().startsWith("> ")) {
        elements.push({ type: "blockquote", text: line.replace(/^>\s*/, "").trim(), key: `quote-${idx}` });
      }
      // Horizontal rules
      else if (line.trim() === "---" || line.trim() === "***") {
        elements.push({ type: "hr", key: `hr-${idx}` });
      }
      // Paragraphs
      else if (line.trim().length > 0) {
        elements.push({ type: "p", text: line.trim(), key: `p-${idx}` });
      }
    });

    return elements;
  }, [content]);

  return (
    <div style={{
      fontFamily: INTER,
      color: "#374151",
      lineHeight: 1.625,
      fontSize: 14.5,
      maxWidth: 720,
      margin: "0 auto",
      padding: "20px 40px",
    }}>
      {parsedElements.map((el) => {
        switch (el.type) {
          case "h1":
            return (
              <h1 key={el.key} style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.03em",
                fontFamily: SERIF,
                marginTop: 28,
                marginBottom: 16,
                borderBottom: "1px solid #E5E7EB",
                paddingBottom: 8,
              }}>
                {el.text}
              </h1>
            );
          case "h2":
            return (
              <h2 key={el.key} style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#1F2937",
                letterSpacing: "-0.02em",
                marginTop: 24,
                marginBottom: 12,
                fontFamily: INTER,
              }}>
                {el.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={el.key} style={{
                fontSize: 16,
                fontWeight: 650,
                color: "#374151",
                marginTop: 20,
                marginBottom: 8,
                fontFamily: INTER,
              }}>
                {el.text}
              </h3>
            );
          case "p":
            return (
              <p key={el.key} style={{
                marginBottom: 14,
                color: "#4B5563",
              }}>
                {el.text}
              </p>
            );
          case "list":
            return (
              <div key={el.key} style={{ display: "flex", gap: 8, paddingLeft: 16, marginBottom: 8 }}>
                <span style={{ color: "#9CA3AF" }}>•</span>
                <span style={{ color: "#4B5563" }}>{el.text}</span>
              </div>
            );
          case "blockquote":
            return (
              <blockquote key={el.key} style={{
                borderLeft: "4px solid #E5E7EB",
                paddingLeft: 16,
                color: "#6B7280",
                fontStyle: "italic",
                margin: "16px 0",
              }}>
                {el.text}
              </blockquote>
            );
          case "code":
            return (
              <pre key={el.key} style={{
                background: "#0F172A",
                color: "#F8FAFC",
                padding: "16px 20px",
                borderRadius: 10,
                overflowX: "auto",
                fontSize: 12,
                fontFamily: MONO,
                margin: "18px 0",
                lineHeight: 1.5,
              }}>
                <code>{el.text}</code>
              </pre>
            );
          case "hr":
            return <hr key={el.key} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ projectName, handleBack }) {
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

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30,
          height: 30,
          background: "#3B82F6",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <BookOpen size={14} color="white" />
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
            Documentation Studio — Project Guides
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 18, background: "#E8EAED", margin: "0 16px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#A8B0BF", fontFamily: INTER }}>{projectName || "react-project"}</span>
        <ChevronRight size={11} color="#D1D5DB" />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GitBranch size={11} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#374151", fontFamily: INTER, fontWeight: 500 }}>main</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#EFF6FF",
        borderRadius: 6,
        border: "1px solid #DBEAFE",
      }}>
        <span style={{ fontSize: 10, color: "#1D4ED8", fontFamily: INTER, fontWeight: 650 }}>
          Interactive Reader
        </span>
      </div>
    </header>
  );
}

// ─── Main Documentation Component ─────────────────────────────────────────────

export default function Documentation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);

  const [selectedDocPath, setSelectedDocPath] = useState("");

  // Retrieve MD documents
  const docFiles = useMemo(() => {
    const mdNodes = knowledgeGraph?.nodes.filter(n => n.kind === "file" && n.subtype === "markdown") || [];

    if (mdNodes.length > 0) {
      return mdNodes.map(node => ({
        path: node.file,
        name: node.name,
        content: node.metadata?.content || "",
      }));
    }

    // Default Seed Fallbacks
    return [
      {
        path: "README.md",
        name: "README.md",
        content: `# Project Guide
Welcome to the React Architect workspace documentation.

## Getting Started
To view your project structure in real time:
- Enter the **Architecture Studio** to see components.
- Enter the **Route Studio** to examine endpoint mapping trees.
- Browse slices in the **State Studio**.

---
*Generated dynamically by the React Architect scanner engine.*`,
      },
      {
        path: "docs/CHANGELOG.md",
        name: "CHANGELOG.md",
        content: `# Changelog
All notable changes to this project will be documented in this file.

## [1.8.0] - Sprint 8
- Added AST Parsing support for component scanner.
- Added IndexedDB handles cache persistence.
- Connected Route, State, and API dynamic graphs.`,
      }
    ];
  }, [knowledgeGraph]);

  // Set default selection
  useEffect(() => {
    if (docFiles.length > 0 && !selectedDocPath) {
      const targetPath = docFiles[0].path;
      requestAnimationFrame(() => {
        setSelectedDocPath(targetPath);
      });
    }
  }, [docFiles, selectedDocPath]);

  const selectedDoc = useMemo(() => {
    return docFiles.find(f => f.path === selectedDocPath) || docFiles[0] || null;
  }, [docFiles, selectedDocPath]);

  const handleBack = () => {
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  };

  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    }
  }, [selectedProject, navigate]);

  useEffect(() => {
    gsap.fromTo(".page-fade", {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    });
  }, []);

  if (!selectedProject) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      fontFamily: INTER,
    }} className="page-fade">
      <TopBar projectName={selectedProject.name} handleBack={handleBack} />
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Left Directory Sidebar */}
        <aside className="w-64 border-r border-neutral-200 bg-[#F9FAFB] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto select-none">
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-widestest text-neutral-500 mb-3.5 font-bold">
              Project Documents
            </h4>
            <div className="flex flex-col gap-2">
              {docFiles.map((doc) => {
                const active = selectedDocPath === doc.path;
                return (
                  <button
                    key={doc.path}
                    onClick={() => setSelectedDocPath(doc.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                      active 
                        ? "border-blue-200 bg-blue-50/60 text-blue-700 shadow-sm font-semibold" 
                        : "border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60"
                    }`}
                  >
                    <FileText size={12} className={active ? "text-blue-500" : "text-neutral-400"} />
                    <span className="font-mono text-[10.5px] truncate" title={doc.path}>
                      {doc.path.split("/").pop()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center Markdown Reader Panel */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "#FFFFFF",
          padding: "20px 0",
        }}>
          {selectedDoc ? (
            <MarkdownViewer content={selectedDoc.content} />
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>No guide document selected</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
