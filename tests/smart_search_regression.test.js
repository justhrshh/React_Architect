import test from "node:test";
import assert from "node:assert/strict";

// Mock browser environment globals for Node test environment
let mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; }
};
globalThis.import = globalThis.import || {};
if (!globalThis.import.meta) globalThis.import.meta = {};
if (!globalThis.import.meta.env) globalThis.import.meta.env = { DEV: true, VITE_GEMINI_API_KEY: "" };

import { GraphQueryEngine } from "../src/engines/query/GraphQueryEngine.js";
import { resolveEntity } from "../src/engines/query/aiQueryAdapter.js";
import { resolveTemplate } from "../src/engines/templates/index.js";
import { getGraphDataForProject } from "../src/lib/analysis/mockDataGenerator.js";

// Construct test Knowledge Graph from Next.js sample project (including collision nodes)
const sampleProject = { framework: "Next.js", hasTypeScript: true, hasRouter: true, hasRedux: true };
const rawGraph = getGraphDataForProject(sampleProject);

const engine = new GraphQueryEngine({
  nodes: rawGraph.nodes.map(n => ({
    id: n.id,
    name: n.name,
    kind: n.type || "component",
    subtype: n.type,
    file: n.filePath,
    loc: { start: 1, end: 50 },
    metadata: { ...n }
  })),
  edges: rawGraph.edges.map(e => ({
    id: `e:${e.from}->${e.to}`,
    source: e.from,
    target: e.to,
    type: "RENDERS"
  }))
});

test("Phase 2 & 6: N-Gram Scanning & Multi-Candidate Collision", async () => {
  // Query "How is Dashboard composed?" collides between component "Dashboard" (0.99) and page "DashboardPage" (0.96)
  const resColl = resolveEntity("How is Dashboard composed?", engine);
  assert.equal(resColl.isAmbiguous, true, "Colliding query 'Dashboard' must trigger ambiguity");
  assert.ok(resColl.candidates.length >= 2, "Must return colliding candidates Dashboard & DashboardPage");

  const resHeader = resolveEntity("Header", engine);
  assert.equal(resHeader.primaryEntity?.name, "Header");
  assert.ok(resHeader.primaryEntity?.confidence >= 0.90);
  assert.equal(resHeader.isAmbiguous, false);

  const resFoo = resolveEntity("How is FooBarBaz composed?", engine);
  assert.equal(resFoo.primaryEntity, null);
});

test("Phase 3: Levenshtein Distance Fuzzy Match Fallback", async () => {
  const resTypo = resolveEntity("dashbord", engine);
  assert.ok(resTypo.isAmbiguous || resTypo.primaryEntity, "Fuzzy match must return candidates");
  assert.ok(resTypo.candidates[0]?.confidence <= 0.65, "Fuzzy match confidence must be capped at 0.65");

  const resExact = resolveEntity("Header", engine);
  assert.ok(resExact.primaryEntity.confidence >= 0.90, "Exact match must not be overridden by fuzzy match");

  const resGarbage = resolveEntity("xkqjzwplo", engine);
  assert.equal(resGarbage.primaryEntity, null);
});

test("Phase 4: Ambiguity & Confidence Threshold Hardening", async () => {
  const resCard = resolveEntity("Card", engine);
  assert.equal(resCard.isAmbiguous, true, "Query 'Card' must trigger isAmbiguous: true");
  assert.equal(resCard.candidates[0]?.name, "MetricCards");
});

test("Phase 5: Focus Term Grounding & Safety Check", async () => {
  const resHeaderTemplate = await resolveTemplate("Header", engine);
  assert.equal(resHeaderTemplate.focusTerm, "Header", "focusTerm must ground to real node name");
  assert.equal(resHeaderTemplate.resolutionFailed, false);

  const resFailed = await resolveTemplate("Explain state in FooBarBazWidget", engine);
  assert.equal(resFailed.focusTerm, null, "Non-existent component must set focusTerm to null");
  assert.equal(resFailed.resolutionFailed, true);

  const resThanks = await resolveTemplate("thanks", engine);
  assert.equal(resThanks.isArchitectural, false, "Conversational queries must return isArchitectural: false");
});

test("Phase 6: Ambiguity Resolution Selection, Intended Template Preservation & Exact ID Resolution", async () => {
  const queryStr = "How is Dashboard composed?";
  const initialRes = await resolveTemplate(queryStr, engine);

  assert.equal(initialRes.isAmbiguous, true);
  assert.equal(initialRes.templateId, null, "Ambiguous query halts pipeline with templateId: null");
  assert.equal(initialRes.intendedTemplateId, "component-hierarchy", "Must preserve classified intendedTemplateId 'component-hierarchy'");

  // Simulate UI candidate click on candidate object (AdminDashboard, id: page-admin-dashboard)
  const thirdCandidate = initialRes.candidates.find(c => c.id === "page-admin-dashboard");
  assert.ok(thirdCandidate, "Candidate object with id page-admin-dashboard must exist");

  // UI onSelectCandidate handler receives candidate object and resolves template with preserved intendedTemplateId & cand.id
  let pendingTemplateId = initialRes.intendedTemplateId || "execution-flow";
  const handleSelectCandidate = async (cand) => {
    const targetTemplateId = pendingTemplateId || "execution-flow";
    pendingTemplateId = null;
    const resolved = await resolveTemplate(cand.id, engine);
    return {
      ...resolved,
      templateId: targetTemplateId
    };
  };

  const resumedRes = await handleSelectCandidate(thirdCandidate);
  assert.equal(resumedRes.templateId, "component-hierarchy", "Resumed pipeline MUST preserve original intended template 'component-hierarchy', not default to 'execution-flow'");
  assert.equal(resumedRes.focusTerm, "AdminDashboard", "Resumed focusTerm must be AdminDashboard");

  // Verify Stage 1 entity resolution resolves candidate object's exact ID directly
  const stage1Res = resolveEntity(thirdCandidate.id, engine);
  assert.equal(stage1Res.primaryEntity?.id, "page-admin-dashboard", "Entity resolution by exact node ID must resolve id page-admin-dashboard");
  assert.equal(stage1Res.primaryEntity?.confidence, 1.00, "Exact node ID lookup must return 100% confidence");
});
