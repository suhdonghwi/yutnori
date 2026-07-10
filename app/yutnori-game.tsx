"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { ConvexHullCollider, CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Phase = "ready" | "rolling" | "move" | "gameover";
type Player = 0 | 1;
type ThrowResult = { name: string; steps: number; flats: number };

const PLAYERS = [
  { name: "청군", color: "#174c6b", glow: "#8bc0d4" },
  { name: "홍군", color: "#a63f31", glow: "#e6a28f" },
] as const;

const TRACK: [number, number, number][] = [
  [4.35, 0.06, 4.35], [4.35, 0.06, 2.2], [4.35, 0.06, 0], [4.35, 0.06, -2.2],
  [4.35, 0.06, -4.35], [2.2, 0.06, -4.35], [0, 0.06, -4.35], [-2.2, 0.06, -4.35],
  [-4.35, 0.06, -4.35], [-4.35, 0.06, -2.2], [-4.35, 0.06, 0], [-4.35, 0.06, 2.2],
  [-4.35, 0.06, 4.35], [-2.2, 0.06, 4.35], [0, 0.06, 4.35], [2.2, 0.06, 4.35],
  [4.35, 0.06, 4.35], [4.35, 0.06, 2.2], [4.35, 0.06, 0], [4.35, 0.06, -2.2],
];

const RESULT_BY_FLATS: Record<number, ThrowResult> = {
  0: { name: "모", steps: 5, flats: 0 },
  1: { name: "도", steps: 1, flats: 1 },
  2: { name: "개", steps: 2, flats: 2 },
  3: { name: "걸", steps: 3, flats: 3 },
  4: { name: "윷", steps: 4, flats: 4 },
};

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

function Token({ position, color, offset, finished }: { position: [number, number, number]; color: string; offset: number; finished: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.lerp(target, 1 - Math.exp(-delta * 5.5));
    ref.current.rotation.y += delta * (finished ? 1.6 : 0.35);
  });

  return (
    <group ref={ref} position={position}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.28, 0.36, 0.34, 32]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 0.44, 0]}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.455, 0.175]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.045, 0.075, 20]} />
        <meshBasicMaterial color="#f3dfb5" />
      </mesh>
      <pointLight color={color} intensity={finished ? 1.3 : 0} distance={2.5} />
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
      <XMark z={-0.55} />
      <XMark z={0.55} />
    </group>
  );
}

function PhysicsYutStick({
  index,
  nonce,
  onSleep,
}: {
  index: number;
  nonce: number;
  onSleep: (index: number, body: RapierRigidBody) => void;
}) {
  const body = useRef<RapierRigidBody>(null);
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

  return (
    <RigidBody
      ref={body}
      type={nonce === 0 ? "fixed" : "dynamic"}
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

function YutPhysics({ rolling, nonce, onSettled }: { rolling: boolean; nonce: number; onSettled: (flats: number) => void }) {
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
      onSettled(outcomes.current.filter(Boolean).length);
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
      {[0, 1, 2, 3].map((index) => (
        <PhysicsYutStick key={`${nonce}-${index}`} index={index} nonce={nonce} onSleep={handleSleep} />
      ))}
    </Physics>
  );
}

function Scene({ pieces, rolling, nonce, onSettled }: { pieces: number[][]; rolling: boolean; nonce: number; onSettled: (flats: number) => void }) {
  const boardSegments = useMemo(() => {
    const outer = TRACK.slice(0, 16);
    return outer.map((point, index) => [point, outer[(index + 1) % outer.length]] as const);
  }, []);

  function piecePosition(player: number, piece: number, step: number): [number, number, number] {
    if (step < 0) {
      const side = player === 0 ? -1 : 1;
      return [side * 5.05, 0.06, 1.35 - piece * 0.72];
    }
    if (step >= 20) {
      const side = player === 0 ? -1 : 1;
      return [side * 5.05, 0.06, -1.35 - piece * 0.62];
    }
    const base = TRACK[step];
    const occupiedBefore = pieces[player].slice(0, piece).filter((value) => value === step).length;
    return [base[0] + occupiedBefore * 0.34, base[1], base[2] + occupiedBefore * 0.34];
  }

  return (
    <>
      <color attach="background" args={["#0d1713"]} />
      <fog attach="fog" args={["#0d1713", 16, 25]} />
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

        {boardSegments.map(([from, to], index) => <BoardPathSegment key={index} from={from} to={to} />)}
        <BoardPathSegment from={TRACK[0]} to={[0, 0.06, 0]} />
        <BoardPathSegment from={[0, 0.06, 0]} to={TRACK[8]} />
        <BoardPathSegment from={TRACK[4]} to={[0, 0.06, 0]} />
        <BoardPathSegment from={[0, 0.06, 0]} to={TRACK[12]} />

        {TRACK.slice(0, 16).map((position, index) => (
          <BoardNode key={index} position={position} major={index % 4 === 0} />
        ))}
        <BoardNode position={[0, 0.06, 0]} major />

        {pieces.map((playerPieces, player) =>
          playerPieces.map((step, piece) => (
            <Token
              key={`${player}-${piece}`}
              position={piecePosition(player, piece, step)}
              color={PLAYERS[player as Player].color}
              offset={piece}
              finished={step >= 20}
            />
          )),
        )}

      </group>

      <YutPhysics rolling={rolling} nonce={nonce} onSettled={onSettled} />

      <ContactShadows position={[0, -0.37, 0]} opacity={0.48} scale={18} blur={2.6} far={8} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
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
  const [pieces, setPieces] = useState<number[][]>([[-1, -1, -1, -1], [-1, -1, -1, -1]]);
  const [result, setResult] = useState<ThrowResult | null>(null);
  const [nonce, setNonce] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);

  const throwYut = () => {
    if (phase !== "ready") return;
    setResult(null);
    setNonce((value) => value + 1);
    setPhase("rolling");
  };

  const settleThrow = useCallback((flats: number) => {
    const nextResult = RESULT_BY_FLATS[flats];
    setResult(nextResult);
    setPhase("move");
  }, []);

  const movePiece = (pieceIndex: number) => {
    if (phase !== "move" || !result) return;
    const nextPieces = pieces.map((side) => [...side]);
    const start = nextPieces[current][pieceIndex];
    nextPieces[current][pieceIndex] = Math.min(20, (start < 0 ? 0 : start) + result.steps);
    setPieces(nextPieces);

    if (nextPieces[current].every((position) => position >= 20)) {
      setWinner(current);
      setPhase("gameover");
      return;
    }

    setCurrent(current === 0 ? 1 : 0);
    setPhase("ready");
  };

  const reset = () => {
    setCurrent(0);
    setPhase("ready");
    setPieces([[-1, -1, -1, -1], [-1, -1, -1, -1]]);
    setResult(null);
    setWinner(null);
    setNonce(0);
  };

  const statusText = phase === "ready"
    ? `${PLAYERS[current].name}의 차례입니다`
    : phase === "rolling"
      ? "윷이 안정될 때까지 기다리는 중"
      : phase === "move"
        ? `${result?.name} · ${result?.steps}칸 움직이세요`
        : `${PLAYERS[winner ?? 0].name}이 이겼습니다`;

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
          <span className="finished-count">도착 {pieces[0].filter((p) => p >= 20).length}/4</span>
        </aside>

        <div className="board-wrap">
          <div className="canvas-wrap">
            <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 10.8, 11.8], fov: 44 }}>
              <Suspense fallback={null}>
                <Scene pieces={pieces} rolling={phase === "rolling"} nonce={nonce} onSettled={settleThrow} />
              </Suspense>
            </Canvas>
            <div className="board-caption" aria-hidden="true">외곽길 · 스무 걸음</div>
          </div>

          <div className="control-panel" style={{ "--turn-color": PLAYERS[current].color } as React.CSSProperties}>
            <div className="turn-copy" aria-live="polite">
              <span className="turn-dot" />
              <div><small>지금은</small><strong>{statusText}</strong></div>
            </div>

            {phase === "move" ? (
              <div className="piece-actions" aria-label="움직일 말 선택">
                {pieces[current].map((position, index) => (
                  <button key={index} type="button" disabled={position >= 20} onClick={() => movePiece(index)}>
                    말 {index + 1}<span>{position < 0 ? "출발" : position >= 20 ? "도착" : `${position}/20`}</span>
                  </button>
                ))}
              </div>
            ) : phase === "gameover" ? (
              <button className="throw-button" type="button" onClick={reset}>한 판 더</button>
            ) : (
              <button className="throw-button" type="button" onClick={throwYut} disabled={phase === "rolling"}>
                <span>{phase === "rolling" ? "물리 판정 중" : "윷 던지기"}</span>
                <i aria-hidden="true">↗</i>
              </button>
            )}
          </div>
        </div>

        <aside className={`player-card red ${current === 1 && phase !== "gameover" ? "active" : ""}`}>
          <span className="player-seal">紅</span>
          <div><small>둘째 선수</small><strong>홍군</strong></div>
          <span className="finished-count">도착 {pieces[1].filter((p) => p >= 20).length}/4</span>
        </aside>
      </section>

      <footer>
        <p>윷을 던지고, 움직일 말을 고르세요. 네 말이 먼저 스무 걸음을 마치면 승리합니다.</p>
        <span>화면을 좌우로 살짝 돌려볼 수 있어요</span>
      </footer>
    </main>
  );
}
