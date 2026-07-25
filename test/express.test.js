import assert from "node:assert/strict";
import test from "node:test";

import { parseFile } from "../src/engines/parser/parser.js";
import { buildKnowledgeGraph } from "../src/engines/graph/buildKnowledgeGraph.js";

test("expressRouteExtractor extracts app and router HTTP endpoints and handlers", () => {
  const code = `
    const express = require('express');
    const app = express();
    const router = express.Router();

    app.use(cors());
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
    router.post('/login', verifyToken, UserController.login);
  `;

  const summary = parseFile(code, "src/server.js");
  const extracted = summary.express.routes;

  assert.equal(extracted.some((r) => r.entityType === "route" && r.path === "/api/health" && r.method === "GET"), true);
  assert.equal(extracted.some((r) => r.entityType === "route" && r.path === "/login" && r.method === "POST"), true);
});

test("expressMiddlewareExtractor categorizes cors, auth, and error-handling arity middleware", () => {
  const code = `
    const app = express();
    app.use(cors());
    app.use(verifyToken);
    function errorHandler(err, req, res, next) { res.status(500).send(err); }
  `;

  const summary = parseFile(code, "src/middleware.js");
  const extracted = summary.express.middleware;

  assert.equal(extracted.some((m) => m.name === "cors" && m.subtype === "cors"), true);
  assert.equal(extracted.some((m) => m.name === "verifyToken" && m.subtype === "auth"), true);
  assert.equal(extracted.some((m) => m.name === "errorHandler" && m.subtype === "error"), true);
});

test("expressControllerExtractor extracts classes, functions, and status codes", () => {
  const code = `
    export class UserController {
      static async getUsers(req, res) {
        return res.status(200).json([]);
      }
    }
    export async function loginUser(req, res) {
      return res.status(201).json({ token: 'abc' });
    }
  `;

  const summary = parseFile(code, "src/controllers/userController.js");
  const extracted = summary.express.controllers;

  assert.equal(extracted.some((c) => c.name === "UserController.getUsers"), true);
  assert.equal(extracted.some((c) => c.name === "loginUser"), true);
});

test("expressServiceExtractor extracts ORM models and services", () => {
  const code = `
    export class UserService {
      async findUsers() {
        return await prisma.user.findMany();
      }
    }
  `;

  const summary = parseFile(code, "src/services/userService.js");
  const extracted = summary.express.services;

  assert.equal(extracted.some((s) => s.name === "UserService" && s.entityType === "service"), true);
  assert.equal(extracted.some((s) => s.entityType === "db_query" && s.targetObject === "prisma"), true);
});

test("buildKnowledgeGraph builds normalized universal nodes and edges for Express", () => {
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

  const graph = buildKnowledgeGraph(files, { name: "Express Project" });

  assert.equal(graph.nodes.some((n) => n.kind === "route" && n.name === "GET /api/users"), true);
  assert.equal(graph.nodes.some((n) => n.kind === "controller" && n.name === "UserController.getUsers"), true);
  assert.equal(graph.nodes.some((n) => n.kind === "middleware" && n.name === "verifyToken"), true);
  assert.equal(graph.nodes.some((n) => n.kind === "service" && n.name === "UserService"), true);
  assert.equal(graph.nodes.some((n) => n.kind === "model" && n.name === "User"), true);

  assert.equal(graph.edges.some((e) => e.type === "HANDLED_BY"), true);
  assert.equal(graph.edges.some((e) => e.type === "AUTHORIZES"), true);
  assert.equal(graph.edges.some((e) => e.type === "USES"), true);
  assert.equal(graph.edges.some((e) => e.type === "READS"), true, `Edge READS not found in: ${JSON.stringify(graph.edges.map(e => e.type))}`);
});
