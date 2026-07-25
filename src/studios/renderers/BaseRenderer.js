/**
 * BaseRenderer
 *
 * Renderer contract for visualization adapters (React Flow, Canvas, SVG, WebGL).
 * A Renderer receives a normalized VisualizationModel and interaction state.
 * Studios NEVER manipulate renderer DOM or internals directly.
 */
export class BaseRenderer {
  constructor(containerElement = null) {
    if (new.target === BaseRenderer) {
      throw new Error("Cannot instantiate abstract BaseRenderer directly.");
    }
    this.containerElement = containerElement;
  }

  render(_visualizationModel) {
    throw new Error("Renderer must implement render(visualizationModel)");
  }

  updateInteractionState(_interactionState) {
    // Optional update method
  }

  destroy() {
    this.containerElement = null;
  }
}
