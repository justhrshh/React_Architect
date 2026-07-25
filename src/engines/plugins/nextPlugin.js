export const NextPlugin = {
  id: "framework:next",
  name: "Next.js",
  category: "fullstack",
  supports(_files, detectorResult) {
    return detectorResult.hasNext;
  },
  run(context) {
    return { status: "applied", plugin: "Next.js" };
  },
};
