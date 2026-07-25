import { buildVisualizationModel } from "./VisualizationModel.js";
import { LAYOUT_MODES, STUDIO_EVENTS } from "./types.js";

/**
 * BaseStudio
 *
 * Abstract Base Class for all Studios.
 * Every Studio (Architecture, Dependency, RequestFlow, State, Network, Security, Database) extends BaseStudio.
 *
 * Studios consume ONLY the QueryEngine and shared managers—NEVER raw ASTs or file parsers.
 */
export class BaseStudio {
  constructor(id, name, description = "") {
    if (new.target === BaseStudio) {
      throw new Error("Cannot instantiate abstract BaseStudio directly.");
    }

    this.id = id;
    this.name = name;
    this.description = description;

    this.queryEngine = null;
    this.selectionManager = null;
    this.filterManager = null;
    this.highlightManager = null;
    this.navigationManager = null;

    this.layout = LAYOUT_MODES.LAYERED;
    this.unsubscribers = [];
    this.isInitialized = false;
  }

  initialize(context = {}) {
    this.queryEngine = context.queryEngine || null;
    this.selectionManager = context.selectionManager || null;
    this.filterManager = context.filterManager || null;
    this.highlightManager = context.highlightManager || null;
    this.navigationManager = context.navigationManager || null;

    this._setupSubscriptions();
    this.isInitialized = true;
  }

  _setupSubscriptions() {
    if (this.selectionManager) {
      const unsub = this.selectionManager.subscribe((event, data) => {
        if (event === STUDIO_EVENTS.SELECTION_CHANGED) {
          this.onSelectionChanged(data.selectedNodeId);
        }
      });
      this.unsubscribers.push(unsub);
    }

    if (this.filterManager) {
      const unsub = this.filterManager.subscribe((event, data) => {
        if (event === STUDIO_EVENTS.FILTER_CHANGED) {
          this.applyFilters(data.filters);
        }
      });
      this.unsubscribers.push(unsub);
    }
  }

  async load() {
    this.ensureInitialized();
    return this.generateVisualizationModel();
  }

  async refresh() {
    return this.load();
  }

  selectNode(nodeId) {
    if (this.selectionManager) {
      this.selectionManager.selectNode(nodeId);
    }
  }

  focusNode(nodeId) {
    if (this.selectionManager) {
      this.selectionManager.focusNode(nodeId);
    }
  }

  highlightPath(nodeIds = [], edgeIds = []) {
    if (this.highlightManager) {
      this.highlightManager.highlightPath(nodeIds, edgeIds);
    }
  }

  clearSelection() {
    if (this.selectionManager) {
      this.selectionManager.clearSelection();
    }
    if (this.highlightManager) {
      this.highlightManager.clearHighlight();
    }
  }

  applyFilters(_filters) {
    this.refresh();
  }

  onSelectionChanged(_nodeId) {
    // Overridden by child classes if needed
  }

  generateVisualizationModel() {
    this.ensureInitialized();

    const projection = this.getProjection();
    const interactionState = {
      selectedNodeId: this.selectionManager ? this.selectionManager.getSelectedNodeId() : null,
      focusedNodeId: this.selectionManager ? this.selectionManager.getFocusedNodeId() : null,
      highlightedNodeIds: this.highlightManager ? this.highlightManager.getHighlightedNodeIds() : [],
      highlightedEdgeIds: this.highlightManager ? this.highlightManager.getHighlightedEdgeIds() : [],
    };

    return buildVisualizationModel({
      studioId: this.id,
      nodes: projection.nodes || [],
      edges: projection.edges || [],
      layout: this.layout,
      interactionState,
    });
  }

  getProjection() {
    if (!this.queryEngine) return { nodes: [], edges: [] };
    return { nodes: this.queryEngine.getNodes(), edges: this.queryEngine.getEdges() };
  }

  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error(`Studio '${this.id}' must be initialized before use.`);
    }
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.isInitialized = false;
  }
}
