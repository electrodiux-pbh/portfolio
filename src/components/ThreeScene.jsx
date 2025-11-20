import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

const noiseOctave = (x, y, noiseFn, octaves = 4, persistence = 0.5, lacunarity = 2) => {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0; // Used for normalizing result to 0.0 - 1.0
    for (let i = 0; i < octaves; i++) {
        total += noiseFn(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
};


function VoxelTerrain() {
  const meshRef = useRef();
  const noise2D = useMemo(() => createNoise2D(), []);
  
  // Terrain configuration
  const gridSize = 200;
  const cellSize = 0.5;
  const count = gridSize * gridSize;

  // Generate data (terrain cache)
  const { positions, colors } = useMemo(() => {
    const positions = [];
    const colors = [];
    const tempColor = new THREE.Color();

    const minColor = new THREE.Color("#090F22");
    const maxColor = new THREE.Color("#00D3F3");

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i - gridSize / 2) * cellSize;
        const z = (j - gridSize / 2) * cellSize;
        
        // Generate height using noise
        // Scale input coordinates for smoother noise
        const noiseScale = 0.018;
        const heightMultiplier = 10;
        const octaves = 4;
        const persistence = 0.5;
        const lacunarity = 1.7;

        const noise = noiseOctave(i * noiseScale, j * noiseScale, noise2D, octaves, persistence, lacunarity);
        const y = Math.floor(noise * heightMultiplier) * cellSize;

        positions.push(x, y, z);

        const ns = Math.max(noise, 0);

        tempColor.set(minColor);  
        tempColor.lerp(maxColor, ns);

        colors.push(tempColor.r, tempColor.g, tempColor.b);
      }
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
  }, [noise2D]);

  useLayoutEffect(() => {
    const tempObject = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      tempObject.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor.needsUpdate = true;
  }, [positions, colors, count]);

  useFrame((state) => {
     // Optional: Add some subtle animation or interaction here if needed
     // For now, static terrain is most performant
     meshRef.current.rotation.y += 0.001;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} position={[0, -2, 0]}>
      <boxGeometry args={[cellSize, cellSize, cellSize]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

export default function ThreeScene() {
  return (
    <div className="absolute inset-0 -z-10 bg-linear-to-b from-slate-950 to-slate-900">
      <Canvas camera={{ position: [15, 15, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
        
        <VoxelTerrain />
        
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
