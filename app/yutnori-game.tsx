"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Phase = "ready" | "rolling" | "move" | "gameover";
type Player = 0 | 1;
type ThrowResult = { name: string; steps: number; flats: number };

const PLAYERS = [
  { name: "청군", color: "#174c6b", glow: "#8bc0d4" },
  { name: "홍군", color: "#a63f31", glow: "#e6a28f" },
] as const;

const TRACK: [number, number, number][] = [
  [4.35, 0.34, 4.35], [4.35, 0.34, 2.2], [4.35, 0.34, 0], [4.35, 0.34, -2.2],
  [4.35, 0.34, -4.35], [2.2, 0.34, -4.35], [0, 0.34, -4.35], [-2.2, 0.34, -4.35],
  [-4.35, 0.34, -4.35], [-4.35, 0.34, -2.2], [-4.35, 0.34, 0], [-4.35, 0.34, 2.2],
  [-4.35, 0.34, 4.35], [-2.2, 0.34, 4.35], [0, 0.34, 4.35], [2.2, 0.34, 4.35],
  [4.35, 0.34, 4.35], [4.35, 0.34, 2.2], [4.35, 0.34, 0], [4.35, 0.34, -2.2],
];

const RESULT_BY_FLATS: Record<number, ThrowResult> = {
  0: { name: "모", steps: 5, flats: 0 },
  1: { name: "도", steps: 1, flats: 1 },
  2: { name: "개", steps: 2, flats: 2 },
  3: { name: "걸", steps: 3, flats: 3 },
  4: { name: "윷", steps: 4, flats: 4 },
};

function randomThrow() {
  let flats = 0;
  for (let i = 0; i < 4; i += 1) flats += Math.random() > 0.5 ? 1 : 0;
  return RESULT_BY_FLATS[flats];
}

function BoardNode({ position, major = false }: { position: [number, number, number]; major?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[major ? 0.46 : 0.3, major ? 0.52 : 0.34, 0.13, 32]} />
        <meshStandardMaterial color={major ? "#33241d" : "#5b4030"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[major ? 0.31 : 0.18, major ? 0.31 : 0.18, 0.035, 24]} />
        <meshStandardMaterial color={major ? "#cfb77c" : "#a98d5e"} roughness={0.7} />
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

function YutStick({ index, rolling, nonce, flat }: { index: number; rolling: boolean; nonce: number; flat: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const spin = useRef(new THREE.Vector3());
  const elapsed = useRef(0);
  const resting = useRef(true);

  useEffect(() => {
    if (!rolling || !ref.current) return;
    const spread = (index - 1.5) * 0.7;
    ref.current.position.set(spread, 4.5 + Math.random() * 0.8, (Math.random() - 0.5) * 1.4);
    ref.current.rotation.set(Math.random() * 4, Math.random() * 4, Math.random() * 4);
    velocity.current.set((Math.random() - 0.5) * 1.8, 1.6 + Math.random(), (Math.random() - 0.5) * 1.8);
    spin.current.set(6 + Math.random() * 7, 3 + Math.random() * 8, 5 + Math.random() * 8);
    elapsed.current = 0;
    resting.current = false;
  }, [rolling, nonce, index]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group || resting.current) return;
    elapsed.current += delta;
    velocity.current.y -= 13.5 * delta;
    group.position.addScaledVector(velocity.current, delta);
    group.rotation.x += spin.current.x * delta;
    group.rotation.y += spin.current.y * delta;
    group.rotation.z += spin.current.z * delta;

    if (group.position.y < 0.43) {
      group.position.y = 0.43;
      velocity.current.y = Math.abs(velocity.current.y) * 0.35;
      velocity.current.x *= 0.72;
      velocity.current.z *= 0.72;
      spin.current.multiplyScalar(0.62);
    }

    if (elapsed.current > 1.35) {
      resting.current = true;
      group.position.y = 0.43;
      group.rotation.set(flat ? 0 : Math.PI, (index - 1.5) * 0.08, (index % 2 ? -1 : 1) * 0.035);
    }
  });

  return (
    <group ref={ref} position={[(index - 1.5) * 0.72, 0.43, 0]} rotation={[flat ? 0 : Math.PI, 0, 0]}>
      <RoundedBox args={[0.48, 0.24, 2.55]} radius={0.11} smoothness={5} castShadow>
        <meshStandardMaterial color="#d7a85f" roughness={0.58} />
      </RoundedBox>
      <mesh position={[0, 0.128, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color="#7e211c" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.128, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color="#7e211c" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Scene({ pieces, rolling, nonce, result }: { pieces: number[][]; rolling: boolean; nonce: number; result: ThrowResult | null }) {
  const linePoints = useMemo(() => {
    const outline = TRACK.slice(0, 16).map(([x, y, z]) => [x, y + 0.02, z] as [number, number, number]);
    outline.push(outline[0]);
    return outline;
  }, []);

  function piecePosition(player: number, piece: number, step: number): [number, number, number] {
    if (step < 0) {
      const side = player === 0 ? -1 : 1;
      return [side * (5.35 + (piece % 2) * 0.58), 0.38, 1.2 - Math.floor(piece / 2) * 0.68];
    }
    if (step >= 20) {
      const side = player === 0 ? -1 : 1;
      return [side * (5.35 + (piece % 2) * 0.58), 0.38, -1.4 - Math.floor(piece / 2) * 0.68];
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

      <group position={[0, -0.2, 0]}>
        <RoundedBox args={[12.2, 0.48, 11.8]} radius={0.36} smoothness={6} receiveShadow castShadow>
          <meshStandardMaterial color="#563721" roughness={0.82} />
        </RoundedBox>
        <RoundedBox args={[11.55, 0.2, 11.15]} radius={0.25} smoothness={5} position={[0, 0.31, 0]} receiveShadow>
          <meshStandardMaterial color="#d2bc88" roughness={0.94} />
        </RoundedBox>

        <Line points={linePoints} color="#4b3327" lineWidth={3} />
        <Line points={[TRACK[0], [0, 0.36, 0], TRACK[8]]} color="#765740" lineWidth={2} />
        <Line points={[TRACK[4], [0, 0.36, 0], TRACK[12]]} color="#765740" lineWidth={2} />

        {TRACK.slice(0, 16).map((position, index) => (
          <BoardNode key={index} position={position} major={index % 4 === 0} />
        ))}
        <BoardNode position={[0, 0.36, 0]} major />

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

        <group position={[0, 0.55, 0]}>
          {[0, 1, 2, 3].map((index) => (
            <YutStick key={index} index={index} rolling={rolling} nonce={nonce} flat={(result?.flats ?? 2) > index} />
          ))}
        </group>
      </group>

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
    const nextResult = randomThrow();
    setResult(nextResult);
    setNonce((value) => value + 1);
    setPhase("rolling");
    window.setTimeout(() => setPhase("move"), 1650);
  };

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
      ? "윷이 날아오릅니다"
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
            <Canvas shadows dpr={[1, 1.7]} camera={{ position: [0, 9.6, 10.4], fov: 43 }}>
              <Suspense fallback={null}>
                <Scene pieces={pieces} rolling={phase === "rolling"} nonce={nonce} result={result} />
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
                <span>{phase === "rolling" ? "던지는 중" : "윷 던지기"}</span>
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
