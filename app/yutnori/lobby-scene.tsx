import { ContactShadows, Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { BoardSurface, LacquerTokenMesh } from "./board-scene";
import { YutStickMesh } from "./yut-physics";

export type LobbyPreviewMode = "local" | "online" | "ai";

function LobbyToken({
  color,
  highlighted,
  position,
}: {
  color: string;
  highlighted: boolean;
  position: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    const target = highlighted ? 1.18 : 1;
    const scale = THREE.MathUtils.damp(group.current.scale.x, target, 9, delta);
    group.current.scale.setScalar(scale);
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      position[1] + (highlighted ? 0.16 : 0),
      9,
      delta,
    );
  });

  return (
    <group ref={group} position={position}>
      <LacquerTokenMesh color={color} highlighted={highlighted} />
      {highlighted && (
        <>
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45, 0.56, 48]} />
            <meshBasicMaterial color="#e7c678" transparent opacity={0.75} depthWrite={false} />
          </mesh>
          <pointLight color={color} intensity={3.2} distance={3.4} position={[0, 0.55, 0]} />
        </>
      )}
    </group>
  );
}

function FloatingYut({ index, highlighted }: { index: number; highlighted: boolean }) {
  const rotations: [number, number, number][] = [
    [0.08, -0.58, -0.13],
    [-0.03, -0.2, 0.04],
    [0.12, 0.2, -0.04],
    [-0.08, 0.57, 0.12],
  ];
  const positions: [number, number, number][] = [
    [-2.6, 1.82, -1.25],
    [-0.9, 2.12, -1.72],
    [0.9, 2.02, -1.7],
    [2.58, 1.72, -1.18],
  ];

  return (
    <Float
      speed={0.85 + index * 0.08}
      rotationIntensity={highlighted ? 0.12 : 0.045}
      floatIntensity={highlighted ? 0.22 : 0.1}
      floatingRange={[-0.06, 0.06]}
    >
      <group position={positions[index]} rotation={rotations[index]}>
        <YutStickMesh backdo={index === 0} variant={index} />
      </group>
    </Float>
  );
}

function LobbyTable({ previewMode }: { previewMode: LobbyPreviewMode | null }) {
  const rig = useRef<THREE.Group>(null);

  useFrame(({ pointer }, delta) => {
    if (!rig.current) return;
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, pointer.x * 0.065 - 0.06, 4.5, delta);
    rig.current.rotation.x = THREE.MathUtils.damp(rig.current.rotation.x, pointer.y * -0.025, 4.5, delta);
  });

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight
        castShadow
        color="#ffe8b9"
        intensity={3.1}
        position={[5, 10, 6]}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight color="#9a5b31" distance={17} intensity={20} position={[-6, 4, -2]} />
      <pointLight color="#174c6b" distance={12} intensity={previewMode === "local" ? 11 : 4} position={[-5, 2, 4]} />
      <pointLight color="#a63f31" distance={12} intensity={previewMode === "ai" ? 11 : 4} position={[5, 2, 4]} />

      <group ref={rig} position={[0, -0.72, 0]} scale={0.78}>
        <BoardSurface />
        <LobbyToken color="#174c6b" highlighted={previewMode === "local"} position={[-3.55, 0.06, 3.1]} />
        <LobbyToken color="#a63f31" highlighted={previewMode === "ai"} position={[3.35, 0.06, 2.4]} />
        {[0, 1, 2, 3].map((index) => (
          <FloatingYut key={index} index={index} highlighted={previewMode !== "online"} />
        ))}
      </group>

      <ContactShadows position={[0, -1.05, 0]} opacity={0.46} scale={17} blur={2.8} far={9} />
    </>
  );
}

export function LobbyScene({ previewMode }: { previewMode: LobbyPreviewMode | null }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 9.2, 12.7], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
    >
      <Suspense fallback={null}>
        <LobbyTable previewMode={previewMode} />
      </Suspense>
    </Canvas>
  );
}
