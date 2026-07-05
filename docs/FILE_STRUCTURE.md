# FILE_STRUCTURE.md

# React Architect - File Structure

This document defines the official project structure.

Every contributor and AI assistant must follow this structure.

---

## Root Structure

```text
react-architect/

docs/
public/
src/
package.json
vite.config.js
README.md
```

---

## Source Directory

```text
src/

main.jsx

app/
│
├── App.jsx
└── Router.jsx

assets/
├── fonts/
├── images/
├── icons/
├── models/
└── shaders/

components/
├── ambient/
│   ├── CursorBlob.jsx
│   └── Noise.jsx
├── hub/
│   ├── ImportProjectModal.jsx      ← Smart import: Local Folder, ZIP, GitHub (coming soon)
│   ├── CreateProjectWizard.jsx     ← 8-step fullscreen creation wizard
│   ├── RenameModal.jsx
│   ├── DeleteConfirmModal.jsx
│   └── ProjectLoadTransition.jsx
├── landing/
│   ├── HeroBackground.jsx
│   ├── HeroCopy.jsx
│   └── LaunchButton.jsx
├── BootSequence.jsx
└── Nav.jsx

features/
├── architecture/
├── routes/
├── state-flow/
├── api-flow/
├── documentation/
└── project-brain/

layouts/
├── LandingLayout.jsx
└── WorkspaceLayout.jsx

lib/
├── projectDetector.js          ← Stack detection foundation (framework, TS, Tailwind, Redux...)
├── gsap.js
├── lenis.js
├── reactflow.js
└── three.js


pages/
├── Landing.jsx
├── Hub.jsx                     ← Decoupled project command console & drag carousel
├── Workspace.jsx               ← Decoupled spatial 3D room operating surface
├── Architecture.jsx            ← Decoupled Architecture Studio Page (AST Node Tree)
├── Routes.jsx                  ← Decoupled Route Studio Page (Router Map)
├── StateFlow.jsx               ← Decoupled State Studio Page (Store Flow)
├── ApiFlow.jsx                 ← Decoupled API Studio Page (Endpoints Graph)
└── Documentation.jsx           ← Decoupled Documentation Studio Page (Markdown View)

redux/
├── store.js
└── slices/
    ├── hubSlice.js             ← projects[], selectedProjectId, localStorage persistence
    ├── graphSlice.js
    ├── uiSlice.js
    ├── searchSlice.js
    ├── scannerSlice.js
    ├── settingsSlice.js
    └── architectureSlice.js

engines/
├── scanner/
│   └── scanner.js                  ← Scans directories & ZIP files for code and configs
├── parser/
│   ├── parser.js                   ← Generates Babel ASTs with error recovery
│   ├── aliasResolver.js            ← Extracts dynamic config path aliases
│   ├── astUtils.js                 ← Shared AST callee and template utilities
│   └── extractors/                 ← Specialized AST data extractor modules
├── graph/
│   ├── buildKnowledgeGraph.js      ← Assembles Knowledge Graph nodes and edges
│   ├── importResolver.js           ← O(1) module re-export index resolver
│   ├── graphValidator.js           ← Validates connections and logs parser errors
│   ├── nodeFactory.js              ← Component/File/Route node schema creation
│   ├── edgeFactory.js              ← Dependency/Render/State relationship creation
│   └── layoutEngine.js             ← Computes 2D rendering coordinates
├── analysis/
│   ├── index.js                    ← Analysis Engine public API entry point
│   ├── analysisEngine.js           ← Orchestrates registered analysis modules
│   └── modules/                    ← Pluggable metrics & health score checkers
└── analyzer.js                     ← Main pipeline orchestrator script

hooks/

services/

constants/

styles/
├── global.css
├── typography.css
├── variables.css
├── animations.css
└── utilities.css

utils/
```

---

## Folder Rules

* New product features belong inside `features/`.
* Reusable UI belongs inside `components/`.
* Redux state belongs inside `redux/`.
* Global styles belong inside `styles/`.
* Shared helper functions belong inside `utils/`.
* Parsing, graph generation, scoring, and AI analysis systems live inside `engines/`.

This structure is the official architecture of React Architect and should remain consistent throughout development.
