import { STUDIO_EVENTS } from "../framework/types.js";

/**
 * SelectionManager
 *
 * Global selection manager for React Architect.
 * Ensures there is exactly ONE active architectural node selection across all Studios, Property Panels, AI Studio, and Navigation.
 */
export class SelectionManager {
  constructor() {
    this.selectedNodeId = null;
    this.focusedNodeId = null;
    this.listeners = new Set();
  }

  getSelectedNodeId() {
    return this.selectedNodeId;
  }

  getFocusedNodeId() {
    return this.focusedNodeId;
  }

  selectNode(nodeId) {
    if (this.selectedNodeId === nodeId) return;
    this.selectedNodeId = nodeId;
    this._notify(STUDIO_EVENTS.SELECTION_CHANGED, { selectedNodeId: nodeId });
  }

  focusNode(nodeId) {
    this.focusedNodeId = nodeId;
    this._notify(STUDIO_EVENTS.FOCUS_CHANGED, { focusedNodeId: nodeId });
  }

  clearSelection() {
    if (this.selectedNodeId === null && this.focusedNodeId === null) return;
    this.selectedNodeId = null;
    this.focusedNodeId = null;
    this._notify(STUDIO_EVENTS.SELECTION_CHANGED, { selectedNodeId: null, focusedNodeId: null });
  }

  subscribe(listenerFn) {
    if (typeof listenerFn === "function") {
      this.listeners.add(listenerFn);
    }
    return () => this.listeners.delete(listenerFn);
  }

  _notify(eventType, data) {
    this.listeners.forEach((fn) => {
      try {
        fn(eventType, data);
      } catch (err) {
        console.warn(`[SelectionManager] Error notifying listener:`, err);
      }
    });
  }
}

export const defaultSelectionManager = new SelectionManager();
