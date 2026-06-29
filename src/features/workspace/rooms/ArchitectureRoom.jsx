import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import gsap from "gsap";

// Rising particle sparks when platform is materializing or active
const LocalParticles = ({ active, exploreMode }) => {
  const groupRef = useRef();
  const particleData = useRef([]);
  const count = 15;

  if (particleData.current.length === 0) {
    for (let i = 0; i < count; i++) {
      particleData.current.push({
        x: (Math.random() - 0.5) * 5.0, // distribute on 3.2 radius platform
        y: Math.random() * 3.0,
        z: (Math.random() - 0.5) * 5.0,
        speed: 0.2 + Math.random() * 0.3,
        scale: 0.02 + Math.random() * 0.04,
      });
    }
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const speedMult = active ? 1.0 : exploreMode ? 0.3 : 0.0;
    
    groupRef.current.children.forEach((child, index) => {
      const data = particleData.current[index];
      if (!data) return;
      child.position.y += data.speed * delta * speedMult;
      // Loop vertical rise
      if (child.position.y > 3.0) {
        child.position.y = 0;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particleData.current.map((p, idx) => (
        <mesh key={idx} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.scale, 8, 8]} />
          <meshBasicMaterial color="#00E5FF" transparent opacity={0.0} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Architecture Room Platform.
 */
const ArchitectureRoom = ({ active, focused, exploreMode, onSelect, children }) => {
  const groupRef = useRef();
  const platformRef = useRef();
  const borderRef = useRef();
  const wireframeRef = useRef();
  const lightRef = useRef();

  const titleRef = useRef();
  const codeRef = useRef();

  useFrame((state) => {
    if (wireframeRef.current) {
      const time = state.clock.getElapsedTime();
      const rotSpeed = active ? 0.35 : exploreMode ? 0.15 : 0.05;
      wireframeRef.current.rotation.y = time * rotSpeed;
      wireframeRef.current.rotation.x = time * rotSpeed * 0.5;
    }
  });

  // GSAP materialization transitions
  useEffect(() => {
    if (!platformRef.current || !borderRef.current || !wireframeRef.current || !lightRef.current) return;

    let targetY = -1.5;         // sunk
    let targetPlatformOpacity = 0.05;
    let targetBorderOpacity = 0.05;
    let targetScale = 0.01;      // collapsed wireframe
    let targetLightIntensity = 0.05;
    let targetTextOpacity = 0.08;
    let targetParticlesOpacity = 0.0;

    if (active) {
      targetY = 0;              // level
      targetPlatformOpacity = 0.9;
      targetBorderOpacity = 0.6;
      targetScale = 1.0;
      targetLightIntensity = 2.0;
      targetTextOpacity = 1.0;
      targetParticlesOpacity = 0.65;
    } else if (exploreMode) {
      targetY = -0.4;           // hovering
      targetPlatformOpacity = 0.45;
      targetBorderOpacity = 0.35;
      targetScale = 0.65;
      targetLightIntensity = 1.0;
      targetTextOpacity = 0.6;
      targetParticlesOpacity = 0.25;
    }

    // Animate Platform Height Position
    gsap.to(platformRef.current.position, {
      y: targetY - 0.4, // offset base
      duration: 1.5,
      ease: "power2.out",
    });

    // Animate Platform Opacities
    gsap.to(platformRef.current.material, {
      opacity: targetPlatformOpacity,
      duration: 1.2,
    });
    gsap.to(borderRef.current.material, {
      opacity: targetBorderOpacity,
      duration: 1.2,
    });

    // Animate Border & Wireframe Heights
    gsap.to(borderRef.current.position, {
      y: targetY - 0.29,
      duration: 1.5,
      ease: "power2.out",
    });
    gsap.to(wireframeRef.current.position, {
      y: targetY + 0.8,
      duration: 1.5,
      ease: "power2.out",
    });

    // Animate Wireframe Scale (Build particle illusion)
    gsap.to(wireframeRef.current.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 1.5,
      ease: active ? "back.out(1.4)" : "power2.out",
    });

    // Animate Lights Intensity
    gsap.to(lightRef.current, {
      intensity: targetLightIntensity,
      duration: 1.2,
    });

    // Animate floating text label opacity
    if (titleRef.current) {
      gsap.to(titleRef.current, {
        fillOpacity: targetTextOpacity,
        duration: 1.2,
        y: targetY + 2.8,
        ease: "power2.out",
      });
    }
    if (codeRef.current) {
      gsap.to(codeRef.current, {
        fillOpacity: targetTextOpacity * 0.7,
        duration: 1.2,
        y: targetY + 2.3,
        ease: "power2.out",
      });
    }

    // Animate particle mesh opacities
    const particleGroup = groupRef.current.children[1]; // Index 1 is LocalParticles
    if (particleGroup && particleGroup.children) {
      particleGroup.children.forEach((mesh) => {
        gsap.to(mesh.material, {
          opacity: targetParticlesOpacity * (0.4 + Math.random() * 0.6),
          duration: 1.0,
        });
      });
    }
  }, [active, exploreMode]);

  return (
    <group 
      ref={groupRef}
      position={[15, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
    >
      {/* Localized Point Light */}
      <pointLight ref={lightRef} position={[0, 3, 0]} intensity={1.5} distance={10} color="#00E5FF" />

      {/* Particle Build Spatter */}
      <LocalParticles active={active} exploreMode={exploreMode} />

      {/* Base Platform Cylinder */}
      <mesh ref={platformRef} position={[0, -0.4, 0]} className="cursor-pointer">
        <cylinderGeometry args={[3.2, 3.2, 0.2, 32]} />
        <meshStandardMaterial
          color="#121214"
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Platform Outline Border ring */}
      <mesh ref={borderRef} position={[0, -0.29, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.03, 8, 64]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={0.5}
          transparent
        />
      </mesh>

      {/* Rotating Wireframe Graybox Representation */}
      <mesh ref={wireframeRef} position={[0, 0.8, 0]}>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial wireframe color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.2} />
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
        ARCHITECTURE
      </Text>

      {/* Room Code Identifier */}
      <Text
        ref={codeRef}
        position={[0, 2.3, 0]}
        fontSize={0.16}
        color="#A1A1AA"
        anchorX="center"
        anchorY="middle"
      >
        /01_COMPONENT_TREE
      </Text>

      {/* Scalable group anchor where Sprint 4 node networks will mount */}
      <group position={[0, 0.2, 0]}>
        {children}
      </group>
    </group>
  );
};

export default ArchitectureRoom;
