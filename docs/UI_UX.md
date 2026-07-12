# Workspace UI/UX Design Specifications

React Architect's Workspace acts as a central briefed briefing room where developers inspect project health statistics before transitioning into dedicated investigation studios.

---

## 1. Interaction Paradigm: The Briefing Room

Instead of navigating folder directories or landing on raw workspaces instantly:
1. The developer imports a project folder or archive.
2. The core AST engine scans and analyses the codebase structure.
3. The developer choice-gates their target studio via domain-briefing celestial nodes.
4. The Workspace presents a high-fidelity briefing HUD summarizing dead code, redux consumers, circular dependencies, and API coverage.

---

## 2. Layout Geometry & Visual Hierarchy

* **Asymmetric Grid Composition**: The static Core is offset left (`coreCX = vw * 0.38`, `coreCY = vh * 0.5`) to establish horizontal balance with the floating HUD panel on the right (`right: 80`, `top: 50%`, width `380px`).
* **Dynamic Orbit Radius**: The domain orbit radius (`ORBIT_R`) dynamically scales between `260px` and `310px` based on screen width to prevent boundary collision.
* **Enlarged Celestial Bodies**: Circular buttons represent domains as dominant bodies (`44px` outer progress ring, `17px` score indicator radius, `13px` active center dot, `11px` typography).
* **Concentric Alignment**: Selection rotations spin the complete container, placing the selected node at the primary `-90deg` top-center position. Counter-rotations on child elements (`rotate: -orbitRotation`) keep labels perfectly upright as the system spins.

---

## 3. Project DNA Onboarding Initialization Sequence

When the developer first enters the Workspace after importing a project, they land on a cinematic Project DNA onboarding screen. This is the **only** Project DNA view — there is no second Project DNA page later.

### Phase 0: Intro (Idle)
* **Layout**: The Project Brain renders at `1.45x` scale, centered in the viewport (`vw/2`, `vh/2`).
* **Info Cards**: 4 diagonal glassmorphic panels display progressive disclosure metrics (Project Scale, Project Health, Technology, Analysis).
* **Hidden Elements**: The workspace header ("Return to Hub", project name), system status, live timestamp, orbit rings, and celestial nodes are all hidden.

### Phase 1: Charging (~900ms)
* **Trigger**: User clicks "Initialize Workspace Exploration".
* **Super Glow**: A radial burst element (`inset: -80px`) with a `radial-gradient` using the project `displayColor` fades in and pulses its scale (`1.0 → 1.35 → 1.15`) over `900ms`.
* **Halo Expansion**: The outer glow halo intensifies to a triple-layer boxShadow (`200px + 400px + 600px` spread).
* **Core Scale**: The Brain scales up to `1.55x`.
* **Info Cards**: Fade out as their information dissolves into the Brain.

### Phase 2: Shrinking (~1000ms)
* **Trigger**: Charging completes.
* **Physics**: The Brain spring-animates (`stiffness: 80, damping: 15`) down to `1.0x` and slides to its off-center workspace position (`coreCX`, `coreCY`).
* **Residual Glow**: Halo decays to a moderate `120px + 250px` spread.

### Phase 3: Revealing (~1200ms)
* **Trigger**: Shrinking completes.
* **Materialization**: Orbit rings, celestial domain nodes, and HUD elements (header, status, timestamp) stagger-scale into the viewport.

### Phase 4: Ready
* **State**: Full workspace is interactive. All HUD elements are visible. Domain nodes are clickable.

---

## 4. Signature Portal Transition Sequence

When the developer triggers a contextual Studio action (e.g. `Investigate Navigation`), the system executes a 5-phase physical transition over `0.97 seconds`:

### Phase 1: Core Acknowledgement (~120ms)
* **Trigger**: Accepts input.
* **Feedback**: The Core executes a subtle physical pulse (scales to `1.08`), increases its border glow shadow, and pauses/stiffens the orbit rotation.

### Phase 2: Orbit Acceleration (~350ms)
* **Trigger**: Momentum build.
* **Feedback**: The outer orbital container accelerates its rotation speed (spins `+180deg` using an ease-in Framer Motion transition). Node progress circles blur (`blur(6px)`) and labels fade to `0` opacity to form abstract light trails.

### Phase 3: Core Energy Charge (~250ms)
* **Trigger**: Energy collection.
* **Feedback**: All 5 connection lines light up, streaming high-speed data flow dots into the Core. Core shadow glow expands to a massive radius.

### Phase 4: Core Expansion (~250ms)
* **Trigger**: Portal state.
* **Feedback**: The Core scales up to `30x` to consume the entire screen view. The HUD text card, project header tabs, and live status indicator cards fade to `0` opacity.

### Phase 5: Arrival
* **Trigger**: Seamless transition.
* **Feedback**: The viewport crossfades into the selected Studio as the router page mounts.

---

## 5. HUD Visibility Gating

The workspace HUD elements follow strict visibility rules tied to the onboarding state machine:

| Element | Visible During Onboarding | Visible During Workspace |
|---|---|---|
| Project Brain Core | ✅ (centered, `1.45x`) | ✅ (off-center, `1.0x`) |
| Info Cards (Scale/Health/Tech/Analysis) | ✅ | ❌ |
| Back Button (ArrowLeft) | ✅ | ❌ |
| "Initialize Workspace" CTA | ✅ | ❌ |
| Workspace Header (Return to Hub / Project Name) | ❌ | ✅ |
| System Status (Analysis Ready) | ❌ | ✅ |
| Live Timestamp | ❌ | ✅ |
| Orbit Rings & Celestial Nodes | ❌ | ✅ |
| Investigation Brief Panel | ❌ | ✅ |

