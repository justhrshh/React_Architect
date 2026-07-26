/**
 * blueprintLaneConfig.js
 *
 * Shared, data-only configuration for Blueprint Flow's semantic lanes (architectural columns).
 *
 * Ownership: this module is intentionally neutral. It is consumed by:
 *   - engines/graph/blueprintGraphBuilder.js  (assigns node.laneId — classification)
 *   - engines/layout/blueprintLayoutEngine.js (positions lanes as columns — layout)
 *   - components/architecture/FlowDiagram.jsx (renders lane banners/colors — presentation)
 *
 * It contains no logic, only the ordered lane definitions. Keeping it separate from both the
 * builder and the layout engine avoids a circular/ownership dependency between them.
 *
 * Lane order below defines left-to-right column order in Blueprint Flow:
 * 0. Entry            : main.jsx, App.jsx, server.js, index.js, _app.jsx
 * 1. Routing          : React Router <Routes>/<Route>, Express Router
 * 2. Pages            : Page-level components
 * 3. Components       : UI components & layouts
 * 4. Hooks & State    : Custom hooks, Contexts, Redux Slices
 * 5. API Clients      : Frontend fetch/axios clients & endpoints
 * 6. Backend Routes   : Express routes & Middleware
 * 7. Business Logic   : Express Controllers & Services
 * 8. Models           : Data Models (Mongoose/Prisma/Sequelize)
 * 9. Database         : Logical Database Storage Nodes
 */

export const LANE_CONFIG = [
  { id: "entry",          label: "Application Entry", color: "#6366F1", bg: "#EEF2FF" },
  { id: "routing",        label: "Routing Layer",     color: "#06B6D4", bg: "#ECFEFF" },
  { id: "pages",          label: "Pages & Views",     color: "#EC4899", bg: "#FDF2F8" },
  { id: "components",     label: "UI Components",     color: "#8B5CF6", bg: "#F5F3FF" },
  { id: "hooks_state",    label: "Hooks & State",     color: "#F97316", bg: "#FFF7ED" },
  { id: "api_clients",    label: "API Clients",       color: "#EF4444", bg: "#FEF2F2" },
  { id: "backend_routes", label: "Backend Routes",    color: "#D97706", bg: "#FEF3C7" },
  { id: "business_logic", label: "Controllers & Services", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "models",         label: "Data Models",       color: "#EA580C", bg: "#FFEDD5" },
  { id: "database",       label: "Database Storage",  color: "#10B981", bg: "#D1FAE5" },
];