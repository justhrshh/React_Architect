import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import FlowDiagram from "../src/components/architecture/FlowDiagram.jsx";
import { getGraphDataForProject } from "../src/lib/analysis/mockDataGenerator.js";

test("FlowDiagram component mounting & rendering directly from raw knowledgeGraph prop", () => {
  const sampleProject = { framework: "Next.js", hasTypeScript: true, hasRouter: true };
  const rawKG = getGraphDataForProject(sampleProject);

  assert.ok(Array.isArray(rawKG.nodes), "Knowledge graph must contain nodes");
  assert.ok(Array.isArray(rawKG.edges), "Knowledge graph must contain edges");

  // Render <FlowDiagram knowledgeGraph={rawKG} /> with NO blueprintEdges or layoutedNodes props supplied
  let html = "";
  assert.doesNotThrow(() => {
    html = renderToString(React.createElement(FlowDiagram, { knowledgeGraph: rawKG }));
  }, "FlowDiagram component must mount without throwing buildBlueprintGraph undefined error");

  assert.ok(html.length > 0, "Rendered HTML string must not be empty");

  // Verify node cards appear in rendered HTML output
  assert.ok(
    html.includes("RootLayout") || html.includes("Header") || html.includes("DashboardPage"),
    "Rendered HTML output must contain node cards from raw knowledgeGraph"
  );
});
