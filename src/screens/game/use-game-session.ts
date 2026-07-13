import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NODE_POSITIONS,
  canChooseRoute,
  cloneBoard,
  createInitialBoard,
  groupLeader,
  isMovable,
  nodeForPiece,
  resolveMove,
  type BoardState,
  type Player,
  type RouteChoice,
} from "../../game/rules";
import { chooseAiMove, type AiDecision } from "../../game/ai-player";
import { BACKDO_RESULT, PLAYERS, RESULT_BY_FLATS } from "../../game/config";
import type {
  ActiveMove,
  GameMode,
  HoveredToken,
  MovePreview,
  PendingRoute,
  Phase,
  ThrowResult,
  ThrowResultEffectState,
} from "../../game/types";
import { tokenPlacement } from "../../scene/token";
import { gameSfx } from "../../audio/game-sfx";
import { useI18n, type MessageRef, type Messages } from "../../i18n";

export function useGameSession(mode: GameMode) {
  const { t } = useI18n();
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
  const [notice, setNotice] = useState<MessageRef | null>(null);
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
          ? t.preview.finished
          : resolution.destination.status === "home"
            ? t.preview.toHome
            : isBranchPreview
              ? isCenterPreview
                ? choice === "shortcut" ? t.preview.fastShortcutArrival : t.preview.roundaboutArrival
                : choice === "shortcut" ? t.preview.shortcutArrival : t.preview.outerArrival
              : t.preview.arrival(t.yut[result.id]),
        action: resolution.capturedPieces.length > 0
          ? "capture" as const
          : resolution.stackedPieces.length > 0
            ? "stack" as const
            : null,
        color: choice === "shortcut" ? "#f2cb72" : PLAYERS[current].glow,
        pathNodes: sourceNode ? [sourceNode, ...resolution.waypoints] : resolution.waypoints,
      };
    });
  }, [aiDecision, current, hoveredRouteChoice, hoveredToken, pendingRoute, phase, pieces, result, t]);

  const throwYut = useCallback(() => {
    if (phase !== "ready") return;
    setAiDecision(null);
    setResult(null);
    setNotice(null);
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
      setNotice(() => (messages: Messages) => messages.notice.backdoNoMoves);
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
    setNotice(() => move.notice);
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
    const noticeRefs: MessageRef[] = [];
    if (resolution.stackedPieces.length > 0) {
      const stackedCount = resolution.stackedPieces.length + resolution.movedPieces.length;
      noticeRefs.push((messages) => messages.notice.stacked(stackedCount));
    }
    if (resolution.capturedPieces.length > 0) {
      noticeRefs.push((messages) => messages.notice.captured);
    } else if (result.extraThrow) {
      const resultId = result.id;
      noticeRefs.push((messages) => messages.notice.extraThrow(messages.yut[resultId]));
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
      notice: noticeRefs.length > 0
        ? (messages) => noticeRefs.map((ref) => ref(messages)).join(" · ")
        : null,
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
          setNotice(() => (messages: Messages) => messages.notice.aiNoMoves);
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
    setNotice(null);
    activeMoveRef.current = null;
    setActiveMove(null);
  };

  const toggleSfx = () => {
    const next = !sfxEnabled;
    gameSfx.setEnabled(next);
    setSfxEnabled(next);
    if (next) gameSfx.playToggle();
  };

  const noticeText = notice ? notice(t) : "";
  const statusText = phase === "ready"
    ? isAiTurn
      ? noticeText || t.status.aiPreparingThrow(t.team(1))
      : noticeText || t.status.playerTurn(t.team(current))
    : phase === "rolling"
      ? isAiTurn ? t.status.aiJudgingThrow(t.team(1)) : t.status.waitingForSticks(t.team(current))
      : phase === "move"
        ? isAiTurn
          ? aiDecision ? t.status.aiDecision(t.aiReason[aiDecision.reason]) : t.status.aiComputing
          : result === null ? "" : result.steps === -1 ? t.status.backdoMove : t.status.move(t.yut[result.id], result.steps)
        : phase === "route"
          ? routeChoiceFromCenter ? t.status.routeFromCenter : t.status.routeFromBranch
          : phase === "moving"
            ? t.status.playerTurn(t.team(current))
            : t.status.winner(t.team(winner ?? 0));

  return {
    current,
    phase,
    pieces,
    result,
    throwResultEffect,
    nonce,
    visibleWinner,
    hoveredToken,
    setHoveredToken,
    setHoveredRouteChoice,
    activeMove,
    aiDecision,
    isAiTurn,
    routeChoiceFromCenter,
    movePreviews,
    statusText,
    sfxEnabled,
    throwYut,
    settleThrow,
    handleMoveComplete,
    movePiece,
    chooseRoute,
    reset,
    toggleSfx,
  };
}
