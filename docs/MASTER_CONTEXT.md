# MASTER_CONTEXT.md

> Single Source of Truth for **React Architect**

## 1. Project Overview

**Name:** React Architect

**Tagline:** Don't just write React. Architect it.

React Architect is an immersive visual platform for understanding,
designing, analyzing and maintaining React applications. Instead of
navigating folders, developers navigate architecture through an
interactive graph.

React Architect is not a website. It is an interactive software experience.

The landing page is not a marketing page.

It is the user's arrival into the world of React Architect.

Every interaction should increase curiosity.

Navigation is experienced as movement through space, not page changes.

------------------------------------------------------------------------

## 2. Vision

Create the world's best visual operating system for React applications.

Goals: - Understand any React codebase in minutes. - Design architecture
before coding. - Visualize components, routes, APIs and state. - Improve
projects with intelligent analysis. - Evolve into an AI-assisted
development platform.

------------------------------------------------------------------------

## 3. Problem Statement

Developers spend more time understanding code than writing it.

React Architect solves this by replacing folder exploration with
architecture visualization.

------------------------------------------------------------------------

## 4. Core Philosophy

-   Architecture First
-   Visual First
-   Premium UX
-   Simplicity Over Complexity
-   Every animation communicates.
-   Reduce cognitive load.

------------------------------------------------------------------------

## 5. Target Audience

-   React beginners
-   Intermediate developers
-   Senior frontend engineers
-   Teams
-   Students

------------------------------------------------------------------------

## 6. MVP Tech Stack

### Frontend

-   React (JavaScript)
-   Vite
-   Tailwind CSS
-   React Router DOM
-   Redux Toolkit
-   React Flow
-   GSAP
-   Framer Motion
-   React Three Fiber
-   @react-three/drei
-   Lenis
-   Lucide React

### Code Analysis

-   Babel Parser
-   AST Parser

### Future

-   Node.js
-   Express
-   MongoDB
-   Redis
-   Socket.IO
-   OpenAI

------------------------------------------------------------------------

## 7. Design Philosophy

The application must not feel like: - GitHub - VS Code - Admin
dashboards - CRUD software

Instead it should feel like: - Framer - Figma - Linear - Arc Browser - A
futuristic architecture studio

Keywords: Minimal • Cinematic • Immersive • Premium • Interactive

------------------------------------------------------------------------

## 8. UI / UX Principles

### Landing

-   Huge typography
-   Interactive background
-   Cinematic animations
-   Single CTA: Launch Architect

### Navigation

Top-left logo. Top-right stacked text menu. No sidebar. Elegant
underline hover.

------------------------------------------------------------------------

## 9. Workspace

The workspace is one immersive environment.

Modules feel like rooms: - Architecture - Routes - State - APIs -
Documentation

Camera transitions move naturally between them.

------------------------------------------------------------------------

## 10. Signature Experience

Opening a project:

1.  Analyze project.
2.  Files fly in.
3.  Components appear.
4.  Hooks detected.
5.  Routes connect.
6.  APIs appear.
7.  Graph assembles.
8.  Workspace becomes interactive.

------------------------------------------------------------------------

## 11. Core Modules

-   Project Brain
-   Ask Your Project
-   Project DNA
-   Architecture Mode
-   Component Explorer
-   Route Explorer
-   API Flow
-   State Flow
-   Architecture Score
-   Refactor Suggestions
-   Dependency Heatmap
-   Interactive Documentation

------------------------------------------------------------------------

## 12. Routing

-   /
-   /hub
-   /workspace

Workspace contains multiple immersive modes instead of traditional
pages, launched from the project selection hub.

------------------------------------------------------------------------

## 13. Redux

Planned slices: - projectSlice - graphSlice - uiSlice - searchSlice -
scannerSlice - settingsSlice - architectureSlice

------------------------------------------------------------------------

## 14. Folder Structure

src/
  app/
  assets/
  animations/
  components/
  hooks/
  layout/
  modules/
  pages/
  redux/
  services/
  styles/
  utils/

for more info read FILE_STRUCTURE.md

------------------------------------------------------------------------

## 15. Naming

Examples: - LandingHero - GraphCanvas - NodeInspector -
WorkspaceLayout - ArchitectureRoom

------------------------------------------------------------------------

## Animation Philosophy

React Architect uses two animation systems.

### CSS

CSS animations are reserved for passive visual effects that continuously run in the background.

Examples:

- Ambient glow
- Floating objects
- Background movement
- Noise
- Spinners
- Pulse effects
- Decorative animations

### GSAP

GSAP is the primary animation engine of React Architect.

It is responsible for:

- Hero animations
- Typography reveals
- Camera movement
- Scene transitions
- Workspace navigation
- Loading sequences
- Project analysis animations
- User interactions
- Timeline-based storytelling

### Rule

Never animate the same element using both CSS and GSAP.

If an animation tells a story or responds to user interaction, it belongs in GSAP.

If an animation simply makes the interface feel alive, it belongs in CSS.


Utilities Philosophy

Tailwind owns layout.

utilities.css owns reusable visual effects.

Never recreate Tailwind utility classes inside utilities.css.
------------------------------------------------------------------------

## 16. Animation Guidelines

-   Use GSAP for cinematic sequences.
-   Use Framer Motion for UI interactions.
-   Use camera movement intentionally.
-   Motion should reinforce architecture.

------------------------------------------------------------------------

## 17. Coding Standards

-   JavaScript only.
-   Redux Toolkit.
-   Tailwind CSS.
-   Functional components.
-   Reusable architecture.
-   Modular code.

------------------------------------------------------------------------

## 18. AI Rules

Every AI must: - Read MASTER_CONTEXT.md first. - Preserve naming. -
Preserve folder structure. - Preserve UI philosophy. - Explain major
changes.

------------------------------------------------------------------------

## 19. Git Workflow

Feature → Build → Review → Commit → Update CHANGELOG.md

------------------------------------------------------------------------

## 20. Current Progress

### ✅ Sprint 1 Complete
The application foundation was completed, setting up React Router, Redux slices, layout files, and CSS design architecture.

### ✅ Sprint 2 Complete
The product identity was built, incorporating ambient scanlines, trailing cursor blob, Three.js hero network nodes, magnetic launch buttons, and 4-checkpoint BootSequence overlays.

### ✅ Sprint 3 Complete
The workspace navigation foundation was completed. Built full-screen R3F `<Canvas>` scene, Redux-driven GSAP camera transition sweeps (`CameraController.jsx`), cosmic stars, grid floor, connecting wire pathways with animated energy flows (`WorldEnvironment.jsx`), global lights rig (`WorldLights.jsx`), and 6 self-contained graybox platform meshes:
*   `BrainRoom.jsx` (rotating center core sphere and torus rings)
*   `ArchitectureRoom.jsx` (with anchors for component node maps)
*   `RoutesRoom.jsx`
*   `StateRoom.jsx`
*   `ApiRoom.jsx`
*   `DocumentationRoom.jsx`
Integrated HUD HTML menu bar at the top and an elegant sliding/fading room metadata HUD glass card at the bottom.

### ✅ Sprint 3.5 Complete
Immersive materialization, explore mode, and bug fixes:
*   Inactive platforms sink below the grid floor (opacity `0.05`, `y: -1.5`). Active platforms rise with a GSAP elastic spring build.
*   Local `LocalParticles` component inside each room: rising energy sparks active only when platform is focused or in explore mode.
*   Wireframe symbols scale from `0.01` → `1.0` with `back.out(1.4)` easing (visual "constructing" build effect).
*   Explore Mode: camera zooms to wide overview, platforms hover at mid-level with distance-based opacity fade.
*   3D platform `onClick` triggers camera travel from within the explore void.
*   "Look Around" HUD button visible only when locked in a room.
*   **Critical infinite loop fixed**: `onArrivalChange` moved into a `useRef` to prevent it from causing `useEffect` to re-fire on every render cycle.
*   First-mount `isFirstMountRef` bypasses GSAP animation so camera snaps to position on initial load.

### ✅ Sprint 4 Complete
Project Hub multi-project management layer:
*   `hubSlice.js` — Redux slice with `projects[]`, `selectedProjectId`, and full localStorage persistence via `crypto.randomUUID()`.
*   `/hub` route inserted between landing and workspace; workspace is now guarded by `WorkspaceGuard` (redirects to `/hub` if no project selected).
*   `ProjectHub.jsx` page with responsive card grid, GSAP entrance animations, and empty state CTA.
*   `ProjectCard.jsx` — Linear-inspired premium card with framework badge (per-framework accent colours), meta grid, hover glow, and context menu (Rename / Delete).
*   `ProjectLoadTransition.jsx` — fullscreen GSAP cinematic overlay (progress bar + sequenced status lines) fires before navigating to `/workspace`.
*   `AddProjectModal`, `RenameModal`, `DeleteConfirmModal` — glassmorphic modals for full project CRUD.
*   Workspace HUD now displays active project name + framework badge; Exit → "← Hub" button.
*   `BootSequence` on landing now routes to `/hub` instead of `/workspace`.
### ✅ Sprint 5 Complete
Holographic Orb exploration space:
*   Built prototype 3D project orbs in the space void representing individual project files.
*   (Superseded by Sprint 6 unified environment for improved usability).

### ✅ Sprint 6 Complete
Unified Hub & Workspace Decoupling:
*   Decoupled the Hub dashboard from the Workspace operating surface.
*   Created a separate `/hub` page route (`Hub.jsx`) for project list management, drag carousel, and modal popups.
*   Created a separate `/workspace` page route (`Workspace.jsx`) containing the immersive 3D spatial room constructs, custom HUD navigation panels, and metadata cards.
*   Retained Three.js canvas optimizations (`WorkspaceScene.jsx`) with dynamic scene controllers, ensuring loading overlays transition smoothly between states.

---

## Current Version
React Architect v1.4 — Decoupled Hub & Workspace Architecture Complete

---

## Current Milestone
Sprint 7 — React Flow Integration
Focus:
*   Integrate React Flow canvas inside the `Architecture` room overlay panel.
*   Use `selectedProject` as source of truth for what the graph renders.
*   Map mock component nodes and connection edges.
*   Maintain spatial GSAP camera sweeps, HUD overlays, and materialization animations.
*   Prepare AST pipelines for Sprint 6.

------------------------------------------------------------------------

## 22. Long-Term Vision

React Architect becomes the operating system for understanding React
applications.

Developers navigate architecture instead of folders.
