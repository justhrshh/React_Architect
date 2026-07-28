import React, { useState } from "react";
import {
  Search,
  Check,
  Target,
  Presentation,
  Box,
} from "lucide-react";

export default function EmptyQueryState({
  templates = [],
  onSelectTemplate,
  onSearchQuery,
  conversationalNotice,
  onClearNotice,
  ambiguousCandidates = [],
  onSelectCandidate,
}) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = searchValue.trim();
    if (!clean) return;
    if (onSearchQuery) {
      onSearchQuery(clean);
    } else if (onSelectTemplate) {
      onSelectTemplate("execution-flow", clean);
    }
  };

  const exploreItems = [
    {
      id: "execution-flow",
      title: "Execution Flow",
      description: "Trace application execution from entry through components.",
    },
    {
      id: "state-flow",
      title: "State Flow",
      description: "Visualize Redux, Context, and state propagation.",
    },
    {
      id: "component-hierarchy",
      title: "Component Hierarchy",
      description: "Explore parent-child rendering relationships in UI.",
    },
    {
      id: "navigation-flow",
      title: "Navigation Flow",
      description: "Inspect routes, transitions, and navigation structure.",
    },
  ];

  return (
    <div className="relative w-full h-full min-h-[540px] bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm flex items-center justify-center p-6 lg:p-10 selection:bg-purple-100">
      {/* ── Background Gradients & Ambient Glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Wash Radial Glows (Rich vibrant ambient color washes) */}
        <div className="absolute -top-20 -left-10 w-[650px] h-[650px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-purple-100/50 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-[650px] h-[650px] rounded-full bg-indigo-100/60 blur-3xl" />

        {/* Seamless Multi-Stop White Edge Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(255,255,255,0.3)_78%,rgba(255,255,255,0.75)_92%,white_100%)] pointer-events-none z-0" />

        {/* ── Custom Animated Ripple Loader Background ── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <style>{`
            .loader-container {
              --size: 460px;
              --duration: 3.5s;
              --logo-color: #94a3b8;
              --background: linear-gradient(
                0deg,
                rgba(129, 129, 163, 0.06) 0%,
                rgba(249, 248, 250, 0.06) 100%
              );
              height: var(--size);
              width: var(--size);
              position: relative;
            }

            .loader-container .box {
              position: absolute;
              background: var(--background);
              border-radius: 25%;
              border-top: 1px solid rgba(148, 163, 184, 0.4);
              box-shadow: rgba(99, 102, 241, 0.06) 0px 0px 10px 0px;
              backdrop-filter: blur(4px);
              animation: loader-ripple var(--duration) infinite ease-in-out;
            }

            .loader-container .box:nth-child(1) {
              inset: 40%;
              z-index: 99;
            }

            .loader-container .box:nth-child(2) {
              inset: 30%;
              z-index: 98;
              border-color: rgba(148, 163, 184, 0.35);
              animation-delay: 0.2s;
            }

            .loader-container .box:nth-child(3) {
              inset: 20%;
              z-index: 97;
              border-color: rgba(148, 163, 184, 0.25);
              animation-delay: 0.4s;
            }

            .loader-container .box:nth-child(4) {
              inset: 10%;
              z-index: 96;
              border-color: rgba(148, 163, 184, 0.2);
              animation-delay: 0.6s;
            }

            .loader-container .box:nth-child(5) {
              inset: 0%;
              z-index: 95;
              border-color: rgba(148, 163, 184, 0.15);
              animation-delay: 0.8s;
            }

            .loader-container .logo {
              position: absolute;
              inset: 0;
              display: grid;
              place-content: center;
              padding: 30%;
            }

            .loader-container .logo svg {
              fill: var(--logo-color);
              width: 100%;
              animation: loader-color-change var(--duration) infinite ease-in-out;
            }

            @keyframes loader-ripple {
              0% {
                transform: scale(1);
                box-shadow: rgba(42, 94, 250, 0.08) 0px -10px 10px -0px;
              }
              50% {
                transform: scale(1.22);
                box-shadow: rgba(42, 94, 250, 0.12) 10px -10px 10px -0px;
              }
              100% {
                transform: scale(1);
                box-shadow: rgba(42, 94, 250, 0.18) -20px -10px 20px -0px;
              }
            }

            @keyframes loader-color-change {
              0% {
                fill: var(--logo-color);
              }
              50% {
                fill: #818cf8;
              }
              100% {
                fill: var(--logo-color);
              }
            }
          `}</style>

          <div className="loader-container">
            <div className="box">
              <div className="logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 94 94" className="svg">
                  <path d="M38.0481 4.82927C38.0481 2.16214 40.018 0 42.4481 0H51.2391C53.6692 0 55.6391 2.16214 55.6391 4.82927V40.1401C55.6391 48.8912 53.2343 55.6657 48.4248 60.4636C43.6153 65.2277 36.7304 67.6098 27.7701 67.6098C18.8099 67.6098 11.925 65.2953 7.11548 60.6663C2.37183 56.0036 3.8147e-06 49.2967 3.8147e-06 40.5456V4.82927C3.8147e-06 2.16213 1.96995 0 4.4 0H13.2405C15.6705 0 17.6405 2.16214 17.6405 4.82927V39.1265C17.6405 43.7892 18.4805 47.2018 20.1605 49.3642C21.8735 51.5267 24.4759 52.6079 27.9678 52.6079C31.4596 52.6079 34.0127 51.5436 35.6268 49.4149C37.241 47.2863 38.0481 43.8399 38.0481 39.0758V4.82927Z" />
                  <path d="M86.9 61.8682C86.9 64.5353 84.9301 66.6975 82.5 66.6975H73.6595C71.2295 66.6975 69.2595 64.5353 69.2595 61.8682V4.82927C69.2595 2.16214 71.2295 0 73.6595 0H82.5C84.9301 0 86.9 2.16214 86.9 4.82927V61.8682Z" />
                  <path d="M2.86102e-06 83.2195C2.86102e-06 80.5524 1.96995 78.3902 4.4 78.3902H83.6C86.0301 78.3902 88 80.5524 88 83.2195V89.1707C88 91.8379 86.0301 94 83.6 94H4.4C1.96995 94 0 91.8379 0 89.1707L2.86102e-06 83.2195Z" />
                </svg>
              </div>
            </div>
            <div className="box" />
            <div className="box" />
            <div className="box" />
            <div className="box" />
          </div>
        </div>
      </div>

      {/* ── Centered Overlapping Stage ── */}
      <div className="relative w-full max-w-4xl h-[470px] flex items-center justify-center">
        {/* ── Right Column (Positioned Behind / Under Left Card) ── */}
        <div className="absolute right-0 lg:right-4 top-[-36px] w-full max-w-[430px] flex flex-col space-y-8 z-10">
          {/* Upper Right Title Card */}
          <div className="relative">
            {/* Shifted Gradient Background Copy Div (Shifted Left & Lower, Diagonal Bottom-Left to Top-Right Purple-to-Transparent Gradient) */}
            <div className="absolute top-[6px] left-[-6px] w-full h-full rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500/50 via-35% to-transparent z-0 pointer-events-none" />

            {/* Main White Card */}
            <div className="relative z-10 bg-white border border-slate-100/90 shadow-xl shadow-indigo-500/5 rounded-3xl p-5 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200/60 flex items-center justify-center shadow-inner shrink-0">
                <Box className="w-6 h-6 text-purple-600 stroke-[1.75]" />
              </div>

              <div>
                <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
                  Visualize Architecture
                </h1>
              </div>
            </div>
          </div>

          {/* Search Area (Borderless Gradient Pill - rgb(42, 94, 250)) */}
          <div>
            <form onSubmit={handleSearchSubmit} className="relative bg-gradient-to-r from-[rgba(42,94,250,0.15)] via-[rgba(42,94,250,0.08)] to-transparent rounded-2xl p-3.5 flex items-center space-x-3.5 transition-all focus-within:from-[rgba(42,94,250,0.22)] focus-within:via-[rgba(42,94,250,0.12)]">
              <Search className="w-5 h-5 text-[rgb(42,94,250)] shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search architecture..."
                className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none border-none outline-none ring-0"
              />
            </form>

            {conversationalNotice && (
              <div className="mt-2.5 px-4 py-2.5 bg-purple-50/90 border border-purple-200/80 rounded-2xl flex items-center justify-between text-xs text-purple-900 font-medium shadow-sm backdrop-blur-sm">
                <div className="flex items-center space-x-2.5">
                  <span className="text-purple-600 text-sm">💬</span>
                  <span className="leading-snug">{conversationalNotice}</span>
                </div>
                {onClearNotice && (
                  <button
                    type="button"
                    onClick={onClearNotice}
                    className="text-purple-400 hover:text-purple-700 p-1 shrink-0 ml-2 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {ambiguousCandidates && ambiguousCandidates.length > 0 && (
              <div className="mt-3 p-4 bg-white/95 border border-indigo-200 rounded-2xl shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-indigo-600 text-sm">❓</span>
                    <span className="text-xs font-bold text-slate-800 tracking-tight">
                      Multiple entities found. Which one would you like to explore?
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ambiguousCandidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => onSelectCandidate && onSelectCandidate(cand)}
                      className="flex flex-col items-start p-2.5 bg-indigo-50/50 hover:bg-indigo-100/70 border border-indigo-100 hover:border-indigo-300 rounded-xl transition-all text-left group"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                          {cand.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-white text-indigo-600 rounded border border-indigo-200 font-semibold">
                          {cand.kind}
                        </span>
                      </div>
                      {cand.file && (
                        <span className="text-[10px] text-slate-500 truncate max-w-full font-mono">
                          {cand.file}
                        </span>
                      )}
                      <div className="mt-1.5 text-[10px] text-indigo-600 font-medium">
                        Match: {Math.round((cand.confidence || 0) * 100)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Placeholder Cards (Borderless Gradient Pill Cards - rgb(42, 94, 250)) */}
          <div className="space-y-4">
            {/* Card 1: Target / Bullseye */}
            <div className="bg-gradient-to-r from-[rgba(42,94,250,0.15)] via-[rgba(42,94,250,0.08)] to-transparent rounded-2xl p-4 flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(42,94,250,0.12)] flex items-center justify-center text-[rgb(42,94,250)] shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-2 w-3/4 bg-[rgba(42,94,250,0.25)] rounded-full" />
                <div className="h-1.5 w-1/2 bg-[rgba(42,94,250,0.15)] rounded-full" />
              </div>
            </div>

            {/* Card 2: Presentation / Board */}
            <div className="bg-gradient-to-r from-[rgba(42,94,250,0.15)] via-[rgba(42,94,250,0.08)] to-transparent rounded-2xl p-4 flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(42,94,250,0.12)] flex items-center justify-center text-[rgb(42,94,250)] shrink-0">
                <Presentation className="w-5 h-5" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-2 w-2/3 bg-[rgba(42,94,250,0.2)] rounded-full" />
                <div className="h-1.5 w-1/3 bg-[rgba(42,94,250,0.12)] rounded-full" />
              </div>
            </div>

            {/* Card 3: Large Faded Decorative Base Card */}
            <div className="h-24 bg-gradient-to-r from-[rgba(42,94,250,0.12)] via-[rgba(42,94,250,0.06)] to-transparent rounded-2xl p-4 flex flex-col justify-end">
              <div className="h-1.5 w-1/3 bg-[rgba(42,94,250,0.18)] rounded-full mb-1.5" />
              <div className="h-1.5 w-1/4 bg-[rgba(42,94,250,0.1)] rounded-full" />
            </div>
          </div>
        </div>

        {/* ── Left Column (Positioned in Front so Top-Right Corner Overlaps Right Cards) ── */}
        <div className="absolute left-0 lg:left-4 bottom-[-80px] w-full max-w-[450px] z-20 flex flex-col space-y-2">

          {/* Lower Left Card: What would you like to explore? */}
          <div className="relative">
            {/* Shifted Gradient Background Copy Div (Exact Height as Content Div, Shifted Right) */}
            <div className="absolute top-0 right-[-6px] w-full h-full rounded-3xl bg-gradient-to-b from-blue-600 via-indigo-600 via-40% to-transparent z-0 pointer-events-none" />

            {/* Main White Card */}
            <div className="relative z-10 bg-white border border-slate-100/90 shadow-2xl shadow-slate-200/60 rounded-3xl p-5 lg:p-6 transition-all duration-300">
              <h2 className="text-sm lg:text-base font-bold text-slate-900 mb-3 tracking-tight">
                What would you like to explore?
              </h2>

              <div className="space-y-2.5">
                {exploreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectTemplate && onSelectTemplate(item.id)}
                    className="group flex items-start space-x-3 w-full text-left p-1.5 rounded-xl hover:bg-purple-50/50 transition-all duration-200"
                  >
                    <div className="mt-0.5 w-4.5 h-4.5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal leading-normal mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Faded Placeholder Lines */}
              <div className="mt-4 space-y-1.5 pt-2 border-t border-slate-100">
                <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                <div className="h-1.5 w-3/4 bg-slate-100/80 rounded-full" />
                <div className="h-1.5 w-1/2 bg-slate-100/60 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
