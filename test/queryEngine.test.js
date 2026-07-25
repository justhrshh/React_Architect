import assert from "node:assert/strict";
import test from "node:test";

import { buildKnowledgeGraph } from "../src/engines/graph/buildKnowledgeGraph.js";
import { createQueryEngine } from "../src/engines/query/index.js";

function createTestGraph() {
  const files = [
    {
      name: "package.json",
      path: "package.json",
      content: JSON.stringify({ dependencies: { express: "^4.18.2" } }),
      isConfig: true,
    },
    {
      name: "server.js",
      path: "src/server.js",
      content: `
        const express = require('express');
        const app = express();
        app.use(verifyToken);
        app.get('/api/users', UserController.getUsers);
      `,
    },
    {
      name: "userController.js",
      path: "src/controllers/userController.js",
      content: `
        export class UserController {
          static async getUsers(req, res) {
            const users = await UserService.findUsers();
            res.json(users);
          }
        }
      `,
    },
    {
      name: "userService.js",
      path: "src/services/userService.js",
      content: `
        export class UserService {
          static async findUsers() {
            return await UserModel.find();
          }
        }
      `,
    },
    {
      name: "userModel.js",
      path: "src/models/userModel.js",
      content: `export const UserModel = {};`,
    },
  ];

  return buildKnowledgeGraph(files, { name: "Test Express App" });
}

test("GraphQueryEngine builds fast indexes and exposes core node queries", () => {
  const graph = createTestGraph();
  const engine = createQueryEngine(graph);

  const routes = engine.findRoutes();
  const controllers = engine.findControllers();
  const services = engine.findServices();
  const models = engine.findModels();
  const middleware = engine.findMiddleware();

  assert.equal(routes.length >= 1, true);
  assert.equal(controllers.length >= 1, true);
  assert.equal(services.length >= 1, true);
  assert.equal(models.length >= 1, true);
  assert.equal(middleware.length >= 1, true);

  const foundNode = engine.findNode(routes[0].id);
  assert.equal(foundNode.id, routes[0].id);

  const searchResults = engine.search("UserController");
  assert.equal(searchResults.some((n) => n.name.includes("UserController")), true);
});

test("GraphQueryEngine executes graph traversal (path, ancestors, descendants, orphans)", () => {
  const graph = createTestGraph();
  const engine = createQueryEngine(graph);

  const routeNode = engine.findRoutes()[0];
  const controllerNode = engine.findControllers().find((c) => c.name.includes("UserController"));
  const serviceNode = engine.findServices()[0];

  assert.equal(Boolean(routeNode), true);
  assert.equal(Boolean(controllerNode), true);

  // Traversal: Route -> Controller -> Service -> Model
  const path = engine.findPath(routeNode.id, controllerNode.id);
  assert.equal(path.length, 2);
  assert.equal(path[0].id, routeNode.id);
  assert.equal(path[1].id, controllerNode.id);

  const ancestors = engine.findAncestors(routeNode.id);
  assert.equal(ancestors.some((n) => n.kind === "controller"), true);

  const dependents = engine.findDependents(controllerNode.id);
  assert.equal(dependents.some((n) => n.kind === "route"), true);
});

test("GraphQueryEngine supports graph projection views", () => {
  const graph = createTestGraph();
  const engine = createQueryEngine(graph);

  const archView = engine.getArchitectureView();
  const requestFlowView = engine.getRequestFlowView();
  const securityView = engine.getSecurityView();
  const databaseView = engine.getDatabaseView();

  assert.equal(archView.viewName, "ArchitectureView");
  assert.equal(archView.nodes.some((n) => n.kind === "route"), true);
  assert.equal(archView.nodes.some((n) => n.kind === "controller"), true);

  assert.equal(requestFlowView.viewName, "RequestFlowView");
  assert.equal(requestFlowView.edges.some((e) => e.type === "HANDLED_BY"), true);

  assert.equal(securityView.viewName, "SecurityView");
  assert.equal(securityView.nodes.some((n) => n.kind === "middleware"), true);

  assert.equal(databaseView.viewName, "DatabaseView");
  assert.equal(databaseView.nodes.some((n) => n.kind === "model"), true);
});

test("AIQueryAdapter answers architectural questions via GraphQueryEngine", () => {
  const graph = createTestGraph();
  const engine = createQueryEngine(graph);

  const serviceRes = engine.ai.whatCallsThisService("UserService");
  assert.equal(serviceRes.found, true);
  assert.equal(serviceRes.callers.some((n) => n.kind === "controller"), true);

  const requestRes = engine.ai.whatRequestReachesController("UserController");
  assert.equal(requestRes.found, true);
  assert.equal(requestRes.routes.length >= 1, true);

  const authRes = engine.ai.whatAuthProtectsEndpoint("/api/users");
  assert.equal(authRes.found, true);
  assert.equal(authRes.protectingMiddleware.some((m) => m.name === "verifyToken"), true);

  const impactRes = engine.ai.whatHappensIfRemoved("UserController");
  assert.equal(impactRes.found, true);
  assert.equal(["low", "medium", "high"].includes(impactRes.impactRisk), true);
});
