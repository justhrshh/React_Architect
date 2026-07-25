import assert from "node:assert/strict";
import test from "node:test";

import { buildKnowledgeGraph } from "../src/engines/graph/buildKnowledgeGraph.js";
import { createQueryEngine } from "../src/engines/query/index.js";
import {
  BaseStudio,
  StudioRegistry,
  SelectionManager,
  NavigationManager,
  FilterManager,
  HighlightManager,
  BreadcrumbManager,
  STUDIO_EVENTS,
} from "../src/studios/index.js";

class TestArchitectureStudio extends BaseStudio {
  constructor() {
    super("architecture", "Architecture Studio", "Visualizes overall system architecture");
  }

  getProjection() {
    if (!this.queryEngine) return { nodes: [], edges: [] };
    return this.queryEngine.getArchitectureView();
  }
}

function setupTestEnvironment() {
  const files = [
    {
      name: "server.js",
      path: "src/server.js",
      content: `
        const express = require('express');
        const app = express();
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

  const graph = buildKnowledgeGraph(files, { name: "Test App" });
  const queryEngine = createQueryEngine(graph);

  const selectionManager = new SelectionManager();
  const filterManager = new FilterManager();
  const highlightManager = new HighlightManager();
  const navigationManager = new NavigationManager(queryEngine, selectionManager);
  const breadcrumbManager = new BreadcrumbManager(queryEngine);

  const studio = new TestArchitectureStudio();
  const context = {
    queryEngine,
    selectionManager,
    filterManager,
    highlightManager,
    navigationManager,
    breadcrumbManager,
  };

  studio.initialize(context);

  return { studio, queryEngine, selectionManager, filterManager, highlightManager, navigationManager, breadcrumbManager };
}

test("BaseStudio initializes, loads projection, and generates visualization model", async () => {
  const { studio } = setupTestEnvironment();

  const model = await studio.load();

  assert.equal(model.studioId, "architecture");
  assert.equal(model.nodes.some((n) => n.kind === "route"), true);
  assert.equal(model.nodes.some((n) => n.kind === "controller"), true);
  assert.equal(model.edges.some((e) => e.type === "HANDLED_BY"), true);
});

test("SelectionManager synchronizes global node selection across subscribers", () => {
  const { selectionManager } = setupTestEnvironment();

  let receivedNodeId = null;
  selectionManager.subscribe((event, data) => {
    if (event === STUDIO_EVENTS.SELECTION_CHANGED) {
      receivedNodeId = data.selectedNodeId;
    }
  });

  selectionManager.selectNode("route:src/server.js:GET:/api/users");

  assert.equal(selectionManager.getSelectedNodeId(), "route:src/server.js:GET:/api/users");
  assert.equal(receivedNodeId, "route:src/server.js:GET:/api/users");
});

test("NavigationManager performs graph-aware navigation and history stack", () => {
  const { navigationManager, selectionManager } = setupTestEnvironment();

  navigationManager.goToNode("route:src/server.js:GET:/api/users");
  assert.equal(selectionManager.getSelectedNodeId(), "route:src/server.js:GET:/api/users");
  assert.equal(navigationManager.canGoBack(), false);

  navigationManager.goToNode("controller:src/controllers/userController.js:UserController.getUsers");
  assert.equal(selectionManager.getSelectedNodeId(), "controller:src/controllers/userController.js:UserController.getUsers");
  assert.equal(navigationManager.canGoBack(), true);

  navigationManager.goBack();
  assert.equal(selectionManager.getSelectedNodeId(), "route:src/server.js:GET:/api/users");

  navigationManager.goForward();
  assert.equal(selectionManager.getSelectedNodeId(), "controller:src/controllers/userController.js:UserController.getUsers");
});

test("BreadcrumbManager generates hierarchical architectural breadcrumbs", () => {
  const { breadcrumbManager } = setupTestEnvironment();

  const breadcrumbs = breadcrumbManager.getBreadcrumbsForNode("controller:src/controllers/userController.js:UserController.getUsers");

  assert.equal(breadcrumbs.length >= 2, true);
  assert.equal(breadcrumbs[breadcrumbs.length - 1].isCurrent, true);
});

test("StudioRegistry registers and manages studio lifecycles", () => {
  const registry = new StudioRegistry();
  const studio = new TestArchitectureStudio();

  registry.register(studio);
  assert.equal(registry.getStudio("architecture"), studio);
  assert.equal(registry.getAllStudios().length, 1);

  const { queryEngine, selectionManager } = setupTestEnvironment();
  registry.initializeAll({ queryEngine, selectionManager });

  assert.equal(studio.isInitialized, true);

  registry.disposeAll();
  assert.equal(studio.isInitialized, false);
});
