# React Architect Development Roadmap

Trace milestones and sprints for the React Architect workspace platform.

---

## Completed Sprints

### Sprint 11: Production Hardening & Impact Analysis UI
- Normalized store casing (`src/redux/store.js`) and hardened engine imports with explicit `.js` extensions for Node/Vite ESM compatibility.
- Added route-level code splitting with `React.lazy`/`Suspense` so heavy studio pages load as separate chunks.
- Surfaced on-demand Impact Analysis inside the Architecture Studio inspector, including blast radius, direct uses/used-by relationships, grouped affected counts, and low/medium/high risk labels.
- Added a lightweight Node test harness covering parser extraction, import resolution, Knowledge Graph creation, analysis, and impact analysis.
- Updated changelog documentation for Sprint 11 completion.

### Sprint 11.3: Graph Focus Mode
- Added isolated neighborhood Focus Mode — selecting a node fades all unrelated nodes and highlights only the selected component and its directly connected peers.
- Introduced Relationship Toggles (Parents, Children, Imports, Hooks, State, APIs, Routes) to dynamically expand or contract the visible neighborhood.
- Derived sub-graph rendering computed on-demand without mutating the underlying Knowledge Graph.

### Sprint 11.4: Inspector Panel Redesign & Quick Actions
- Redesigned the inspector into independently collapsible accordion sections: Overview, Health, Hierarchy, Hooks, State, APIs, and Impact Analysis.
- Added Quick Actions toolbar with Open in Editor (Vite middleware), Highlight Related Nodes, and Explain with AI (reserved slot).
- Smooth height transitions and context-sensitive default open sections per node type.

### Sprint 11.5: Professional Productivity Features
- Added SVG, PNG (2×), and PDF canvas exporters implemented via `forwardRef`/`useImperativeHandle` to bypass browser popup blockers.
- Embedded floating glassmorphic Keyboard Shortcuts HUD showing `Ctrl+F`, `F`, `Esc`, `Tab` bindings.
- Added Viewport Minimap HUD with real-time sync viewport box, click-to-pan, and drag navigation.
- Animated bezier edge curves, node hover lift transforms, skeleton loaders, and refined micro-interactions.
- Removed unused Share and Settings header buttons.
- Fixed fullscreen black screen (missing flex layout on wrapper) and export coordinate accuracy.


### Sprint 1 - 3: Baseline R3F Architecture
- Setup 3D blueprint void environment, lights, star particles, and camera orbit controls.
- Created central Project Brain platform.

### Sprint 4 - 6: Hub & Import Wizards
- Implemented stand-alone `/hub` dashboard for workspace import options.
- Configured local filesystem handle select methods.

### Sprint 7: Decoupled Portals & Unified Tool Routes
- Deployed cinematic R3F torus gateway portal transitions with node collapse/implosion sequences.
- Registered `/architecture`, `/routes`, `/state`, `/api`, and `/docs` explorer pages.

### Sprint 8: Real AST Scanning & Workspace Studios
- **Scanner Engine**: Implemented AST-based parser extraction for components, routes, slices, and services.
- **Contrast Polish**: Designed high-contrast off-white sidebar file-trees.
- **Page-collapse Fullscreen**: Collapses panel views inside the workspace for fullscreen graph mapping.
- **Studios Mapping**: Deployed React Flow maps for Component Nesting, Route Mappings, Redux State slices, and API Client endpoints. Added a markdown reader for guide documents.

### Sprint 9: Unified Centralized Knowledge Graph Engine
- **Knowledge Graph Framework**: Designed a framework-agnostic node/edge factory database mapping project DNA.
- **Extractor Pipelines**: Orchestrated modular extractors under `src/engines/parser/extractors/`.
- **Layout coordinator**: Decoupled visual layer calculations (`layoutEngine.js`) from visual client adapters.
- **Studios Refactoring**: Updated all five studios to load, inspect, and map nodes/edges directly from the central Knowledge Graph database.

### Sprint 9.2: Analysis Engine
- **Reusable Analysis Engine**: Built `src/engines/analysis/` as a pure consumer of the Knowledge Graph — no parsing, no AST, no Babel, no React Flow dependency of any kind.
- **Modular Design**: Six independent modules (`projectDNA`, `architectureHealth`, `dependencyHeatmap`, `deadCode`, `complexity`, `impactAnalysis`) orchestrated by `analysisEngine.js`, each exposing a common `analyze(graph)` interface.
- **Pluggable Health Scoring**: `architectureHealth.js` uses an array-of-rules pattern — every scoring rule is an independent function contributing its own deduction, so new rules never require touching existing ones.
- **Shared Metrics Toolbox**: `metrics.js` centralizes graph math (degree maps, centrality, cycle detection, BFS depth, orphan detection) so no module duplicates the same traversal logic.
- **On-Demand Impact Analysis**: `analyzeImpact(graph, nodeId)` traverses the graph in both directions to compute blast radius — laying the groundwork for Live Refactoring (Feature 1) and the Refactor Simulator (Feature 10).

### Sprint 10: Architecture Explorer Foundation
- **Architecture Adapter**: Created a reusable Architecture Model independent of React Flow.
- **Synchronized Exploration**: Built synchronized Summary, Explorer, and Graph views.
- **Semantic Traversal**: Added semantic DFS hierarchy traversal with automatic root detection and cycle protection.
- **Shared Inspector**: Synchronized component properties, rendering connections, and recommendations.

### Sprint 10.2: Core Boot, Flow Views & Maintainability Analytics
- **Cinematic Core Boot**: Reworked Project Brain core to serve as the exclusive voice during startup, displaying cross-fading typography.
- **Architecture Flow View**: Built a top-to-bottom directed flow diagram using a custom layout solver, pannable canvas, and progressive disclosure toggles.
- **Maintainability Scoring**: Removed simplistic LOC thresholds; deployed a multi-signal health scoring engine evaluating hooks, imports, dependencies, responsibilities, and complexity.
- **Actionable Advice**: Context-aware recommendations detailing *why* components require refactoring.

---

## Future Roadmap: Product Direction & Studio Vision (v2)

React Architect should no longer be designed as five independent visualization pages. It should evolve into an operating system for understanding React applications.

Every studio must answer a specific developer question instead of exposing raw project data.

The Workspace is the central command room where developers choose which aspect of their application they want to investigate.

---

### Domain Investigation Studios

#### • Architecture Studio — *"How is this project built?"*
Focus on component hierarchy, maintainability, architecture health, dependency relationships, complexity, and impact analysis.
* **Status**: Production Ready.

#### • Navigation Studio (formerly Routes Studio) — *"How do users move through this application?"*
Focus on route hierarchy, layouts, authentication flow, redirects, dynamic routes, user journeys, route health, and navigation analytics.
* **Status**: In Progress.

#### • Data Flow Studio (formerly State Studio) — *"Where does my data come from and where does it go?"*
Focus on Redux, Context, props, local state, custom hooks, state origins, update chains, state consumers, duplicate state detection, prop drilling, and overall data movement.
* **Status**: In Progress.

#### • Network Studio (formerly API Studio) — *"How does the frontend communicate with the backend?"*
Focus on components, services, API clients, endpoints, requests, responses, loading states, error handling, duplicate requests, request lifecycle, and API health.
* **Status**: In Progress.

#### • Investigation Studio (new flagship AI experience) — *"Help me understand this project."*
This studio is not a generic chatbot. It is an architectural investigation assistant powered by the Knowledge Graph, Architecture Model, Analysis Engine, Impact Analysis, Maintainability Engine, Route Graph, Data Graph, and Network Graph.

The Investigation Studio should answer questions such as:
* *Explain this component.*
* *Explain authentication.*
* *Why is this component re-rendering?*
* *Can I safely delete this file?*
* *What breaks if I change this?*
* *Find duplicated logic.*
* *Explain this hook.*
* *Explain this route.*
* *Which components should be refactored first?*
* *Generate onboarding documentation.*
* *Plan a new feature before implementation.*
* **Status**: In Progress.

---

### Core Architecture Philosophy

All studios must consume the same Knowledge Graph and Analysis Engine. No studio should perform its own parsing or duplicate architectural analysis.

The long-term philosophy of React Architect is:

```
Import Project
  │
  ▼
Analyze
  │
  ▼
Build Knowledge Graph
  │
  ▼
Enter Workspace
  │
  ▼
Investigate Architecture  ("How is it built?")
  │
  ▼
Investigate Navigation    ("How do users move?")
  │
  ▼
Investigate Data Flow     ("Where does my data go?")
  │
  ▼
Investigate Network       ("How does frontend communicate?")
  │
  ▼
Investigate the Project through AI ("Help me understand everything.")
```

The product is no longer a visualization tool. It is an operating system for understanding React applications.

---

### Upcoming Sprints & Developmental Priority

#### Sprint 12 — Navigation Studio (Routes to Journeys)
- Transition the `/routes` view into the Navigation Studio.
- Map layout nesting relationships and highlight auth-gated routes visually.
- Expose redirects and route analytics inside the inspector.

#### Sprint 13 — Data Flow Studio (State to Lifecycles)
- Transition the `/state` view into the Data Flow Studio.
- Build visual state consumer and update cascades mapping hooks to redux slices.
- Highlight duplicate state variables and deep prop-drilling pathways.

#### Sprint 14 — Network Studio (API to Lifecycles)
- Transition the `/api` view into the Network Studio.
- Map end-to-end component-to-service-to-endpoint network transactions.
- Highlight duplicate/redundant API request loops.

#### Sprint 15 — Investigation Studio (Flagship AI Onboarding)
- Deploy the AI-powered architectural assistant chat interface.
- Wire the assistant to query the centralized Redux `knowledgeGraph` state and `analysis` state.
- Enable Graph-aware queries (explain auth, compute mock implementations, calculate blast radius).

