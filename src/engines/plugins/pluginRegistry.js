import { ReactPlugin } from "./reactPlugin.js";
import { NextPlugin } from "./nextPlugin.js";
import { ExpressPlugin } from "./expressPlugin.js";
import { NestPlugin } from "./nestPlugin.js";

export class PluginRegistry {
  constructor() {
    this.plugins = new Map();
  }

  register(plugin) {
    if (!plugin || !plugin.id || !plugin.name) {
      throw new Error("Plugin must have 'id' and 'name' properties.");
    }
    this.plugins.set(plugin.id, plugin);
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  detectActivePlugins(files, detectorResult) {
    const active = [];
    for (const plugin of this.plugins.values()) {
      if (typeof plugin.supports === "function" && plugin.supports(files, detectorResult)) {
        active.push(plugin);
      }
    }
    return active;
  }
}

export const defaultPluginRegistry = new PluginRegistry();

defaultPluginRegistry.register(ReactPlugin);
defaultPluginRegistry.register(NextPlugin);
defaultPluginRegistry.register(ExpressPlugin);
defaultPluginRegistry.register(NestPlugin);
