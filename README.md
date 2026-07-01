# React Architect

> **Don't just write React. Architect it.**

React Architect is an immersive visual platform designed for exploring, analyzing, and documenting React applications in real time. By connecting a dynamic AST analysis pipeline with interactive 3D spatial environments and React Flow diagrams, React Architect turns folder structure exploration into interactive, relationship-driven visual maps.

---

## Core Architecture & Spatial Void

React Architect is built as a split decoupled workspace:
1. **Stand-alone Command Center (World Hub)**: Manage import handlers, select templates, and configure directory structures in a cinematic 3D R3F (React Three Fiber) void.
2. **Project Brain**: An interactive 3D command platform representing your code features. Selecting a tool platform triggers a collapse-and-implode vertex particle transition, zooping through the torus gateway into your studio explorer.
3. **Workspace Explorer Studios**: Five specialized, light-themed engineering studios designed to break down and inspect different layers of your application.

---

## The Five Explorer Studios

### 1. Component Architecture Studio (`/architecture`)
- **Visualizes**: Component Nesting & Parent-Child Trees.
- **Engine**: Parses files using a recursive Babel AST crawler to identify element parameters, imports, exports, and children.
- **Controls**: Zoom controls, centering, and app-level collapse toggle to hide lists and inspectors for a full-size canvas view.

### 2. Route Studio (`/routes`)
- **Visualizes**: URL Endpoint & Navigation Mappings.
- **Engine**: Resolves Next.js folder routing hierarchies (`app/**/page.tsx`) and React Router schemas (JSX `<Route>` and `createBrowserRouter` objects).
- **Inspector**: Exposes parameters, dynamic query details, and security state definitions.

### 3. State Studio (`/state`)
- **Visualizes**: Store configurations and Redux/Context Slices.
- **Engine**: Scans for slice managers (e.g., Redux toolkit, selectors, and dispatch hooks).
- **Dependency Paths**: Highlights connections showing which slices feed state data directly to which React components.

### 4. API Studio (`/api`)
- **Visualizes**: Network Services and HTTP Request Endpoints.
- **Engine**: Identifies Axios/Fetch setups, GET/POST route methods, and links them to the exact component consumer that initiates the request.

### 5. Documentation Studio (`/docs`)
- **Visualizes**: Project Guides & Markdown Files.
- **Engine**: Indices and parses `.md` files dynamically, rendering them inside a clean documentation panel supporting stylized code-blocks, lists, quotes, and headers.

---

## Technical Stack
- **Core Framework**: React 19 + Vite 8
- **State Management**: Redux Toolkit
- **3D Spatial Graphics**: React Three Fiber, Three.js, GSAP (GreenSock)
- **Flow Chart Engine**: `@xyflow/react` (React Flow)
- **Parser Core**: `@babel/parser`

---

## Installation & Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Run local dev server**:
   ```bash
   npm run dev
   ```

3. **Build production bundle**:
   ```bash
   npm run build
   ```
