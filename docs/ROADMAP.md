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

## Future Roadmap

The key insight is this:

Every future feature should operate on the same AST graph.

Not separate parsers.
Not separate scanners.
One knowledge graph.

------------------------------------------------------------

Phase 1 — Build the Knowledge Graph (NOW)

Don't think:

React Project
      ↓
React Flow

Think:

React Project
      │
      ▼
Scanner
      │
      ▼
AST Parser
      │
      ▼
Knowledge Graph
      │
 ┌────┼────┬────┬────┐
 ▼    ▼    ▼    ▼    ▼
Architecture
Routes
State
API
Docs

Everything should consume the same graph.

Update: the graph now has an Analysis Engine sitting directly on top of it
(Sprint 9.2). The picture is now:

React Project
      │
      ▼
Scanner
      │
      ▼
AST Parser
      │
      ▼
Knowledge Graph
      │
      ▼
Analysis Engine
      │
 ┌────┼────┬────┬────┬────┐
 ▼    ▼    ▼    ▼    ▼    ▼
Architecture
Routes
State
API
Docs
(+ Impact Analysis, on demand)

Studios and future features consume Analysis Engine output instead of
recomputing their own graph traversals.

------------------------------------------------------------

Feature 1 — Live Synced Refactoring

Instead of simply renaming a component, expose intelligent refactoring actions from the inspector.

Actions:
- Rename Component
- Move Component
- Extract Component
- Inline Component
- Convert to Lazy
- Delete
- Duplicate

When a refactor is performed, automatically update:
- File names
- Imports
- Exports
- JSX usage
- Component relationships

Rebuild the knowledge graph automatically so every studio stays in sync.

------------------------------------------------------------

Feature 2 — Architecture Health

Replace a generic architecture score with actionable insights.

Example:

Health: 92 (Good)

Issues:
- Large Components: 3
- Circular Imports: 1
- Unused Components: 8
- Duplicate Hooks: 2
- Dead Routes: 1

The score should explain *why* it exists and how to improve it.

------------------------------------------------------------

Feature 3 — Dependency Heatmap

Visualize how important each component is.

Examples:

Button
██████████
Used 142 times

App
██████
Used 37 times

LegacyCard
█
Used once

Node size, color, or glow should communicate dependency importance.

------------------------------------------------------------

Feature 4 — Component Timeline

Instead of only showing relationships, visualize the lifecycle of a component.

Example:

Imports
   ↓
Hooks
   ↓
State
   ↓
API Calls
   ↓
Children
   ↓
Render

This gives developers an execution-oriented understanding.

------------------------------------------------------------

Feature 5 — Explain This Component

Allow AI to explain a selected component using the generated knowledge graph instead of raw source code.

Example:

"HeroSection is rendered by HomePage. It composes CTAButton, FeatureGrid, and StatsCard. It owns local animation state while authentication is handled by AuthProvider."

The explanation should be graph-aware rather than file-aware.

------------------------------------------------------------

Feature 6 — Architecture Diff

Compare two versions of the same project.

Example:

Added
- Navbar
- Dashboard

Removed
- LegacyAuth

Changed
- App

Visualize architectural changes between versions.

------------------------------------------------------------

Feature 7 — Impact Analysis

Before deleting or modifying a component, show its impact.

Example:

Delete Button

Affected:
- 17 Components
- 3 Pages
- 12 Imports
- 2 APIs

This helps developers make safe refactoring decisions.

------------------------------------------------------------

Feature 8 — Semantic Search

Search by intent rather than filenames.

Searching:

authentication

Should highlight:

- Login
- AuthProvider
- ProtectedRoute
- JWTService

Because they are architecturally connected.

------------------------------------------------------------

Feature 9 — Dead Code Detection

Automatically detect:

- Unused Components
- Unused Hooks
- Dead Routes
- Orphaned Files

Highlight them directly in the architecture graph.

------------------------------------------------------------

Feature 10 — Refactor Simulator

Allow developers to simulate architectural changes before applying them.

Example:

Move AuthProvider

↓

Preview updated graph

↓

Warnings

↓

Affected components

No files are modified until the user confirms.

------------------------------------------------------------

Project DNA

Every imported project should generate a concise architectural fingerprint.

Example:

Framework:
React 19

Architecture:
Feature-Based

Complexity:
Medium

State:
Redux Toolkit

Routing:
React Router

Components:
142

Hooks:
87

Contexts:
4

API Clients:
3

Largest Component:
Dashboard.jsx

Project DNA should allow developers to understand a codebase within seconds.

------------------------------------------------------------

Development Priority

## Next Priority

### Sprint 10.1 — Architecture Intelligence

Focus shifts from visualization to understanding.

Planned work:

* Component Timeline
* Dependency Heatmap UI
* Feature Boundary Detection
* Architecture Search
* AI Project Understanding ("Ask Your Project")
* Refactoring Preparation
* Advanced Inspector
* Impact Analysis UI
