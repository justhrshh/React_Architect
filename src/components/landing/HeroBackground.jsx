import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Decouple Math.random from render to comply with react-hooks/purity rule
function generateNetworkFieldData(count, radius) {
  const pos = new Float32Array(count * 3);
  const points = [];
  for (let i = 0; i < count; i++) {
    const r = radius * (0.6 + Math.random() * 0.4);
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = 2 * Math.PI * Math.random();
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi) * 0.7;
    const z = r * Math.cos(theta);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    points.push(new THREE.Vector3(x, y, z));
  }

  // Build neighbour lines (limited)
  const linePositions = [];
  const threshold = 1.6;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].distanceTo(points[j]) < threshold) {
        linePositions.push(points[i].x, points[i].y, points[i].z);
        linePositions.push(points[j].x, points[j].y, points[j].z);
      }
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  return { positions: pos, lineGeo: lineGeometry };
}

/**
 * NetworkField — a rotating cloud of nodes connected by thin
 * lines to their nearest neighbours. Reads like an architecture
 * graph floating in deep space.
 */
const NetworkField = ({ count = 140, radius = 6 }) => {
  const groupRef = useRef(null);
  const pointsRef = useRef(null);
  const linesRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });

  const { positions, lineGeo } = useMemo(() => {
    return generateNetworkFieldData(count, radius);
  }, [count, radius]);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.04;
    groupRef.current.rotation.x += delta * 0.012;
    // soft parallax toward mouse
    const targetX = mouse.current.y * 0.25;
    const targetY = mouse.current.x * 0.35;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.02;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.02;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={new THREE.Color("#ffffff")}
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeo}>
        <lineBasicMaterial
          color={new THREE.Color("#00E5FF")}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};

const HeroBackground = () => (
  <div className="absolute inset-0 -z-0">
    {/* CSS grid + glow underneath the R3F canvas */}
    <div className="absolute inset-0 grid-bg opacity-90" />
    <div className="absolute inset-0 vignette" />
    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-50"
         style={{ background: "radial-gradient(closest-side, rgba(0,229,255,0.22), transparent 70%)" }} />
    <Canvas
      camera={{ position: [0, 0, 10], fov: 55 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.6} />
      <NetworkField />
    </Canvas>
    {/* soft floor fade */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-obsidian to-transparent" />
  </div>
);

export default HeroBackground;
