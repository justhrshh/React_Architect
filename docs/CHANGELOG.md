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
