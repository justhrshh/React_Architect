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
├── ambient/
│   ├── CursorBlob.jsx
│   └── Noise.jsx
├── hub/
│   ├── ProjectCard.jsx             ← Detected metadata display (framework, tech flags, build tool)
│   ├── ImportProjectModal.jsx      ← Smart import: Local Folder, ZIP, GitHub (coming soon)
│   ├── CreateProjectWizard.jsx     ← 8-step fullscreen creation wizard
│   ├── AddProjectModal.jsx         ← SUPERSEDED by ImportProjectModal (kept for reference)
│   ├── RenameModal.jsx
│   ├── DeleteConfirmModal.jsx
│   └── ProjectLoadTransition.jsx
├── landing/
│   ├── HeroBackground.jsx
│   ├── HeroCopy.jsx
│   └── LaunchButton.jsx
├── BootSequence.jsx
└── Nav.jsx

features/
├── workspace/
│   ├── CameraController.jsx       ← GSAP sweeps + OrbitControls (explore mode only)
│   ├── CameraPositions.js         ← Static room position/target coordinate configs
│   ├── WorkspaceScene.jsx         ← R3F Canvas orchestrator; distributes state flags to rooms
│   ├── WorldLights.jsx            ← Ambient + spot lighting rig for all 6 platforms
│   ├── WorldEnvironment.jsx       ← Stars, grid floor, wire connections, energy particles
│   └── rooms/
│       ├── BrainRoom.jsx          ← Project Brain core; scale/ring/light transitions
│       ├── ArchitectureRoom.jsx   ← Platform + LocalParticles + wireframe build
│       ├── RoutesRoom.jsx         ← Platform + LocalParticles + wireframe build
│       ├── StateRoom.jsx          ← Platform + LocalParticles + wireframe build
│       ├── ApiRoom.jsx            ← Platform + LocalParticles + wireframe build
│       └── DocumentationRoom.jsx  ← Platform + LocalParticles + wireframe build
├── architecture/
├── routes/
├── state-flow/
├── api-flow/
├── documentation/
└── project-brain/

layouts/
├── LandingLayout.jsx
├── HubLayout.jsx               ← Hub ambient wrapper (CursorBlob + Noise)
└── WorkspaceLayout.jsx

lib/
├── projectDetector.js          ← Stack detection foundation (framework, TS, Tailwind, Redux...)
├── gsap.js
├── lenis.js
├── reactflow.js
└── three.js


pages/
├── Landing.jsx
├── ProjectHub.jsx              ← Multi-project management home screen
└── Workspace.jsx

redux/
├── store.js
└── slices/
    ├── hubSlice.js             ← projects[], selectedProjectId, localStorage persistence
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
├── global.css
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
