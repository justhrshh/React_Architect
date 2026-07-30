import test from "node:test";
import assert from "node:assert/strict";

import { classifyEdgeSemantic } from "../src/components/architecture/FlowDiagram.jsx";

test("Backend & Request Lifecycle Edge Type Semantics", () => {
  // 1. HANDLED_BY
  const handledBy = classifyEdgeSemantic({ type: "HANDLED_BY" });
  assert.equal(handledBy.color, "#7C3AED");
  assert.equal(handledBy.label, "handler");

  // 2. AUTHORIZES
  const authorizes = classifyEdgeSemantic({ type: "AUTHORIZES" });
  assert.equal(authorizes.color, "#0284C7");
  assert.equal(authorizes.label, "auth");

  // 3. VALIDATES
  const validates = classifyEdgeSemantic({ type: "VALIDATES" });
  assert.equal(validates.color, "#0284C7");
  assert.equal(validates.label, "validates");

  // 4. CALLS_SERVICE
  const callsService = classifyEdgeSemantic({ type: "CALLS_SERVICE" });
  assert.equal(callsService.color, "#DB2777");
  assert.equal(callsService.label, "service");

  // 5. USES_MODEL
  const usesModel = classifyEdgeSemantic({ type: "USES_MODEL" });
  assert.equal(usesModel.color, "#EA580C");
  assert.equal(usesModel.label, "model");

  // 6. ACCESSES_DB
  const accessesDb = classifyEdgeSemantic({ type: "ACCESSES_DB" });
  assert.equal(accessesDb.color, "#10B981");
  assert.equal(accessesDb.label, "database");
});

test("Component Hierarchy & Frontend Edge Type Semantics", () => {
  // RENDERS
  const renders = classifyEdgeSemantic({ type: "RENDERS" });
  assert.equal(renders.color, "#A855F7");
  assert.equal(renders.label, "renders");

  // ROUTE_RENDERS
  const routeRenders = classifyEdgeSemantic({ type: "ROUTE_RENDERS" });
  assert.equal(routeRenders.color, "#10B981");
  assert.equal(routeRenders.label, "renders page");

  // IMPORTS
  const imports = classifyEdgeSemantic({ type: "IMPORTS" });
  assert.equal(imports.color, "#60A5FA");
  assert.equal(imports.label, "imports");
});

test("Backward Compatibility for Core Data Flow Broad Categories", () => {
  // READS
  const reads = classifyEdgeSemantic({ type: "READS" });
  assert.equal(reads.category, "READS");
  assert.equal(reads.color, "#10B981");
  assert.equal(reads.label, "reads state");

  // WRITES
  const writes = classifyEdgeSemantic({ type: "WRITES" });
  assert.equal(writes.category, "WRITES");
  assert.equal(writes.color, "#EF4444");
  assert.equal(writes.label, "dispatches / writes");

  // CALLS_API
  const callsApi = classifyEdgeSemantic({ type: "CALLS_API" });
  assert.equal(callsApi.category, "CALLS_API");
  assert.equal(callsApi.color, "#F59E0B");

  // READS_AND_WRITES
  const readsWrites = classifyEdgeSemantic({ type: "READS_AND_WRITES" });
  assert.equal(readsWrites.category, "READS_AND_WRITES");
  assert.equal(readsWrites.color, "#8B5CF6");
});
