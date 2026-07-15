import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  NODE_POSITIONS,
  nodeForPiece,
  type BoardState,
  type NodeId,
  type PieceState,
} from "../game/rules";
import { gameSfx } from "../audio/game-sfx";

const TOKEN_STACK_STEP = 0.17;
const TOKEN_GEOMETRY = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0, 0.016),
    new THREE.Vector2(0.302, 0.016),
    new THREE.Vector2(0.338, 0.025),
    new THREE.Vector2(0.353, 0.045),
    new THREE.Vector2(0.353, 0.132),
    new THREE.Vector2(0.342, 0.153),
    new THREE.Vector2(0.315, 0.169),
    new THREE.Vector2(0, 0.174),
  ],
  64,
);
TOKEN_GEOMETRY.computeVertexNormals();

// 구조 분해 기본값은 React Compiler v1이 컴파일하지 못해 쓰지 않습니다.
export function LacquerTokenMesh({
  color,
  highlighted,
}: {
  color: string;
  highlighted?: boolean;
}) {
  const grooveColor = new THREE.Color(color).multiplyScalar(0.48);

  return (
    <group position={[0, 0.024, 0]}>
      <mesh geometry={TOKEN_GEOMETRY} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.34}
          metalness={0.025}
          clearcoat={0.18}
          clearcoatRoughness={0.58}
          emissive={highlighted ? color : "#000000"}
          emissiveIntensity={highlighted ? 0.58 : 0}
        />
      </mesh>
      <mesh position={[0, 0.166, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.197, 0.007, 8, 48]} />
        <meshStandardMaterial color={grooveColor} roughness={0.72} />
      </mesh>
    </group>
  );
}

export function tokenPlacement(
  pieces: BoardState,
  player: number,
  piece: number,
) {
  const state = pieces[player][piece];
  if (state.status === "home") {
    const side = player === 0 ? -1 : 1;
    return {
      position: [side * 6.5, 0.06, 1.5 - piece] as [number, number, number],
      count: 1,
      slot: 0,
      members: [piece],
    };
  }
  if (state.status === "finished") {
    const side = player === 0 ? -1 : 1;
    return {
      position: [side * 5.32, 0.06, -1.35 - piece * 0.62] as [
        number,
        number,
        number,
      ],
      count: 1,
      slot: 0,
      members: [piece],
    };
  }

  const node = nodeForPiece(state)!;
  const occupants: { player: number; piece: number }[] = [];
  pieces.forEach((side, occupantPlayer) => {
    if (occupantPlayer !== player) return;
    side.forEach((occupantState, occupantPiece) => {
      if (nodeForPiece(occupantState) === node)
        occupants.push({ player: occupantPlayer, piece: occupantPiece });
    });
  });
  occupants.sort(
    (first, second) =>
      pieces[player][first.piece].stackOrder -
        pieces[player][second.piece].stackOrder || first.piece - second.piece,
  );
  const slot = occupants.findIndex(
    (occupant) => occupant.player === player && occupant.piece === piece,
  );
  const count = occupants.length;
  const members = occupants.map((occupant) => occupant.piece);
  const base = NODE_POSITIONS[node];
  if (count <= 1)
    return {
      position: [base[0], base[1], base[2]] as [number, number, number],
      count: 1,
      slot: 0,
      members,
    };

  return {
    position: [base[0], base[1] + slot * TOKEN_STACK_STEP, base[2]] as [
      number,
      number,
      number,
    ],
    count,
    slot,
    members,
  };
}

export function Token({
  position,
  color,
  state,
  highlighted,
  stackLabel,
  activeMoveId,
  moveWaypoints,
  moveWaypointClearances,
  movingStackSlot,
  notifyOnMoveComplete,
  onMoveComplete,
}: {
  position: [number, number, number];
  color: string;
  state: PieceState;
  highlighted: boolean;
  stackLabel: string | null;
  activeMoveId: number | null;
  moveWaypoints: NodeId[] | null;
  moveWaypointClearances: number[] | null;
  movingStackSlot: number;
  notifyOnMoveComplete: boolean;
  onMoveComplete: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  // 마운트 시점의 위치를 고정합니다. 이후 위치는 useFrame이 직접 제어합니다.
  const [initialPosition] = useState<[number, number, number]>(() => [
    position[0],
    position[1],
    position[2],
  ]);
  const target = new THREE.Vector3(position[0], position[1], position[2]);
  const segmentStart = useRef(target.clone());
  const segmentEnd = useRef(target.clone());
  const segmentProgress = useRef(1);
  const segmentDuration = useRef(0.42);
  const jumpHeight = useRef(0.38);
  const waypointQueue = useRef<THREE.Vector3[]>([]);
  const notifyWhenFinished = useRef(false);
  const handledMoveId = useRef<number | null>(null);

  const beginNextSegment = () => {
    const group = ref.current;
    const next = waypointQueue.current.shift();
    if (!group || !next) {
      segmentProgress.current = 1;
      if (notifyWhenFinished.current) {
        notifyWhenFinished.current = false;
        onMoveComplete();
      }
      return;
    }
    segmentStart.current.copy(group.position);
    segmentEnd.current.copy(next);
    segmentProgress.current = 0;
    const distance = segmentStart.current.distanceTo(segmentEnd.current);
    segmentDuration.current = Math.min(0.58, Math.max(0.3, distance * 0.14));
    jumpHeight.current = Math.min(0.55, Math.max(0.3, distance * 0.13));
  };

  useEffect(() => {
    const group = ref.current;
    if (!group) return;

    if (activeMoveId !== null && activeMoveId !== handledMoveId.current) {
      handledMoveId.current = activeMoveId;
      notifyWhenFinished.current = notifyOnMoveComplete;
      waypointQueue.current = (moveWaypoints ?? []).map((node, index) => {
        const point = NODE_POSITIONS[node];
        const clearance = moveWaypointClearances?.[index] ?? 0;
        return new THREE.Vector3(
          point[0],
          point[1] + clearance + movingStackSlot * TOKEN_STACK_STEP,
          point[2],
        );
      });
      const lastWaypoint =
        waypointQueue.current[waypointQueue.current.length - 1];
      const endsAtTargetXZ =
        lastWaypoint &&
        Math.abs(lastWaypoint.x - target.x) < 0.01 &&
        Math.abs(lastWaypoint.z - target.z) < 0.01;
      if (!endsAtTargetXZ) {
        waypointQueue.current.push(target.clone());
      }
      beginNextSegment();
      return;
    }
    if (group.position.distanceTo(target) < 0.01) return;
    waypointQueue.current = [target.clone()];
    beginNextSegment();
  }, [
    activeMoveId,
    beginNextSegment,
    moveWaypointClearances,
    moveWaypoints,
    movingStackSlot,
    notifyOnMoveComplete,
    state,
    target,
  ]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;

    if (segmentProgress.current < 1) {
      segmentProgress.current = Math.min(
        1,
        segmentProgress.current + delta / segmentDuration.current,
      );
      const t = segmentProgress.current;
      const eased = t * t * (3 - 2 * t);
      group.position.lerpVectors(
        segmentStart.current,
        segmentEnd.current,
        eased,
      );
      group.position.y += Math.sin(Math.PI * t) * jumpHeight.current;
      if (segmentProgress.current >= 1) {
        group.position.copy(segmentEnd.current);
        if (notifyOnMoveComplete) gameSfx.playPieceStep();
        beginNextSegment();
      }
    }

    const targetScale = highlighted ? 1.16 : 1;
    const scaleEase = 1 - Math.exp(-delta * 11);
    group.scale.x += (targetScale - group.scale.x) * scaleEase;
    group.scale.y += (targetScale - group.scale.y) * scaleEase;
    group.scale.z += (targetScale - group.scale.z) * scaleEase;
    group.rotation.y +=
      delta * (state.status === "finished" ? 1.6 : highlighted ? 1.15 : 0.35);
  });

  return (
    <group ref={ref} position={initialPosition}>
      <LacquerTokenMesh color={color} highlighted={highlighted} />
      <mesh
        visible={highlighted}
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.38, 0.48, 36]} />
        <meshBasicMaterial
          color="#f4d283"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        color={highlighted ? "#f4d283" : color}
        intensity={highlighted ? 2.1 : state.status === "finished" ? 1.3 : 0}
        distance={2.7}
      />
      {stackLabel && (
        <Html
          center
          position={[0, 0.49, 0]}
          distanceFactor={8.5}
          style={{ pointerEvents: "none" }}
        >
          <span className="block min-w-[76px] rounded-full border-[1.5px] border-gold/65 bg-night/95 px-[13px] py-2 text-center text-[clamp(15px,1.2vw,18px)] leading-[1.1] font-extrabold tracking-[-.02em] whitespace-nowrap text-parchment-bright shadow-[0_7px_20px] shadow-black/40">
            {stackLabel}
          </span>
        </Html>
      )}
    </group>
  );
}
