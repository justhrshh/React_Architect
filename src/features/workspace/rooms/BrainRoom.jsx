import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import gsap from "gsap";

const BrainRoom = ({ active, focused, exploreMode, onSelect }) => {
  const groupRef = useRef();
  const sphereRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const lightRef = useRef();

  const titleRef = useRef();
  const codeRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Dynamically adjust speed based on active/explore state
    const speedMult = active ? 1.0 : exploreMode ? 0.6 : 0.2;

    if (sphereRef.current) {
      sphereRef.current.rotation.y = time * 0.15 * speedMult;
      sphereRef.current.rotation.x = time * 0.08 * speedMult;
      // Soft float
      sphereRef.current.position.y = Math.sin(time * 1.5) * 0.08 * speedMult;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.12 * speedMult;
      ring1Ref.current.rotation.y = time * 0.18 * speedMult;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.22 * speedMult;
      ring2Ref.current.rotation.z = time * 0.14 * speedMult;
    }
  });

  // State-driven transitions for fading & scale
  useEffect(() => {
    if (!sphereRef.current || !ring1Ref.current || !ring2Ref.current || !lightRef.current) return;

    let targetCoreScale = 0.35; // default faded size
    let targetRing1Opacity = 0.05;
    let targetRing2Opacity = 0.02;
    let targetLightIntensity = 0.15;
    let targetTextOpacity = 0.08;

    if (active) {
      targetCoreScale = 1.0;
      targetRing1Opacity = 0.45;
      targetRing2Opacity = 0.3;
      targetLightIntensity = 2.0;
      targetTextOpacity = 1.0;
    } else if (exploreMode) {
      targetCoreScale = 0.75;
      targetRing1Opacity = 0.25;
      targetRing2Opacity = 0.15;
      targetLightIntensity = 1.0;
      targetTextOpacity = 0.6;
    }

    // Animate Core Sphere Scale & Material Emission
    gsap.to(sphereRef.current.scale, {
      x: targetCoreScale,
      y: targetCoreScale,
      z: targetCoreScale,
      duration: 1.5,
      ease: "power2.out",
    });

    // Animate Light Intensity
    gsap.to(lightRef.current, {
      intensity: targetLightIntensity,
      duration: 1.2,
      ease: "power2.out",
    });

    // Animate Orbit Ring Opacities
    gsap.to(ring1Ref.current.material, {
      opacity: targetRing1Opacity,
      duration: 1.2,
    });
    gsap.to(ring2Ref.current.material, {
      opacity: targetRing2Opacity,
      duration: 1.2,
    });

    // Animate Labels Opacities
    if (titleRef.current) {
      gsap.to(titleRef.current, {
        fillOpacity: targetTextOpacity,
        duration: 1.2,
      });
    }
    if (codeRef.current) {
      gsap.to(codeRef.current, {
        fillOpacity: targetTextOpacity * 0.7,
        duration: 1.2,
      });
    }
  }, [active, exploreMode]);

  return (
    <group 
      ref={groupRef}
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        // Allow selection in explore mode or when faded
        if (onSelect) onSelect();
      }}
    >
      {/* Localized Point Light */}
      <pointLight ref={lightRef} position={[0, 3, 0]} intensity={2.0} distance={12} color="#00E5FF" />

      {/* Central Core Brain Sphere */}
      <mesh ref={sphereRef} className="cursor-pointer">
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshStandardMaterial
          color="#050505"
          emissive="#00E5FF"
          emissiveIntensity={2.5}
          roughness={0.05}
          metalness={0.9}
        />
      </mesh>

      {/* Orbit Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.8, 0.015, 8, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.4} />
      </mesh>

      {/* Orbit Ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.012, 8, 64]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.25} />
      </mesh>

      {/* Room Title */}
      <Text
        ref={titleRef}
        position={[0, 2.8, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        PROJECT BRAIN
      </Text>
      
      {/* Subtext */}
      <Text
        ref={codeRef}
        position={[0, 2.3, 0]}
        fontSize={0.16}
        color="#A1A1AA"
        anchorX="center"
        anchorY="middle"
      >
        /00_CORE_HUB
      </Text>
    </group>
  );
};

export default BrainRoom;
