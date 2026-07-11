# FILE_STRUCTURE.md

# React Architect — File Structure

This document defines the official project structure.

Every contributor and AI assistant must follow this structure.

---

## Root Structure

```text
react-architect/
├── docs/
├── public/
├── src/
├── test/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## Source Directory

```text
src/
│
├── main.jsx
│
├── app/
│   ├── App.jsx                         ← Root application entry point
│   └── Router.jsx                      ← React Router v6 route declarations
│
├── assets/
│
├── components/
│   ├── BootSequence.jsx                ← Animated boot overlay on landing
│   ├── Nav.jsx                         ← Global navigation bar
│   │
│   ├── ambient/
│   │   ├── CursorBlob.jsx              ← Trailing cursor glow effect
│   │   └── Noise.jsx                   ← CSS noise overlay texture
│   │
│   ├── architecture/                   ← Architecture Studio subcomponents
│   │   ├── constants.js                ← Shared config: TYPE_CFG, findPathToNode
│   │   ├── CustomNode.jsx              ← React Flow custom node renderer
│   │   ├── FlowDiagram.jsx             ← Hierarchical flow diagram + layout solver
│   │   ├── InspectorPanel.jsx          ← Maintainability scores, complexity drivers
│   │   ├── TopBar.jsx                  ← Context-sensitive header + diagnostics bar
│   │   └── TreeNode.jsx                ← Recursive folder/component tree explorer
│   │
│   ├── hub/
│   │   ├── ImportProjectModal.jsx      ← Smart import: Local Folder, ZIP, GitHub
│   │   ├── CreateProjectWizard.jsx     ← 8-step fullscreen creation wizard
│   │   ├── RenameModal.jsx
│   │   ├── DeleteConfirmModal.jsx
│   │   └── ProjectLoadTransition.jsx  ← Cinematic loading screen (Hub → Workspace)
│   │
│   ├── landing/
│   │   ├── HeroBackground.jsx
│   │   ├── HeroCopy.jsx
│   │   └── LaunchButton.jsx
│   │
│   └── workspace/                      ← Workspace Studio subcomponents
│       ├── WorkspaceHeader.jsx         ← HUD top header, project title, diagnostics
│       ├── OrbitSystem.jsx             ← Domain orbit rings, S-curve SVG paths, data flows
│       ├── CoreSystem.jsx              ← Central core rings, boot messages, scanning sweep
│       └── InvestigationBrief.jsx      ← Floating context panel, recommendations, nav buttons
│
├── constants/
│   └── testIds.js                      ← Stable data-testid identifiers
│
├── engines/                            ← Core analysis pipeline (pure JS, no React)
│   ├── analyzer.js                     ← Pipeline orchestrator: scan → parse → graph → analyze
│   │
│   ├── scanner/
│   │   └── scanner.js                  ← Reads FileSystem Directory Handles and ZIP files
│   │
│   ├── parser/
│   │   ├── parser.js                   ← Babel AST generator with error recovery
│   │   ├── aliasResolver.js            ← Dynamic path alias discovery from tsconfig/vite config
│   │   ├── astUtils.js                 ← Shared AST helpers (callee name, file path guessing)
│   │   ├── walk.js                     ← Generic recursive AST node walker
│   │   └── extractors/                 ← Specialized per-concern AST data extractors
│   │       ├── componentExtractor.js   ← React components, hooks, JSX children, lazy/memo/forwardRef
│   │       ├── importExtractor.js      ← Static and dynamic import declarations
│   │       ├── exportExtractor.js      ← Named, default, and barrel re-exports
│   │       ├── hookExtractor.js        ← Custom hook definitions
│   │       ├── contextExtractor.js     ← React Context providers and consumers
│   │       ├── reduxExtractor.js       ← Redux slices, selectors, thunks, RTK Query
│   │       ├── routeExtractor.js       ← JSX and object-based React Router route configs
│   │       ├── fileRouteExtractor.js   ← Next.js App Router / Pages Router file-based routes
│   │       └── apiExtractor.js         ← Axios, fetch, and API gateway detection
│   │
│   ├── graph/
│   │   ├── buildKnowledgeGraph.js      ← Assembles the central Knowledge Graph (nodes + edges)
│   │   ├── importResolver.js           ← O(1) module resolution: aliases, barrels, index files
│   │   ├── graphValidator.js           ← Validates graph integrity, detects cycles and orphans
│   │   ├── nodeFactory.js              ← Node schema creation (component, file, route, state, api)
│   │   └── edgeFactory.js              ← Edge schema creation (RENDERS, IMPORTS, STATE_CONSUMER…)
│   │
│   ├── layout/
│   │   └── layoutEngine.js             ← 2D coordinate solver for graph visualization
│   │
│   ├── analysis/
│   │   ├── index.js                    ← Analysis Engine public API entry point
│   │   ├── analysisEngine.js           ← Orchestrates registered rule modules
│   │   └── modules/                    ← Pluggable analysis rule modules
│   │       ├── architectureHealth.js   ← Overall health score, rule runner, deduction engine
│   │       ├── maintainability.js      ← Per-component maintainability score (0–100)
│   │       ├── deadCode.js             ← Unused routes, hooks, API services, components
│   │       ├── complexity.js           ← JSX nesting depth, cyclomatic complexity proxy
│   │       ├── dependencyHeatmap.js    ← Import fan-in/fan-out coupling heatmap
│   │       ├── impactAnalysis.js       ← Change impact scoring per component
│   │       ├── metrics.js              ← Shared utilities: findCycles, computeDepths, buildAdjacency
│   │       └── projectDNA.js           ← Component count, hook count, route count, API count
│   │
│   └── adapters/
│       ├── architectureAdapter.js      ← Transforms KG into the Architecture Model
│       └── reactFlowAdapter.js         ← Transforms KG nodes/edges into React Flow format
│
├── features/                           ← Reserved for future self-contained feature modules
│   ├── architecture/
│   ├── routes/
│   ├── state-flow/
│   ├── api-flow/
│   ├── documentation/
│   └── project-brain/
│
├── layouts/
│   ├── LandingLayout.jsx               ← Public landing page layout shell
│   └── WorkspaceLayout.jsx             ← Workspace operating surface layout shell
│
├── lib/
│   ├── gsap.js                         ← GSAP singleton + plugin registration
│   ├── lenis.js                        ← Lenis smooth scroll singleton
│   ├── reactflow.js                    ← React Flow shared config
│   ├── three.js                        ← Three.js scene utilities
│   ├── projectDetector.js              ← Stack detection (framework, TS, Tailwind, Redux…)
│   └── analysis/                       ← Analysis pipeline support utilities
│       ├── mockDataGenerator.js        ← Fallback mock KG data for seed projects
│       ├── projectStore.js             ← IndexedDB persistence for file handles
│       ├── routeParser.js              ← Legacy route parsing utilities
│       └── scanner.js                  ← Browser File System Access API utilities
│
├── pages/
│   ├── Landing.jsx                     ← Public landing page
│   ├── Hub.jsx                         ← Project command console + drag carousel
│   ├── Workspace.jsx                   ← Spatial operating surface + orbit system (771 LOC)
│   ├── Architecture.jsx                ← Architecture Studio: Summary, Explorer, Flow, Graph (530 LOC)
│   ├── Routes.jsx                      ← Route Studio: React Flow route map visualization
│   ├── StateFlow.jsx                   ← State Studio: Redux slice flow graph
│   ├── ApiFlow.jsx                     ← API Studio: Endpoint dependency graph
│   └── Documentation.jsx              ← Documentation Studio: Markdown file viewer
│
├── redux/
│   ├── Store.js
│   └── slices/
│       ├── analysisSlice.js            ← Analysis pipeline status, phase, results
│       ├── architectureSlice.js        ← Architecture Studio view state
│       ├── graphSlice.js               ← Knowledge Graph nodes, edges, files
│       ├── hubSlice.js                 ← Projects[], selectedProjectId, localStorage persistence
│       ├── projectSlice.js             ← Active project metadata
│       ├── scannerSlice.js             ← Scanner progress state
│       ├── searchSlice.js              ← Global search query state
│       ├── settingsSlice.js            ← User preferences and settings
│       └── uiSlice.js                  ← Active room, sidebar, modal open/close
│
├── services/
│   └── analysisService.js              ← Shared async thunk: full analysis pipeline (scan → graph → score)
│
└── styles/
    ├── global.css                      ← Base resets and global defaults
    ├── typography.css                  ← Font scale, headings, text utilities
    ├── variables.css                   ← CSS custom properties (colors, spacing, radii)
    ├── animations.css                  ← CSS keyframe animations (passive effects)
    ├── components.css                  ← Shared component-scoped style blocks
    └── utilities.css                   ← Reusable visual effect helpers
```

---

## Folder Rules

- New product features belong inside `features/`.
- Reusable UI belongs inside `components/`.
- Studio-specific subcomponents belong in a named subfolder of `components/` (e.g. `components/architecture/`, `components/workspace/`).
- Redux state belongs inside `redux/slices/`.
- Global styles belong inside `styles/`.
- Shared helper functions belong inside `lib/` or `services/`.
- All analysis and parsing systems live inside `engines/`. No React imports allowed inside `engines/`.
- Page-level components are thin orchestrators. Heavy logic belongs in engine modules or subcomponents.

---

## Component Size Guidelines

| File | Guideline |
|------|-----------|
| Page components (`pages/`) | ≤ 800 LOC |
| Studio subcomponents (`components/architecture/`, `components/workspace/`) | ≤ 400 LOC |
| Engine modules (`engines/`) | ≤ 300 LOC |
| Redux slices | ≤ 150 LOC |

When a file exceeds its guideline, extract focused subcomponents into the appropriate subfolder.

---

This structure is the official architecture of React Architect and must remain consistent throughout development.
