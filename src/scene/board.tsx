import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import {
  BOARD_EDGES,
  BOARD_NODE_IDS,
  MAJOR_NODE_IDS,
  NODE_POSITIONS,
  finishSlotPosition,
  type NodeId,
  type Player,
} from "../game/rules";

export function boardEdgeKey(from: NodeId, to: NodeId) {
  return from < to ? `${from}:${to}` : `${to}:${from}`;
}

// 구조 분해 기본값은 React Compiler v1이 컴파일하지 못해 쓰지 않습니다.
function BoardNode({
  position,
  major,
}: {
  position: [number, number, number];
  major?: boolean;
}) {
  return (
    <group position={position}>
      {major && (
        <>
          <mesh position={[0, 0.026, 0]} receiveShadow>
            <cylinderGeometry args={[0.505, 0.525, 0.024, 48]} />
            <meshStandardMaterial
              color="#2b211c"
              roughness={0.86}
              metalness={0.02}
            />
          </mesh>
          <mesh position={[0, 0.044, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.48, 0.525, 48]} />
            <meshBasicMaterial
              color="#2a201b"
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.39, 0.49, 48]} />
            <meshBasicMaterial
              color="#e0b957"
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
      <mesh position={[0, major ? 0.032 : 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[major ? 0.4 : 0.275, major ? 0.425 : 0.292, 0.018, 48]}
        />
        <meshStandardMaterial
          color={major ? "#29231f" : "#3b2e28"}
          roughness={0.9}
          metalness={0.01}
        />
      </mesh>
      <mesh
        position={[0, major ? 0.042 : 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[major ? 0.325 : 0.21, 48]} />
        <meshStandardMaterial
          color={major ? "#322923" : "#493930"}
          roughness={0.96}
        />
      </mesh>
    </group>
  );
}

// 완주한 말 4개가 모이는 보드 밖 구역. 금색 캡슐 테두리 선 하나로만
// 표시하고, 비어 있을 때도 항상 보여서 말이 빠져나갈 자리를 알 수 있게
// 합니다.
function stadiumOutlineGeometry(
  halfStraight: number,
  radius: number,
  strokeWidth: number,
) {
  const outline = (r: number) => {
    const path = new THREE.Shape();
    path.absarc(halfStraight, 0, r, -Math.PI / 2, Math.PI / 2, false);
    path.absarc(-halfStraight, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    return path;
  };
  const shape = outline(radius);
  shape.holes.push(outline(radius - strokeWidth));
  const geometry = new THREE.ShapeGeometry(shape, 32);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// halfStraight는 슬롯 간격(0.75) 3칸의 절반과 맞춰야 합니다.
const TRAY_GEOMETRY = stadiumOutlineGeometry(1.125, 0.55, 0.055);

function FinishTray({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 말 밑면(0.04) 바로 아래에 그려 어느 시점에서든 말이 선 안에 앉아
          보이게 합니다. */}
      <mesh geometry={TRAY_GEOMETRY} position={[0, 0.035, 0]}>
        <meshBasicMaterial color="#c9a24e" toneMapped={false} />
      </mesh>
    </group>
  );
}

function BoardPathSegment({
  from,
  to,
  previewColor,
}: {
  from: [number, number, number];
  to: [number, number, number];
  previewColor?: string;
}) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const center: [number, number, number] = [
    (from[0] + to[0]) / 2,
    0.086,
    (from[2] + to[2]) / 2,
  ];

  useFrame(({ clock }) => {
    if (!material.current || !previewColor) return;
    material.current.emissiveIntensity =
      0.42 + Math.sin(clock.elapsedTime * 6.5) * 0.16;
  });

  return (
    <group position={center} rotation={[0, angle, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.115, 0.014, Math.max(0.1, length - 0.06)]} />
        <meshStandardMaterial
          ref={material}
          color={previewColor ?? "#3a2d27"}
          emissive={previewColor ?? "#000000"}
          emissiveIntensity={previewColor ? 0.5 : 0}
          roughness={previewColor ? 0.66 : 0.92}
          metalness={0.01}
        />
      </mesh>
    </group>
  );
}

export function BoardSurface({
  previewEdgeColors,
  showFinishTrays,
}: {
  previewEdgeColors?: ReadonlyMap<string, string>;
  showFinishTrays?: boolean;
}) {
  return (
    <group>
      <RoundedBox
        args={[12.2, 0.44, 11.8]}
        radius={0.16}
        smoothness={8}
        position={[0, -0.22, 0]}
        receiveShadow
        castShadow
      >
        <meshPhysicalMaterial
          color="#35251d"
          roughness={0.72}
          clearcoat={0.08}
          clearcoatRoughness={0.7}
        />
      </RoundedBox>
      <RoundedBox
        args={[11.76, 0.1, 11.36]}
        radius={0.03}
        smoothness={6}
        position={[0, 0.025, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#211914" roughness={0.84} />
      </RoundedBox>
      <RoundedBox
        args={[11.58, 0.07, 11.18]}
        radius={0.022}
        smoothness={6}
        position={[0, 0.045, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#bdaa82"
          roughness={0.94}
          clearcoat={0.025}
          clearcoatRoughness={0.9}
        />
      </RoundedBox>

      {BOARD_EDGES.map(([from, to]) => (
        <BoardPathSegment
          key={`${from}-${to}`}
          from={NODE_POSITIONS[from]}
          to={NODE_POSITIONS[to]}
          previewColor={previewEdgeColors?.get(boardEdgeKey(from, to))}
        />
      ))}

      {BOARD_NODE_IDS.map((node) => (
        <BoardNode
          key={node}
          position={NODE_POSITIONS[node]}
          major={MAJOR_NODE_IDS.has(node)}
        />
      ))}

      {showFinishTrays &&
        ([0, 1] as Player[]).map((player) => {
          const first = finishSlotPosition(player, 0);
          const last = finishSlotPosition(player, 3);
          return (
            <FinishTray
              key={`finish-tray-${player}`}
              position={[(first[0] + last[0]) / 2, 0, (first[2] + last[2]) / 2]}
              rotationY={-Math.PI / 2}
            />
          );
        })}
    </group>
  );
}
