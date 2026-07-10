"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { BallCollider, ConvexHullCollider, CuboidCollider, CylinderCollider, Physics, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BOARD_EDGES,
  BOARD_NODE_IDS,
  MAJOR_NODE_IDS,
  NODE_POSITIONS,
  canChooseRoute,
  createInitialBoard,
  groupForPiece,
  groupLeader,
  isMovable,
  nodeForPiece,
  pieceProgressLabel,
  resolveMove,
  sameStack,
  type BoardState,
  type NodeId,
  type PieceState,
  type Player,
  type RouteChoice,
} from "./yutnori-rules";

type Phase = "ready" | "rolling" | "move" | "route" | "moving" | "gameover";
type ThrowResult = { name: string; steps: number; flats: number; extraThrow: boolean };
type HoveredToken = { player: Player; piece: number } | null;
type ActiveMove = {
  id: number;
  player: Player;
  pieces: number[];
  leader: number;
  waypoints: NodeId[];
  nextPlayer: Player;
  winner: Player | null;
  notice: string;
} | null;
type PendingRoute = { piece: number } | null;

const PLAYERS = [
  { name: "청군", color: "#174c6b", glow: "#8bc0d4" },
  { name: "홍군", color: "#a63f31", glow: "#e6a28f" },
] as const;

const RESULT_BY_FLATS: Record<number, ThrowResult> = {
  0: { name: "모", steps: 5, flats: 0, extraThrow: true },
  1: { name: "도", steps: 1, flats: 1, extraThrow: false },
  2: { name: "개", steps: 2, flats: 2, extraThrow: false },
  3: { name: "걸", steps: 3, flats: 3, extraThrow: false },
  4: { name: "윷", steps: 4, flats: 4, extraThrow: true },
};

const BACKDO_RESULT: ThrowResult = { name: "빽도", steps: -1, flats: 1, extraThrow: false };

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

function tokenPlacement(pieces: BoardState, player: number, piece: number) {
  const state = pieces[player][piece];
  if (state.status === "home") {
    const side = player === 0 ? -1 : 1;
    return { position: [side * 5.05, 0.06, 1.35 - piece * 0.72] as [number, number, number], count: 1 };
  }
  if (state.status === "finished") {
    const side = player === 0 ? -1 : 1;
    return { position: [side * 5.05, 0.06, -1.35 - piece * 0.62] as [number, number, number], count: 1 };
  }

  const node = nodeForPiece(state)!;
  const occupants: { player: number; piece: number }[] = [];
  pieces.forEach((side, occupantPlayer) => {
    side.forEach((occupantState, occupantPiece) => {
      if (nodeForPiece(occupantState) === node) occupants.push({ player: occupantPlayer, piece: occupantPiece });
    });
  });
  const slot = occupants.findIndex((occupant) => occupant.player === player && occupant.piece === piece);
  const count = occupants.length;
  const base = NODE_POSITIONS[node];
  if (count <= 1) return { position: [base[0], base[1], base[2]] as [number, number, number], count: 1 };

  const radius = count === 2 ? 0.38 : count === 3 ? 0.43 : 0.5;
  const angle = -Math.PI / 2 + (slot / count) * Math.PI * 2;
  return {
    position: [base[0] + Math.cos(angle) * radius, base[1], base[2] + Math.sin(angle) * radius] as [number, number, number],
    count,
  };
}

function Token({
  position,
  color,
  state,
  highlighted,
  player,
  piece,
  stackCount,
  activeMoveId,
  moveWaypoints,
  notifyOnMoveComplete,
  onMoveComplete,
}: {
  position: [number, number, number];
  color: string;
  state: PieceState;
  highlighted: boolean;
  player: number;
  piece: number;
  stackCount: number;
  activeMoveId: number | null;
  moveWaypoints: NodeId[] | null;
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
      waypointQueue.current = (moveWaypoints ?? []).map((node) => {
        const point = NODE_POSITIONS[node];
        return new THREE.Vector3(point[0], point[1], point[2]);
      });
      if (waypointQueue.current.length === 0 || !waypointQueue.current[waypointQueue.current.length - 1].equals(target)) {
        waypointQueue.current.push(target.clone());
      }
      beginNextSegment();
      return;
    }
    if (group.position.distanceTo(target) < 0.01) return;
    waypointQueue.current = [target.clone()];
    beginNextSegment();
  }, [activeMoveId, beginNextSegment, moveWaypoints, notifyOnMoveComplete, state, target]);

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

    const stackedScale = stackCount >= 4 ? 0.74 : stackCount > 1 ? 0.84 : 1;
    const targetScale = highlighted ? Math.max(1.12, stackedScale * 1.22) : stackedScale;
    const scaleEase = 1 - Math.exp(-delta * 11);
    group.scale.x += (targetScale - group.scale.x) * scaleEase;
    group.scale.y += (targetScale - group.scale.y) * scaleEase;
    group.scale.z += (targetScale - group.scale.z) * scaleEase;
    group.rotation.y += delta * (state.status === "finished" ? 1.6 : highlighted ? 1.15 : 0.35);
  });

  return (
    <group ref={ref} position={initialPosition.current}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.28, 0.36, 0.34, 32]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.1} emissive={highlighted ? color : "#000000"} emissiveIntensity={highlighted ? 0.65 : 0} />
      </mesh>
      <mesh castShadow position={[0, 0.44, 0]}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} emissive={highlighted ? color : "#000000"} emissiveIntensity={highlighted ? 0.7 : 0} />
      </mesh>
      <mesh position={[0, 0.455, 0.175]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.045, 0.075, 20]} />
        <meshBasicMaterial color="#f3dfb5" />
      </mesh>
      <mesh visible={highlighted} position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 36]} />
        <meshBasicMaterial color="#f4d283" transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color={highlighted ? "#f4d283" : color} intensity={highlighted ? 2.1 : state.status === "finished" ? 1.3 : 0} distance={2.7} />
      {stackCount > 1 && (
        <Html center position={[0, 0.78, 0]} distanceFactor={8.5} style={{ pointerEvents: "none" }}>
          <span className={`token-id-badge ${player === 0 ? "blue" : "red"}`}>{player === 0 ? "청" : "홍"}{piece + 1}</span>
        </Html>
      )}
    </group>
  );
}

function XMark({ z }: { z: number }) {
  return (
    <group position={[0, 0.304, z]}>
      <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.052, 0.018, 0.32]} />
        <meshStandardMaterial color="#17130f" roughness={0.82} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.052, 0.018, 0.32]} />
        <meshStandardMaterial color="#17130f" roughness={0.82} />
      </mesh>
    </group>
  );
}

function createYutGeometry() {
  const radius = 0.29;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.absarc(0, 0, radius, 0, Math.PI, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2.45,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 18,
  });
  geometry.translate(0, 0, -1.225);
  geometry.computeVertexNormals();
  return geometry;
}

const YUT_GEOMETRY = createYutGeometry();
const YUT_COLLIDER_VERTICES = new Float32Array(YUT_GEOMETRY.attributes.position.array);

function YutStickMesh() {
  return (
    <group>
      <mesh geometry={YUT_GEOMETRY} castShadow receiveShadow>
        <meshStandardMaterial color="#d8aa65" roughness={0.6} />
      </mesh>
      <XMark z={-0.66} />
      <XMark z={0} />
      <XMark z={0.66} />
    </group>
  );
}

function PhysicsYutStick({
  index,
  nonce,
  arranged,
  onSleep,
}: {
  index: number;
  nonce: number;
  arranged: boolean;
  onSleep: (index: number, body: RapierRigidBody) => void;
}) {
  const { rapier } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  const arrangeFromPosition = useRef(new THREE.Vector3());
  const arrangeFromRotation = useRef(new THREE.Quaternion());
  const arrangeNextPosition = useRef(new THREE.Vector3());
  const arrangeNextRotation = useRef(new THREE.Quaternion());
  const arrangeTargetRotation = useRef(new THREE.Quaternion());
  const arrangeProgress = useRef(1);
  const arrangeReady = useRef(false);
  const arrangeTarget = useMemo(() => new THREE.Vector3((index - 1.5) * 0.76, 0.035, 0), [index]);
  const initial = useMemo(() => {
    if (nonce === 0) {
      return {
        position: [(index - 1.5) * 0.76, 0.325, 0] as [number, number, number],
        rotation: [Math.PI, 0, 0] as [number, number, number],
        linearVelocity: [0, 0, 0] as [number, number, number],
        angularVelocity: [0, 0, 0] as [number, number, number],
      };
    }
    const direction = index - 1.5;
    return {
      position: [direction * 0.95, 1.18 + (index % 2) * 0.18, 0.78] as [number, number, number],
      rotation: [(Math.random() - 0.5) * 0.28, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.16] as [number, number, number],
      linearVelocity: [direction * 0.72 + (Math.random() - 0.5) * 0.65, 5.3 + Math.random() * 1.1, -1.15 + (Math.random() - 0.5) * 1.1] as [number, number, number],
      angularVelocity: [(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 18] as [number, number, number],
    };
  }, [index, nonce]);

  useEffect(() => {
    const rigidBody = body.current;
    if (!arranged || !rigidBody) {
      arrangeReady.current = false;
      return;
    }

    const translation = rigidBody.translation();
    const rotation = rigidBody.rotation();
    arrangeFromPosition.current.set(translation.x, translation.y, translation.z);
    arrangeFromRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w);

    rigidBody.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setNextKinematicTranslation(arrangeFromPosition.current);
    rigidBody.setNextKinematicRotation(arrangeFromRotation.current);

    arrangeProgress.current = 0;
    arrangeReady.current = true;
  }, [arranged, rapier]);

  useFrame((_, delta) => {
    if (!arranged || !arrangeReady.current || !body.current) return;
    arrangeProgress.current = Math.min(1, arrangeProgress.current + delta / 0.72);
    const t = arrangeProgress.current;
    const eased = 1 - Math.pow(1 - t, 3);
    arrangeNextPosition.current.lerpVectors(arrangeFromPosition.current, arrangeTarget, eased);
    arrangeNextPosition.current.y += Math.sin(Math.PI * t) * 0.55;
    arrangeNextRotation.current.copy(arrangeFromRotation.current).slerp(arrangeTargetRotation.current, eased);
    body.current.setNextKinematicTranslation(arrangeNextPosition.current);
    body.current.setNextKinematicRotation(arrangeNextRotation.current);
  });

  return (
    <RigidBody
      ref={body}
      type={nonce === 0 ? "fixed" : arranged ? "kinematicPosition" : "dynamic"}
      colliders={false}
      position={initial.position}
      rotation={initial.rotation}
      linearVelocity={initial.linearVelocity}
      angularVelocity={initial.angularVelocity}
      friction={0.92}
      restitution={0.28}
      linearDamping={0.42}
      angularDamping={0.62}
      ccd
      canSleep
      onSleep={() => body.current && onSleep(index, body.current)}
    >
      <ConvexHullCollider args={[YUT_COLLIDER_VERTICES]} friction={0.92} restitution={0.28} contactSkin={0.028} />
      <YutStickMesh />
    </RigidBody>
  );
}

function YutPhysics({
  rolling,
  nonce,
  pieces,
  tokenCollisionsEnabled,
  arranged,
  onSettled,
}: {
  rolling: boolean;
  nonce: number;
  pieces: BoardState;
  tokenCollisionsEnabled: boolean;
  arranged: boolean;
  onSettled: (flats: number, backdo: boolean) => void;
}) {
  const outcomes = useRef<(boolean | null)[]>([null, null, null, null]);
  const retries = useRef([0, 0, 0, 0]);
  const completed = useRef(false);

  useEffect(() => {
    outcomes.current = [null, null, null, null];
    retries.current = [0, 0, 0, 0];
    completed.current = false;
  }, [nonce]);

  const handleSleep = useCallback((index: number, body: RapierRigidBody) => {
    if (!rolling || completed.current) return;
    const rotation = body.rotation();
    const flatNormal = new THREE.Vector3(0, -1, 0).applyQuaternion(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
    );

    if (Math.abs(flatNormal.y) < 0.42 && retries.current[index] < 2) {
      retries.current[index] += 1;
      body.wakeUp();
      body.applyTorqueImpulse({ x: 0.18 * (index % 2 ? 1 : -1), y: 0.03, z: 0.14 }, true);
      return;
    }

    outcomes.current[index] = flatNormal.y > 0;
    if (outcomes.current.every((value) => value !== null)) {
      completed.current = true;
      const flats = outcomes.current.filter(Boolean).length;
      onSettled(flats, flats === 1 && outcomes.current[0] === true);
    }
  }, [onSettled, rolling]);

  return (
    <Physics key="world-y0-v2" gravity={[0, -12.8, 0]} timeStep={1 / 60} paused={!rolling && nonce === 0}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.74, 0.13, 5.54]} position={[0, -0.13, 0]} friction={0.95} restitution={0.2} />
        <CuboidCollider args={[0.12, 0.65, 5.55]} position={[-5.72, 0.65, 0]} restitution={0.35} />
        <CuboidCollider args={[0.12, 0.65, 5.55]} position={[5.72, 0.65, 0]} restitution={0.35} />
        <CuboidCollider args={[5.55, 0.65, 0.12]} position={[0, 0.65, -5.52]} restitution={0.35} />
        <CuboidCollider args={[5.55, 0.65, 0.12]} position={[0, 0.65, 5.52]} restitution={0.35} />
      </RigidBody>
      {tokenCollisionsEnabled && pieces.map((playerPieces, player) =>
        playerPieces.map((_, piece) => {
          const placement = tokenPlacement(pieces, player, piece);
          const scale = placement.count >= 4 ? 0.74 : placement.count > 1 ? 0.84 : 1;
          return (
            <RigidBody key={`token-collider-${player}-${piece}`} type="fixed" colliders={false} position={placement.position}>
              <CylinderCollider
                args={[0.17 * scale, 0.36 * scale]}
                position={[0, 0.18 * scale, 0]}
                friction={0.82}
                restitution={0.3}
                contactSkin={0.012}
              />
              <BallCollider
                args={[0.21 * scale]}
                position={[0, 0.44 * scale, 0]}
                friction={0.78}
                restitution={0.34}
                contactSkin={0.012}
              />
            </RigidBody>
          );
        }),
      )}
      {[0, 1, 2, 3].map((index) => (
        <PhysicsYutStick key={`${nonce}-${index}`} index={index} nonce={nonce} arranged={arranged} onSleep={handleSleep} />
      ))}
    </Physics>
  );
}

function Scene({
  pieces,
  rolling,
  nonce,
  onSettled,
  hoveredToken,
  activeMove,
  tokenCollisionsEnabled,
  yutsArranged,
  onMoveComplete,
}: {
  pieces: BoardState;
  rolling: boolean;
  nonce: number;
  onSettled: (flats: number, backdo: boolean) => void;
  hoveredToken: HoveredToken;
  activeMove: ActiveMove;
  tokenCollisionsEnabled: boolean;
  yutsArranged: boolean;
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

        {BOARD_NODE_IDS.map((node) => (
          <BoardNode key={node} position={NODE_POSITIONS[node]} major={MAJOR_NODE_IDS.has(node)} />
        ))}

        {pieces.map((playerPieces, player) =>
          playerPieces.map((state, piece) => {
            const placement = tokenPlacement(pieces, player, piece);
            const hoveredState = hoveredToken?.player === player ? pieces[player][hoveredToken.piece] : null;
            const highlighted = hoveredToken?.player === player
              && (hoveredToken.piece === piece || (hoveredState ? sameStack(state, hoveredState) : false));
            const isMovingPiece = activeMove?.player === player && activeMove.pieces.includes(piece);
            return (
              <Token
                key={`${player}-${piece}`}
                position={placement.position}
                color={PLAYERS[player as Player].color}
                state={state}
                highlighted={highlighted}
                player={player}
                piece={piece}
                stackCount={placement.count}
                activeMoveId={isMovingPiece ? activeMove.id : null}
                moveWaypoints={isMovingPiece ? activeMove.waypoints : null}
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
        pieces={pieces}
        tokenCollisionsEnabled={tokenCollisionsEnabled}
        arranged={yutsArranged}
        onSettled={onSettled}
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
        maxDistance={21}
        minPolarAngle={0.72}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.25}
        maxAzimuthAngle={0.25}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function YutnoriGame() {
  const [current, setCurrent] = useState<Player>(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [pieces, setPieces] = useState<BoardState>(() => createInitialBoard());
  const [result, setResult] = useState<ThrowResult | null>(null);
  const [nonce, setNonce] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [hoveredToken, setHoveredToken] = useState<HoveredToken>(null);
  const [activeMove, setActiveMove] = useState<ActiveMove>(null);
  const [pendingRoute, setPendingRoute] = useState<PendingRoute>(null);
  const [notice, setNotice] = useState("");
  const [tokenCollisionsEnabled, setTokenCollisionsEnabled] = useState(true);
  const [yutsArranged, setYutsArranged] = useState(false);
  const activeMoveRef = useRef<ActiveMove>(null);
  const moveId = useRef(0);
  const otherPlayer = (current === 0 ? 1 : 0) as Player;

  const throwYut = () => {
    if (phase !== "ready") return;
    setResult(null);
    setNotice("");
    setYutsArranged(false);
    setTokenCollisionsEnabled(true);
    setNonce((value) => value + 1);
    setPhase("rolling");
  };

  const settleThrow = useCallback((flats: number, backdo: boolean) => {
    const nextResult = backdo ? BACKDO_RESULT : RESULT_BY_FLATS[flats];
    setResult(nextResult);
    if (nextResult.steps < 0 && !pieces[current].some((piece) => piece.status === "board")) {
      setCurrent(current === 0 ? 1 : 0);
      setNotice("빽도였지만 움직일 말이 없어 차례가 넘어갔습니다");
      setPhase("ready");
      return;
    }
    setPhase("move");
  }, [current, pieces]);

  const handleMoveComplete = useCallback(() => {
    const move = activeMoveRef.current;
    if (!move) return;
    activeMoveRef.current = null;
    setActiveMove(null);
    setTokenCollisionsEnabled(true);
    setNotice(move.notice);
    if (move.winner !== null) {
      setWinner(move.winner);
      setPhase("gameover");
    } else {
      setCurrent(move.nextPlayer);
      setPhase("ready");
    }
  }, []);

  const executeMove = (pieceIndex: number, routeChoice: RouteChoice) => {
    if (!result || (phase !== "move" && phase !== "route")) return;
    setHoveredToken(null);
    setPendingRoute(null);

    const resolution = resolveMove(pieces, current, pieceIndex, result.steps, routeChoice);
    setPieces(resolution.board);

    const gotExtraThrow = result.extraThrow || resolution.capturedPieces.length > 0;
    const nextPlayer = gotExtraThrow ? current : otherPlayer;
    const messages: string[] = [];
    if (resolution.stackedPieces.length > 0) {
      messages.push(`같은 편 ${resolution.stackedPieces.length + resolution.movedPieces.length}말을 업었습니다`);
    }
    if (resolution.capturedPieces.length > 0) {
      messages.push(`상대 ${resolution.capturedPieces.length}말을 잡아 한 번 더 던집니다`);
    } else if (result.extraThrow) {
      messages.push(`${result.name}이 나와 한 번 더 던집니다`);
    }

    moveId.current += 1;
    const move: NonNullable<ActiveMove> = {
      id: moveId.current,
      player: current,
      pieces: resolution.movedPieces,
      leader: Math.min(...resolution.movedPieces),
      waypoints: resolution.waypoints,
      nextPlayer,
      winner: resolution.won ? current : null,
      notice: messages.join(" · "),
    };
    activeMoveRef.current = move;
    setActiveMove(move);
    setTokenCollisionsEnabled(false);
    setYutsArranged(true);
    setPhase("moving");
  };

  const movePiece = (pieceIndex: number) => {
    if (phase !== "move" || !result) return;
    const piece = pieces[current][pieceIndex];
    if (!isMovable(piece, result.steps) || groupLeader(pieces, current, pieceIndex) !== pieceIndex) return;
    if (canChooseRoute(piece, result.steps)) {
      setHoveredToken(null);
      setPendingRoute({ piece: pieceIndex });
      setPhase("route");
      return;
    }
    executeMove(pieceIndex, "outer");
  };

  const chooseRoute = (choice: RouteChoice) => {
    if (!pendingRoute) return;
    executeMove(pendingRoute.piece, choice);
  };

  const reset = () => {
    setCurrent(0);
    setPhase("ready");
    setPieces(createInitialBoard());
    setResult(null);
    setWinner(null);
    setNonce(0);
    setHoveredToken(null);
    setPendingRoute(null);
    setNotice("");
    activeMoveRef.current = null;
    setActiveMove(null);
    setTokenCollisionsEnabled(true);
    setYutsArranged(false);
  };

  const statusText = phase === "ready"
    ? notice || `${PLAYERS[current].name}의 차례입니다`
    : phase === "rolling"
      ? "윷이 안정될 때까지 기다리는 중"
      : phase === "move"
        ? result?.steps === -1 ? "빽도 · 움직일 말을 골라 한 칸 뒤로 가세요" : `${result?.name} · ${result?.steps}칸 움직이세요`
        : phase === "route"
          ? "이 갈림길에서 어느 길로 갈까요?"
          : phase === "moving"
            ? "말이 한 칸씩 이동하는 중"
            : `${PLAYERS[winner ?? 0].name}이 네 말을 모두 냈습니다`;

  return (
    <main className="game-shell">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">윷</div>
        <div>
          <p className="eyebrow">두 사람이 마주 앉는 작은 놀이판</p>
          <h1>한판 윷놀이</h1>
        </div>
        <button className="reset-button" type="button" onClick={reset}>새 판</button>
      </header>

      <section className="game-layout" aria-label="3D 윷놀이 게임">
        <aside className={`player-card blue ${current === 0 && phase !== "gameover" ? "active" : ""}`}>
          <span className="player-seal">靑</span>
          <div><small>첫째 선수</small><strong>청군</strong></div>
          <span className="finished-count">도착 {pieces[0].filter((piece) => piece.status === "finished").length}/4</span>
        </aside>

        <div className="board-wrap">
          <div className="canvas-wrap">
            <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 10.8, 11.8], fov: 44 }}>
              <Suspense fallback={null}>
                <Scene
                  pieces={pieces}
                  rolling={phase === "rolling"}
                  nonce={nonce}
                  onSettled={settleThrow}
                  hoveredToken={hoveredToken}
                  activeMove={activeMove}
                  tokenCollisionsEnabled={tokenCollisionsEnabled}
                  yutsArranged={yutsArranged}
                  onMoveComplete={handleMoveComplete}
                />
              </Suspense>
            </Canvas>
            <div className="board-caption" aria-hidden="true">스물아홉 밭 · 두 갈래 지름길</div>
          </div>

          <div className="control-panel" style={{ "--turn-color": PLAYERS[current].color } as React.CSSProperties}>
            <div className="turn-copy" aria-live="polite">
              <span className="turn-dot" />
              <div><small>지금은</small><strong>{statusText}</strong></div>
            </div>

            {phase === "move" ? (
              <div className="piece-actions" aria-label="움직일 말 선택">
                {pieces[current].map((piece, index) => {
                  const group = groupForPiece(pieces, current, index);
                  const leader = Math.min(...group);
                  const follower = piece.status === "board" && leader !== index;
                  const movable = isMovable(piece, result?.steps ?? 0) && !follower;
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={!movable}
                      onPointerEnter={() => setHoveredToken({ player: current, piece: index })}
                      onPointerLeave={() => setHoveredToken(null)}
                      onFocus={() => setHoveredToken({ player: current, piece: index })}
                      onBlur={() => setHoveredToken(null)}
                      onClick={() => movePiece(index)}
                    >
                      {group.length > 1 && !follower
                        ? group.map((member) => `말 ${member + 1}`).join(" + ")
                        : `말 ${index + 1}`}
                      <span>{follower ? `말 ${leader + 1}과 업힘` : pieceProgressLabel(piece)}</span>
                    </button>
                  );
                })}
              </div>
            ) : phase === "route" ? (
              <div className="route-actions" aria-label="이동 경로 선택">
                <button type="button" onClick={() => chooseRoute("shortcut")}>
                  지름길<span>가운데를 가로질러 갑니다</span>
                </button>
                <button type="button" onClick={() => chooseRoute("outer")}>
                  바깥길<span>모서리를 따라 계속 갑니다</span>
                </button>
              </div>
            ) : phase === "gameover" ? (
              <button className="throw-button" type="button" onClick={reset}>한 판 더</button>
            ) : (
              <button className="throw-button" type="button" onClick={throwYut} disabled={phase === "rolling" || phase === "moving"}>
                <span>{phase === "rolling" ? "물리 판정 중" : phase === "moving" ? "말 이동 중" : "윷 던지기"}</span>
                <i aria-hidden="true">↗</i>
              </button>
            )}
          </div>
        </div>

        <aside className={`player-card red ${current === 1 && phase !== "gameover" ? "active" : ""}`}>
          <span className="player-seal">紅</span>
          <div><small>둘째 선수</small><strong>홍군</strong></div>
          <span className="finished-count">도착 {pieces[1].filter((piece) => piece.status === "finished").length}/4</span>
        </aside>
      </section>

      <footer>
        <p>갈림길에서는 길을 고르고, 같은 편은 업고, 상대편은 잡습니다. 네 말을 먼저 모두 내면 승리합니다.</p>
        <span>윷·모 또는 잡기에는 한 번 더 던집니다</span>
      </footer>
    </main>
  );
}
