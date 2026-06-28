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
-   /workspace

Workspace contains multiple immersive modes instead of traditional
pages.

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
The product identity was fully built.
Implemented:
* Ambient scanline grain overlay and trail cursor blob.
* Three.js interactive network canvas (`HeroBackground.jsx`).
* GSAP-driven typographic animated hero header (`HeroCopy.jsx`).
* Magnetic CTA launch button (`LaunchButton.jsx`).
* Cinematic BootSequence overlay screen (`BootSequence.jsx`) checking workspace environment setup through 4 key checkpoints.
* Top navigation layout with active underlines and responsive transitions.
* Lenis smooth scrolling integrated natively into layouts.
* Tailwind v4 `@theme` integrations for colors, fonts, and letter spacing.

---

## Current Version
React Architect v0.2.0 — Product Identity Complete

---

## Current Milestone

### Sprint 3 — Workspace Navigation Foundation

**Objective:** Build the immersive workspace and establish the navigation system before integrating any visualization or parsing engines.

**Focus:**

* Create a single React Three Fiber scene representing the entire workspace.
* Implement a centralized `CameraController` responsible for all camera movement.
* Build placeholder ("graybox") rooms for:

  * Architecture
  * Routes
  * State Flow
  * API Flow
  * Documentation
* Store the active room in the Redux `uiSlice`.
* Animate camera transitions using GSAP based on Redux state changes.
* Define reusable camera positions in a dedicated configuration file.
* Ensure every room is an independent module that owns its own content and animations.

**Success Criteria:**

* The user can navigate between every room through smooth cinematic camera movement.
* No room contains production functionality yet; the focus is solely on navigation and architecture.

---

### Upcoming Sprint

**Sprint 4 — React Flow Integration**

Focus:

* Replace the Architecture placeholder room with a fully functional React Flow canvas.
* Preserve the existing camera system.
* Keep all remaining rooms as placeholders.

---

### Future Sprints

**Sprint 5 — AST Analysis Engine**

* Parse React projects using Babel.
* Generate nodes and edges from the parsed architecture.
* Feed live data into React Flow.

**Sprint 6 — Workspace Modules**

* Implement State Flow.
* Implement API Flow.
* Implement Documentation.
* Implement Project Brain.
* Add module-specific interactions and animations.



------------------------------------------------------------------------

## 21. Roadmap

Phase 1: Landing + Workspace

Phase 2: React Flow

Phase 3: AST Analysis

Phase 4: Architecture Graph

Phase 5: Explorer Modules

Phase 6: AI Integration

------------------------------------------------------------------------

## 22. Long-Term Vision

React Architect becomes the operating system for understanding React
applications.

Developers navigate architecture instead of folders.
