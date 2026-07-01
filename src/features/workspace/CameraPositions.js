/**
 * Predefined camera positions and targets for the workspace rooms.
 * - position: Close-up zoom coordinates of the camera.
 * - target: Center coordinate of the room platform (lookAt target).
 */
export const CAMERA_POSITIONS = {
  hub: {
    position: { x: 0, y: 2.0, z: 4.2 },
    target: { x: 0, y: 0, z: 0 },
  },
  brain: {
    position: { x: 0, y: 2.2, z: 5.5 },
    target: { x: 0, y: 0, z: 0 },
  },
  architecture: {
    position: { x: 15, y: 2.2, z: 5.5 },
    target: { x: 15, y: 0, z: 0 },
  },
  routes: {
    position: { x: 0, y: 2.2, z: 20.5 },
    target: { x: 0, y: 0, z: 15 },
  },
  state: {
    position: { x: 10, y: 2.2, z: -9.5 },
    target: { x: 10, y: 0, z: -15 },
  },
  api: {
    position: { x: -10, y: 2.2, z: -9.5 },
    target: { x: -10, y: 0, z: -15 },
  },
  documentation: {
    position: { x: -15, y: 2.2, z: 5.5 },
    target: { x: -15, y: 0, z: 0 },
  },
  explore: {
    position: { x: 0, y: 22, z: 32 },
    target: { x: 0, y: 0, z: 0 },
  },
};
