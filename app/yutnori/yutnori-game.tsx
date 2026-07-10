import { Canvas } from "@react-three/fiber";
import { josa, susa } from "es-hangul";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NODE_POSITIONS,
  canChooseRoute,
  cloneBoard,
  createInitialBoard,
  groupForPiece,
  groupLeader,
  isMovable,
  nodeForPiece,
  pieceProgressLabel,
  resolveMove,
  type BoardState,
  type Player,
  type RouteChoice,
} from "./rules";
import { Scene, tokenPlacement } from "./board-scene";
import { BACKDO_RESULT, PLAYERS, RESULT_BY_FLATS } from "./game-config";
import type {
  ActiveMove,
  HoveredToken,
  MovePreview,
  PendingRoute,
  Phase,
  ThrowResult,
  ThrowResultEffectState,
} from "./game-types";
import { ThrowResultEffect, VictoryEffect } from "./result-effects";

export default function YutnoriGame() {
  const [current, setCurrent] = useState<Player>(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [pieces, setPieces] = useState<BoardState>(() => createInitialBoard());
  const [result, setResult] = useState<ThrowResult | null>(null);
  const [throwResultEffect, setThrowResultEffect] = useState<ThrowResultEffectState>(null);
  const [nonce, setNonce] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [hoveredToken, setHoveredToken] = useState<HoveredToken>(null);
  const [activeMove, setActiveMove] = useState<ActiveMove>(null);
  const [pendingRoute, setPendingRoute] = useState<PendingRoute>(null);
  const [hoveredRouteChoice, setHoveredRouteChoice] = useState<RouteChoice | null>(null);
  const [notice, setNotice] = useState("");
  const activeMoveRef = useRef<ActiveMove>(null);
  const moveId = useRef(0);
  const throwEffectId = useRef(0);
  const otherPlayer = (current === 0 ? 1 : 0) as Player;
  const routeChoiceFromCenter = pendingRoute !== null
    && nodeForPiece(pieces[current][pendingRoute.piece]) === "C";
  const previewWinner = useMemo<Player | null>(() => {
    if (!import.meta.env.DEV) return null;
    const value = new URLSearchParams(window.location.search).get("victory");
    if (value === "blue" || value === "cheong" || value === "0") return 0;
    if (value === "red" || value === "hong" || value === "1") return 1;
    return null;
  }, []);
  const visibleWinner = phase === "gameover" ? winner : previewWinner;

  useEffect(() => {
    if (!throwResultEffect) return;
    const timeout = window.setTimeout(() => setThrowResultEffect(null), 1450);
    return () => window.clearTimeout(timeout);
  }, [throwResultEffect]);

  const movePreviews = useMemo<MovePreview[]>(() => {
    if (!result) return [];
    const pieceIndex = phase === "move" && hoveredToken?.player === current
      ? hoveredToken.piece
      : phase === "route" && pendingRoute
        ? pendingRoute.piece
        : null;
    if (pieceIndex === null) return [];
    const piece = pieces[current][pieceIndex];
    if (!isMovable(piece, result.steps) || groupLeader(pieces, current, pieceIndex) !== pieceIndex) return [];

    const hasRouteChoice = canChooseRoute(piece, result.steps);
    const choices: RouteChoice[] = hasRouteChoice
      ? phase === "route" && hoveredRouteChoice ? [hoveredRouteChoice] : ["shortcut", "outer"]
      : ["outer"];
    return choices.map((choice) => {
      const resolution = resolveMove(pieces, current, pieceIndex, result.steps, choice);
      const destinationNode = nodeForPiece(resolution.destination);
      const sourceNode = nodeForPiece(piece);
      const destinationPosition = destinationNode
        ? NODE_POSITIONS[destinationNode]
        : resolution.destination.status === "finished"
          ? NODE_POSITIONS.O0
          : tokenPlacement(resolution.board, current, pieceIndex).position;
      const isBranchPreview = hasRouteChoice;
      const isCenterPreview = nodeForPiece(piece) === "C";
      return {
        key: `${pieceIndex}-${choice}`,
        position: destinationPosition,
        label: resolution.destination.status === "finished"
          ? "도착"
          : resolution.destination.status === "home"
            ? "대기석으로"
            : isBranchPreview
              ? isCenterPreview
                ? choice === "shortcut" ? "빠른 길 도착" : "돌아가는 길 도착"
                : choice === "shortcut" ? "지름길 도착" : "바깥길 도착"
              : `${result.name} 도착`,
        action: resolution.capturedPieces.length > 0
          ? "잡기!"
          : resolution.stackedPieces.length > 0
            ? "업기!"
            : null,
        color: choice === "shortcut" ? "#f2cb72" : PLAYERS[current].glow,
        pathNodes: sourceNode ? [sourceNode, ...resolution.waypoints] : resolution.waypoints,
      };
    });
  }, [current, hoveredRouteChoice, hoveredToken, pendingRoute, phase, pieces, result]);

  const throwYut = () => {
    if (phase !== "ready") return;
    setResult(null);
    setNotice("");
    setNonce((value) => value + 1);
    setPhase("rolling");
  };

  const retryTimedOutThrow = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  const settleThrow = useCallback((flats: number, backdo: boolean) => {
    const nextResult = backdo ? BACKDO_RESULT : RESULT_BY_FLATS[flats];
    throwEffectId.current += 1;
    setThrowResultEffect({ id: throwEffectId.current, result: nextResult });
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

    if (move.captureReturn) {
      const capture = move.captureReturn;
      setPieces(capture.board);
      moveId.current += 1;
      const returnMove: NonNullable<ActiveMove> = {
        ...move,
        id: moveId.current,
        stage: "capture-return",
        player: capture.player,
        pieces: capture.pieces,
        leader: capture.pieces[capture.pieces.length - 1],
        waypoints: [],
        waypointClearances: [],
        captureReturn: null,
      };
      activeMoveRef.current = returnMove;
      setActiveMove(returnMove);
      return;
    }

    activeMoveRef.current = null;
    setActiveMove(null);
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
    setHoveredRouteChoice(null);
    setPendingRoute(null);

    const resolution = resolveMove(pieces, current, pieceIndex, result.steps, routeChoice);
    const waypointClearances = resolution.waypoints.map((node) => {
      let occupants = 0;
      pieces.forEach((playerPieces, player) => {
        playerPieces.forEach((piece, index) => {
          const isMovingPiece = player === current && resolution.movedPieces.includes(index);
          if (!isMovingPiece && nodeForPiece(piece) === node) occupants += 1;
        });
      });
      return occupants * 0.19;
    });
    const capturePlayer = otherPlayer;
    let visibleBoard = resolution.board;
    let captureReturn: NonNullable<ActiveMove>["captureReturn"] = null;
    if (resolution.capturedPieces.length > 0) {
      visibleBoard = cloneBoard(resolution.board);
      resolution.capturedPieces.forEach((capturedPiece) => {
        visibleBoard[capturePlayer][capturedPiece] = { ...pieces[capturePlayer][capturedPiece] };
      });
      captureReturn = {
        player: capturePlayer,
        pieces: resolution.capturedPieces,
        board: resolution.board,
      };
    }
    setPieces(visibleBoard);

    const gotExtraThrow = result.extraThrow || resolution.capturedPieces.length > 0;
    const nextPlayer = gotExtraThrow ? current : otherPlayer;
    const messages: string[] = [];
    if (resolution.stackedPieces.length > 0) {
      const stackedCount = resolution.stackedPieces.length + resolution.movedPieces.length;
      messages.push(`같은 편 ${josa(`${susa(stackedCount, true)} 말`, "을/를")} 업었습니다`);
    }
    if (resolution.capturedPieces.length > 0) {
      messages.push(`상대 ${josa(`${susa(resolution.capturedPieces.length, true)} 말`, "을/를")} 잡아 한 번 더 던집니다`);
    } else if (result.extraThrow) {
      messages.push(`${josa(result.name, "이/가")} 나와 한 번 더 던집니다`);
    }

    moveId.current += 1;
    const move: NonNullable<ActiveMove> = {
      id: moveId.current,
      stage: "advance",
      player: current,
      pieces: resolution.movedPieces,
      leader: resolution.movedPieces[resolution.movedPieces.length - 1],
      waypoints: resolution.waypoints,
      waypointClearances,
      nextPlayer,
      winner: resolution.won ? current : null,
      notice: messages.join(" · "),
      captureReturn,
    };
    activeMoveRef.current = move;
    setActiveMove(move);
    setPhase("moving");
  };

  const movePiece = (pieceIndex: number) => {
    if (phase !== "move" || !result) return;
    const piece = pieces[current][pieceIndex];
    if (!isMovable(piece, result.steps) || groupLeader(pieces, current, pieceIndex) !== pieceIndex) return;
    if (canChooseRoute(piece, result.steps)) {
      setHoveredToken(null);
      setHoveredRouteChoice(null);
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
    setThrowResultEffect(null);
    setWinner(null);
    setNonce(0);
    setHoveredToken(null);
    setHoveredRouteChoice(null);
    setPendingRoute(null);
    setNotice("");
    activeMoveRef.current = null;
    setActiveMove(null);
  };

  const statusText = phase === "ready"
    ? notice || `${PLAYERS[current].name}의 차례입니다`
    : phase === "rolling"
      ? "윷이 안정될 때까지 기다리는 중"
      : phase === "move"
        ? result?.steps === -1 ? "빽도 · 움직일 말을 골라 한 칸 뒤로 가세요" : `${result?.name} · ${result?.steps}칸 움직이세요`
        : phase === "route"
          ? routeChoiceFromCenter ? "중앙에서 어느 지름길로 갈까요?" : "이 갈림길에서 어느 길로 갈까요?"
          : phase === "moving"
            ? activeMove?.stage === "capture-return"
              ? "잡힌 말이 대기석으로 돌아가는 중"
              : "잡는 말이 도착 칸으로 이동하는 중"
            : `${josa(PLAYERS[winner ?? 0].name, "이/가")} 네 말을 모두 냈습니다`;

  return (
    <main className="game-shell">
      <div className="grain" aria-hidden="true" />
      {throwResultEffect && <ThrowResultEffect effect={throwResultEffect} />}
      {visibleWinner !== null && <VictoryEffect winner={visibleWinner} />}
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">윷</div>
        <div>
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
                  onRollTimeout={retryTimedOutThrow}
                  hoveredToken={hoveredToken}
                  movePreviews={movePreviews}
                  activeMove={activeMove}
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
                  const leader = group[0];
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
                      <span>{follower ? `${josa(`${leader + 1}번 말`, "와/과")} 업힘` : pieceProgressLabel(piece)}</span>
                    </button>
                  );
                })}
              </div>
            ) : phase === "route" ? (
              <div className="route-actions" aria-label="이동 경로 선택">
                <button
                  type="button"
                  onPointerEnter={() => setHoveredRouteChoice("shortcut")}
                  onPointerLeave={() => setHoveredRouteChoice(null)}
                  onFocus={() => setHoveredRouteChoice("shortcut")}
                  onBlur={() => setHoveredRouteChoice(null)}
                  onClick={() => chooseRoute("shortcut")}
                >
                  {routeChoiceFromCenter ? "빠른 지름길" : "지름길"}
                  <span>{routeChoiceFromCenter ? "도착점 방향으로 바로 갑니다" : "가운데를 가로질러 갑니다"}</span>
                </button>
                <button
                  type="button"
                  onPointerEnter={() => setHoveredRouteChoice("outer")}
                  onPointerLeave={() => setHoveredRouteChoice(null)}
                  onFocus={() => setHoveredRouteChoice("outer")}
                  onBlur={() => setHoveredRouteChoice(null)}
                  onClick={() => chooseRoute("outer")}
                >
                  {routeChoiceFromCenter ? "돌아가는 길" : "바깥길"}
                  <span>{routeChoiceFromCenter ? "반대편 모서리를 거쳐 갑니다" : "모서리를 따라 계속 갑니다"}</span>
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
