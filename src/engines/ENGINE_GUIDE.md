# React Architect v2 — Analysis Engine Architecture Guide (`ENGINE_GUIDE.md`)

This guide documents the compiler-grade, 8-layer decoupled architecture of the **React Architect Analysis Engine (v2.0)** and the **Graph Query Engine (`GraphQueryEngine`)**.

---

## Architecture Pipeline & Query Layer Overview

```
Scanner  (File Discovery)
   │  Array<{ name, path, content }>
   ▼
Parser  (Babel AST Parsing with errorRecovery)
   │  AST Summary Object
   ▼
Extractor Registry  (Runs all registered extractors via common interface)
   │  Structured Fact Metadata ({ type, data, errors })
   ▼
Framework & Plugin Detector  (Identifies active React, Next.js, Express, NestJS plugins)
   │  Active Plugins Array
   ▼
Knowledge Graph Builder  (Constructs Canonical Nodes & Edge Schemas)
   │  Unresolved Knowledge Graph + Manifest (FNV-1a Hashing)
   ▼
Relationship Resolvers  (Path Aliases, O(1) Import Resolver, Express Resolvers)
   │  Resolved Canonical Knowledge Graph + Incremental Lookups
   ▼
Architecture Analyzers  (Pure Graph Rules: Maintainability, Health, Dead Code, Impact)
   │  Architecture Insights & Metrics
   ▼
Knowledge Graph Storage  (Canonical Data Storage)
   │
   ▼
Graph Query Engine  (Intelligent Query Layer & Projections: O(1) Indexes)
   │  Projections: Architecture, Request Flow, State, Security, Database Views
   ▼
Public Engine API  (Exposed to UI Studios & AI Modules)
```

---

## Graph Query Engine API Specification (`src/engines/query/`)

The **Knowledge Graph remains storage. The Query Engine becomes intelligence.** No UI Studio, AI module, or analyzer accesses raw graph arrays directly.

### 1. Fast Node & Search Queries ($O(1)$ Indexing)
- `createQueryEngine(graph)`: Instantiates query engine with 6 fast lookup indexes.
- `engine.findNode(id)`: Returns node by ID ($O(1)$).
- `engine.findNodesByKind(kind)`: Returns nodes matching universal kind (`component`, `route`, `controller`, `service`, `model`, etc.).
- `engine.findNodesBySubtype(subtype)`: Returns nodes matching subtype (`express_route`, `auth`, `orm`, etc.).
- `engine.findNodesByFile(filePath)`: Returns all nodes declared in a file.
- `engine.search(queryStr)`: Fuzzy search across node names, paths, and metadata.

### 2. Graph Traversal & Structure
- `engine.findIncomingEdges(nodeId)` / `engine.findOutgoingEdges(nodeId)` ($O(1)$)
- `engine.findNeighbors(nodeId, direction)`
- `engine.findPath(sourceId, targetId)` (BFS Shortest Path)
- `engine.findDependents(nodeId)` (Immediate 1-hop dependent nodes)
- `engine.findDependencies(nodeId)` (Immediate 1-hop dependency nodes)
- `engine.findAncestors(nodeId)` (Recursive upstream dependency chain)
- `engine.findDescendants(nodeId)` (Recursive downstream dependent tree)
- `engine.findCycles()` (Circular dependency detection using Tarjan's DFS)
- `engine.findOrphans()` (Isolated nodes with 0 incoming/outgoing edges)

### 3. Domain Convenience Methods
- `engine.findRoutes()`
- `engine.findControllers()`
- `engine.findServices()`
- `engine.findComponents()`
- `engine.findModels()`
- `engine.findState()`
- `engine.findMiddleware()`

### 4. Graph Projection Views
- `engine.getArchitectureView()`: Components, Routes, Controllers, Services, Models.
- `engine.getDependencyView()`: Structural dependency and render edges.
- `engine.getRequestFlowView()`: Execution chain (Frontend -> Route -> Middleware -> Controller -> Service -> Model).
- `engine.getNetworkView()`: API gateways, endpoints, routes, controllers.
- `engine.getStateView()`: Redux, Context, hooks, consumers.
- `engine.getSecurityView()`: Middleware, auth, validation, protected routes.
- `engine.getDatabaseView()`: Services, ORM models, SQL queries, database entities.

### 5. AI Query Adapter (`engine.ai`)
- `engine.ai.whatCallsThisService(serviceName)`
- `engine.ai.whatDependsOnThisComponent(compName)`
- `engine.ai.whatRequestReachesController(ctrlName)`
- `engine.ai.whatAuthProtectsEndpoint(routePath)`
- `engine.ai.whatHappensIfRemoved(entityName)`
