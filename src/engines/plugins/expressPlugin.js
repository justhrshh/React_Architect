/**
 * Express Framework Plugin
 *
 * Implements the standard Plugin Interface.
 * Detects Express backend projects and activates Express-specific analysis rules.
 */
export const ExpressPlugin = {
  id: "framework:express",
  name: "Express",
  category: "backend",
  supports(_files, detectorResult) {
    return detectorResult.hasExpress;
  },
  run(context) {
    return {
      status: "active",
      plugin: "Express",
      category: "backend",
    };
  },
};
