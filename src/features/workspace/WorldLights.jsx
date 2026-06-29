import React from "react";

const WorldLights = () => {
  return (
    <>
      {/* Global Ambient Fill */}
      <ambientLight intensity={0.15} />

      {/* Primary Directional Keylight */}
      <directionalLight
        position={[10, 25, 10]}
        intensity={0.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Spotlights focused directly on room platform coordinates */}
      {/* Project Brain Spotlight */}
      <spotLight
        position={[0, 10, 0]}
        target-position={[0, 0, 0]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.5}
        color="#00E5FF"
      />

      {/* Architecture Spotlight */}
      <spotLight
        position={[15, 10, 0]}
        target-position={[15, 0, 0]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
      />

      {/* Routes Spotlight */}
      <spotLight
        position={[0, 10, 15]}
        target-position={[0, 0, 15]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
      />

      {/* State Spotlight */}
      <spotLight
        position={[10, 10, -15]}
        target-position={[10, 0, -15]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
      />

      {/* API Spotlight */}
      <spotLight
        position={[-10, 10, -15]}
        target-position={[-10, 0, -15]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
      />

      {/* Documentation Spotlight */}
      <spotLight
        position={[-15, 10, 0]}
        target-position={[-15, 0, 0]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
      />
    </>
  );
};

export default WorldLights;
