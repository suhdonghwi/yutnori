import { useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  BOARD_EDGES,
  BOARD_NODE_IDS,
  MAJOR_NODE_IDS,
  NODE_POSITIONS,
  nodeForPiece,
  sameStack,
  type BoardState,
  type NodeId,
  type PieceState,
  type Player,
} from "./rules";
import { PLAYERS } from "./game-config";
import type { ActiveMove, HoveredToken, MovePreview } from "./game-types";
import { YutPhysics } from "./yut-physics";

function BoardNode({ position, major = false }: { position: [number, number, number]; major?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[major ? 0.47 : 0.31, major ? 0.51 : 0.35, 0.075, 32]} />
        <meshStandardMaterial color={major ? "#2a1c16" : "#4b3024"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <cylinderGeometry args={[major ? 0.3 : 0.17, major ? 0.3 : 0.17, 0.014, 24]} />
        <meshBasicMaterial color={major ? "#dfc27e" : "#b78f54"} />
      </mesh>
    </group>
  );
}

function BoardPathSegment({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const center: [number, number, number] = [(from[0] + to[0]) / 2, 0, (from[2] + to[2]) / 2];

  return (
    <group position={center} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.026, 0]} receiveShadow>
        <boxGeometry args={[0.2, 0.04, length]} />
        <meshStandardMaterial color="#322018" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.051, 0]}>
        <boxGeometry args={[0.065, 0.012, Math.max(0.1, length - 0.08)]} />
        <meshBasicMaterial color="#c39a5c" />
      </mesh>
    </group>
  );
}

function PreviewPathSegment({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const center: [number, number, number] = [(from[0] + to[0]) / 2, 0.082, (from[2] + to[2]) / 2];

  useFrame(({ clock }) => {
    if (material.current) material.current.opacity = 0.68 + Math.sin(clock.elapsedTime * 7) * 0.16;
  });

  return (
    <group position={center} rotation={[0, angle, 0]}>
      <mesh>
        <boxGeometry args={[0.18, 0.025, Math.max(0.12, length - 0.04)]} />
        <meshBasicMaterial
          ref={material}
          color={color}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function PreviewPathNode({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const scale = 1 + Math.sin(clock.elapsedTime * 7.5) * 0.1;
    ref.current.scale.setScalar(scale);
  });

  return (
    <group ref={ref} position={[position[0], 0.115, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color={color} intensity={1.3} distance={1.8} position={[0, 0.32, 0]} />
    </group>
  );
}

function MoveDestinationPreview({ preview }: { preview: MovePreview }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 5.2) * 0.09;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref} position={[preview.position[0], 0.13, preview.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.61, 40]} />
        <meshBasicMaterial color={preview.color} transparent opacity={0.88} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.44, 40]} />
        <meshBasicMaterial color={preview.color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color={preview.color} intensity={1.8} distance={2.1} position={[0, 0.42, 0]} />
      <Html center position={[0, 0.72, 0]} distanceFactor={8.5} style={{ pointerEvents: "none" }}>
        <div className="move-preview-labels">
          <span className="move-preview-badge">{preview.label}</span>
          {preview.action && (
            <span className={`move-preview-action ${preview.action === "잡기!" ? "capture" : "stack"}`}>
              {preview.action}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export function tokenPlacement(pieces: BoardState, player: number, piece: number) {
  const state = pieces[player][piece];
  if (state.status === "home") {
    const side = player === 0 ? -1 : 1;
    return { position: [side * 6.5, 0.06, 1.5 - piece] as [number, number, number], count: 1, slot: 0, members: [piece] };
  }
  if (state.status === "finished") {
    const side = player === 0 ? -1 : 1;
    return { position: [side * 5.32, 0.06, -1.35 - piece * 0.62] as [number, number, number], count: 1, slot: 0, members: [piece] };
  }

  const node = nodeForPiece(state)!;
  const occupants: { player: number; piece: number }[] = [];
  pieces.forEach((side, occupantPlayer) => {
    if (occupantPlayer !== player) return;
    side.forEach((occupantState, occupantPiece) => {
      if (nodeForPiece(occupantState) === node) occupants.push({ player: occupantPlayer, piece: occupantPiece });
    });
  });
  const slot = occupants.findIndex((occupant) => occupant.player === player && occupant.piece === piece);
  const count = occupants.length;
  const members = occupants.map((occupant) => occupant.piece);
  const base = NODE_POSITIONS[node];
  if (count <= 1) return { position: [base[0], base[1], base[2]] as [number, number, number], count: 1, slot: 0, members };

  return {
    position: [base[0], base[1] + slot * 0.19, base[2]] as [number, number, number],
    count,
    slot,
    members,
  };
}

function Token({
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
  const initialPosition = useRef<[number, number, number]>([position[0], position[1], position[2]]);
  const target = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );
  const segmentStart = useRef(target.clone());
  const segmentEnd = useRef(target.clone());
  const segmentProgress = useRef(1);
  const segmentDuration = useRef(0.42);
  const jumpHeight = useRef(0.38);
  const waypointQueue = useRef<THREE.Vector3[]>([]);
  const notifyWhenFinished = useRef(false);
  const handledMoveId = useRef<number | null>(null);

  const beginNextSegment = useCallback(() => {
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
  }, [onMoveComplete]);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;

    if (activeMoveId !== null && activeMoveId !== handledMoveId.current) {
      handledMoveId.current = activeMoveId;
      notifyWhenFinished.current = notifyOnMoveComplete;
      waypointQueue.current = (moveWaypoints ?? []).map((node, index) => {
        const point = NODE_POSITIONS[node];
        const clearance = moveWaypointClearances?.[index] ?? 0;
        return new THREE.Vector3(point[0], point[1] + clearance + movingStackSlot * 0.19, point[2]);
      });
      const lastWaypoint = waypointQueue.current[waypointQueue.current.length - 1];
      const endsAtTargetXZ = lastWaypoint
        && Math.abs(lastWaypoint.x - target.x) < 0.01
        && Math.abs(lastWaypoint.z - target.z) < 0.01;
      if (!endsAtTargetXZ) {
        waypointQueue.current.push(target.clone());
      }
      beginNextSegment();
      return;
    }
    if (group.position.distanceTo(target) < 0.01) return;
    waypointQueue.current = [target.clone()];
    beginNextSegment();
  }, [activeMoveId, beginNextSegment, moveWaypointClearances, moveWaypoints, movingStackSlot, notifyOnMoveComplete, state, target]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;

    if (segmentProgress.current < 1) {
      segmentProgress.current = Math.min(1, segmentProgress.current + delta / segmentDuration.current);
      const t = segmentProgress.current;
      const eased = t * t * (3 - 2 * t);
      group.position.lerpVectors(segmentStart.current, segmentEnd.current, eased);
      group.position.y += Math.sin(Math.PI * t) * jumpHeight.current;
      if (segmentProgress.current >= 1) {
        group.position.copy(segmentEnd.current);
        beginNextSegment();
      }
    }

    const targetScale = highlighted ? 1.16 : 1;
    const scaleEase = 1 - Math.exp(-delta * 11);
    group.scale.x += (targetScale - group.scale.x) * scaleEase;
    group.scale.y += (targetScale - group.scale.y) * scaleEase;
    group.scale.z += (targetScale - group.scale.z) * scaleEase;
    group.rotation.y += delta * (state.status === "finished" ? 1.6 : highlighted ? 1.15 : 0.35);
  });

  return (
    <group ref={ref} position={initialPosition.current}>
      <mesh castShadow receiveShadow position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.19, 48]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.08} emissive={highlighted ? color : "#000000"} emissiveIntensity={highlighted ? 0.55 : 0} />
      </mesh>
      <mesh castShadow position={[0, 0.208, 0]}>
        <cylinderGeometry args={[0.275, 0.275, 0.026, 48]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.12} emissive={highlighted ? color : "#000000"} emissiveIntensity={highlighted ? 0.7 : 0} />
      </mesh>
      <mesh position={[0, 0.224, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.19, 0.215, 36]} />
        <meshBasicMaterial color="#f3dfb5" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh visible={highlighted} position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 36]} />
        <meshBasicMaterial color="#f4d283" transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color={highlighted ? "#f4d283" : color} intensity={highlighted ? 2.1 : state.status === "finished" ? 1.3 : 0} distance={2.7} />
      {stackLabel && (
        <Html center position={[0, 0.54, 0]} distanceFactor={8.5} style={{ pointerEvents: "none" }}>
          <span className="token-stack-label">{stackLabel}</span>
        </Html>
      )}
    </group>
  );
}

export function Scene({
  pieces,
  rolling,
  nonce,
  onSettled,
  onRollTimeout,
  hoveredToken,
  movePreviews,
  activeMove,
  onMoveComplete,
}: {
  pieces: BoardState;
  rolling: boolean;
  nonce: number;
  onSettled: (flats: number, backdo: boolean) => void;
  onRollTimeout: () => void;
  hoveredToken: HoveredToken;
  movePreviews: MovePreview[];
  activeMove: ActiveMove;
  onMoveComplete: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#0d1713"]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 10, 7]} intensity={2.6} color="#ffe8bb" castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-6, 4, -4]} intensity={16} color="#87512d" distance={14} />

      <group>
        <RoundedBox args={[12.2, 0.5, 11.8]} radius={0.18} smoothness={6} position={[0, -0.35, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#563721" roughness={0.82} />
        </RoundedBox>
        <mesh position={[0, -0.09, 0]} receiveShadow>
          <boxGeometry args={[11.55, 0.18, 11.15]} />
          <meshStandardMaterial color="#d2bc88" roughness={0.94} />
        </mesh>

        {BOARD_EDGES.map(([from, to]) => (
          <BoardPathSegment key={`${from}-${to}`} from={NODE_POSITIONS[from]} to={NODE_POSITIONS[to]} />
        ))}

        {movePreviews.flatMap((preview) => preview.pathNodes.slice(1).map((node, index) => (
          <PreviewPathSegment
            key={`preview-path-${preview.key}-${index}-${node}`}
            from={NODE_POSITIONS[preview.pathNodes[index]]}
            to={NODE_POSITIONS[node]}
            color={preview.color}
          />
        )))}

        {movePreviews.flatMap((preview) => preview.pathNodes.map((node, index) => (
          <PreviewPathNode
            key={`preview-node-${preview.key}-${index}-${node}`}
            position={NODE_POSITIONS[node]}
            color={preview.color}
          />
        )))}

        {BOARD_NODE_IDS.map((node) => (
          <BoardNode key={node} position={NODE_POSITIONS[node]} major={MAJOR_NODE_IDS.has(node)} />
        ))}

        {movePreviews.map((preview) => (
          <MoveDestinationPreview key={preview.key} preview={preview} />
        ))}

        {pieces.map((playerPieces, player) =>
          playerPieces.map((state, piece) => {
            const placement = tokenPlacement(pieces, player, piece);
            const hoveredState = hoveredToken?.player === player ? pieces[player][hoveredToken.piece] : null;
            const highlighted = hoveredToken?.player === player
              && (hoveredToken.piece === piece || (hoveredState ? sameStack(state, hoveredState) : false));
            const isMovingPiece = activeMove?.player === player && activeMove.pieces.includes(piece);
            const movingStackSlot = isMovingPiece ? activeMove.pieces.indexOf(piece) : 0;
            const hasMovePreviewAtPosition = movePreviews.some((preview) => (
              Math.abs(preview.position[0] - placement.position[0]) < 0.1
              && Math.abs(preview.position[2] - placement.position[2]) < 0.1
            ));
            const stackLabel = !hasMovePreviewAtPosition && placement.count > 1 && placement.slot === placement.count - 1
              ? placement.members.map((member) => `${player === 0 ? "청" : "홍"}${member + 1}`).join(" + ")
              : null;
            return (
              <Token
                key={`${player}-${piece}`}
                position={placement.position}
                color={PLAYERS[player as Player].color}
                state={state}
                highlighted={highlighted}
                stackLabel={stackLabel}
                activeMoveId={isMovingPiece ? activeMove.id : null}
                moveWaypoints={isMovingPiece ? activeMove.waypoints : null}
                moveWaypointClearances={isMovingPiece ? activeMove.waypointClearances : null}
                movingStackSlot={movingStackSlot}
                notifyOnMoveComplete={isMovingPiece && activeMove.leader === piece}
                onMoveComplete={onMoveComplete}
              />
            );
          }),
        )}

      </group>

      <YutPhysics
        rolling={rolling}
        nonce={nonce}
        onSettled={onSettled}
        onTimeout={onRollTimeout}
      />

      <ContactShadows position={[0, -0.37, 0]} opacity={0.48} scale={18} blur={2.6} far={8} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.85}
        minDistance={8.5}
        maxDistance={30}
        minPolarAngle={0.72}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.25}
        maxAzimuthAngle={0.25}
        target={[0, 0, 0]}
      />
    </>
  );
}

