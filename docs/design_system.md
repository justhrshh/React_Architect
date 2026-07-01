# DESIGN_SYSTEM.md

> Official Visual Identity, Typography, and Motion Standards for **React Architect**

React Architect is built on a high-fidelity visual language. The design system bridges two worlds: an **immersive dark cybernetic void** for spatial code analysis and a **pure premium light-theme console hierarchy** for local project management.

---

## 1. Core Color Palette

### 1.1 The Cyber Void (Deep Mode)
Used in the Three.js 3D space, landing page, and general site framing.

| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `bg-obsidian` | `#06070b` | Base application background; represents deep void space. |
| `accent-cyan` | `#00d4ff` | Primary active energy color; used for active rooms, laser wire flows. |
| `accent-purple`| `#7F56D9` | Secondary active color; used for ZIP files and alternative paths. |
| `ink-faint` | `#2e3347` | Labels, inactive stats, and dark theme blueprint borders. |
| `ink-dim` | `#5a6178` | Description paragraphs and muted header tabs. |

### 1.2 The Project Console (Light Mode)
Used inside the Import Modal, Wizard headers, and configuration surfaces to provide a sharp, clean developer hierarchy.

| Token | Hex Value / Class | Role / Usage |
| :--- | :--- | :--- |
| `bg-white` | `bg-white` | Base surface for elevated cards, active buttons, and input modules. |
| `bg-backdrop` | `bg-neutral-50/65` | Soft off-white backdrop container wrapping lists and wizards. |
| `border-soft` | `border-neutral-200/80` | Card boundaries and input lines. |
| `border-accent`| `border-neutral-250` | Outer structural borders for metadata tags. |
| `text-primary` | `text-neutral-900` / `text-neutral-950` | High-contrast main headings. |
| `text-secondary`| `text-neutral-500` | Explanatory labels and descriptions. |
| `text-muted` | `text-neutral-400` | Small metadata, helper text, and placeholders. |

---

## 2. Typography

We enforce strict visual contrast between futuristic display fonts and technical monospace layouts.

### 2.1 Headings (`font-display`)
* **Font Family**: Inter, Outfit, or Orbitron (for 3D canvas labels).
* **Weights**: `font-[800]` (ExtraBold) or `font-[900]` (Black).
* **Tracking**: `tracking-tightest` (or `letter-spacing: -0.04em`) to create a solid, engineered appearance.
* **Line Heights**: Mapped tightly (`leading-[0.88]` to `leading-none`).

### 2.2 Metadata & Code (`font-mono`)
* **Font Family**: JetBrains Mono.
* **Sizes**: `text-[8px]` to `text-[11px]`.
* **Weights**: `font-medium` or `font-bold` for status states.
* **Transform**: `uppercase` with expanded tracking (`tracking-widestest`) for structured technical tags.

---

## 3. Spatial Elevations & Shadows

Elevation is represented through soft, multi-layered box shadows simulating real-world light projection.

### 3.1 Poster Cards
* **Inactive Card (Flat)**: 
  `box-shadow: 0 15px 35px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.02)`
* **Active Card (Baseline Raised)**: 
  `box-shadow: 0 35px 80px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.04)`
* **Hovered Inactive Card**: 
  `box-shadow: 0 40px 85px rgba(0,0,0,0.35), 0 4px 15px rgba(0,0,0,0.06)`
* **Hovered Active Card (Maximum Pop)**: 
  `box-shadow: 0 55px 110px rgba(0,0,0,0.55), 0 5px 20px rgba(0,0,0,0.08)`

### 3.2 Action Modals
* **Import Option Tiles (At Rest)**: 
  `box-shadow: 0 10px 25px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.01)`
* **Import Option Tiles (Hovered)**: 
  `box-shadow: 0 30px 60px rgba(0,0,0,0.08), 0 5px 15px rgba(0,0,0,0.02)`

---

## 4. Interactive Motion & Animations

All transitions must feel natural, hydraulic, and deliberate.

### 4.1 Reels-Style Snap Scrolling
* **Math**: The `PerspectiveCarousel` uses drag gestures (mouse + touch) integrated at the window level, tracking momentum velocities.
* **Snapping**: If drag velocity exceeds `0.4 px/ms` or drag offset exceeds `30%` of card width, it snaps to the next/prev card using `transform 600ms cubic-bezier(0.16, 1, 0.3, 1)`.

### 4.2 Interactive 3D Tilt (Holographic Parallax)
Active panel elements tilt towards the cursor when hovered:
* **Max rotation angle**: 10 degrees (`rotateX`, `rotateY`).
* **Preserve-3D Layering**: Child elements lift off the base plane at different Z-depths to create a stereoscopic effect:
  - **Icons**: `translateZ(20px)`
  - **Titles / Text**: `translateZ(12px)`
  - **Arrow Indicators**: `translateZ(25px)`

### 4.3 Cinematic 3D Modal Entrance
Wizards and modals enter the screen with a perspective sweep animation:
* **Keyframes (`modal3dEnter`)**:
  - `0%`: `opacity: 0; transform: perspective(1400px) rotateX(12deg) translateY(35px) translateZ(-100px) scale(0.95);`
  - `100%`: `opacity: 1; transform: perspective(1400px) rotateX(0deg) translateY(0) translateZ(0) scale(1);`
* **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` over `550ms`.

### 4.4 Magnetic Button Snapping
Interactive action buttons drag slightly toward the cursor on hover:
* **Math**: Translates coordinates by `dx * 0.18` and `dy * 0.22` relative to the button center.
* **Transition**: Reset transition uses `transform 350ms cubic-bezier(0.2, 0.7, 0.1, 1)` to bounce smoothly back to center.

### 4.5 Cinematic 3D Portal Transition (White Light-Flash Continuity)
Redirection into standalone 2D tool pages (like `/architecture`) is bridged through a high-contrast white light portal:
* **Construct Sequence**: Implosion of 8 white vertex spheres collapses the platform's rotating wireframe and forms a vertical white torus ring & energy disk.
* **Zoop Zoom-past**: The portal group position moves forward past the camera viewport (`z: 0.05 → z: 8.0` over `650ms`, `ease: power3.in`) while the energy disk scales to `18x` to cover the screen.
* **Mount Fade-in**: The destination page mounts with a `gsap.fromTo` background animation fading from solid white (`#ffffff`) back to obsidian `#06070b` over `800ms` with `ease: power2.out`. This creates seamless visual continuity across routes.
