import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// Premium Industrial Framework Colors
// ─────────────────────────────────────────────────────────────────────────────
const FW_COLOR = {
  "React":            "#00e5ff",
  "Next.js":          "#f8fafc",
  "Create React App": "#00ffd0",
  "Vite":             "#a855f7",
  "Remix":            "#60a5fa",
  "Gatsby":           "#a855f7",
};

function getFwColor(fw) {
  return FW_COLOR[fw] ?? "#00e5ff";
}

// ─────────────────────────────────────────────────────────────────────────────
// Holographic Leader Pointer lines
// ─────────────────────────────────────────────────────────────────────────────
const LeaderLine = ({ color, startX = 0, startY = 0.6, startZ = 0 }) => {
  return (
    <group position={[startX, startY, startZ]}>
      {/* Precision vertical micro-segment */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.003, 0.1, 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      
      {/* Sleek diagonal bracket arm */}
      <mesh position={[0.15, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.22, 0.003, 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      
      {/* Underline anchor */}
      <mesh position={[0.36, 0.278, 0]}>
        <boxGeometry args={[0.2, 0.003, 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3D Spawning File Nodes
// ─────────────────────────────────────────────────────────────────────────────
const FileNode = ({ name, index, total, transitionState, color }) => {
  const meshRef = useRef();

  const angle = (index / total) * Math.PI * 2;
  const radius = 0.55;
  const startX = Math.cos(angle) * radius;
  const startZ = Math.sin(angle) * radius;

  useEffect(() => {
    if (!meshRef.current) return;

    if (transitionState === "spawning_files") {
      meshRef.current.position.set(0, 0, 0);
      meshRef.current.scale.set(0, 0, 0);

      gsap.to(meshRef.current.position, {
        x: startX,
        y: 0.45,
        z: startZ,
        duration: 0.8,
        ease: "back.out(1.2)",
        delay: index * 0.05,
      });
      gsap.to(meshRef.current.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.6,
        delay: index * 0.05,
      });
    } else if (transitionState === "compressing") {
      gsap.to(meshRef.current.position, {
        x: 0,
        y: 0.2,
        z: 0,
        duration: 0.6,
        ease: "power3.in",
      });
      gsap.to(meshRef.current.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.5,
        ease: "power2.in",
      });
    }
  }, [transitionState]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    if (!meshRef.current || transitionState !== "spawning_files") return;
    const time = state.clock.getElapsedTime();
    meshRef.current.position.y = 0.4 + Math.sin(time * 2.0 + index) * 0.025;
    meshRef.current.rotation.y = time * 0.5 + index;
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.09, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.045}
        color="#f1f5f9"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Premium Project Column Terminal
// ─────────────────────────────────────────────────────────────────────────────
const ProjectTower = ({
  project,
  position,
  hoveredId,
  selectedId,
  onHover,
  onLeave,
  onClick,
  onContextMenu,
}) => {
  const groupRef = useRef();
  const baseFrameRef = useRef();
  const baseNeonRef = useRef();
  const laserRef = useRef();

  const isHovered = hoveredId === project.id;
  const color = getFwColor(project.framework);

  useFrame(() => {
    if (!groupRef.current || !baseNeonRef.current || !laserRef.current || !baseFrameRef.current) return;
    
    const targetScale = isHovered ? 1.05 : 1.0;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

    // Bevel frame roughness reduction on hover
    baseFrameRef.current.material.roughness = THREE.MathUtils.lerp(
      baseFrameRef.current.material.roughness,
      isHovered ? 0.1 : 0.25,
      0.15
    );
    baseNeonRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
      baseNeonRef.current.material.emissiveIntensity,
      isHovered ? 2.5 : 0.6,
      0.15
    );
    laserRef.current.material.opacity = THREE.MathUtils.lerp(
      laserRef.current.material.opacity,
      isHovered ? 0.85 : 0.25,
      0.15
    );
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(project);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerEnter={(e) => { e.stopPropagation(); onHover(project.id); }}
      onPointerLeave={(e) => { e.stopPropagation(); onLeave(); }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, project); }}
    >
      {/* Layer 1: Dark Anodized Metal Base Chassis Bracket */}
      <mesh ref={baseFrameRef} position={[0, 0.015, 0]}>
        <boxGeometry args={[0.24, 0.03, 0.24]} />
        <meshStandardMaterial
          color="#0f0f11"
          roughness={0.25}
          metalness={0.95}
        />
      </mesh>

      {/* Layer 2: Embedded Neon glow light seam */}
      <mesh ref={baseNeonRef} position={[0, 0.035, 0]}>
        <boxGeometry args={[0.2, 0.01, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Layer 3: Stacked Premium Physical Glass block 1 (Base segment) */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.18]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.05}
          metalness={0.15}
          transmission={0.9}
          thickness={0.5}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Stacked Glass block 2 (Mid segment) */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.13, 0.16, 0.13]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.05}
          metalness={0.15}
          transmission={0.9}
          thickness={0.4}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Stacked Glass block 3 (Top segment) */}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.05}
          metalness={0.15}
          transmission={0.9}
          thickness={0.3}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Laser light pillar core */}
      <mesh ref={laserRef} position={[0, 0.26, 0]}>
        <boxGeometry args={[0.01, 0.52, 0.01]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Leader Bracket & elegant labels (Increased Size for Readability) */}
      {isHovered && (
        <group>
          <LeaderLine color={color} startX={0} startY={0.52} startZ={0} />

          <group position={[0.48, 0.86, 0]}>
            <Text
              fontSize={0.14}
              color="#ffffff"
              anchorX="left"
              anchorY="middle"
            >
              {project.name}
            </Text>
            
            <Text
              position={[0, -0.11, 0]}
              fontSize={0.08}
              color={color}
              anchorX="left"
              anchorY="middle"
            >
              Click to Select
            </Text>
          </group>
        </group>
      )}
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3D Glass/Metal Add Terminal
// ─────────────────────────────────────────────────────────────────────────────
const AddTower = ({ position, onAddClick }) => {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? "#00e5ff" : "#4b5563";

  return (
    <group
      position={position}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
      onClick={(e) => { e.stopPropagation(); onAddClick(); }}
    >
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.2, 0.03, 0.2]} />
        <meshStandardMaterial color="#0f0f11" roughness={0.25} metalness={0.95} />
      </mesh>

      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.16, 0.01, 0.16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.5 : 0.2} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.14, 0.22, 0.14]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.08}
          metalness={0.1}
          transmission={0.9}
          thickness={0.3}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      <group position={[0, 0.14, 0]}>
        <mesh>
          <boxGeometry args={[0.06, 0.008, 0.008]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.008, 0.06, 0.008]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {hovered && (
        <group>
          <LeaderLine color="#00e5ff" startX={0} startY={0.26} startZ={0} />
          <group position={[0.48, 0.6, 0]}>
            <Text
              fontSize={0.14}
              color="#ffffff"
              anchorX="left"
              anchorY="middle"
            >
              NEW PROJECT
            </Text>
            <Text
              position={[0, -0.11, 0]}
              fontSize={0.08}
              color="#00e5ff"
              anchorX="left"
              anchorY="middle"
            >
              Import or Create wizard
            </Text>
          </group>
        </group>
      )}
    </group>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Operating Surface
// ─────────────────────────────────────────────────────────────────────────────
const BrainRoom = ({
  active,
  focused,
  exploreMode,
  onSelect,
  hubMode = false,
  projectName = "",
  projects = [],
  onSelectProject,
  onAddClick,
  onContextMenu,
}) => {
  const groupRef = useRef();
  const surfaceRef = useRef();
  const innerRingRef = useRef();
  const outerRingRef = useRef();
  const waveRingRef = useRef();
  const lightRef = useRef();

  // Stacked industrial frame layer refs
  const slabRef = useRef();
  const slabBorderRef = useRef();
  const crosshair1Ref = useRef();
  const crosshair2Ref = useRef();
  const towersGroupRef = useRef();

  // Integrated energy track refs
  const pulse1Ref = useRef();
  const pulse2Ref = useRef();

  const titleRef = useRef();
  const codeRef = useRef();

  // Selection states
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transitionState, setTransitionState] = useState("idle");

  const [towersActive, setTowersActive] = useState(!hubMode);

  // ── Constructing animation sequence on mount (holographic table power on) ──
  useEffect(() => {
    if (!hubMode) {
      setTowersActive(true);
      return;
    }

    setTowersActive(false);

    // Initial state setup before animation starts
    if (slabRef.current) slabRef.current.material.opacity = 0;
    if (slabBorderRef.current) slabBorderRef.current.material.opacity = 0;
    if (innerRingRef.current) innerRingRef.current.material.opacity = 0;
    if (outerRingRef.current) outerRingRef.current.material.opacity = 0;
    if (crosshair1Ref.current) crosshair1Ref.current.scale.set(0, 1, 1);
    if (crosshair2Ref.current) crosshair2Ref.current.scale.set(1, 1, 0);
    if (lightRef.current) lightRef.current.intensity = 0;
    if (towersGroupRef.current) {
      towersGroupRef.current.position.y = -1.0;
      towersGroupRef.current.scale.set(0, 0, 0);
    }

    const tl = gsap.timeline({
      delay: 0.1,
      onComplete: () => {
        setTowersActive(true);
      }
    });

    // 1. Concentric blueprint rings draw themselves (subtle)
    if (innerRingRef.current && outerRingRef.current) {
      tl.to(innerRingRef.current.material, { opacity: 0.12, duration: 0.6, ease: "power1.inOut" });
      tl.to(outerRingRef.current.material, { opacity: 0.08, duration: 0.6, ease: "power1.inOut" }, "<");
    }

    // 2. Thick metallic alloy frame and border lines fade in
    if (slabRef.current && slabBorderRef.current) {
      tl.to(slabRef.current.material, { opacity: 0.9, duration: 0.5, ease: "power2.out" }, "-=0.2");
      tl.to(slabBorderRef.current.material, { opacity: 0.15, duration: 0.4, ease: "power2.out" }, "<");
    }

    // 3. Connection laser channels (crosshairs) slide in/grow
    if (crosshair1Ref.current && crosshair2Ref.current) {
      tl.to(crosshair1Ref.current.scale, { x: 1, duration: 0.4, ease: "power2.out" }, "-=0.1");
      tl.to(crosshair2Ref.current.scale, { z: 1, duration: 0.4, ease: "power2.out" }, "<");
    }

    // 4. Glow stabilizes (console point light)
    if (lightRef.current) {
      tl.to(lightRef.current, { intensity: 1.8, duration: 0.6, ease: "power2.out" }, "-=0.2");
    }

    // 5. Scan line pass across the surface
    if (waveRingRef.current) {
      tl.call(() => {
        if (!waveRingRef.current) return;
        waveRingRef.current.scale.set(0.1, 0.1, 0.1);
        waveRingRef.current.material.opacity = 0.5;
      });
      tl.to(waveRingRef.current.scale, { x: 2.7, y: 2.7, z: 2.7, duration: 0.7, ease: "power2.out" });
      tl.to(waveRingRef.current.material, { opacity: 0, duration: 0.7, ease: "power2.out" }, "<");
    }

    // 6. Project towers emerge from the surface
    tl.call(() => {
      if (towersGroupRef.current) {
        gsap.to(towersGroupRef.current.position, { y: 0, duration: 0.8, ease: "back.out(1.1)" });
        gsap.to(towersGroupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "power2.out" });
      }
    });

    return () => {
      tl.kill();
    };
  }, [hubMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Workspace Mode Active (snap state parameters bypass timeline)
  useEffect(() => {
    if (hubMode) return;
    if (slabRef.current) slabRef.current.material.opacity = 0.9;
    if (slabBorderRef.current) slabBorderRef.current.material.opacity = 0.15;
    if (innerRingRef.current) innerRingRef.current.material.opacity = 0.12;
    if (outerRingRef.current) outerRingRef.current.material.opacity = 0.08;
    if (crosshair1Ref.current) crosshair1Ref.current.scale.set(1, 1, 1);
    if (crosshair2Ref.current) crosshair2Ref.current.scale.set(1, 1, 1);
    if (lightRef.current) lightRef.current.intensity = 1.5;
    setTowersActive(true);
  }, [hubMode]);

  // Project select loading process
  const handleProjectClick = (project) => {
    if (transitionState !== "idle") return;
    setSelectedProject(project);
    setTransitionState("expanding");

    setTimeout(() => {
      setTransitionState("spawning_files");
    }, 600);

    setTimeout(() => {
      setTransitionState("compressing");
    }, 2200);

    setTimeout(() => {
      setTransitionState("loading");
      if (waveRingRef.current) {
        waveRingRef.current.scale.set(0.1, 0.1, 0.1);
        waveRingRef.current.material.opacity = 0.7;
        gsap.to(waveRingRef.current.scale, {
          x: 2.8, y: 2.8, z: 2.8,
          duration: 1.2,
          ease: "expo.out",
        });
        gsap.to(waveRingRef.current.material, {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
        });
      }
      if (lightRef.current) {
        gsap.to(lightRef.current, {
          intensity: 4.5,
          duration: 0.4,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
        });
      }
    }, 2850);

    setTimeout(() => {
      setTransitionState("idle");
      setSelectedProject(null);
      onSelectProject(project);
    }, 3900);
  };

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const speedMult = hubMode ? 0.7 : active ? 1.0 : exploreMode ? 0.5 : 0.15;

    // Table console slow rotation
    if (surfaceRef.current) {
      surfaceRef.current.rotation.y = time * 0.015 * speedMult;
      surfaceRef.current.position.y = -0.55 + Math.sin(time * 0.8) * 0.015 * speedMult;
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = time * 0.1 * speedMult;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -time * 0.06 * speedMult;
    }

    // Animate energy pulses running along the axis channels
    if (pulse1Ref.current) {
      pulse1Ref.current.position.x = Math.sin(time * 1.2) * 2.4;
    }
    if (pulse2Ref.current) {
      pulse2Ref.current.position.z = Math.cos(time * 1.2) * 1.8;
    }
  });

  useEffect(() => {
    if (!surfaceRef.current || !innerRingRef.current || !outerRingRef.current || !lightRef.current) return;

    let targetCoreScale = 0.45;
    let targetLightIntensity = 0.15;
    let targetTextOpacity = 0.08;

    if (hubMode) {
      targetCoreScale = 1.35;
      targetLightIntensity = 1.8;
      targetTextOpacity = 0.85; // highly visible typography
    } else if (active) {
      targetCoreScale = 1.0;
      targetLightIntensity = 1.5;
      targetTextOpacity = 0.9;
    } else if (exploreMode) {
      targetCoreScale = 0.8;
      targetLightIntensity = 0.8;
      targetTextOpacity = 0.4;
    }

    gsap.to(surfaceRef.current.scale, {
      x: targetCoreScale,
      y: targetCoreScale,
      z: targetCoreScale,
      duration: 1.5,
      ease: "power2.out",
    });

    if (!hubMode) {
      gsap.to(lightRef.current, {
        intensity: targetLightIntensity,
        duration: 1.2,
        ease: "power2.out",
      });
    }

    if (titleRef.current) {
      gsap.to(titleRef.current, {
        fillOpacity: targetTextOpacity,
        duration: 1.2,
      });
    }
    if (codeRef.current) {
      gsap.to(codeRef.current, {
        fillOpacity: targetTextOpacity * 0.6,
        duration: 1.2,
      });
    }
  }, [active, exploreMode, hubMode]);

  // Staggered positioning coordinates
  const NODE_SPACING = 1.0;
  const nodesCount = projects.length + 1;
  const nodesWidth = (nodesCount - 1) * NODE_SPACING;
  const startX = -nodesWidth / 2;

  const representativeFiles = ["App.jsx", "Navbar.jsx", "routes.js", "reduxSlice.js", "api.js"];
  const selectedProjColor = selectedProject ? getFwColor(selectedProject.framework) : "#00e5ff";

  return (
    <group 
      ref={groupRef}
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
    >
      {/* Light hierarchy point light */}
      <pointLight ref={lightRef} position={[0, 2.5, 0]} intensity={1.2} distance={10} color="#00e5ff" />

      {/* ── Layered Architectural Console (Horizontal table sandwich) ── */}
      <group ref={surfaceRef} position={[0, -0.55, 0]}>
        
        {/* Layer 1: Dark metallic chassis frame (spacecraft alloy) */}
        <mesh ref={slabRef} position={[0, -0.08, 0]}>
          <boxGeometry args={[5.6, 0.16, 4.2]} />
          <meshStandardMaterial
            color="#09090b"
            roughness={0.22}
            metalness={0.95}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Layer 2: CNC beveled aluminium border frames */}
        <mesh ref={slabBorderRef} position={[0, -0.01, 0]}>
          <boxGeometry args={[5.615, 0.025, 4.215]} />
          <meshStandardMaterial
            color="#1e1e24"
            roughness={0.15}
            metalness={0.9}
            transparent
            opacity={0.15}
            wireframe
          />
        </mesh>

        {/* Layer 3: Smoked Sapphire Glass Top Screen (highly transparent, glossy clearcoat) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[2.0, 64]} />
          <meshPhysicalMaterial
            color="#030304"
            roughness={0.06}
            metalness={0.1}
            transmission={0.95}
            thickness={0.8}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Layer 4: Projection ring track (subtle blueprint circle markings) */}
        <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[1.97, 1.99, 64]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[1.2, 1.215, 64]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* Axis center grid line channels */}
        <mesh ref={crosshair1Ref} position={[0, 0.015, 0]}>
          <boxGeometry args={[5.2, 0.002, 0.005]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.05} depthWrite={false} />
        </mesh>
        <mesh ref={crosshair2Ref} position={[0, 0.015, 0]}>
          <boxGeometry args={[0.005, 0.002, 3.8]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.05} depthWrite={false} />
        </mesh>

        {/* Layer 5: Energy pulses traveling inside laser channels */}
        <mesh ref={pulse1Ref} position={[0, 0.018, 0]}>
          <boxGeometry args={[0.15, 0.002, 0.006]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh ref={pulse2Ref} position={[0, 0.018, 0]}>
          <boxGeometry args={[0.006, 0.002, 0.15]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} depthWrite={false} />
        </mesh>

        {/* Concentric scan ripple */}
        <mesh ref={waveRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[0, 0, 0]}>
          <ringGeometry args={[1.0, 1.03, 64]} />
          <meshBasicMaterial color={selectedProjColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* ── 3D Project Glass Towers Strip (staggered depth) ── */}
        {hubMode && (
          <group ref={towersGroupRef} position={[0, 0.03, -0.4]}>
            {towersActive && transitionState === "idle" && (
              <>
                {projects.map((project, i) => {
                  const depthStagger = (i % 2) * -0.4;
                  return (
                    <ProjectTower
                      key={project.id}
                      project={project}
                      position={[startX + i * NODE_SPACING, 0, depthStagger]}
                      hoveredId={hoveredId}
                      selectedId={selectedProject?.id}
                      onHover={setHoveredId}
                      onLeave={() => setHoveredId(null)}
                      onClick={handleProjectClick}
                      onContextMenu={onContextMenu}
                    />
                  );
                })}

                <AddTower
                  position={[startX + projects.length * NODE_SPACING, 0, (projects.length % 2) * -0.4]}
                  onAddClick={onAddClick}
                />
              </>
            )}
          </group>
        )}

      </group>

      {/* ── Spawning files nodes ── */}
      {transitionState !== "idle" && (
        <group position={[0, -0.1, 0]}>
          {representativeFiles.map((fname, i) => (
            <FileNode
              key={fname}
              name={fname}
              index={i}
              total={representativeFiles.length}
              transitionState={transitionState}
              color={selectedProjColor}
            />
          ))}
        </group>
      )}

      {/* ── Floating Holographic Projection Labels (Elegant & Scaled) ── */}
      <Text
        ref={titleRef}
        position={[0, hubMode ? 1.5 : 1.1, 0]}
        fontSize={0.34}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {hubMode
          ? (selectedProject ? selectedProject.name : "PROJECT HUB")
          : (projectName || "PROJECT BRAIN")}
      </Text>
      
      <Text
        ref={codeRef}
        position={[0, hubMode ? 1.12 : 0.78, 0]}
        fontSize={0.14}
        color={selectedProjColor}
        anchorX="center"
        anchorY="middle"
      >
        {hubMode
          ? (transitionState === "idle" ? "/00_SELECT_PROJECT" : `/00_LOADING_${transitionState.toUpperCase()}`)
          : "/00_CORE_HUB"}
      </Text>

    </group>
  );
};

export default BrainRoom;
