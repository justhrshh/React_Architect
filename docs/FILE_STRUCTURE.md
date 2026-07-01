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

components/
├── ambient/
│   ├── CursorBlob.jsx
│   └── Noise.jsx
├── hub/
│   ├── ImportProjectModal.jsx      ← Smart import: Local Folder, ZIP, GitHub (coming soon)
│   ├── CreateProjectWizard.jsx     ← 8-step fullscreen creation wizard
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
│       ├── Portal.jsx             ← Reusable 3D Portal Gateway (white node-scattering implosion)
│       ├── BrainRoom.jsx          ← Holographic operating table console; concentric division lines, crosshairs, dynamic scale/glow transitions
│       ├── ArchitectureRoom.jsx   ← Platform + LocalParticles + wireframe build + Portal Integration
│       ├── RoutesRoom.jsx         ← Platform + LocalParticles + wireframe build + Portal Integration
│       ├── StateRoom.jsx          ← Platform + LocalParticles + wireframe build + Portal Integration
│       ├── ApiRoom.jsx            ← Platform + LocalParticles + wireframe build + Portal Integration
│       └── DocumentationRoom.jsx  ← Platform + LocalParticles + wireframe build + Portal Integration
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
├── projectDetector.js          ← Stack detection foundation (framework, TS, Tailwind, Redux...)
├── gsap.js
├── lenis.js
├── reactflow.js
└── three.js


pages/
├── Landing.jsx
├── Hub.jsx                     ← Decoupled project command console & drag carousel
├── Workspace.jsx               ← Decoupled spatial 3D room operating surface
├── Architecture.jsx            ← Decoupled Architecture Studio Page (AST Node Tree)
├── Routes.jsx                  ← Decoupled Route Studio Page (Router Map)
├── StateFlow.jsx               ← Decoupled State Studio Page (Store Flow)
├── ApiFlow.jsx                 ← Decoupled API Studio Page (Endpoints Graph)
└── Documentation.jsx           ← Decoupled Documentation Studio Page (Markdown View)

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
