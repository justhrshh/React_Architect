# v8.0 — Self-Architecture Optimization Pass (Sprint 10.3)

## Added

### Component Decomposition
* Decomposed `Workspace.jsx` (previously ~2015 LOC) into four dedicated subcomponents under `src/components/workspace/`:
  - **`WorkspaceHeader.jsx`** — HUD top header, project title, return-to-hub trigger, diagnostics status animations.
  - **`OrbitSystem.jsx`** — Domain orbit rings, animated S-curve SVG paths, data flow streams, recommended node glows.
  - **`CoreSystem.jsx`** — Central tick rings, morphing visual overlays (`CoreViz`), progress scanning sweeps, `CoreBootMessages` sequence.
  - **`InvestigationBrief.jsx`** — Floating context information panel, recommendations engine, active studio navigation buttons.
* Decomposed `Architecture.jsx` (previously ~2377 LOC) into six dedicated subcomponents under `src/components/architecture/`:
  - **`constants.js`** — Shared variables (`TYPE_CFG`), recursive tree search helper (`findPathToNode`).
  - **`CustomNode.jsx`** — React Flow custom node renderer with hook/child/API metadata counters.
  - **`InspectorPanel.jsx`** — Detailed inspector panel: maintainability scores, complexity drivers, parent/child hierarchy, circular loop flags.
  - **`TreeNode.jsx`** — Recursive interactive folder/component tree explorer with expand/collapse.
  - **`FlowDiagram.jsx`** — Custom hierarchical layout solver (`computeFlowLayout`), zoom/pan controls, flow chart rendering.
  - **`TopBar.jsx`** — Context-sensitive top bar with project path, diagnostic counters, and action buttons.

## Fixed

### Analyzer Engine Accuracy
* **False-positive dead routes**: Tightened `hasRouteShape()` to require both a path/index key AND a routing-specific key (`element`, `children`, `loader`, `action`, `lazy`, `redirectTo`) — objects with only a `path` key in non-router code no longer create spurious route nodes.
* **Route extraction in wrong files**: Added a file-path guard to the regex fallback in `routeExtractor.js` that prevents route scanning in `engines/`, `lib/`, `services/`, `redux/`, `utils/`, and `hooks/` subdirectories.
* **Route componentName resolution**: `addRouteNodeRecursive()` in `buildKnowledgeGraph.js` now resolves each route's `componentName` through actual import declarations using `resolveModulePath` + `resolveComponentDeclaration`, instead of leaving raw alias text.
* **False-positive circular dependencies (`TreeNode <-> TreeNode`)**: `findCycles()` in both `graphValidator.js` and `metrics.js` now skips self-edges. Recursive components (a component rendering itself) are a valid pattern, not an architectural defect.
* **False-positive circular dependencies (`App <-> Router`)**: Added the full React Router v6/v5 JSX API to `REACT_BUILTIN_JSX_NAMES` in `componentExtractor.js` — `Routes`, `Route`, `Navigate`, `Outlet`, `Link`, `NavLink`, `BrowserRouter`, `RouterProvider`, `Switch`, `Redirect` — preventing them from generating RENDERS edges against user components.
* **Orphaned catch-all routes**: Added `BUILTIN_ROUTER_COMPONENTS` allowlist in `deadCode.js` so `<Navigate>` in wildcard `*` routes is not flagged as an unresolved component.

## Changed

* `Workspace.jsx` reduced from ~2015 LOC to **771 LOC**.
* `Architecture.jsx` reduced from ~2377 LOC to **530 LOC**.
* `FILE_STRUCTURE.md` fully rewritten to reflect current directory layout including all new subcomponent directories.

## Status

Sprint 10.3 Complete.
React Architect now passes its own architectural review with **0 dead routes**, **0 false-positive circular dependencies**, and all page components within maintainability guidelines.

---

# v7.0 — Architecture Flow Diagram & Maintainability Health Analysis


## Added

### Architecture Flow View
* Added a new **Flow** tab to the Architecture Studio rendering a top-to-bottom directed hierarchical flow diagram.
* Implemented a custom canvas rendering model supporting mouse dragging (pan), scroll-wheel zooming, reset controls, and color-coded node legends.
* Pure layout solver engine (`computeFlowLayout`) calculating sibling width bounds and vertical tier spacing recursively.
* Smooth SVG cubic bezier connection lines that animate with drawing reveals.
* Staggered fade/slide transitions for dynamic progressive disclosure child rendering.

### Maintainability Health Scoring
* Created a multi-signal maintainability analysis engine (`maintainability.js`) scoring components out of 100 based on weighted metrics:
  - Responsibilities (30%)
  - Cyclomatic Complexity Proxy (20%)
  - Hook Complexity (15%)
  - JSX Nesting (10%)
  - Branching (10%)
  - Component Size (5%)
  - Import Graph Complexity (5%)
  - Dependency Count (5%)
* Dynamic Complexity Drivers compiling positive compliance checks (Well modularized, Organized imports) alongside warnings (High JSX nesting, Multiple responsibilities).
* Contextual recommendations detailing *why* components require refactoring and providing specific, evidence-based recommendations.

### Workspace Boot Sequence
* Reworked the Project Brain Core to serve as the singular communication portal during startup.
* Added `CoreBootMessages` displaying morphing typography ("INITIALIZING...", "SCANNING SOURCE", "BUILDING KNOWLEDGE GRAPH", "ANALYZING ARCHITECTURE", "PROJECT UNDERSTOOD") inside the Core center.
* Smooth cross-fades and text morphing animations using monospace typography, transitioning into an elegant serif style for final diagnostics.

## Changed

* Removed the arbitrary LOC > 250 large component warnings from the parser validators and dashboards.
* Replaced the project-level `LARGE_COMPONENTS` health deduction rule with `POOR_MAINTAINABILITY` (deducting score for components with maintainability < 70).
* Updated the Summary tab Recommended Action card to highlight maintainability score risks instead of component line count length.
* Refactored workspace system briefings and HUD reveal staggers to coordinate with Core booting stages.

## Status

Sprint 10.2 Complete.
The Architecture Studio is fully optimized around hierarchical storytelling and maintainability metrics rather than arbitrary code rules.

---

# v6.0 — Architecture Explorer Foundation

## Added

### Architecture Studio Foundation
* Replaced the single React Flow visualization with a multi-view Architecture Studio.
* Introduced three synchronized exploration modes:
  - **Summary** — architectural diagnostics and project health overview.
  - **Explorer** — semantic component hierarchy explorer (default view).
  - **Graph** — existing React Flow visualization retained as an alternative representation.

### Architecture Adapter
* Added a dedicated Architecture Adapter layer that transforms the Knowledge Graph into an Architecture Model consumed by every Architecture Studio view.
* React Flow is now a visualization of the Architecture Model instead of directly consuming parser output.

### Semantic Component Explorer
* Automatic root component detection using render relationships.
* DFS-based traversal with circular render protection.
* Semantic grouping of:
  - Layouts
  - Components
  - Providers / Context
  - State
  - APIs / Services
* Expand / collapse tree navigation.
* Dynamic breadcrumb generation.
* Inspector synchronization across Explorer and Graph.

### Summary Dashboard
* Architecture Health overview.
* Project DNA metrics.
* Largest modules.
* Rendering cycle detection.
* Recommended architectural actions.
* Live inspector integration.

## Changed

* Architecture Studio is no longer React Flow-centric.
* React Flow is now one exploration mode rather than the primary experience.
* Inspector now consumes shared Architecture Model data.
* Selection state is synchronized across every Architecture Studio representation.

## Status

Sprint 10.0 Foundation Complete.
Architecture Studio now operates on a reusable Architecture Model prepared for future architectural tooling.





# v5.0 — Cinematic Project DNA Onboarding & Progressive Disclosure HUD

## Added
* **Cinematic Onboarding Sequence (`Workspace.jsx`)**:
  - Implemented a 4-step intro state machine (`intro` → `charging` → `shrinking` → `revealing` → `ready`) that plays a cinematic transition when the user clicks "Initialize Workspace Exploration".
  - During `intro`, the Project Brain renders at `1.45x` scale centered in the viewport alongside 4 diagonal glassmorphic info cards (Project Scale, Project Health, Technology, Analysis).
  - During `charging`, a massive super glow radial burst fires behind the core with a pulsing scale animation (`1.0 → 1.35 → 1.15`) and triple-layer halo expansion (`200px + 400px + 600px` spread).
  - During `shrinking`, the Brain spring-animates down to its off-center workspace position with residual glow decay.
  - During `revealing`, orbit rings, celestial nodes, and HUD elements stagger into the viewport.
* **Progressive Disclosure Info Cards**:
  - `01 / PROJECT SCALE`: Shows Components (with animated sonar radar widget) and Pages by default; hovering `+ More` reveals a glass overlay with Layouts, Hooks, Context Providers, Redux Slices, Utilities, Assets, Services, and Custom Hooks.
  - `02 / PROJECT HEALTH`: Shows Health Score (with animated SVG radial gauge), Complexity, and Warnings by default; hovering `+ Details` reveals Dead Code, Circular Dependencies, Broken Imports, Unused Components, Parser Confidence, KG Integrity, and Graph Validation.
  - `03 / TECHNOLOGY`: Shows a Stack Profile pill (`React • Vite • JavaScript`); hovering `+ Technologies` reveals dynamically detected categories parsed from the project's `package.json` dependencies.
  - `04 / ANALYSIS`: Shows Files Parsed and Analysis Time by default; hovering `+ Diagnostics` reveals Folders Indexed, Parser version, Graph Node/Relationship counts, timestamp, and Import Resolution details.
* **Dynamic Technology Detection**:
  - The technology overlay scans `package.json` from `rawFiles` in the knowledge graph, mapping dependencies through a registry to clean display names.
  - Categories auto-hide when empty; only actually detected technologies appear.
* **Workspace HUD Visibility Gating**:
  - The workspace header ("Return to Hub", project name, framework/language subtitle), system status indicator ("Analysis Ready"), and bottom-left live timestamp are now hidden during onboarding intro/charging/shrinking phases and only materialize when the workspace is initialized (`revealing`/`ready`).
* **Glassmorphic Back Button**:
  - Added a premium circular glass back button with `ArrowLeft` icon positioned at `top: 36px, left: 36px` during the intro screen.
* **Core Backdrop Shroud**:
  - Implemented a dark radial gradient overlay behind the Project Brain center metric text to prevent visual collisions with background SVG elements.

## Changed
* **`getContextualMetric`**: Updated fallback logic so projects with zero detected components, routes, or API endpoints display `0` rather than hardcoded placeholder values.
* **Outer Glow Halo**: Now responds to all intro phases (`charging`, `shrinking`) in addition to the existing signature transition phases.

---

# v4.0 — Parser Accuracy & Architectural Merge

## Added
* **Dynamic Config & Path Alias Discovery (`src/engines/parser/aliasResolver.js`)**:
  - Automatically parses `tsconfig.json`, `jsconfig.json`, `vite.config.js`, and `package.json` to extract custom path aliases (e.g. `@components`, `@lib`, `@/*`) instead of assuming a single hardcoded `@/` prefix.
* **Ast Utilities (`src/engines/parser/astUtils.js`)**:
  - Shared dependency-free helper library for AST callee identifier resolution, templates interpolation, comments stripping, and basename-derived naming.
* **O(1) Module Resolution Index (`src/engines/graph/importResolver.js`)**:
  - Replaced inline quadratic traversals with an O(1) file index lookup. Handles extension-less imports, directory index files, and resolves named re-exports and barrel files recursively.
* **File-Based Routing Extractor (`src/engines/parser/extractors/fileRouteExtractor.js`)**:
  - Maps Next.js App Router and Pages Router entry patterns directly from folder structure.
* **Parser Error Isolation & Recovery**:
  - Wrapped Babel parser options in error recovery mode and isolated each AST extractor execution in a `try/catch` block. Malformed files or unusual AST shapes no longer crash the scanner.

---

# v3.1 — Analysis Engine

## Added
* **Analysis Engine (`src/engines/analysis/`)**:
  - `analysisEngine.js` — orchestrates every analysis module via `runAnalysis(graph)`, returning `{ projectDNA, architectureHealth, dependencyHeatmap, deadCode, complexity }`. Modules are registered in a single array (`moduleRegistry`), so adding a future module (Refactor Suggestions, AI Context Builder, Performance Analyzer, etc.) never requires touching existing ones.
  - `index.js` — public entry point; re-exports `runAnalysis`, `analyzeImpact`, and every module individually for callers that only need one analysis.
  - **`modules/projectDNA.js`** — derives framework, language, router, state library, build tool, package manager, component/page/hook/context/slice/API/route counts, largest component, average component size, average dependency count, and an estimated complexity tier, entirely from graph data (no hardcoded assumptions).
  - **`modules/architectureHealth.js`** — pluggable rule-based scorer. Nine independent rules ship out of the box (large components, circular dependencies, dead routes, duplicate hooks, orphan components, unused components, excessive nesting, broken imports, missing providers), each contributing its own score deduction and structured findings. Returns `{ score, grade, errors, warnings, suggestions, ruleResults }`.
  - **`modules/dependencyHeatmap.js`** — computes incoming/outgoing degree, RENDERS-tree depth, degree centrality, and usage frequency per node, plus a ranked `criticalNodes` list.
  - **`modules/deadCode.js`** — detects unused components, low-reuse hooks, unresolved routes, unconsumed contexts, uncalled API endpoints, and orphan files. Exempts legitimate structural roots (pages, layouts, providers, app entry files) from false positives.
  - **`modules/complexity.js`** — per-component complexity scoring (LOC + hooks + children + API calls, weighted), project-wide complexity, average/max nesting depth, largest render subtree, and file-level dependency depth.
  - **`modules/impactAnalysis.js`** — on-demand `analyze(graph, nodeId)` bidirectional BFS returning every component/route/API/state node structurally connected to a target, plus a blast-radius count. Kept out of the default `runAnalysis` sweep since it's parameterized per node; invoked via `analyzeImpact(graph, nodeId)`.
  - **`modules/metrics.js`** — shared, dependency-free graph math toolbox (adjacency/reverse-adjacency builders, degree maps, BFS depth, cycle detection, orphan detection, degree centrality, grouping/averaging helpers) used by every module above so no traversal logic is duplicated.

## Design Notes
* The Analysis Engine has zero dependencies on Babel, the parser, or React Flow — it only ever reads the generic `{ nodes, edges }` Knowledge Graph shape from `nodeFactory.js` / `edgeFactory.js`. As parser accuracy improves in the parallel sprint, every module here automatically produces richer output with no code changes.
* `architectureHealth.js` accepts pre-computed context (`deadCode` results, `graph.validation`) from `analysisEngine.js` to avoid recomputing the same structural scans twice — a pattern any future module can opt into via a `needsContext` flag in `moduleRegistry`.
* Verified against a synthetic graph shaped exactly like `buildKnowledgeGraph.js` output (including its fallback-seed schema) — all six modules execute cleanly and produce internally consistent results (e.g. `deadCode.unusedComponents` and `architectureHealth`'s `ORPHAN_COMPONENTS`/`UNUSED_COMPONENTS` rules agree with each other).

## Status
Sprint 9.2 Complete. React Architect now has a reusable Analysis Engine sitting above the Knowledge Graph — Architecture Health and Impact Analysis are engine-ready; only studio UI wiring remains to surface them.

---

# v3.0 — Centralized Knowledge Graph Engine & Refactored Studio Pages

## Added
* **Centralized Knowledge Graph (KG) Engine**:
  - Modularized the parsing and analysis pipeline into framework-agnostic node (`nodeFactory.js`) and standardized relationship edge (`edgeFactory.js`) constructors.
  - Implemented structured validation (`graphValidator.js`) detecting duplicates, orphan elements, large components, and circular rendering loops.
  - Deployed a standalone layout engine (`layoutEngine.js`) to compute node coordinate properties separate from React Flow adapters.
  - Created modular extractor scripts under `src/engines/parser/extractors/` (component, hook, import, export, context, redux, route, api).
* **Refactored Exploration Studios**:
  - Updated Component Architecture, Routes, State Flow, API, and Documentation studio pages to consume data directly from the unified Redux `knowledgeGraph` state database.
  - Standardized stable node identifiers (`component:file:name`) to maintain persistent selections across workspace views.

---

# v2.0 — Real AST analysis & Interactive Workspace Explorer Studios

## Added
* **Dynamic AST Scanner Engine**:
  - Implemented recursive directory scanning (File System Access API) and JSZip archives unpackers inside `scanner.js`.
  - Added Babel AST visitors inside `parser.js` that extract component names, hooks, props, imports, and exports.
  - Linked parent-child render edges inside `graphBuilder.js` and layered nodes inside `reactFlowAdapter.js`.
* **Component Architecture Studio Improvements**:
  - Implemented solid off-white high-contrast sidebar to replace translucent dark themes for maximum readability.
  - Added "Nesting Hierarchy" context badges.
  - Added app-level collapsible sidebar/inspector panels fullscreen toggle, auto-fitting the layout to the viewport on toggle.
* **Interactive Route Studio (`/routes`)**:
  - Created `routeParser.js` to dynamically extract URL patterns from Next.js (`app/**/page.tsx`) and React Router formats.
  - Deployed route endpoint nodes, parameters, and targets inside `@xyflow/react` routing trees.
* **Interactive State Studio (`/state`)**:
  - Plotted Redux Slices (e.g. `authSlice`, `uiSlice`) and state variables.
  - Drew dependency edges linking state slices to useSelector consumer components.
* **Interactive API Studio (`/api`)**:
  - Visualized Network Gateway Client objects, HTTP route operations (`POST /auth/login`, `GET /projects`), and mapped them to the triggering components.
* **Interactive Documentation Studio (`/docs`)**:
  - Indexed `.md` files during scans and bypassed AST parsing.
  - Rendered select markdown documents inside a custom reader component supporting headers, quotes, lists, and code blocks.
* **Persisted Handles**:
  - Cached folder handles in IndexedDB (`projectStore.js`) to restore user access rights on page refresh via workspace re-grant prompts.
* **Simulated Fetch Delay**:
  - Implemented a 1.8-second indexing loading screen on project imports.

---

# v1.5 — Decoupled Workspace Portals & Tool Studios

## Added
* **Cinematic Portal Construction Sequence**:
  - Implemented a reusable 3D R3F `<Portal />` component rendered at the center of all platform rooms.
  - **Sequence Mechanics**: When a platform is focused, the rotating wireframe collapses, 8 white vertex spheres scatter outwards and implode back to the center to spin out a glowing white torus ring and energy disk.
  - **Simulated Camera Zoop**: The portal group sweeps forward past the camera view while scaling up to cover the screen in a solid white screen flash, avoiding camera position mutations.
* **Unified Tool Routes & Dedicated Studio Pages**:
  - Registered routes `/architecture`, `/routes`, `/state`, `/api`, and `/docs` under the Workspace router.
  - Created standalone dark placeholder studio pages: `Architecture.jsx`, `Routes.jsx`, `StateFlow.jsx`, `ApiFlow.jsx`, and `Documentation.jsx`.
  - Added a `gsap.fromTo` background fade transition on mounting to blend seamlessly from the white portal zoop flash back to the dark workspace panels.
  - Integrated `← Command Center` back buttons on all studio pages that safely reset the active room state back to `"project-brain"` to prevent infinite redirect loops.
* **Workspace HUD Overlay Auto-Hiding**:
  - Configured top navigation header, mobile selector bar, and bottom info cards to instantly slide and fade away when a portal destination is selected, or when entering **Look Around (explore)** mode.
  - HUD elements animate back into view seamlessly when the camera settles back on the main Project Brain platform.

---

# v1.4 — Decoupled Hub & Workspace Architecture

## Added
* **Decoupled Hub & Workspace pages**:
  - Re-introduced `/hub` route mapping to `src/pages/Hub.jsx` to serve as a standalone, lightweight project management command console.
  - Dedicated `/workspace` route mapping to `src/pages/Workspace.jsx` to serve as the standalone spatial 3D room constructs, custom HUD navigation panels, and metadata cards.
  - Landing page's `BootSequence` completion now redirects to `/hub` instead of going directly to the workspace void.
  - Implemented automatic redirection guards on `/workspace` that send users back to `/hub` if they attempt to load the workspace without selecting an active project.
* **Refined Premium 3D Interaction Styles**:
  - Baseline project carousel cards elevated in a persistent, shallow arch curve.
  - Dynamic local hover tilt gestures append extra translation offsets (`translateY(-20px) translateZ(40px) scale(1.03)`) and shift shadow spreads.
  - Redesigned the Import Modal layout to feature a soft, off-white container frame (`bg-neutral-50/65`) that makes white option cards pop out with maximum contrast.

---

# v0.4.2 — Create New Project Wizard

## Philosophy
The Hub is no longer a page. It is an environment. Same void, same stars, same world as the Workspace.

## Removed
* `ProjectHub.jsx` (dashboard layout) — completely replaced
* `HubLayout.jsx` (padded container) — replaced with full-viewport wrapper
* Project cards, grids, headers, sidebars — all gone

## Added
* `src/features/hub/HubScene.jsx` — full R3F Canvas scene for the Hub:
  - Reuses `WorldEnvironment` (stars, void, blueprint grid) from workspace
  - Reuses `WorldLights`
  - Phase state machine: `arriving → idle → selecting`
  - Orbs appear only after camera arrival animation completes
* `src/features/hub/HubCamera.jsx` — locked camera controller:
  - Arrival: `[0,5,18] → [0,3,10]` over 2s on mount (cinematic entry)
  - Selection: zooms forward `z:10 → z:-10` over 1s (GSAP power3.in)
  - Always `lookAt(0,0,0)` via `useFrame` — no drift, no orbit
* `src/features/hub/ProjectOrb.jsx` — holographic project icon:
  - Thin cyan torus ring (`torusGeometry`) + translucent inner disc
  - Entrance: rises from y=-5 to y=0 with staggered GSAP delay
  - Idle: subtle rotation drift via `useFrame`
  - Hover: scale 1.12, emissive 1.6, HTML label brightens (lerp via `useFrame`)
  - Click: GSAP scale to 3.0 + emissive flash → `onSelect` fires at 430ms
  - Label: project name only (no metadata)
  - Right-click: fires `onContextMenu` for rename/delete
* `src/features/hub/AddOrb.jsx` — "+" holographic orb:
  - Grey ring + slow spin to distinguish from project orbs
  - Cross geometry in centre, turns cyan on hover
  - Same entrance animation as ProjectOrb
  - Click: fires `onAddClick` (no workspace transition)
* `src/features/hub/ProjectOrbGroup.jsx` — horizontal arc layout:
  - Projects + Add orb centred at x=0, spaced 2.8 units apart
  - Entrance stagger: 0.1s per orb left-to-right
* `src/features/hub/HubHUD.jsx` — minimal HTML overlay:
  - `← Landing` link (top-left)
  - Version label (top-right)
  - Environment identifier (bottom-centre)
  - Hidden during transitions
* `src/pages/ProjectHub.jsx` — thin orchestrator (no visual rendering):
  - `AddChooserOverlay`: blurred void overlay with Import/Create tiles
  - `ContextMenu`: right-click HTML menu for rename/delete on orbs
  - All modals (Import, Wizard, Rename, Delete) work unchanged
  - Project selection → `selectProject` dispatch → `ProjectLoadTransition` → `/workspace`

## Changed
* `HubLayout.jsx` — `fixed inset-0`, zero padding, zero overflow

## Status
Sprint 5 Complete. The Hub is now an immersive environment, not a dashboard.

---

# v0.4.2 — Create New Project Wizard

## Added
* `src/components/hub/CreateProjectWizard.jsx` — fullscreen 8-step project creation wizard:
  - Step 1: Project Name (text input, Enter to continue)
  - Step 2: Framework — React + Vite (recommended), Next.js, Remix (coming soon)
  - Step 3: Language — TypeScript (recommended), JavaScript
  - Step 4: Styling — Tailwind CSS (recommended), CSS Modules, SCSS, Styled Components
  - Step 5: State Management — None, Redux Toolkit, Zustand, Context API
  - Step 6: Routing — React Router, TanStack Router, None
  - Step 7: Optional Packages — multi-select (GSAP, Framer Motion, TanStack Query, Axios, React Hook Form, Zod, Lucide, date-fns, ESLint, Prettier)
  - Step 8: Folder Structure — React Architect (recommended), Feature-Based, Basic, Domain-Driven
  - Left sidebar: animated step tracker with completed (✓), active (accent border), upcoming (muted) states
  - GSAP entrance animation + slide transition between steps
  - Smart routing: selecting Next.js auto-sets routing to next-router
  - Continue button disabled until Step 1 is filled
  - "Recommended" badge on default selections
  - "Coming Soon" badge on disabled options
  - Builds full `DetectedProject`-compatible payload for `addProject`
  - Pre-generates `crypto.randomUUID()` ID so `selectProject` can fire immediately
  - On complete: dispatches `addProject` + `selectProject` → calls `onComplete` → cinematic load → workspace
* `src/pages/ProjectHub.jsx` — rewritten:
  - Header now has two buttons: `↑ Import` (secondary) and `+ New Project` (primary accent)
  - Empty state redesigned: dual-path tiles side by side — "Import Existing" and "Create New Project"
  - Wizard completion triggers cinematic load transition directly to `/workspace`
* `hubSlice.js` `addProject` — accepts optional pre-generated `id` field, stores full wizard metadata: `language`, `styling`, `stateManagement`, `routing`, `optionalPackages`, `folderStructure`

## Status
Sprint 4.2 Complete. React Architect now supports both developer journeys — import and create — with the same workspace destination.

---

# v0.4.1 — Sprint 4 Revision: Real Project Import

## Changed
* Replaced `AddProjectModal` with `ImportProjectModal` — no more manual name/framework entry
* Import button label: `+ New Project` → `↑ Import Project` everywhere in the hub
* `ProjectCard.jsx` rewritten to display detected metadata (tech flag pills, build tool, React version, import method)
* `hubSlice.js` `addProject` extended with full `DetectedProject` shape

## Added
* `src/lib/projectDetector.js` — detection foundation module:
  - `detectFromDirectoryHandle(handle)` — File System Access API reads `package.json`
  - `detectFromZip(file)` — filename-based fallback; full ZIP parsing planned for Sprint 6
  - `detectFromPackageJson(pkg)` — pure function, framework / buildTool / version / flag detection
  - Detects: framework, build tool, React version, TypeScript, Tailwind, Redux, React Router
* `src/components/hub/ImportProjectModal.jsx` — state-machine modal (`idle → detecting → review → confirm`):
  - Local Folder: `window.showDirectoryPicker()` (Chrome/Edge 86+)
  - ZIP Archive: drag-and-drop dropzone + file input
  - GitHub: disabled tile with "Coming Soon" badge
  - Review screen shows detected name, description, framework, build tool, React version, tech badges
  - AbortError handled silently; browser-unsupported fallback error state

## Status
Sprint 4.1 Complete. React Architect now imports real projects and auto-detects their stack.

---

# v0.4.0 — Project Hub

## Added
* `hubSlice.js` — new Redux slice for project management (`projects[]`, `selectedProjectId`) with full localStorage persistence and `crypto.randomUUID()` ID generation
* Reducers: `addProject`, `deleteProject`, `renameProject`, `selectProject`, `clearSelectedProject`, `updateLastOpened`
* Selectors: `selectAllProjects`, `selectSelectedProjectId`, `selectSelectedProject`
* `HubLayout.jsx` — minimal layout wrapper with `CursorBlob` and `Noise` ambient effects
* `/hub` route inserted between `/` and `/workspace` in `Router.jsx`
* `WorkspaceGuard` component — redirects to `/hub` if no project is selected (prevents direct `/workspace` access)
* `ProjectHub.jsx` — full project management page with:
  - Entrance GSAP animations on header and card grid
  - Responsive project card grid sorted by `lastOpenedAt`
  - `EmptyState` component with animated orb and CTA
  - Section counter label
* `ProjectCard.jsx` — premium Linear-inspired card:
  - Framework badge with per-framework accent colour
  - Hover lift + framework-colour glow shadow
  - Meta grid: Last Opened, Arch. Score, Last Analysis, Created
  - ⋯ context menu with Rename and Delete actions (opacity-0, group-hover reveal)
  - "Open workspace →" CTA fades in on hover
* `AddProjectModal.jsx` — glassmorphic modal with Project Name + Framework (select) fields and validation
* `RenameModal.jsx` — pre-filled rename modal
* `DeleteConfirmModal.jsx` — danger-styled two-button confirmation
* `ProjectLoadTransition.jsx` — fullscreen cinematic load overlay:
  - GSAP-sequenced status lines: `Initialising project...` → `Loading workspace...` → `Architect online`
  - Animated progress bar fill over 2.2s
  - Fades out, then triggers `navigate('/workspace')`
* Workspace HUD now shows active project name + framework badge next to the logo
* `← Hub` button in workspace header navigates back to `/hub` without clearing session

## Changed
* `Landing.jsx` — `BootSequence` completion now routes to `/hub` instead of `/workspace`
* `Landing.jsx` — footer sprint label updated to `Sprint 04`
* `Router.jsx` — fully replaced; workspace is now guarded
* `store.js` — `hub` reducer registered

## Status
Sprint 4 Complete. React Architect is now a multi-project OS. Every workspace session belongs to a selected project.

---

# v0.3.5 — Immersive Materialization & Explore Mode

## Added
* Modular platform state system — `WorkspaceScene` passes `active`, `focused`, and `exploreMode` flags to each room
* `LocalParticles` sub-component embedded inside each room: rising energy sparks animate only when a platform is active or in explore mode
* Platform sinking/rising GSAP materializations — inactive rooms sink below the grid floor (`y: -1.5`, opacity `0.05`), rising to surface on selection with an elastic scale spring (`back.out(1.4)`)
* Wireframe graybox symbols scale from `0.01` → `1.0` on selection for a "constructing" build effect
* Explore Mode (`activeRoom === 'explore'`): wide-angle overview zooms out, all platforms hover at mid-level with distance-based fade opacities (center `0.9`, near `0.45–0.6`, far `0.35`)
* 3D platform mesh `onClick` bindings: clicking any faded platform in explore mode flies the camera to it and locks in
* "Look Around" HUD button — visible only when locked inside a workspace room; triggers explore mode on click
* Cinematic flight HUD slide — header navbar, details card, and version label slide out during camera sweeps and fade back in on arrival
* Explore mode instruction overlay (drag, zoom, click cue)
* `CursorBlob` and `Noise` ambient components added to `WorkspaceLayout` so ambient effects persist on `/workspace` route

## Fixed
* **Critical infinite render loop** — `onArrivalChange` callback was listed in `CameraController`'s `useEffect` dependency array. Because `WorkspaceScene` recreated the inline function on every render, the effect fired continuously. Fixed by storing the callback in a `useRef` (accessed as `onArrivalChangeRef.current`) and intentionally excluding it from the dependency array. `useCallback` also added in `WorkspaceScene` as a second safety layer
* Removed duplicate `noise-overlay` div from `Workspace.jsx` (was already rendered by `WorkspaceLayout`)
* Default Redux `activeRoom` initialised to `'project-brain'` so workspace boots focused on the central hub
* First-mount camera snap: `isFirstMountRef` skips all GSAP animations on initial load so no auto-zoom occurs on page entry

## Status
Sprint 3.5 Complete. Immersive materialization, explore mode, and cinematic camera navigation all working without loops.

---

# v0.3.0 — Workspace Navigation Foundation Complete

## Added
* Cinematic full-viewport R3F Workspace background scene (`WorkspaceScene.jsx`)
* Redux-driven GSAP camera transition orchestrator and interactive `OrbitControls` wrapper (`CameraController.jsx`)
* Centralized camera target and offset configs (`CameraPositions.js`)
* Global ambient & spot lighting rig focusing spotlights on the 6 coordinates (`WorldLights.jsx`)
* Space environment layout with stars background, ground grid helper, and wire connections (`WorldEnvironment.jsx`)
* Self-animating coordinate energy flow nodes moving along connection lines
* Six self-contained platform mesh elements with border outlines and floating 3D labels:
  - `BrainRoom.jsx` (rotating center sphere with orbit rings)
  - `ArchitectureRoom.jsx` (exposes children anchor group for node integration)
  - `RoutesRoom.jsx`
  - `StateRoom.jsx`
  - `ApiRoom.jsx`
  - `DocumentationRoom.jsx`
* Premium HTML HUD UI overlays inside `Workspace.jsx` (top navigation controller, responsive mobile toggle, back CTAs)
* Smart fading information display panel which automatically fades during sweeps and slides back in on camera arrival

## Fixed
* Renamed and corrected spelling typo on the feature folder (`wrokspace` -> `workspace`) to enforce standard naming path protocols

## Status
Sprint 3 Complete. Cinematic spatial camera navigation loops successfully.

---

# v0.2.0 — Product Identity Complete

## Added
* Three.js interactive network canvas background (`HeroBackground.jsx`)
* GSAP-driven typographic animated hero title (`HeroCopy.jsx`)
* Interactive magnetic CTA button (`LaunchButton.jsx`)
* Ambient cursor trailing blob element (`CursorBlob.jsx`)
* Ambient scanline noise & grain layer (`Noise.jsx`)
* Cinematic progress-checking BootSequence loader overlay (`BootSequence.jsx`), configured with 4 core checkpoints:
  - `01 — Setting up workspace`
  - `02 — Creating environment`
  - `03 — Loading tools`
  - `04 — Architect online`
* Top header navigation component (`Nav.jsx`) with active-state lines and underlines
* Smooth-scrolling Lenis driver integrated into Layout
* Tailwind v4 `@theme` fonts (`font-display`, `font-mono`, `font-sans`) and letter spacing (`tracking-tightest`, `tracking-widestest`) utility configurations
* Redux UI slice states (`bootActive`, `bootStep`, `activeRoom`, `cursorActive`) and respective dispatch actions

## Fixed
* Corrected CSS standard ordering rules where imports were overridden by `@theme` definitions (moved `@theme` block below all stylesheets)
* Fixed specificity resolving issues on heading text by adding an explicit `.text-accent` color override with `!important`
* Cleaned up duplicate directories by deleting redundant `src/features/landing/`

## Status
Sprint 2 Complete. Product identity and visual interactions match clone specifications.

---

# v0.1.0 — Foundation Complete

## Added

* Complete project architecture
* Folder structure
* React Router
* Redux Toolkit store
* Seven domain-driven Redux slices
* Landing & Workspace layouts
* Global design system
* CSS architecture
* Animation philosophy
* Utility philosophy
* Documentation system

## Changed

* BrowserRouter moved from Router.jsx to main.jsx.
* Layouts migrated from CSS classes to semantic `<main>` elements.
* utilities.css rewritten to complement Tailwind instead of duplicating it.
* animations.css reserved for ambient animations only.
* GSAP designated as the primary animation engine.

## Fixed

* BrowserRouter import issue in main.jsx.
* Removed obsolete layout CSS.
* Improved global stylesheet organization.

Status:

Sprint 1 Complete.
Application boots successfully.
# v8.1 - Production Hardening & Impact Analysis UI (Sprint 11)

## Added

### Impact Analysis Inspector
* Added an Impact Analysis section to the Architecture Studio inspector.
* Selecting a node now shows blast radius, risk level, affected component/route/state/API counts, direct dependencies, and direct dependents.
* Extended `impactAnalysis.js` to return `direct.uses`, `direct.usedBy`, `affectedByKind`, and `riskLevel` in addition to the existing affected-node groups.

### Engine Test Harness
* Added a Node test script (`npm test`) using the built-in `node:test` runner.
* Added focused engine coverage for parser extraction, import resolution, Knowledge Graph construction, and on-demand impact analysis.

## Changed

* Route-level code splitting added in `Router.jsx` with `React.lazy` and `Suspense`, moving heavy studio pages into separate chunks.
* Engine/parser internal imports now use explicit `.js` extensions so the same modules can run under Vite and Node's ESM test runner.
* Normalized the Redux store filename to `src/redux/store.js` for cross-platform casing safety.

## Status

Sprint 11 Complete.
React Architect now has a visible refactor-risk surface in Architecture Studio, a lightweight engine verification suite, route-level code splitting, and improved ESM portability.

---
