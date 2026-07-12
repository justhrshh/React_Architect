# React Architect Features

React Architect provides a multi-dimensional inspection suite powered by a centralized Knowledge Graph and composed of five specialized developer studios.

## 0. Centralized Knowledge Graph Engine
The single source of truth database representing your project DNA:
* **Framework-Agnostic Schema**: Normalized generic node structure mapping ID, Kind, Subtype, Name, and Metadata.
* **Path Alias Discovery**: Scans `tsconfig.json`/`jsconfig.json`/`vite.config.js` to build dynamic mappings, resolving nested path aliases.
* **O(1) Import Resolution**: Employs a pre-built O(1) file index to resolve relative, extension-less, directory index files, and named barrel re-exports recursively.
* **Standardized Relationship Edges**: Unified dependency tracking using relationship descriptors (`IMPORTS`, `RENDERS`, `USES_HOOK`, `USES_CONTEXT`, `USES_API`, `STATE_CONSUMER`, `LAZY_LOADS`).
* **Structured Validator**: Integrated analysis scoring for circular rendering cycles, duplicate IDs, orphaned nodes, parser errors, and code metrics.
* **Decoupled Layout Engine**: Hierarchical position solver computing visual coordinate properties separate from client adapters.

---

## 0.1 Project DNA Onboarding
The cinematic first-contact screen after importing a project. This is the **only** Project DNA view in React Architect — after this, users enter the full Workspace.

* **Cinematic Intro Sequence**: A 4-step state machine (`intro` → `charging` → `shrinking` → `revealing` → `ready`) with spring physics, scale animations, and staggered element materialization.
* **Super Glow Initialization Burst**: When the user clicks "Initialize Workspace Exploration", a radial energy burst and triple-layer halo expansion fires behind the Project Brain core.
* **Progressive Disclosure Cards**: Four diagonal glassmorphic panels (Project Scale, Project Health, Technology, Analysis) show key metrics by default with `+ More` / `+ Details` / `+ Technologies` / `+ Diagnostics` hover actions that reveal floating glass overlays containing the complete architectural fingerprint.
* **Sonar Radar Widget**: An animated circular sonar scanner visualizing component file nodes with a pulsing radar sweep ring.
* **SVG Radial Health Gauge**: A glowing circular gauge with animated `strokeDashoffset` fill representing the project's architecture health score.
* **Dynamic Technology Detection**: Scans `package.json` dependencies from the knowledge graph's `rawFiles`, mapping packages through a registry to clean display names. Categories auto-hide when empty.
* **Workspace HUD Gating**: The workspace header, system status indicator, and live timestamp only appear after workspace initialization — never during the onboarding intro.

---

## 0.5 Analysis Engine
A reusable intelligence layer sitting directly above the Knowledge Graph. It never touches source files, Babel, or React Flow — it only ever reads the `{ nodes, edges }` graph, which means it automatically gets smarter as the parser improves without ever being rewritten.

* **Project DNA**: Framework, language, router, state library, build tool, component/page/hook/context/route/API counts, largest component, average component size, average dependency count, and an estimated complexity tier — all derived live from the graph.
* **Architecture Health**: A pluggable, rule-based scorer (large components, circular dependencies, dead routes, duplicate hooks, orphan components, unused components, excessive nesting, broken imports, missing providers). Each rule is independent and contributes its own deduction, so the score always explains *why* it exists.
* **Dependency Heatmap**: Incoming/outgoing degree, render depth, centrality, and usage frequency for every node, plus a ranked list of the graph's most critical nodes.
* **Dead Code Detection**: Unused components, low-reuse hooks, unresolved routes, unconsumed contexts, uncalled API endpoints, and orphan files.
* **Complexity**: Per-component complexity scoring, project-wide complexity, average/max nesting depth, the largest render subtree, and file-level dependency depth.
* **Impact Analysis**: Given any node, returns every component, route, API, and state slice structurally connected to it, plus a blast-radius count — the foundation for safe Live Refactoring and the future Refactor Simulator.

---

## 1. Architecture Studio

The Architecture Studio is the primary environment for understanding how a React application is structured. It presents the same Architecture Model through four synchronized perspectives:

### Summary
* Overall Architecture Health (Poor Maintainability rule deductions)
* Project DNA
* Largest Components & Render Cycles
* Recommended Actions

### Explorer
* Semantic component tree hierarchy
* Automatic root detection
* Category folders (Layouts, Components, Providers, State, Services)
* Expand/collapse navigation

### Flow
* Automatically generated software architecture & execution flow diagram
* Directed top-to-bottom vertical layout
* Interactive pan & zoom canvas
* Progressive disclosure nodes (App → Router → Pages → Components)

### Graph
* Interactive React Flow diagram
* Raw node/relationship dependency investigation

### Shared Inspector
Selecting any element from any perspective updates a synchronized side inspector showing:
* **Identity specs**: subtype labels, role descriptions, file path
* **Architecture Health**: Maintainability Score (0-100) and positive checkmarks/warning Complexity Drivers
* **Recommendations**: Actionable, evidence-based recommendations
* **Hierarchy Connections**: Rendered By parents and Renders children list
* **Properties**: typed props list
* **State / Services**: redux slices and API services consumed
* **Custom Hooks**: list of standard and custom hooks used
* **Imports**: imported module paths list

## 2. Navigation Studio
* **Question**: *"How do users move through this application?"*
* **Router Schema Resolution**: Parses Next.js directory routing patterns and dynamic React Router maps (JSX or object config).
* **Navigation Journeys**: Maps nested layout relationships, authentication gating gates, redirects, and dynamic path parameters.
* **Properties Inspector**: Spots dynamic query/param hooks (e.g. `:id`), route access states (Public vs. Protected), and route analytics.

---

## 3. Data Flow Studio
* **Question**: *"Where does my data come from and where does it go?"*
* **Slices & Providers**: Discovers and maps Redux slices, Context providers, local state variables, and custom hook flows.
* **Consumer Highlighting**: Highlights consumer components and tracks the flow of state update chains.
* **Health Diagnostics**: Detects deep prop-drilling pathways, duplicate states, and unused state hooks.

---

## 4. Network Studio
* **Question**: *"How does my frontend communicate with the backend?"*
* **Endpoint Services**: Maps HTTP services (axios, fetch), base config layers, and API endpoint routes.
* **Request Lifecycle Connectors**: Links network operations directly to components that trigger actions, tracing loading states and error handling.
* **Network Health**: Automatically identifies duplicate/redundant API requests and orphans.

---

## 5. Investigation Studio (AI)
* **Question**: *"Help me understand this project."*
* **Centralized AI Assistant**: The flagship intelligent developer assistant.
* **Graph-Aware Architecture Queries**: Unlike traditional developer chat widgets, the assistant queries the centralized Redux Knowledge Graph and Analysis Engine directly.
* **Deep Insight Generation**: Explains complex auth systems, isolates component re-render roots, identifies blast radiuses for refactoring risk, produces implementation plans, and generates live markdown onboarding documentation.