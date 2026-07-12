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

## Future Roadmap: React Architect Studio Philosophy (v2)

### Core Principle

React Architect is **not** a collection of visual dashboards. It is an operating system for understanding React applications.

Every studio exists to answer a specific developer question. The developer should never have to think:
> *"I want to open the Route Studio."*

Instead, they should think:
> *"I want to understand how users move through my app."*

The studio simply becomes the dedicated space that answers that question.

---

### Overall Product Structure

Every studio represents a different way of understanding the same Knowledge Graph. The Knowledge Graph remains the single source of truth, and the Analysis Engine sits directly on top of it:

```
React Project
      │
      ▼
   Scanner
      │
      ▼
 AST Parser
      │
      ▼
Knowledge Graph (Single Source of Truth)
      │
      ▼
Analysis Engine
      │
 ┌────┼────┬────┬────┬────┐
 ▼    ▼    ▼    ▼    ▼    ▼
Architecture  Navigation  Data Flow  Network  Investigation (AI)
```

1. **Project Import** → Scans codebase and builds the raw Knowledge Graph database.
2. **Project DNA Analysis** → Analysis Engine processes the graph and calculates initial metrics/health scores.
3. **Workspace Command Room** → Users enter the workspace and choose which aspect of their application they want to investigate.

---

### Domain Investigation Studios

#### 1. Architecture Studio
* **Question**: *"How is this project built?"*
* **Purpose**: Understand the structural blueprint of the application.
* **Focus**: Component render hierarchy, Architecture Health score, Maintainability scores, dependency graph complexity, file structure, and Blast Radius impact analysis.
* **Status**: Production Ready.

#### 2. Navigation Studio
* **Question**: *"How do users move through this application?"*
* **Purpose**: Understand navigation flows instead of raw router configurations.
* **Focus**: Route hierarchy, nested layout relationships, authentication gating flows, redirects, dynamic parameter routing, user journeys, navigation health, and route usage analytics.
* **Status**: In Progress.

#### 3. Data Flow Studio
* **Question**: *"Where does my data come from and where does it go?"*
* **Purpose**: Understand how information moves across the application.
* **Focus**: Redux slices, Context providers, prop-drilling pathways, local state instances, custom hooks, state origins, state consumers, state update chains, duplicate state, and state health.
* **Status**: In Progress.

#### 4. Network Studio
* **Question**: *"How does my frontend communicate with the backend?"*
* **Purpose**: Understand communication pathways between UI components and external APIs.
* **Focus**: API services, endpoint maps, request/response lifecycles, load states, error handling structures, duplicate requests, and API client health.
* **Status**: In Progress.

#### 5. Investigation Studio (AI)
* **Question**: *"Help me understand this project."*
* **Purpose**: Serve as the flagship intelligent architect assistant.
* **Focus**: Unlike traditional AI assistants, the Investigation Studio consumes the Knowledge Graph, Analysis Engine, maintainability metrics, and blast-radius maps directly to answer high-level questions:
  * *"Explain authentication in this project."*
  * *"Why does this component re-render?"*
  * *"Can I safely delete this file?"*
  * *"What breaks if this route changes?"*
  * *"Find duplicate hooks and state logic."*
  * *"Generate onboarding documentation and project implementation plans."*
* **Status**: In Progress.

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

