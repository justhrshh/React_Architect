import { buildKnowledgeGraph } from "../src/engines/graph/buildKnowledgeGraph.js";

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

console.log("NODES:", graph.nodes.map((n) => ({ id: n.id, kind: n.kind, name: n.name })));
console.log("EDGES:", graph.edges.map((e) => ({ type: e.type, source: e.source, target: e.target })));
