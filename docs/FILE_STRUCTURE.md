# FILE_STRUCTURE.md

# React Architect - File Structure

This document defines the official project structure.

Every contributor and AI assistant must follow this structure.

---

## Root Structure

```text
react-architect/

docs/
public/
src/
package.json
vite.config.js
README.md
```

---

## Source Directory

```text
src/

main.jsx

app/
│
├── App.jsx
└── Router.jsx

assets/
├── fonts/
├── images/
├── icons/
├── models/
└── shaders/

animations/
    ├── landing/
    |   ├── heroTimeline.js
        ├── bootSequence.js
        ├── titleReveal.js
    |   └── backgroundTimeline.js
    |
    ├── workspace/
    |   ├── cameraTimeline.js
        ├── roomTransition.ja
        ├── panelTimeline.js
    |   └── menuTimeline.js
    |
    └── common/
        ├── pageTransition.js
        ├── sharedTimelines.js
        └── cursorEffects.js
    


components/
├── common/
├── ui/
├── graph/
├── animation/
└── three/

features/
├── landing/
├── workspace/
├── architecture/
├── routes/
├── state-flow/
├── api-flow/
├── documentation/
└── project-brain/

layouts/
├── LandingLayout.jsx
└── WorkspaceLayout.jsx

lib/
├── gsap.js
├── lenis.js
├── reactflow.js
└── three.js


pages/
├── Landing.jsx
└── Workspace.jsx

redux/
├── store.js
└── slices/
    ├── projectSlice.js
    ├── graphSlice.js
    ├── uiSlice.js
    ├── searchSlice.js
    ├── scannerSlice.js
    ├── settingsSlice.js
    └── architectureSlice.js

hooks/

services/

constants/

styles/
├── globals.css
├── typography.css
├── variables.css
├── animations.css
└── utilities.css

utils/
```

---

## Folder Rules

* New product features belong inside `features/`.
* Reusable UI belongs inside `components/`.
* Redux state belongs inside `redux/`.
* Global styles belong inside `styles/`.
* Shared helper functions belong inside `utils/`.
* Future parsing, graph generation, scoring, and AI systems will live inside `engines/`.

This structure is the official architecture of React Architect and should remain consistent throughout development.
