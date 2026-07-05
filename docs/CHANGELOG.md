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