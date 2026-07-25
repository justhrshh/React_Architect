import { STUDIO_EVENTS } from "../framework/types.js";

/**
 * FilterManager
 *
 * Manages global architectural filters (node kinds, search text, risk scores, file directories).
 */
export class FilterManager {
  constructor() {
    this.filters = {
      searchQuery: "",
      allowedKinds: new Set(),
      allowedSubtypes: new Set(),
      excludeOrphans: false,
    };
    this.listeners = new Set();
  }

  getFilters() {
    return { ...this.filters };
  }

  setSearchQuery(query = "") {
    this.filters.searchQuery = query;
    this._notify();
  }

  setAllowedKinds(kinds = []) {
    this.filters.allowedKinds = new Set(kinds);
    this._notify();
  }

  setExcludeOrphans(exclude = false) {
    this.filters.excludeOrphans = !!exclude;
    this._notify();
  }

  applyFilters(newFilters = {}) {
    this.filters = {
      ...this.filters,
      ...newFilters,
    };
    this._notify();
  }

  resetFilters() {
    this.filters = {
      searchQuery: "",
      allowedKinds: new Set(),
      allowedSubtypes: new Set(),
      excludeOrphans: false,
    };
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
        fn(STUDIO_EVENTS.FILTER_CHANGED, { filters: this.getFilters() });
      } catch (err) {
        console.warn(`[FilterManager] Error notifying listener:`, err);
      }
    });
  }
}

export const defaultFilterManager = new FilterManager();
