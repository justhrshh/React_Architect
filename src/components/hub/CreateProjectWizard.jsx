import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import gsap from "gsap";
import { addProject, selectProject } from "@/redux/slices/hubSlice";
import { setProject } from "@/redux/slices/projectSlice";

// =============================================================================
// Step definitions — declarative data drives all rendering
// =============================================================================

const STEPS = [
  {
    id: "name",
    title: "Project Name",
    subtitle: "Give your project an identity.",
    type: "text",
    placeholder: "my-awesome-app",
  },
  {
    id: "framework",
    title: "Framework",
    subtitle: "Choose your React framework.",
    type: "single",
    options: [
      {
        id: "react-vite",
        label: "React + Vite",
        desc: "Fast, ESM-native, zero config. Best for SPAs.",
        icon: "⚡",
        recommended: true,
      },
      {
        id: "nextjs",
        label: "Next.js",
        desc: "Full-stack framework. SSR, API routes, App Router.",
        icon: "▲",
      },
      {
        id: "remix",
        label: "Remix",
        desc: "Full-stack with web fundamentals at the core.",
        icon: "💿",
        comingSoon: true,
      },
    ],
  },
  {
    id: "language",
    title: "Language",
    subtitle: "JavaScript or TypeScript?",
    type: "single",
    options: [
      {
        id: "typescript",
        label: "TypeScript",
        desc: "Typed superset of JavaScript. Recommended for larger projects.",
        icon: "TS",
        recommended: true,
      },
      {
        id: "javascript",
        label: "JavaScript",
        desc: "Standard JavaScript — no compilation step required.",
        icon: "JS",
      },
    ],
  },
  {
    id: "styling",
    title: "Styling",
    subtitle: "How will you style your app?",
    type: "single",
    options: [
      {
        id: "tailwind",
        label: "Tailwind CSS",
        desc: "Utility-first CSS. Rapid iteration with consistent design tokens.",
        icon: "🌊",
        recommended: true,
      },
      {
        id: "css-modules",
        label: "CSS Modules",
        desc: "Scoped CSS per component. No naming collisions.",
        icon: "📦",
      },
      {
        id: "scss",
        label: "SCSS",
        desc: "Sass superset — variables, nesting, mixins.",
        icon: "🎨",
      },
      {
        id: "styled-components",
        label: "Styled Components",
        desc: "CSS-in-JS with dynamic styling and theming.",
        icon: "💅",
      },
    ],
  },
  {
    id: "stateManagement",
    title: "State Management",
    subtitle: "How will you manage global state?",
    type: "single",
    options: [
      {
        id: "none",
        label: "None",
        desc: "Start lean. Add state management when complexity demands it.",
        icon: "○",
        recommended: true,
      },
      {
        id: "redux",
        label: "Redux Toolkit",
        desc: "Predictable state container. Industry standard for complex apps.",
        icon: "🔴",
      },
      {
        id: "zustand",
        label: "Zustand",
        desc: "Minimal, unopinionated. Simple API, no boilerplate.",
        icon: "🐻",
      },
      {
        id: "context",
        label: "Context API",
        desc: "Built-in React context. Good for low-frequency updates.",
        icon: "⚛",
      },
    ],
  },
  {
    id: "routing",
    title: "Routing",
    subtitle: "How will you handle navigation?",
    type: "single",
    options: [
      {
        id: "react-router",
        label: "React Router",
        desc: "The de-facto standard for React client-side routing.",
        icon: "🗺",
        recommended: true,
      },
      {
        id: "tanstack-router",
        label: "TanStack Router",
        desc: "Fully type-safe. Built-in data loading and search params.",
        icon: "🔷",
      },
      {
        id: "none",
        label: "None",
        desc: "Single-page app with no route management needed.",
        icon: "○",
      },
    ],
  },
  {
    id: "optionalPackages",
    title: "Optional Packages",
    subtitle: "Add tools your project will use.",
    type: "multi",
    options: [
      { id: "gsap",              label: "GSAP",              desc: "Professional animation library.",         icon: "🎬" },
      { id: "framer-motion",     label: "Framer Motion",     desc: "Production-ready React animations.",      icon: "✨" },
      { id: "react-query",       label: "TanStack Query",    desc: "Powerful async state management.",        icon: "🔄" },
      { id: "axios",             label: "Axios",             desc: "Promise-based HTTP client.",              icon: "🌐" },
      { id: "react-hook-form",   label: "React Hook Form",   desc: "Performant, flexible forms.",             icon: "📋" },
      { id: "zod",               label: "Zod",               desc: "TypeScript-first schema validation.",     icon: "🛡" },
      { id: "lucide-react",      label: "Lucide React",      desc: "Beautiful, consistent icon library.",     icon: "🎯" },
      { id: "date-fns",          label: "date-fns",          desc: "Modern JavaScript date utilities.",       icon: "📅" },
      { id: "eslint",            label: "ESLint",            desc: "Code quality and style enforcement.",     icon: "✓" },
      { id: "prettier",          label: "Prettier",          desc: "Opinionated code formatter.",             icon: "💎" },
    ],
  },
  {
    id: "folderStructure",
    title: "Folder Structure",
    subtitle: "Choose your project architecture pattern.",
    type: "single",
    options: [
      {
        id: "react-architect",
        label: "React Architect",
        desc: "Feature-driven with clean separation of pages, features, components, hooks, and services.",
        icon: "◈",
        recommended: true,
      },
      {
        id: "feature-based",
        label: "Feature-Based",
        desc: "Group everything by domain feature. Scales well as the project grows.",
        icon: "⬡",
      },
      {
        id: "basic",
        label: "Basic",
        desc: "Simple src/ with components/, pages/, and utils/. Great for small projects.",
        icon: "□",
      },
      {
        id: "domain-driven",
        label: "Domain-Driven",
        desc: "Entities, use cases, adapters. Strict separation of concerns.",
        icon: "⬣",
      },
    ],
  },
];

// =============================================================================
// Default selections
// =============================================================================

const DEFAULTS = {
  name: "",
  framework: "react-vite",
  language: "typescript",
  styling: "tailwind",
  stateManagement: "none",
  routing: "react-router",
  optionalPackages: [],
  folderStructure: "react-architect",
};

// =============================================================================
// Maps for building the project data object
// =============================================================================

const FRAMEWORK_MAP = {
  "react-vite": "React",
  "nextjs":     "Next.js",
  "remix":      "Remix",
};

const BUILD_TOOL_MAP = {
  "react-vite": "Vite",
  "nextjs":     "Next.js",
  "remix":      "Vite",
};

// =============================================================================
// Main wizard component
// =============================================================================

/**
 * CreateProjectWizard — fullscreen multi-step project creation wizard.
 *
 * Props:
 *   onClose    — close without saving
 *   onComplete — called with { projectId, projectName } after successful creation
 *               (parent handles cinematic load transition)
 */
const CreateProjectWizard = ({ onClose, onComplete }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState(DEFAULTS);
  const [nameError, setNameError] = useState("");

  const overlayRef = useRef();
  const contentRef = useRef();
  const prevStepRef = useRef(0);

  // Entrance animation
  useEffect(() => {
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.out" }
    );
    gsap.fromTo(
      contentRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.1 }
    );
  }, []);

  // Step change animation
  useEffect(() => {
    if (!contentRef.current) return;
    const direction = step > prevStepRef.current ? 1 : -1;
    prevStepRef.current = step;

    gsap.fromTo(
      contentRef.current,
      { x: direction * 32, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
    );
  }, [step]);

  // Validation
  const canContinue = useCallback(() => {
    if (STEPS[step].id === "name") return selections.name.trim().length > 0;
    return true;
  }, [step, selections.name]);

  const handleNext = () => {
    if (STEPS[step].id === "name" && !selections.name.trim()) {
      setNameError("Project name is required.");
      return;
    }
    // Smart routing: if Next.js is selected, pre-select next-router on step 5
    if (STEPS[step].id === "framework" && selections.framework === "nextjs") {
      setSelections((s) => ({ ...s, routing: "next-router" }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setNameError("");
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSelect = (stepId, value) => {
    setSelections((s) => ({ ...s, [stepId]: value }));
  };

  const handleToggleMulti = (stepId, value) => {
    setSelections((s) => {
      const current = s[stepId] ?? [];
      return {
        ...s,
        [stepId]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const handleCreate = () => {
    // Build the standardised project data object
    const id = crypto.randomUUID();
    const projectData = {
      id,
      name:               selections.name.trim(),
      framework:          FRAMEWORK_MAP[selections.framework] ?? "React",
      buildTool:          BUILD_TOOL_MAP[selections.framework] ?? "Vite",
      reactVersion:       null,
      hasTypeScript:      selections.language === "typescript",
      hasTailwind:        selections.styling === "tailwind",
      hasRedux:           selections.stateManagement === "redux",
      hasRouter:          selections.routing !== "none",
      importMethod:       "wizard",
      language:           selections.language,
      styling:            selections.styling,
      stateManagement:    selections.stateManagement,
      routing:            selections.routing,
      optionalPackages:   selections.optionalPackages,
      folderStructure:    selections.folderStructure,
      packageName:        selections.name.toLowerCase().replace(/\s+/g, "-"),
      description:        null,
      packageVersion:     "0.1.0",
    };

    dispatch(addProject(projectData));
    dispatch(selectProject(id));
    dispatch(setProject({ name: projectData.name, path: null }));

    // Let parent handle cinematic load
    onComplete({ projectId: id, projectName: projectData.name });
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-obsidian flex"
      style={{ opacity: 0 }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 border-r border-edge-subtle p-8 flex-shrink-0">
        {/* Logo */}
        <div className="mb-12">
          <span className="font-display font-[800] text-sm tracking-tightest text-white">
            React<span className="text-accent">/</span>Architect
          </span>
          <p className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint mt-1">
            New Project Wizard
          </p>
        </div>

        {/* Step list */}
        <nav className="flex flex-col gap-1 flex-1">
          {STEPS.map((s, i) => {
            const isActive    = i === step;
            const isCompleted = i < step;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive ? "bg-white/5" : ""
                }`}
              >
                {/* Step number / check */}
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] transition-all duration-300 ${
                    isCompleted
                      ? "bg-accent text-obsidian"
                      : isActive
                      ? "border border-accent text-accent"
                      : "border border-white/15 text-ink-faint"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </span>

                {/* Label */}
                <span
                  className={`font-mono text-[11px] uppercase tracking-widestest transition-colors ${
                    isActive ? "text-white" : isCompleted ? "text-ink-dim" : "text-ink-faint"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Close */}
        <button
          onClick={onClose}
          className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint hover:text-white transition-colors flex items-center gap-2 mt-6"
        >
          ← Cancel
        </button>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Progress bar */}
        <div className="h-px bg-white/5 w-full relative">
          <div
            className="absolute left-0 top-0 h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <span className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint">
            Step {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-edge-subtle text-ink-dim hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step content area */}
        <div className="flex-1 overflow-y-auto px-8 md:px-14 xl:px-20 py-12 md:py-16">
          <div ref={contentRef}>

            {/* Step header */}
            <div className="mb-10">
              <p className="font-mono text-[9px] uppercase tracking-widestest text-accent mb-2">
                Step {step + 1} of {STEPS.length}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-[800] text-white tracking-tightest leading-none mb-2">
                {currentStep.title}
              </h1>
              <p className="font-mono text-[11px] text-ink-dim">
                {currentStep.subtitle}
              </p>
            </div>

            {/* Step body */}
            {currentStep.type === "text" && (
              <TextStep
                step={currentStep}
                value={selections[currentStep.id]}
                onChange={(v) => { handleSelect(currentStep.id, v); setNameError(""); }}
                error={nameError}
                onEnter={handleNext}
              />
            )}

            {currentStep.type === "single" && (
              <SingleSelectStep
                step={currentStep}
                value={selections[currentStep.id]}
                onChange={(v) => handleSelect(currentStep.id, v)}
              />
            )}

            {currentStep.type === "multi" && (
              <MultiSelectStep
                step={currentStep}
                values={selections[currentStep.id] ?? []}
                onToggle={(v) => handleToggleMulti(currentStep.id, v)}
              />
            )}
          </div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-edge-subtle px-8 md:px-14 xl:px-20 py-6 flex items-center justify-between gap-4">
          <button
            onClick={step === 0 ? onClose : handleBack}
            className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim hover:text-white transition-colors"
          >
            {step === 0 ? "✕ Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-4">
            {/* Dot progress (mobile) */}
            <div className="flex items-center gap-1 lg:hidden">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? "bg-accent" : i < step ? "bg-white/30" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-accent text-obsidian font-mono text-[10px] uppercase tracking-widestest font-semibold hover:bg-accent/90 transition-colors shadow-lg"
              >
                Create Project ✓
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex items-center gap-2 px-7 py-3 rounded-xl font-mono text-[10px] uppercase tracking-widestest font-semibold transition-all ${
                  canContinue()
                    ? "bg-white text-obsidian hover:bg-white/90 shadow-lg"
                    : "bg-white/10 text-ink-faint cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Step sub-components
// =============================================================================

const TextStep = ({ step, value, onChange, error, onEnter }) => (
  <div className="max-w-lg">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      placeholder={step.placeholder}
      autoFocus
      className="w-full bg-white/5 border border-edge-subtle rounded-2xl px-6 py-5 text-white text-xl font-display font-[700] tracking-tightest placeholder:text-ink-faint focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-colors"
    />
    {error && (
      <p className="mt-2 font-mono text-[10px] text-red-400">{error}</p>
    )}
    <p className="mt-3 font-mono text-[9px] text-ink-faint">
      Press Enter to continue
    </p>
  </div>
);

const SingleSelectStep = ({ step, value, onChange }) => (
  <div className={`grid gap-3 ${step.options.length <= 2 ? "grid-cols-1 md:grid-cols-2 max-w-xl" : "grid-cols-1 md:grid-cols-2 max-w-2xl"}`}>
    {step.options.map((opt) => (
      <OptionTile
        key={opt.id}
        option={opt}
        selected={value === opt.id}
        multi={false}
        onClick={() => !opt.comingSoon && onChange(opt.id)}
      />
    ))}
  </div>
);

const MultiSelectStep = ({ step, values, onToggle }) => (
  <div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
      {step.options.map((opt) => (
        <OptionTile
          key={opt.id}
          option={opt}
          selected={values.includes(opt.id)}
          multi={true}
          onClick={() => onToggle(opt.id)}
        />
      ))}
    </div>
    {values.length > 0 && (
      <p className="mt-4 font-mono text-[9px] text-ink-faint">
        {values.length} package{values.length > 1 ? "s" : ""} selected
      </p>
    )}
  </div>
);

const OptionTile = ({ option, selected, multi, onClick }) => (
  <button
    onClick={onClick}
    disabled={option.comingSoon}
    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 group ${
      option.comingSoon
        ? "border-edge-subtle opacity-40 cursor-not-allowed"
        : selected
        ? "border-accent/60 bg-accent/8 shadow-lg shadow-accent/5"
        : "border-edge-subtle hover:border-white/15 hover:bg-white/3 cursor-pointer"
    }`}
    style={selected ? { boxShadow: "inset 0 0 0 1px rgba(0,229,255,0.25)" } : undefined}
  >
    {/* Selection indicator */}
    <div className={`absolute top-4 right-4 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
      selected ? "border-accent bg-accent" : "border-white/15"
    }`}>
      {selected && (
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <polyline points="1.5 5 4 7.5 8.5 2.5" stroke="#050505" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>

    {/* Icon */}
    <div className={`text-2xl mb-3 font-mono ${
      selected ? "text-accent" : "text-ink-dim group-hover:text-white"
    } transition-colors`}>
      {option.icon}
    </div>

    {/* Label + badges */}
    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
      <span className={`font-display text-sm font-[700] tracking-tightest transition-colors ${
        selected ? "text-white" : "text-white"
      }`}>
        {option.label}
      </span>
      {option.recommended && !selected && (
        <span className="font-mono text-[7px] uppercase tracking-widestest px-1.5 py-0.5 rounded border border-accent/30 text-accent">
          Recommended
        </span>
      )}
      {option.comingSoon && (
        <span className="font-mono text-[7px] uppercase tracking-widestest px-1.5 py-0.5 rounded border border-white/10 text-ink-faint">
          Soon
        </span>
      )}
    </div>

    {/* Description */}
    <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
      {option.desc}
    </p>
  </button>
);

export default CreateProjectWizard;
