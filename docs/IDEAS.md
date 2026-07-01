# React Architect Future Feature Ideas

Potential feature ideas for next versions of React Architect.

---

## 1. Live Code Synced Refactoring
- **Idea**: Selecting component nodes exposes quick refactoring operations (e.g. rename component, extract helper function).
- **Execution**: Edits modify local filesystem files in real-time, refreshing the active AST tree.

## 2. Graphic Exporters
- **Idea**: Export interactive flowcharts to vector files (`PNG`, `SVG`, or `PDF`) for presentation slideshows.

## 3. Lint & Pattern Warnings
- **Idea**: Use Babel AST logic to detect common react lint failures:
  - Missing prop validation.
  - Large component files exceeding 500 lines of code.
  - Overuse of local context state.

## 4. Multi-Framework Adapters
- **Idea**: Extend parsing helpers to map Vue templates (`.vue`) and Svelte wrappers (`.svelte`).
