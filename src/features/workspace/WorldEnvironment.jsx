import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Line } from "@react-three/drei";
import * as THREE from "three";

// Energy flow particle traveling along a connection line
const EnergyFlow = ({ start, end, speed = 0.5, delay = 0 }) => {
  const meshRef = useRef();
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    // Offset progress using custom speed and delay parameters
    const progress = ((time * speed + delay) % 1.0);
    
    // Interpolate coordinate vectors
    meshRef.current.position.lerpVectors(startVec, endVec, progress);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#00E5FF" toneMapped={false} />
    </mesh>
  );
};

const WorldEnvironment = () => {
  const connections = [
    { name: "architecture", end: [15, 0, 0], delay: 0 },
    { name: "documentation", end: [-15, 0, 0], delay: 0.2 },
    { name: "routes", end: [0, 0, 15], delay: 0.4 },
    { name: "state", end: [10, 0, -15], delay: 0.6 },
    { name: "api", end: [-10, 0, -15], delay: 0.8 },
  ];

  return (
    <>
      {/* Background Starry Sky */}
      <Stars
        radius={120}
        depth={60}
        count={3000}
        factor={5}
        saturation={0.5}
        fade
        speed={1.5}
      />

      {/* Energy Wires and Animate Particles */}
      {connections.map((c) => (
        <group key={c.name}>
          {/* Main wire line */}
          <Line
            points={[[0, 0, 0], c.end]}
            color="#ffffff"
            lineWidth={0.5}
            transparent
            opacity={0.12}
          />
          {/* Glowing particle along the connection line */}
          <EnergyFlow start={[0, 0, 0]} end={c.end} speed={0.25} delay={c.delay} />
        </group>
      ))}
    </>
  );
};

export default WorldEnvironment;
