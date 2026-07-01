import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import { CAMERA_POSITIONS } from "./CameraPositions";

const roomKeyMapping = {
  "project-brain": "brain",
  "architecture": "architecture",
  "routes": "routes",
  "state-flow": "state",
  "api-flow": "api",
  "documentation": "documentation",
  "explore": "explore",
};

/**
 * CameraController handles automated cinematic GSAP sweeps and
 * locks the camera into room platforms on arrival.
 *
 * KEY DESIGN: onArrivalChange is stored in a ref so it NEVER enters
 * the useEffect dependency array — this prevents the render loop:
 *   onArrivalChange fires -> parent setState -> new fn reference -> effect re-runs -> repeat
 */
const CameraController = ({ onArrivalChange }) => {
  const { camera } = useThree();
  const activeRoom = useSelector((state) => state.ui.activeRoom);
  const appMode = useSelector((state) => state.ui.appMode);

  const controlsRef = useRef();
  const activeTimelineRef = useRef(null);
  const isFirstMountRef = useRef(true);

  // Store callback in a ref so changing it never triggers useEffect
  const onArrivalChangeRef = useRef(onArrivalChange);
  useEffect(() => {
    onArrivalChangeRef.current = onArrivalChange;
  });

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  // Re-runs when activeRoom or appMode changes
  useEffect(() => {
    const isHub = appMode === "hub" && activeRoom === "project-brain";
    const internalKey = isHub ? "hub" : (roomKeyMapping[activeRoom] || "brain");
    const config = CAMERA_POSITIONS[internalKey];

    if (!config || !controlsRef.current) return;

    // First mount: snap camera to position, no animation
    if (isFirstMountRef.current) {
      camera.position.set(config.position.x, config.position.y, config.position.z);
      controlsRef.current.target.set(config.target.x, config.target.y, config.target.z);
      controlsRef.current.update();
      isFirstMountRef.current = false;
      controlsRef.current.enabled = (internalKey === "explore");
      onArrivalChangeRef.current?.(activeRoom);
      return;
    }

    // Kill previous timeline
    if (activeTimelineRef.current) {
      activeTimelineRef.current.kill();
    }

    // Signal: camera is in flight
    controlsRef.current.enabled = false;
    onArrivalChangeRef.current?.(null);

    const startY = camera.position.y;
    const endX = config.position.x;
    const endY = config.position.y;
    const endZ = config.position.z;

    const tl = gsap.timeline({
      onComplete: () => {
        if (controlsRef.current) {
          controlsRef.current.enabled = (internalKey === "explore");
        }
        onArrivalChangeRef.current?.(activeRoom);
      },
    });

    if (internalKey === "explore" || startY > 10) {
      // Linear sweep into or out of explore mode
      tl.to(camera.position, {
        x: endX, y: endY, z: endZ,
        duration: 1.8,
        ease: "power2.inOut",
      }, 0);
    } else {
      // Cinematic arc: zoom out high → sweep across → zoom in
      const midX = (camera.position.x + endX) / 2;
      const midZ = (camera.position.z + endZ) / 2;
      const midY = Math.max(startY, endY) + 12;

      tl.to(camera.position, {
        x: midX, y: midY, z: midZ,
        duration: 0.9,
        ease: "power1.out",
      }, 0);

      tl.to(camera.position, {
        x: endX, y: endY, z: endZ,
        duration: 1.0,
        ease: "power2.inOut",
      }, 0.9);
    }

    // Animate orbit target in parallel
    tl.to(controlsRef.current.target, {
      x: config.target.x,
      y: config.target.y,
      z: config.target.z,
      duration: 1.8,
      ease: "power2.inOut",
    }, 0);

    activeTimelineRef.current = tl;

    return () => {
      activeTimelineRef.current?.kill();
    };
  }, [activeRoom, appMode, camera]); // onArrivalChange intentionally excluded — use ref above

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={4}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
};

export default CameraController;
