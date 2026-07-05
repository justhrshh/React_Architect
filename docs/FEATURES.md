# React Architect Features

React Architect provides a multi-dimensional inspection suite powered by a centralized Knowledge Graph and composed of five specialized developer studios.

## 0. Centralized Knowledge Graph Engine
The single source of truth database representing your project DNA:
* **Framework-Agnostic Schema**: Normalized generic node structure mapping ID, Kind, Subtype, Name, and Metadata.
* **Path Alias Discovery**: Scans `tsconfig.json`/`jsconfig.json`/`vite.config.js` to build dynamic mappings, resolving nested path aliases.
* **O(1) Import Resolution**: Employs a pre-built O(1) file index to resolve relative, extension-less, directory index files, and named barrel re-exports recursively.
* **Standardized Relationship Edges**: Unified dependency tracking using relationship descriptors (`IMPORTS`, `RENDERS`, `USES_HOOK`, `USES_CONTEXT`, `USES_API`, `STATE_CONSUMER`, `LAZY_LOADS`).
* **Structured Validator**: Integrated analysis scoring for circular rendering cycles, duplicate IDs, orphaned nodes, parser errors, and code metrics.
* **Decoupled Layout Engine**: Hierarchical position solver computing visual coordinate properties separate from client adapters.

---

## 0.5 Analysis Engine
A reusable intelligence layer sitting directly above the Knowledge Graph. It never touches source files, Babel, or React Flow — it only ever reads the `{ nodes, edges }` graph, which means it automatically gets smarter as the parser improves without ever being rewritten.

* **Project DNA**: Framework, language, router, state library, build tool, component/page/hook/context/route/API counts, largest component, average component size, average dependency count, and an estimated complexity tier — all derived live from the graph.
* **Architecture Health**: A pluggable, rule-based scorer (large components, circular dependencies, dead routes, duplicate hooks, orphan components, unused components, excessive nesting, broken imports, missing providers). Each rule is independent and contributes its own deduction, so the score always explains *why* it exists.
* **Dependency Heatmap**: Incoming/outgoing degree, render depth, centrality, and usage frequency for every node, plus a ranked list of the graph's most critical nodes.
* **Dead Code Detection**: Unused components, low-reuse hooks, unresolved routes, unconsumed contexts, uncalled API endpoints, and orphan files.
* **Complexity**: Per-component complexity scoring, project-wide complexity, average/max nesting depth, the largest render subtree, and file-level dependency depth.
* **Impact Analysis**: Given any node, returns every component, route, API, and state slice structurally connected to it, plus a blast-radius count — the foundation for safe Live Refactoring and the future Refactor Simulator.

---

## 1. Component Architecture Studio
Understand component organization and composition instantly.
* **Component Nesting**: Charts parent-child boundaries dynamically using AST analysis.
* **Component Inspector**: Click any component node to inspect:
  - Destructured Props
  - Hooks used
  - File locations
  - Custom metrics (Lines of code, complexity indices)
* **Collapse View**: Hides sidebars with a single click for a clutter-free chart view.

---

## 2. Route Studio
Trace navigation mappings, paths, layouts, and endpoints.
* **Router Schema Resolution**: Parses next-generation Next.js app folder schemes and standard React Router declarations (JSX or object-based).
* **Properties Inspector**: Spot dynamic params (e.g. `:id`) and page access security modes (Public vs. Protected).

---

## 3. State Studio
Trace how application state is managed and consumed across your project.
* **Slices & Providers**: Displays Redux slices, variables, keys, and Context Providers.
* **Consumer Highlighting**: Connects state nodes to the specific React components that call state variables using selectors.

---

## 4. API Studio
Map every HTTP gateway service and client transaction.
* **Endpoint Services**: Maps core service configurations (e.g., `axiosInstance`) and API route definitions.
* **Action Connectors**: Links network operations directly to components that dispatch requests.

---

## 5. Documentation Studio
Keep your guide documents and codebase walkthroughs in sync.
* **Markdown Viewer**: Discovers and indexes markdown documents (`.md`), rendering them inside a clean, light-themed documentation reader.
* **Element Styling**: Renders headers, lists, code snippets, blockquotes, and dividers with custom styling.