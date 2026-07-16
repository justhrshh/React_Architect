/**
 * settings.js
 * Manages provider settings (model selection, API keys) persisted in localStorage.
 */

import { GEMINI_MODELS } from "./models.js";

const STORAGE_KEY = "react-architect:ai-settings";

const DEFAULT_SETTINGS = {
  provider: "gemini",
  model: "gemini-3.1-flash-lite",
  apiKey: "",
};

/**
 * Loads provider settings from localStorage. Restores default model if invalid.
 * @returns {{ provider: string, model: string, apiKey: string }}
 */
export function getProviderSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate that the model exists in GEMINI_MODELS
      const isValidModel = GEMINI_MODELS.some(m => m.id === parsed.model);
      if (!isValidModel) {
        parsed.model = DEFAULT_SETTINGS.model;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Error reading provider settings:", e);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Saves provider settings to localStorage and dispatches sync event.
 * @param {{ provider: string, model: string, apiKey: string }} settings
 */
export function saveProviderSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Notify same-window components to refresh state
    window.dispatchEvent(new Event("react-architect:ai-settings-changed"));
  } catch (e) {
    console.error("Error writing provider settings:", e);
  }
}
