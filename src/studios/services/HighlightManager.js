import { STUDIO_EVENTS } from "../framework/types.js";

/**
 * HighlightManager
 *
 * Controls active highlighted nodes, execution paths, and impact paths across all Studios.
 */
export class HighlightManager {
  constructor() {
    this.highlightedNodeIds = new Set();
    this.highlightedEdgeIds = new Set();
    this.listeners = new Set();
  }

  getHighlightedNodeIds() {
    return Array.from(this.highlightedNodeIds);
  }

  getHighlightedEdgeIds() {
    return Array.from(this.highlightedEdgeIds);
  }

  highlightNodes(nodeIds = []) {
    this.highlightedNodeIds = new Set(nodeIds);
    this._notify();
  }

  highlightPath(nodeIds = [], edgeIds = []) {
    this.highlightedNodeIds = new Set(nodeIds);
    this.highlightedEdgeIds = new Set(edgeIds);
    this._notify();
  }

  clearHighlight() {
    if (this.highlightedNodeIds.size === 0 && this.highlightedEdgeIds.size === 0) return;
    this.highlightedNodeIds.clear();
    this.highlightedEdgeIds.clear();
    this._notify();
  }

  subscribe(listenerFn) {
    if (typeof listenerFn === "function") {
      this.listeners.add(listenerFn);
    }
    return () => this.listeners.delete(listenerFn);
  }

  _notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(STUDIO_EVENTS.HIGHLIGHT_CHANGED, {
          nodeIds: this.getHighlightedNodeIds(),
          edgeIds: this.getHighlightedEdgeIds(),
        });
      } catch (err) {
        console.warn(`[HighlightManager] Error notifying listener:`, err);
      }
    });
  }
}

export const defaultHighlightManager = new HighlightManager();
