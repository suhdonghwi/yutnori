import { Canvas } from "@react-three/fiber";
import { ArrowRight, DoorOpen, Plus, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
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
import { chooseAiMove, type AiDecision } from "./ai-player";
import { BACKDO_RESULT, PLAYERS, RESULT_BY_FLATS } from "./game-config";
import type {
  ActiveMove,
  GameMode,
  HoveredToken,
  MovePreview,
  PendingRoute,
  Phase,
  ThrowResult,
  ThrowResultEffectState,
} from "./game-types";
import { ThrowResultEffect, VictoryEffect } from "./result-effects";
import { Lobby } from "./lobby";
import { gameSfx } from "./game-sfx";

function PlayerProgress({
  player,
  role,
  finished,
  active,
}: {
  player: Player;
  role: string;
  finished: number;
  active: boolean;
}) {
  const config = PLAYERS[player];

  return (
    <div
      className={`relative flex items-center gap-3 transition-opacity duration-300 max-[760px]:gap-2 ${active ? "opacity-100" : "opacity-55"}`}
      style={{ "--player-color": config.color } as React.CSSProperties}
    >
      <span className="size-6 shrink-0 rounded-full border border-[rgba(245,222,168,.62)] bg-[var(--player-color)] shadow-[0_5px_14px_rgba(0,0,0,.28)] max-[760px]:size-4" aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5 whitespace-nowrap max-[760px]:gap-1.5">
          <strong className="text-base leading-none font-extrabold text-[#f0dfbb] max-[760px]:text-[13px]">{config.name}{player === 1 && role === "AI 상대" ? " AI" : ""}</strong>
          <span className="text-[11px] font-semibold text-[#a69a80] max-[760px]:text-[9px]">{finished} / 4 도착</span>
          <small className="text-[9px] font-medium tracking-[.08em] text-[#736c5e] max-[960px]:hidden">{role}</small>
        </div>
        <div className="mt-2 flex items-center gap-3 max-[760px]:hidden" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className={`size-[7px] rounded-full border ${index < finished ? "border-[#d9ba70] bg-[#d9ba70]" : "border-[rgba(217,186,112,.48)] bg-transparent"}`} />
          ))}
        </div>
      </div>
      {active && <span className="absolute -bottom-3 left-0 h-px w-full bg-[linear-gradient(90deg,#d9ba70,transparent)] max-[760px]:-bottom-2" aria-hidden="true" />}
    </div>
  );
}

function GameSession({ mode, onExit }: { mode: GameMode; onExit: () => void }) {
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
  const [aiDecision, setAiDecision] = useState<AiDecision | null>(null);
  const [notice, setNotice] = useState("");
  const [sfxEnabled, setSfxEnabled] = useState(() => gameSfx.isEnabled());
  const activeMoveRef = useRef<ActiveMove>(null);
  const moveId = useRef(0);
  const throwEffectId = useRef(0);
  const otherPlayer = (current === 0 ? 1 : 0) as Player;
  const isAiTurn = mode === "ai" && current === 1;
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
    const pieceIndex = phase === "move" && aiDecision
      ? aiDecision.pieceIndex
      : phase === "move" && hoveredToken?.player === current
        ? hoveredToken.piece
      : phase === "route" && pendingRoute
        ? pendingRoute.piece
        : null;
    if (pieceIndex === null) return [];
    const piece = pieces[current][pieceIndex];
    if (!isMovable(piece, result.steps) || groupLeader(pieces, current, pieceIndex) !== pieceIndex) return [];

    const hasRouteChoice = canChooseRoute(piece, result.steps);
    const choices: RouteChoice[] = aiDecision
      ? [aiDecision.routeChoice]
      : hasRouteChoice
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
  }, [aiDecision, current, hoveredRouteChoice, hoveredToken, pendingRoute, phase, pieces, result]);

  const throwYut = useCallback(() => {
    if (phase !== "ready") return;
    setAiDecision(null);
    setResult(null);
    setNotice("");
    setNonce((value) => value + 1);
    setPhase("rolling");
  }, [phase]);

  const settleThrow = useCallback((flats: number, backdo: boolean) => {
    const nextResult = backdo ? BACKDO_RESULT : RESULT_BY_FLATS[flats];
    gameSfx.playResult(nextResult.steps);
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
      gameSfx.playCapture();
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
        arrivalEffect: null,
        captureReturn: null,
      };
      activeMoveRef.current = returnMove;
      setActiveMove(returnMove);
      return;
    }

    activeMoveRef.current = null;
    setActiveMove(null);
    if (move.arrivalEffect === "stack") gameSfx.playStack();
    setNotice(move.notice);
    if (move.winner !== null) {
      gameSfx.playVictory();
      setWinner(move.winner);
      setPhase("gameover");
    } else {
      setCurrent(move.nextPlayer);
      setPhase("ready");
    }
  }, []);

  const executeMove = (pieceIndex: number, routeChoice: RouteChoice) => {
    if (!result || (phase !== "move" && phase !== "route")) return;
    setAiDecision(null);
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
      arrivalEffect: resolution.capturedPieces.length > 0
        ? "capture"
        : resolution.stackedPieces.length > 0
          ? "stack"
          : null,
      captureReturn,
    };
    activeMoveRef.current = move;
    setActiveMove(move);
    setPhase("moving");
  };

  const movePiece = (pieceIndex: number) => {
    if (isAiTurn || phase !== "move" || !result) return;
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
    if (isAiTurn || !pendingRoute) return;
    executeMove(pendingRoute.piece, choice);
  };

  useEffect(() => {
    if (!isAiTurn) return;

    if (phase === "ready") {
      const timeout = window.setTimeout(throwYut, 700);
      return () => window.clearTimeout(timeout);
    }

    if (phase !== "move" || !result) return;
    if (!aiDecision) {
      const timeout = window.setTimeout(() => {
        const decision = chooseAiMove(pieces, result);
        if (!decision) {
          setNotice("AI가 움직일 수 없어 차례가 넘어갔습니다");
          setCurrent(0);
          setPhase("ready");
          return;
        }
        setAiDecision(decision);
        setHoveredToken({ player: 1, piece: decision.pieceIndex });
      }, 600);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      executeMove(aiDecision.pieceIndex, aiDecision.routeChoice);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [aiDecision, isAiTurn, phase, pieces, result, throwYut]);

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
    setAiDecision(null);
    setPendingRoute(null);
    setNotice("");
    activeMoveRef.current = null;
    setActiveMove(null);
  };

  const toggleSfx = () => {
    const next = !sfxEnabled;
    gameSfx.setEnabled(next);
    setSfxEnabled(next);
    if (next) gameSfx.playToggle();
  };

  const statusText = phase === "ready"
    ? isAiTurn
      ? notice || "홍팀 AI가 윷을 준비하는 중"
      : notice || `${PLAYERS[current].name}의 차례입니다`
    : phase === "rolling"
      ? isAiTurn ? "홍팀 AI가 던진 윷을 판정하는 중" : "윷이 안정될 때까지 기다리는 중"
      : phase === "move"
        ? isAiTurn
          ? aiDecision ? `AI 판단 · ${aiDecision.reason}` : "AI가 최선의 수를 계산하는 중"
          : result?.steps === -1 ? "빽도 · 움직일 말을 골라 한 칸 뒤로 가세요" : `${result?.name} · ${result?.steps}칸 움직이세요`
        : phase === "route"
          ? routeChoiceFromCenter ? "중앙에서 어느 지름길로 갈까요?" : "이 갈림길에서 어느 길로 갈까요?"
          : phase === "moving"
            ? activeMove?.stage === "capture-return"
              ? "잡힌 말이 대기석으로 돌아가는 중"
              : "잡는 말이 도착 칸으로 이동하는 중"
            : `${josa(PLAYERS[winner ?? 0].name, "이/가")} 네 말을 모두 냈습니다`;

  return (
    <main className="game-shell fixed inset-0 block h-svh min-h-0 w-full overflow-hidden isolate">
      <div className="grain" aria-hidden="true" />
      {throwResultEffect && <ThrowResultEffect effect={throwResultEffect} />}
      {visibleWinner !== null && <VictoryEffect winner={visibleWinner} />}

      <section className="pointer-events-none absolute inset-0 block h-full w-full" aria-label="3D 윷놀이 게임">
        <div className="pointer-events-auto absolute top-7 left-8 z-20 max-[760px]:top-4 max-[760px]:left-3">
          <PlayerProgress
            player={0}
            role={mode === "ai" ? "플레이어" : "첫째 선수"}
            finished={pieces[0].filter((piece) => piece.status === "finished").length}
            active={current === 0 && phase !== "gameover"}
          />
        </div>

        <div className="pointer-events-auto absolute top-7 right-8 z-20 flex items-start gap-7 max-[760px]:top-4 max-[760px]:right-3 max-[760px]:gap-3">
          <PlayerProgress
            player={1}
            role={mode === "ai" ? "AI 상대" : "둘째 선수"}
            finished={pieces[1].filter((piece) => piece.status === "finished").length}
            active={current === 1 && phase !== "gameover"}
          />
          <div className="flex items-start gap-4 border-l border-[rgba(217,186,112,.34)] pl-5 max-[760px]:gap-2 max-[760px]:pl-3">
            <button className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-[#a89b80] transition-colors hover:text-[#ead6a9]" type="button" onClick={toggleSfx} aria-label={sfxEnabled ? "효과음 끄기" : "효과음 켜기"} aria-pressed={sfxEnabled}>
              {sfxEnabled
                ? <SpeakerHigh size={21} weight="regular" aria-hidden="true" />
                : <SpeakerSlash size={21} weight="regular" aria-hidden="true" />}
              <span className="max-[760px]:hidden">효과음</span>
            </button>
            <button className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-[#a89b80] transition-colors hover:text-[#ead6a9]" type="button" onClick={onExit} aria-label="로비로 돌아가기">
              <DoorOpen size={21} weight="regular" aria-hidden="true" />
              <span className="max-[760px]:hidden">로비로</span>
            </button>
            <button className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-[#a89b80] transition-colors hover:text-[#ead6a9]" type="button" onClick={reset} aria-label="새 판 시작">
              <Plus size={21} weight="regular" aria-hidden="true" />
              <span className="max-[760px]:hidden">새 판</span>
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1] block min-w-0">
          <div className="pointer-events-auto absolute inset-0 h-full min-h-0 w-full [&_canvas]:touch-none">
            <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 10.8, 11.8], fov: 44 }}>
              <Suspense fallback={null}>
                <Scene
                  pieces={pieces}
                  rolling={phase === "rolling"}
                  nonce={nonce}
                  onSettled={settleThrow}
                  hoveredToken={hoveredToken}
                  movePreviews={movePreviews}
                  activeMove={activeMove}
                  onMoveComplete={handleMoveComplete}
                />
              </Suspense>
            </Canvas>
          </div>

          <div className="pointer-events-auto absolute bottom-5 left-1/2 z-[14] flex min-h-[96px] w-[calc(100%-64px)] max-w-[1380px] -translate-x-1/2 items-stretch overflow-hidden rounded-[2px] border border-[rgba(217,186,112,.58)] bg-[rgba(7,15,12,.8)] shadow-[0_20px_60px_rgba(0,0,0,.34)] max-[760px]:bottom-2 max-[760px]:min-h-[108px] max-[760px]:w-[calc(100%-16px)] max-[760px]:flex-col max-[760px]:rounded-[3px]" style={{ "--turn-color": PLAYERS[current].color } as React.CSSProperties}>
            <div className="flex min-w-[330px] flex-[1.05] items-center gap-4 border-r border-[rgba(217,186,112,.36)] px-8 py-4 max-[900px]:min-w-[270px] max-[760px]:min-h-[52px] max-[760px]:w-full max-[760px]:min-w-0 max-[760px]:flex-none max-[760px]:gap-2.5 max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-3.5 max-[760px]:py-2" aria-live="polite">
              <span className="size-[11px] shrink-0 rounded-full border border-[rgba(245,222,168,.66)] bg-[var(--turn-color)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--turn-color),transparent_80%)] max-[760px]:size-[9px]" />
              <div className="min-w-0"><small className="mb-1 block text-[11px] font-medium text-[#a89b80] max-[760px]:mb-0 max-[760px]:text-[9px]">지금은</small><strong className="block overflow-hidden text-[clamp(16px,1.5vw,21px)] leading-[1.18] font-extrabold text-ellipsis whitespace-nowrap text-[#f0e2c5] max-[760px]:max-w-[calc(100vw-62px)] max-[760px]:text-[13px]">{statusText}</strong></div>
            </div>

            {phase === "move" && isAiTurn ? (
              <div className="flex min-w-[310px] flex-[1.35] items-center gap-4 px-8 py-4 max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:gap-2 max-[760px]:px-3.5 max-[760px]:py-2" aria-live="polite">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[rgba(226,162,143,.34)] text-[11px] font-black text-[#e2a294] max-[760px]:size-8">AI</span>
                <div>
                  <small className="mb-1 block text-[9px] leading-none font-semibold tracking-[.1em] text-[#b99b91]">홍팀의 선택</small>
                  <strong className="block whitespace-nowrap text-sm leading-[1.2] font-extrabold text-[#efd6cb] max-[760px]:max-w-[68vw] max-[760px]:overflow-hidden max-[760px]:text-[11px] max-[760px]:text-ellipsis">{aiDecision?.reason ?? "수를 읽는 중"}</strong>
                </div>
              </div>
            ) : phase === "move" ? (
              <div className="grid flex-[1.55] grid-cols-4 max-[760px]:min-h-[58px] max-[760px]:grid-cols-4" aria-label="움직일 말 선택">
                {pieces[current].map((piece, index) => {
                  const group = groupForPiece(pieces, current, index);
                  const leader = group[0];
                  const follower = piece.status === "board" && leader !== index;
                  const movable = isMovable(piece, result?.steps ?? 0) && !follower;
                  return (
                    <button
                      key={index}
                      type="button"
                      className="group min-w-[58px] cursor-pointer border-0 border-l border-[rgba(217,186,112,.28)] bg-transparent px-3 py-3 text-sm font-extrabold text-[#d7c8a8] transition-[background-color,color,opacity] enabled:hover:bg-[rgba(217,186,112,.1)] enabled:hover:text-[#f4dba1] disabled:cursor-not-allowed disabled:opacity-[.24] max-[760px]:min-w-0 max-[760px]:px-1 max-[760px]:py-1.5 max-[760px]:text-[11px]"
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
                      <span className="mt-1.5 block text-[9px] font-medium text-[#817867] group-hover:text-[#c5b590] max-[760px]:mt-0.5 max-[760px]:text-[8px]">{follower ? `${josa(`${leader + 1}번 말`, "와/과")} 업힘` : pieceProgressLabel(piece)}</span>
                    </button>
                  );
                })}
              </div>
            ) : phase === "route" ? (
              <div className="grid flex-[1.45] grid-cols-2 max-[760px]:min-h-[58px]" aria-label="이동 경로 선택">
                <button
                  type="button"
                  className="cursor-pointer border-0 border-r border-[rgba(217,186,112,.28)] bg-[rgba(217,186,112,.09)] px-5 py-3 text-sm font-extrabold text-[#efd49a] transition-colors hover:bg-[rgba(217,186,112,.15)] max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-[7px] max-[760px]:text-[11px]"
                  onPointerEnter={() => setHoveredRouteChoice("shortcut")}
                  onPointerLeave={() => setHoveredRouteChoice(null)}
                  onFocus={() => setHoveredRouteChoice("shortcut")}
                  onBlur={() => setHoveredRouteChoice(null)}
                  onClick={() => chooseRoute("shortcut")}
                >
                  {routeChoiceFromCenter ? "빠른 지름길" : "지름길"}
                  <span className="mt-[3px] block text-[9px] font-medium text-[rgba(238,224,195,.65)]">{routeChoiceFromCenter ? "도착점 방향으로 바로 갑니다" : "가운데를 가로질러 갑니다"}</span>
                </button>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent px-5 py-3 text-sm font-extrabold text-[#cabea5] transition-colors hover:bg-white/[.04] hover:text-[#f1dfb9] max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-[7px] max-[760px]:text-[11px]"
                  onPointerEnter={() => setHoveredRouteChoice("outer")}
                  onPointerLeave={() => setHoveredRouteChoice(null)}
                  onFocus={() => setHoveredRouteChoice("outer")}
                  onBlur={() => setHoveredRouteChoice(null)}
                  onClick={() => chooseRoute("outer")}
                >
                  {routeChoiceFromCenter ? "돌아가는 길" : "바깥길"}
                  <span className="mt-[3px] block text-[9px] font-medium text-[rgba(238,224,195,.65)]">{routeChoiceFromCenter ? "반대편 모서리를 거쳐 갑니다" : "모서리를 따라 계속 갑니다"}</span>
                </button>
              </div>
            ) : phase === "gameover" ? (
              <button className="flex min-w-[240px] flex-[1.2] cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-[#d9ba70] transition-colors hover:bg-[rgba(217,186,112,.1)] hover:text-[#f4d99b] max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:text-sm" type="button" onClick={reset}>한 판 더 <ArrowRight size={21} weight="bold" aria-hidden="true" /></button>
            ) : (
              <button className="flex min-w-[240px] flex-[1.2] cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-[#d9ba70] transition-colors enabled:hover:bg-[rgba(217,186,112,.1)] enabled:hover:text-[#f4d99b] disabled:cursor-wait disabled:opacity-45 max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:px-3 max-[760px]:text-sm" type="button" onClick={throwYut} disabled={isAiTurn || phase === "rolling" || phase === "moving"}>
                <span>{isAiTurn && phase === "ready" ? "AI 자동 진행" : phase === "rolling" ? "결과 확인 중" : phase === "moving" ? "말 이동 중" : "윷 던지기"}</span>
                <ArrowRight size={22} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

      </section>

      <footer className="hidden">
        <p>갈림길에서는 길을 고르고, 같은 편은 업고, 상대편은 잡습니다. 네 말을 먼저 모두 내면 승리합니다.</p>
        <span>윷·모 또는 잡기에는 한 번 더 던집니다</span>
      </footer>
    </main>
  );
}

export default function YutnoriGame() {
  const [screen, setScreen] = useState<"lobby" | GameMode>("lobby");

  const startGame = (mode: GameMode) => {
    gameSfx.unlock();
    setScreen(mode);
  };

  return screen === "lobby"
    ? <Lobby onStartLocal={() => startGame("local")} onStartAi={() => startGame("ai")} />
    : <GameSession mode={screen} onExit={() => setScreen("lobby")} />;
}
