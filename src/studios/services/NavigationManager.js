import { STUDIO_EVENTS } from "../framework/types.js";

/**
 * NavigationManager
 *
 * Graph-aware navigation system:
 * - Go to Node / Definition
 * - Upstream / Downstream Traversal
 * - Undo/Redo Navigation History Stack (Back / Forward)
 */
export class NavigationManager {
  constructor(queryEngine = null, selectionManager = null) {
    this.queryEngine = queryEngine;
    this.selectionManager = selectionManager;

    this.historyStack = [];
    this.historyIndex = -1;
    this.listeners = new Set();
  }

  setQueryEngine(queryEngine) {
    this.queryEngine = queryEngine;
  }

  setSelectionManager(selectionManager) {
    this.selectionManager = selectionManager;
  }

  goToNode(nodeId) {
    if (!nodeId) return;

    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }

    if (this.historyStack[this.historyStack.length - 1] !== nodeId) {
      this.historyStack.push(nodeId);
      this.historyIndex = this.historyStack.length - 1;
    }

    if (this.selectionManager) {
      this.selectionManager.selectNode(nodeId);
    }

    this._notify("goToNode", nodeId);
  }

  navigateUpstream(nodeId) {
    if (!this.queryEngine) return;
    const targetId = nodeId || (this.selectionManager && this.selectionManager.getSelectedNodeId());
    if (!targetId) return;

    const ancestors = this.queryEngine.findAncestors(targetId);
    if (ancestors.length > 0) {
      this.goToNode(ancestors[0].id);
    }
  }

  navigateDownstream(nodeId) {
    if (!this.queryEngine) return;
    const targetId = nodeId || (this.selectionManager && this.selectionManager.getSelectedNodeId());
    if (!targetId) return;

    const descendants = this.queryEngine.findDescendants(targetId);
    if (descendants.length > 0) {
      this.goToNode(descendants[0].id);
    }
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const targetId = this.historyStack[this.historyIndex];
      if (this.selectionManager) {
        this.selectionManager.selectNode(targetId);
      }
      this._notify("goBack", targetId);
    }
  }

  goForward() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      const targetId = this.historyStack[this.historyIndex];
      if (this.selectionManager) {
        this.selectionManager.selectNode(targetId);
      }
      this._notify("goForward", targetId);
    }
  }

  canGoBack() {
    return this.historyIndex > 0;
  }

  canGoForward() {
    return this.historyIndex < this.historyStack.length - 1;
  }

  subscribe(listenerFn) {
    if (typeof listenerFn === "function") {
      this.listeners.add(listenerFn);
    }
    return () => this.listeners.delete(listenerFn);
  }

  _notify(action, targetNodeId) {
    this.listeners.forEach((fn) => {
      try {
        fn(STUDIO_EVENTS.NAVIGATION_CHANGED, { action, targetNodeId, canBack: this.canGoBack(), canForward: this.canGoForward() });
      } catch (err) {
        console.warn(`[NavigationManager] Error notifying listener:`, err);
      }
    });
  }
}

export const defaultNavigationManager = new NavigationManager();
