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
