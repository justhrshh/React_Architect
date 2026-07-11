import assert from "node:assert/strict";
import test from "node:test";

import { parseFile } from "../src/engines/parser/parser.js";
import { buildFileIndex, resolveModulePath } from "../src/engines/graph/importResolver.js";
import { buildKnowledgeGraph } from "../src/engines/graph/buildKnowledgeGraph.js";
import { runAnalysis, analyzeImpact } from "../src/engines/analysis/index.js";

test("parseFile extracts components, hooks, routes, redux, and API endpoints", () => {
  const code = `
    import React, { useEffect, useState } from "react";
    import { createSlice } from "@reduxjs/toolkit";
    import { Route } from "react-router-dom";

    export const userSlice = createSlice({
      name: "user",
      initialState: { currentUser: null },
      reducers: {}
    });

    export function Dashboard({ title }) {
      const [ready, setReady] = useState(false);
      useEffect(() => {
        fetch("/api/users");
        setReady(true);
      }, []);
      return <Route path="/dashboard" element={<section>{ready && title}</section>} />;
    }
  `;

  const summary = parseFile(code, "src/pages/Dashboard.jsx");

  const dashboard = summary.components.find(component => component.name === "Dashboard");

  assert.equal(Boolean(dashboard), true);
  assert.equal(dashboard.hooks.includes("useState"), true);
  assert.equal(summary.redux.some(slice => slice.name === "user"), true);
  assert.equal(summary.routes.some(route => route.path === "/dashboard"), true);
  assert.equal(summary.api.some(api => api.path === "/api/users"), true);
});

test("resolveModulePath handles relative, extensionless, and directory imports", () => {
  const fileIndex = buildFileIndex([
    "src/App.jsx",
    "src/components/Button.jsx",
    "src/components/forms/index.js",
  ]);
  const aliasMap = new Map();

  assert.equal(
    resolveModulePath("src/App.jsx", "./components/Button", fileIndex, aliasMap),
    "src/components/Button.jsx"
  );
  assert.equal(
    resolveModulePath("src/App.jsx", "./components/forms", fileIndex, aliasMap),
    "src/components/forms/index.js"
  );
});

test("buildKnowledgeGraph creates core nodes and relationships", () => {
  const files = [
    {
      name: "App.jsx",
      path: "src/App.jsx",
      content: `
        import Dashboard from "./pages/Dashboard";
        export default function App() {
          return <Dashboard />;
        }
      `,
    },
    {
      name: "Dashboard.jsx",
      path: "src/pages/Dashboard.jsx",
      content: `
        export default function Dashboard() {
          return <main>Dashboard</main>;
        }
      `,
    },
  ];

  const graph = buildKnowledgeGraph(files, { id: "test", name: "Test App", hasRouter: false, hasRedux: false });

  assert.equal(graph.nodes.some(node => node.id === "component:src/App.jsx:App"), true);
  assert.equal(graph.nodes.some(node => node.id === "component:src/pages/Dashboard.jsx:Dashboard"), true);
  assert.equal(
    graph.edges.some(edge =>
      edge.type === "RENDERS" &&
      edge.source === "component:src/App.jsx:App" &&
      edge.target === "component:src/pages/Dashboard.jsx:Dashboard"
    ),
    true
  );
});

test("analysis engine returns project metrics and on-demand impact", () => {
  const graph = buildKnowledgeGraph([
    {
      name: "App.jsx",
      path: "src/App.jsx",
      content: `
        import Dashboard from "./pages/Dashboard";
        export default function App() {
          return <Dashboard />;
        }
      `,
    },
    {
      name: "Dashboard.jsx",
      path: "src/pages/Dashboard.jsx",
      content: `
        export default function Dashboard() {
          return <main>Dashboard</main>;
        }
      `,
    },
  ], { id: "test", name: "Test App", hasRouter: false, hasRedux: false });

  const analysis = runAnalysis(graph);
  const impact = analyzeImpact(graph, "component:src/pages/Dashboard.jsx:Dashboard");

  assert.equal(typeof analysis.projectDNA.componentCount, "number");
  assert.equal(typeof analysis.architectureHealth.score, "number");
  assert.equal(impact.target.name, "Dashboard");
  assert.equal(impact.direct.usedBy.some(node => node.name === "App"), true);
  assert.equal(["low", "medium", "high"].includes(impact.riskLevel), true);
});
