import { useCallback, useEffect, useRef, useState } from "react";
import { gameSfx } from "../../audio/game-sfx";
import { BACKDO_RESULT, PLAYERS, RESULT_BY_FLATS } from "../../game/config";
import {
  cloneBoard,
  NODE_POSITIONS,
  nodeForPiece,
  resolveMove,
  waypointClearances,
  type BoardState,
} from "../../game/rules";
import type {
  TutorialBadgeKey,
  TutorialStep,
} from "../../game/tutorial-script";
import type { ActiveMove, MovePreview, ThrowResult } from "../../game/types";
import { tokenPlacement } from "../../scene/token";
import { useI18n } from "../../i18n";

export function useTutorialPlayer(step: TutorialStep) {
  const { t } = useI18n();
  const [pieces, setPieces] = useState<BoardState>(() =>
    cloneBoard(step.board),
  );
  const [activeMove, setActiveMove] = useState<ActiveMove>(null);
  const [movePreviews, setMovePreviews] = useState<MovePreview[]>([]);
  const [rolling, setRolling] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [settledResult, setSettledResult] = useState<ThrowResult | null>(null);
  const [badge, setBadge] = useState<TutorialBadgeKey | null>(null);
  const [runId, setRunId] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const piecesRef = useRef(pieces);
  const activeMoveRef = useRef<ActiveMove>(null);
  const moveId = useRef(0);
  const timer = useRef<number | null>(null);
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const scheduleNext = useCallback((ms: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setActionIndex((value) => value + 1);
    }, ms);
  }, []);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    const board = cloneBoard(step.board);
    piecesRef.current = board;
    activeMoveRef.current = null;
    setPieces(board);
    setActiveMove(null);
    setMovePreviews([]);
    setRolling(false);
    setSettledResult(null);
    setBadge(null);
    setActionIndex(0);
    setRunId((value) => value + 1);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [step]);

  useEffect(() => {
    const action = step.actions[actionIndex];
    if (!action) {
      if (reducedMotion.current) return;
      timer.current = window.setTimeout(() => {
        const board = cloneBoard(step.board);
        piecesRef.current = board;
        setPieces(board);
        setActiveMove(null);
        activeMoveRef.current = null;
        setMovePreviews([]);
        setSettledResult(null);
        setBadge(null);
        setRunId((value) => value + 1);
        setActionIndex(0);
      }, 1600);
      return () => {
        if (timer.current !== null) window.clearTimeout(timer.current);
      };
    }
    if (action.kind === "pause") {
      scheduleNext(action.ms);
      return;
    }
    if (action.kind === "badge") {
      setBadge(action.key);
      scheduleNext(action.ms);
      return;
    }
    if (action.kind === "throw") {
      setSettledResult(null);
      setNonce((value) => value + 1);
      setRolling(true);
      return;
    }

    const board = piecesRef.current;
    const resolution = resolveMove(
      board,
      action.player,
      action.piece,
      action.steps,
      action.choice ?? "outer",
    );
    const sourceNode = nodeForPiece(board[action.player][action.piece]);
    const destinationNode = nodeForPiece(resolution.destination);
    const preview: MovePreview = {
      key: `tutorial-${runId}-${actionIndex}`,
      position: destinationNode
        ? NODE_POSITIONS[destinationNode]
        : resolution.destination.status === "finished"
          ? NODE_POSITIONS.O0
          : tokenPlacement(resolution.board, action.player, action.piece)
              .position,
      label:
        resolution.destination.status === "finished"
          ? t.preview.finished
          : t.preview.arrival(String(Math.abs(action.steps))),
      action:
        resolution.capturedPieces.length > 0
          ? "capture"
          : resolution.stackedPieces.length > 0
            ? "stack"
            : null,
      color:
        action.choice === "shortcut" ? "#f2cb72" : PLAYERS[action.player].glow,
      pathNodes: sourceNode
        ? [sourceNode, ...resolution.waypoints]
        : resolution.waypoints,
    };
    setMovePreviews([preview]);
    timer.current = window.setTimeout(() => {
      setMovePreviews([]);
      const opponent = (action.player === 0 ? 1 : 0) as 0 | 1;
      let visibleBoard = resolution.board;
      let captureReturn: NonNullable<ActiveMove>["captureReturn"] = null;
      if (resolution.capturedPieces.length > 0) {
        visibleBoard = cloneBoard(resolution.board);
        resolution.capturedPieces.forEach((piece) => {
          visibleBoard[opponent][piece] = { ...board[opponent][piece] };
        });
        captureReturn = {
          player: opponent,
          pieces: resolution.capturedPieces,
          board: resolution.board,
        };
      }
      piecesRef.current = visibleBoard;
      setPieces(visibleBoard);
      moveId.current += 1;
      const move: NonNullable<ActiveMove> = {
        id: moveId.current,
        stage: "advance",
        player: action.player,
        pieces: resolution.movedPieces,
        leader: resolution.movedPieces.at(-1)!,
        waypoints: resolution.waypoints,
        waypointClearances: waypointClearances(
          board,
          action.player,
          resolution.movedPieces,
          resolution.waypoints,
        ),
        nextPlayer: action.player,
        winner: resolution.won ? action.player : null,
        notice: null,
        arrivalEffect: resolution.capturedPieces.length
          ? "capture"
          : resolution.stackedPieces.length
            ? "stack"
            : null,
        captureReturn,
      };
      activeMoveRef.current = move;
      setActiveMove(move);
    }, action.previewMs ?? 0);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [actionIndex, runId, scheduleNext, step, t]);

  const handleMoveComplete = useCallback(() => {
    const move = activeMoveRef.current;
    if (!move) return;
    if (move.captureReturn) {
      gameSfx.playCapture();
      const capture = move.captureReturn;
      piecesRef.current = capture.board;
      setPieces(capture.board);
      moveId.current += 1;
      const returnMove: NonNullable<ActiveMove> = {
        ...move,
        id: moveId.current,
        stage: "capture-return",
        player: capture.player,
        pieces: capture.pieces,
        leader: capture.pieces.at(-1)!,
        waypoints: [],
        waypointClearances: [],
        arrivalEffect: null,
        captureReturn: null,
      };
      activeMoveRef.current = returnMove;
      setActiveMove(returnMove);
      return;
    }
    if (move.arrivalEffect === "stack") gameSfx.playStack();
    activeMoveRef.current = null;
    setActiveMove(null);
    setActionIndex((value) => value + 1);
  }, []);

  const handleSettled = useCallback((flats: number, backdo: boolean) => {
    const result = backdo ? BACKDO_RESULT : RESULT_BY_FLATS[flats];
    setRolling(false);
    setSettledResult(result);
    gameSfx.playResult(result.steps);
    setActionIndex((value) => value + 1);
  }, []);

  return {
    pieces,
    activeMove,
    movePreviews,
    rolling,
    nonce,
    settledResult,
    badge,
    runId,
    handleMoveComplete,
    handleSettled,
  };
}
