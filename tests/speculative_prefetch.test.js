import test from "node:test";
import assert from "node:assert/strict";

// Polyfill localStorage for Node test runner
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
  configurable: true,
  writable: true
});

import { speculativeClassify, getSpeculativeResult } from "../src/engines/templates/templateResolver.js";

test("speculativeClassify and getSpeculativeResult API contract", async (t) => {
  await t.test("getSpeculativeResult returns null for unknown/unregistered queryId", () => {
    const res = getSpeculativeResult("qid-unknown-999");
    assert.equal(res, null);
  });

  await t.test("speculativeClassify without API key stores null and returns resolvedBy error", async () => {
    const res = await speculativeClassify("qid-nokey-123", "How is Dashboard composed?", null);
    assert.equal(res.queryId, "qid-nokey-123");
    assert.equal(res.templateId, null);
    assert.equal(res.resolvedBy, "error");

    const cached = getSpeculativeResult("qid-nokey-123");
    assert.notEqual(cached, null);
    assert.equal(cached.templateId, null);
  });

  await t.test("getSpeculativeResult gracefully allows fallback to local pendingTemplateId", () => {
    const result = getSpeculativeResult("qid-never-seen");
    const pendingTemplateId = "component-hierarchy";
    const finalTemplateId = (result && result.templateId) ? result.templateId : pendingTemplateId;
    assert.equal(finalTemplateId, "component-hierarchy");
  });
});
