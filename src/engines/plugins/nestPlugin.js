export const NestPlugin = {
  id: "framework:nest",
  name: "NestJS",
  category: "backend",
  supports(_files, detectorResult) {
    return detectorResult.hasNest;
  },
  run(context) {
    return { status: "ready_for_phase_2", plugin: "NestJS" };
  },
};
