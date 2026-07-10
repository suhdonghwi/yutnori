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

  const statusText = phase === "ready"
    ? isAiTurn
      ? notice || "홍군 AI가 윷을 준비하는 중"
      : notice || `${PLAYERS[current].name}의 차례입니다`
    : phase === "rolling"
      ? isAiTurn ? "홍군 AI가 던진 윷을 판정하는 중" : "윷이 안정될 때까지 기다리는 중"
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
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex w-full items-center gap-4 border-b border-[rgba(227,204,158,.12)] bg-[linear-gradient(180deg,rgba(8,15,12,.92),rgba(8,15,12,.48)_72%,transparent)] px-[22px] pt-2.5 pb-3 max-[760px]:gap-2 max-[760px]:px-3 max-[760px]:pt-2 max-[760px]:pb-2.5">
        <div className="pointer-events-auto grid size-9 place-items-center rounded-full border border-[rgba(232,199,139,.48)] text-[17px] font-extrabold text-[#d9b96f] max-[760px]:size-8 max-[760px]:text-[15px]" aria-hidden="true">윷</div>
        <div>
          <h1 className="pointer-events-auto m-0 text-[clamp(20px,1.8vw,25px)] leading-none font-bold tracking-[-.06em]">한판 윷놀이</h1>
        </div>
        <div className="pointer-events-auto ml-auto flex items-center gap-2 max-[760px]:gap-1.5">
          <button className="cursor-pointer rounded-full border border-[rgba(230,206,160,.16)] bg-white/[.025] px-3.5 py-1.5 text-[13px] text-[#b9ad96] transition-colors hover:border-[rgba(230,206,160,.5)] hover:bg-white/[.08] hover:text-[#eadbbd] max-[760px]:px-[11px] max-[760px]:text-xs" type="button" onClick={onExit}>로비로</button>
          <button className="cursor-pointer rounded-full border border-[rgba(230,206,160,.28)] bg-white/[.03] px-3.5 py-1.5 text-[13px] text-[#d9c8a8] transition-colors hover:border-[rgba(230,206,160,.5)] hover:bg-white/[.08] max-[760px]:px-[11px] max-[760px]:text-xs" type="button" onClick={reset}>새 판</button>
        </div>
      </header>

      <section className="pointer-events-none absolute inset-0 block h-full w-full" aria-label="3D 윷놀이 게임">
        <aside className={`pointer-events-auto absolute top-[72px] left-7 z-[12] flex w-56 items-center gap-3 rounded-[17px] border bg-[rgba(13,22,18,.78)] px-3.5 py-3 text-left shadow-[0_14px_38px_rgba(0,0,0,.28)] backdrop-blur-2xl transition-[opacity,border-color] max-[760px]:left-2.5 max-[760px]:w-[158px] max-[760px]:gap-2 max-[760px]:px-2.5 max-[760px]:py-[9px] ${current === 0 && phase !== "gameover" ? "border-[rgba(226,202,157,.32)] opacity-100 after:absolute after:top-[7px] after:right-2.5 after:rounded-full after:bg-[#d7bd82] after:px-2 after:py-[3px] after:text-[8px] after:font-extrabold after:tracking-[.08em] after:text-[#33261c] after:content-['차례'] max-[760px]:after:hidden" : "border-[rgba(226,202,157,.14)] opacity-[.58]"}`}>
          <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-[var(--blue)] text-[19px] font-extrabold text-[#f4e5c2] shadow-[inset_0_0_0_6px_rgba(255,255,255,.08),0_12px_28px_rgba(0,0,0,.25)] max-[760px]:size-[37px] max-[760px]:text-base">靑</span>
          <div><small className="mb-[3px] block text-[10px] font-medium tracking-[.12em] text-[#9c8e76] max-[760px]:hidden">{mode === "ai" ? "플레이어" : "첫째 선수"}</small><strong className="text-[19px] max-[760px]:text-base">청군</strong></div>
          <span className="ml-auto whitespace-nowrap text-[10px] font-semibold text-[#c9b997] max-[760px]:hidden">도착 {pieces[0].filter((piece) => piece.status === "finished").length}/4</span>
        </aside>

        <div className="pointer-events-none absolute inset-0 z-[1] block min-w-0">
          <div className="pointer-events-auto absolute inset-0 h-full min-h-0 w-full [&_canvas]:touch-none">
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
          </div>

          <div className="pointer-events-auto absolute bottom-[22px] left-1/2 z-[14] flex min-h-[84px] w-[min(760px,calc(100%-36px))] -translate-x-1/2 items-center gap-5 rounded-[22px] border border-[rgba(227,204,161,.24)] bg-[rgba(13,20,16,.88)] py-[13px] pr-3.5 pl-[22px] shadow-[0_24px_70px_rgba(0,0,0,.45)] backdrop-blur-2xl max-[760px]:bottom-2 max-[760px]:min-h-[72px] max-[760px]:w-[calc(100%-16px)] max-[760px]:gap-2 max-[760px]:rounded-[17px] max-[760px]:py-2.5 max-[760px]:pr-2.5 max-[760px]:pl-3.5" style={{ "--turn-color": PLAYERS[current].color } as React.CSSProperties}>
            <div className="flex min-w-0 flex-1 items-center gap-3 max-[760px]:gap-[9px]" aria-live="polite">
              <span className="size-[9px] shrink-0 rounded-full bg-[var(--turn-color)] shadow-[0_0_0_5px_color-mix(in_srgb,var(--turn-color),transparent_78%)]" />
              <div className="min-w-0"><small className="mb-0.5 block text-[10px] font-medium text-[#9f927b]">지금은</small><strong className="block overflow-hidden text-[clamp(14px,1.4vw,18px)] text-ellipsis whitespace-nowrap text-[#f0e2c5] max-[760px]:max-w-[42vw] max-[760px]:text-sm">{statusText}</strong></div>
            </div>

            {phase === "move" && isAiTurn ? (
              <div className="flex min-w-[250px] items-center gap-3 rounded-[13px] border border-[rgba(226,162,143,.2)] bg-[rgba(166,63,49,.11)] px-[13px] py-[9px] max-[760px]:min-w-0 max-[760px]:gap-2 max-[760px]:px-[9px] max-[760px]:py-[7px]" aria-live="polite">
                <span className="grid size-[39px] shrink-0 place-items-center rounded-[11px] bg-[#8f352b] text-xs font-black text-[#ffe6dc] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)] max-[760px]:size-[34px]">AI</span>
                <div>
                  <small className="mb-1 block text-[9px] leading-none font-semibold tracking-[.1em] text-[#b99b91]">홍군의 선택</small>
                  <strong className="block whitespace-nowrap text-[13px] leading-[1.2] font-extrabold text-[#efd6cb] max-[760px]:max-w-[32vw] max-[760px]:overflow-hidden max-[760px]:text-[11px] max-[760px]:text-ellipsis">{aiDecision?.reason ?? "수를 읽는 중"}</strong>
                </div>
              </div>
            ) : phase === "move" ? (
              <div className="grid flex-[1.3] grid-cols-4 gap-1.5 max-[760px]:grid-cols-2" aria-label="움직일 말 선택">
                {pieces[current].map((piece, index) => {
                  const group = groupForPiece(pieces, current, index);
                  const leader = group[0];
                  const follower = piece.status === "board" && leader !== index;
                  const movable = isMovable(piece, result?.steps ?? 0) && !follower;
                  return (
                    <button
                      key={index}
                      type="button"
                      className="group min-w-[58px] cursor-pointer rounded-[10px] border border-[rgba(223,196,140,.2)] bg-white/[.055] px-[7px] py-2 text-xs font-extrabold text-[#eee0c3] transition-[transform,background-color,border-color,opacity] enabled:hover:-translate-y-0.5 enabled:hover:border-transparent enabled:hover:bg-[var(--turn-color)] disabled:cursor-not-allowed disabled:opacity-[.28] max-[760px]:py-[5px]"
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
                      <span className="mt-[3px] block text-[9px] font-medium text-[#aa9b82] group-hover:text-white/75">{follower ? `${josa(`${leader + 1}번 말`, "와/과")} 업힘` : pieceProgressLabel(piece)}</span>
                    </button>
                  );
                })}
              </div>
            ) : phase === "route" ? (
              <div className="grid flex-[1.35] grid-cols-2 gap-2 max-[760px]:gap-[5px]" aria-label="이동 경로 선택">
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-transparent bg-[color-mix(in_srgb,var(--turn-color)_68%,transparent)] px-[13px] py-[9px] text-[13px] font-extrabold text-[#f1dfb9] transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-[1.13] max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-[7px] max-[760px]:text-[11px]"
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
                  className="cursor-pointer rounded-xl border border-[rgba(223,196,140,.24)] bg-white/[.055] px-[13px] py-[9px] text-[13px] font-extrabold text-[#f1dfb9] transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-[1.13] max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-[7px] max-[760px]:text-[11px]"
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
              <button className="flex h-[54px] min-w-[155px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-[#d3b873] px-5 font-black text-[#251e16] shadow-[inset_0_1px_rgba(255,255,255,.35),0_8px_20px_rgba(0,0,0,.24)] transition-[transform,filter] enabled:hover:-translate-y-0.5 enabled:hover:brightness-[1.08] max-[760px]:h-[50px] max-[760px]:min-w-[126px]" type="button" onClick={reset}>한 판 더</button>
            ) : (
              <button className="flex h-[54px] min-w-[155px] shrink-0 cursor-pointer items-center justify-between gap-3 rounded-xl border-0 bg-[#d3b873] py-0 pr-2.5 pl-5 font-black text-[#251e16] shadow-[inset_0_1px_rgba(255,255,255,.35),0_8px_20px_rgba(0,0,0,.24)] transition-[transform,filter] enabled:hover:-translate-y-0.5 enabled:hover:brightness-[1.08] disabled:cursor-wait disabled:opacity-70 max-[760px]:h-[50px] max-[760px]:min-w-[126px] max-[760px]:pl-3.5" type="button" onClick={throwYut} disabled={isAiTurn || phase === "rolling" || phase === "moving"}>
                <span>{isAiTurn && phase === "ready" ? "AI 자동 진행" : phase === "rolling" ? "물리 판정 중" : phase === "moving" ? "말 이동 중" : "윷 던지기"}</span>
                <i className="grid size-[35px] place-items-center rounded-[9px] bg-[rgba(35,29,20,.12)] text-xl not-italic" aria-hidden="true">↗</i>
              </button>
            )}
          </div>
        </div>

        <aside className={`pointer-events-auto absolute top-[72px] right-7 z-[12] flex w-56 items-center gap-3 rounded-[17px] border bg-[rgba(13,22,18,.78)] px-3.5 py-3 text-left shadow-[0_14px_38px_rgba(0,0,0,.28)] backdrop-blur-2xl transition-[opacity,border-color] max-[760px]:right-2.5 max-[760px]:w-[158px] max-[760px]:gap-2 max-[760px]:px-2.5 max-[760px]:py-[9px] ${current === 1 && phase !== "gameover" ? "border-[rgba(226,202,157,.32)] opacity-100 after:absolute after:top-[7px] after:right-2.5 after:rounded-full after:bg-[#d7bd82] after:px-2 after:py-[3px] after:text-[8px] after:font-extrabold after:tracking-[.08em] after:text-[#33261c] after:content-['차례'] max-[760px]:after:hidden" : "border-[rgba(226,202,157,.14)] opacity-[.58]"}`}>
          <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-[var(--red)] text-[19px] font-extrabold text-[#f4e5c2] shadow-[inset_0_0_0_6px_rgba(255,255,255,.08),0_12px_28px_rgba(0,0,0,.25)] max-[760px]:size-[37px] max-[760px]:text-base">紅</span>
          <div><small className="mb-[3px] block text-[10px] font-medium tracking-[.12em] text-[#9c8e76] max-[760px]:hidden">{mode === "ai" ? "AI 상대" : "둘째 선수"}</small><strong className="text-[19px] max-[760px]:text-base">홍군</strong></div>
          <span className="ml-auto whitespace-nowrap text-[10px] font-semibold text-[#c9b997] max-[760px]:hidden">도착 {pieces[1].filter((piece) => piece.status === "finished").length}/4</span>
        </aside>
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

  return screen === "lobby"
    ? <Lobby onStartLocal={() => setScreen("local")} onStartAi={() => setScreen("ai")} />
    : <GameSession mode={screen} onExit={() => setScreen("lobby")} />;
}
