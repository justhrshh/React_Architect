# React Architect Features

React Architect provides a multi-dimensional inspection suite composed of five specialized developer studios.

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
