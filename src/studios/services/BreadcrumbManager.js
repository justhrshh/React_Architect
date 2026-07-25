/**
 * BreadcrumbManager
 *
 * Computes hierarchical architectural breadcrumbs for any given node ID.
 * Example: App.jsx -> GET /api/users -> UserController -> UserService -> UserModel
 */
export class BreadcrumbManager {
  constructor(queryEngine = null) {
    this.queryEngine = queryEngine;
  }

  setQueryEngine(queryEngine) {
    this.queryEngine = queryEngine;
  }

  getBreadcrumbsForNode(nodeId) {
    if (!this.queryEngine || !nodeId) return [];

    const targetNode = this.queryEngine.findNode(nodeId);
    if (!targetNode) return [];

    const breadcrumbs = [];

    // File level
    if (targetNode.file) {
      breadcrumbs.push({
        id: `file:${targetNode.file}`,
        label: targetNode.file,
        kind: "file",
      });
    }

    // Upstream ancestors (limit to 3 for clean display)
    const ancestors = this.queryEngine.findAncestors(nodeId).slice(0, 2).reverse();
    ancestors.forEach((anc) => {
      breadcrumbs.push({
        id: anc.id,
        label: anc.name,
        kind: anc.kind,
      });
    });

    // Target Node itself
    breadcrumbs.push({
      id: targetNode.id,
      label: targetNode.name,
      kind: targetNode.kind,
      isCurrent: true,
    });

    return breadcrumbs;
  }
}
