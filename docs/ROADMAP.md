# React Architect Development Roadmap

Trace milestones and sprints for the React Architect workspace platform.

---

## Completed Sprints

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

### Sprint 9: Unified Centralized Knowledge Graph Engine (Active Sprint)
- **Knowledge Graph Framework**: Designed a framework-agnostic node/edge factory database mapping project DNA.
- **Extractor Pipelines**: Orchestrated modular extractors under `src/engines/parser/extractors/`.
- **Layout coordinator**: Decoupled visual layer calculations (`layoutEngine.js`) from visual client adapters.
- **Studios Refactoring**: Updated all five studios to load, inspect, and map nodes/edges directly from the central Knowledge Graph database.

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

1. Improve parser accuracy
   - Barrel exports
   - Path aliases
   - React.lazy()
   - memo()
   - forwardRef()
   - Dynamic imports

2. Build a reusable Knowledge Graph
   Every studio should consume the same graph instead of maintaining separate parsers.

3. Architecture Health

4. Dependency & Impact Analysis

5. Project DNA

6. Live Refactoring

7. AI-powered explanations built on top of the Knowledge Graph