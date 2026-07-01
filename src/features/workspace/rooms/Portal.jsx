import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";

const corners = [
  [-0.7, -0.7, -0.7],
  [-0.7, -0.7,  0.7],
  [-0.7,  0.7, -0.7],
  [-0.7,  0.7,  0.7],
  [ 0.7, -0.7, -0.7],
  [ 0.7, -0.7,  0.7],
  [ 0.7,  0.7, -0.7],
  [ 0.7,  0.7,  0.7],
];

// Portals use premium pure white for nodes, torus rings, and energy fields
const portalColor = "#ffffff";

/**
 * Reusable 3D Portal Gateway component with node-scattering construct sequence.
 * - Animates/collapses the wireframe symbol representation.
 * - Spawns 8 vertex nodes at corners and scatters them outwards (white).
 * - Implodes nodes back to center to form the circular torus portal (white).
 * - Zoops camera through the portal while scaling it to cover the screen in a flash.
 */
const Portal = ({ active, wireframe, onComplete }) => {
  const { camera } = useThree();
  const portalRef = useRef();
  const ringRef = useRef();
  const fieldRef = useRef();
  const particlesRef = useRef();
  const scatterRef = useRef();

  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();
    
    // Rotate energy field disk slowly
    if (fieldRef.current) {
      fieldRef.current.rotation.z = time * 0.08;
    }
    // Rotate swirling portal sparks
    if (particlesRef.current) {
      particlesRef.current.rotation.z = -time * 0.15;
    }
  });

  useEffect(() => {
    if (!ringRef.current || !fieldRef.current || !particlesRef.current || !scatterRef.current) return;

    if (active) {
      // Kill previous tweens
      gsap.killTweensOf([
        ringRef.current.scale,
        fieldRef.current.scale,
        fieldRef.current.material,
        particlesRef.current.scale,
        portalRef.current.position,
      ]);

      // Reset components to initial states
      ringRef.current.scale.set(0, 0, 0);
      fieldRef.current.scale.set(1, 1, 1);
      fieldRef.current.material.opacity = 0;
      particlesRef.current.scale.set(0, 0, 0);
      portalRef.current.position.set(0, 0.8, 0.05);

      const scatterNodes = scatterRef.current.children;
      scatterNodes.forEach((mesh, index) => {
        const base = corners[index];
        mesh.position.set(base[0], base[1], base[2]);
        mesh.scale.set(0, 0, 0);
        gsap.killTweensOf([mesh.position, mesh.scale]);
      });

      if (wireframe && wireframe.current) {
        gsap.killTweensOf([wireframe.current.scale, wireframe.current.material]);
        wireframe.current.scale.set(1, 1, 1);
      }

      // Timeline sequence
      const tl = gsap.timeline({
        onComplete: () => {
          if (active && onComplete) {
            onComplete();
          }
        }
      });

      // ── STEP 1: WIREFRAME CUBE COLLAPSES & SCATTER NODES REVEAL ──
      if (wireframe && wireframe.current) {
        tl.to(wireframe.current.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.35,
          ease: "power2.inOut",
        }, 0);
        tl.to(wireframe.current.material, {
          emissiveIntensity: 1.8,
          duration: 0.25,
        }, 0);
      }

      scatterNodes.forEach((mesh, index) => {
        const base = corners[index];
        // Fade & Scale in at baseline cube position
        tl.to(mesh.scale, {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 0.25,
          ease: "power2.out",
        }, 0.1);

        // Scatter outwards (fly away from center)
        tl.to(mesh.position, {
          x: base[0] * 3.8,
          y: base[1] * 3.8,
          z: base[2] * 3.8,
          duration: 0.55,
          ease: "power2.out",
        }, 0.25);

        // ── STEP 2: NODES COLLIDE/IMPLODE IN CENTER ──
        tl.to(mesh.position, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.6,
          ease: "power2.in",
        }, 0.85);

        tl.to(mesh.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.2,
        }, 1.25);
      });

      // ── STEP 3: COLLISION SPINS OUT THE PORTAL GATE ──
      tl.to(ringRef.current.scale, {
        x: 1.35,
        y: 1.35,
        z: 1.35,
        duration: 0.7,
        ease: "back.out(1.2)",
      }, 1.3);

      tl.to(fieldRef.current.material, {
        opacity: 0.35,
        duration: 0.6,
        ease: "power2.out",
      }, 1.55);

      tl.to(particlesRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.6,
        ease: "power2.out",
      }, 1.6);

      // ── STEP 4: SUDDEN BRIGHTNESS GLOW & ZOOP TRAVEL ──
      // Dynamic focal brightening flash
      tl.to(fieldRef.current.material, {
        opacity: 1.0,
        duration: 0.4,
        ease: "power2.in",
      }, 2.15);

      tl.to(ringRef.current.scale, {
        x: 1.7,
        y: 1.7,
        z: 1.7,
        duration: 0.45,
        ease: "power2.in",
      }, 2.15);

      // Rapid screen-filling portal scaling (fades scene to solid color)
      tl.to(fieldRef.current.scale, {
        x: 18,
        y: 18,
        z: 18,
        duration: 0.6,
        ease: "power3.in",
      }, 2.15);

      // Move portal forward past the camera to simulate zoop travel
      tl.to(portalRef.current.position, {
        z: 8.0,
        duration: 0.65,
        ease: "power3.in",
      }, 2.15);

    } else {
      // Revert/Collapse cleanups
      gsap.killTweensOf([
        ringRef.current.scale,
        fieldRef.current.scale,
        fieldRef.current.material,
        particlesRef.current.scale,
        portalRef.current.position,
      ]);

      gsap.to(ringRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.4 });
      gsap.to(fieldRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
      gsap.to(fieldRef.current.material, { opacity: 0, duration: 0.3 });
      gsap.to(particlesRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.4 });
      gsap.to(portalRef.current.position, { x: 0, y: 0.8, z: 0.05, duration: 0.4 });

      // Restore wireframe symbol
      if (wireframe && wireframe.current) {
        gsap.to(wireframe.current.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
        gsap.to(wireframe.current.material, { emissiveIntensity: 0.2, duration: 0.5 });
      }

      // Hide scatter nodes
      if (scatterRef.current) {
        scatterRef.current.children.forEach((mesh) => {
          gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.3 });
        });
      }
    }
  }, [active, onComplete, wireframe]);

  return (
    <group ref={portalRef} position={[0, 0.8, 0.05]}>
      {/* 8 Cube corner nodes for scattering animation */}
      <group ref={scatterRef}>
        {corners.map((pos, idx) => (
          <mesh key={idx} position={pos} scale={[0, 0, 0]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshBasicMaterial color={portalColor} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>

      {/* Outer Border Glowing Torus */}
      <mesh ref={ringRef} scale={[0, 0, 0]}>
        <torusGeometry args={[1.05, 0.03, 12, 64]} />
        <meshBasicMaterial color={portalColor} transparent opacity={0.8} />
      </mesh>

      {/* Energy Disk Field */}
      <mesh ref={fieldRef}>
        <circleGeometry args={[1.02, 32]} />
        <meshBasicMaterial 
          color={portalColor} 
          transparent 
          opacity={0} 
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Portal Swirling Sparks */}
      <group ref={particlesRef} scale={[0, 0, 0]}>
        {Array.from({ length: 8 }).map((_, idx) => {
          const angle = (idx / 8) * Math.PI * 2;
          const radius = 0.3 + Math.random() * 0.55;
          return (
            <mesh 
              key={idx} 
              position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0.01]}
            >
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export default Portal;
