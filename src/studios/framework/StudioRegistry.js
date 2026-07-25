/**
 * StudioRegistry
 *
 * Centralized registry for registering, instantiating, and managing all Studios.
 */
export class StudioRegistry {
  constructor() {
    this.studios = new Map();
  }

  register(studioInstance) {
    if (!studioInstance || !studioInstance.id) {
      throw new Error("Studio instance must have a valid 'id' property.");
    }
    this.studios.set(studioInstance.id, studioInstance);
  }

  getStudio(id) {
    return this.studios.get(id) || null;
  }

  getAllStudios() {
    return Array.from(this.studios.values());
  }

  initializeAll(context) {
    this.studios.forEach((studio) => studio.initialize(context));
  }

  disposeAll() {
    this.studios.forEach((studio) => studio.dispose());
  }
}

export const defaultStudioRegistry = new StudioRegistry();
