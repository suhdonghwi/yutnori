import { useEffect, useRef, useState } from "react";
import { gameSfx } from "../../audio/game-sfx";
import { BACKDO_RESULT, PLAYERS, RESULT_BY_FLATS } from "../../game/config";
import {
  NODE_POSITIONS,
  canChooseRoute,
  cloneBoard,
  nodeForPiece,
  resolveMove,
  waypointClearances,
  type BoardState,
  type RouteChoice,
} from "../../game/rules";
import {
  TUTORIAL_STEPS,
  type TutorialAction,
  type TutorialBadgeKey,
} from "../../game/tutorial-script";
import type { ActiveMove, MovePreview, ThrowResult } from "../../game/types";
import { useI18n } from "../../i18n";
import { tokenPlacement } from "../../scene/token";

const LOOP_HOLD_MS = 1_600;
const LOOP_START_MS = 380;
const THROW_RESULT_HOLD_MS = 2_000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

type PendingContinuation = {
  generation: number;
  nextAction: number;
};

export function useTutorialPlayer(stepIndex: number) {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const step = TUTORIAL_STEPS[stepIndex];
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
  const piecesRef = useRef(pieces);
  const activeMoveRef = useRef<ActiveMove>(null);
  const pendingMoveRef = useRef<PendingContinuation | null>(null);
  const pendingThrowRef = useRef<PendingContinuation | null>(null);
  const timers = useRef(new Set<number>());
  const generation = useRef(0);
  const moveId = useRef(0);

  const updatePieces = (board: BoardState) => {
    piecesRef.current = board;
    setPieces(board);
  };

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  };

  const schedule = (callback: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, ms);
    timers.current.add(timer);
  };

  const previewsForMove = (
    board: BoardState,
    action: Extract<TutorialAction, { kind: "move" }>,
  ): MovePreview[] => {
    const source = board[action.player][action.piece];
    const sourceNode = nodeForPiece(source);
    const hasRouteChoice = canChooseRoute(source, action.steps);
    const choices: RouteChoice[] = hasRouteChoice
      ? ["shortcut", "outer"]
      : [action.choice ?? "outer"];

    return choices.map((choice) => {
      const resolution = resolveMove(
        board,
        action.player,
        action.piece,
        action.steps,
        choice,
      );
      const destinationNode = nodeForPiece(resolution.destination);
      const destinationPosition = destinationNode
        ? NODE_POSITIONS[destinationNode]
        : resolution.destination.status === "finished"
          ? NODE_POSITIONS.O0
          : tokenPlacement(resolution.board, action.player, action.piece)
              .position;

      return {
        key: `tutorial-${action.piece}-${choice}`,
        position: destinationPosition,
        label:
          resolution.destination.status === "finished"
            ? t.preview.finished
            : hasRouteChoice
              ? choice === "shortcut"
                ? t.preview.shortcutArrival
                : t.preview.outerArrival
              : t.tutorial.movePreview(action.steps),
        action:
          resolution.capturedPieces.length > 0
            ? "capture"
            : resolution.stackedPieces.length > 0
              ? "stack"
              : null,
        color: choice === "shortcut" ? "#f2cb72" : PLAYERS[action.player].glow,
        pathNodes: sourceNode
          ? [sourceNode, ...resolution.waypoints]
          : resolution.waypoints,
      };
    });
  };

  const runAction = (actionIndex: number, runGeneration: number) => {
    if (generation.current !== runGeneration) return;
    const action = step.actions[actionIndex];

    if (!action) {
      if (reducedMotion) return;
      schedule(() => {
        if (generation.current !== runGeneration) return;
        const nextGeneration = runGeneration + 1;
        generation.current = nextGeneration;
        const nextBoard = cloneBoard(step.board);
        activeMoveRef.current = null;
        pendingMoveRef.current = null;
        pendingThrowRef.current = null;
        updatePieces(nextBoard);
        setActiveMove(null);
        setMovePreviews([]);
        setRolling(false);
        setSettledResult(null);
        setBadge(null);
        setRunId((value) => value + 1);
        schedule(
          () => runAction(0, nextGeneration),
          step.showSticks ? 220 : LOOP_START_MS,
        );
      }, LOOP_HOLD_MS);
      return;
    }

    if (action.kind === "pause") {
      schedule(() => runAction(actionIndex + 1, runGeneration), action.ms);
      return;
    }

    if (action.kind === "badge") {
      setBadge(action.key);
      schedule(() => {
        if (generation.current !== runGeneration) return;
        setBadge(null);
        runAction(actionIndex + 1, runGeneration);
      }, action.ms);
      return;
    }

    if (action.kind === "throw") {
      setSettledResult(null);
      pendingThrowRef.current = {
        generation: runGeneration,
        nextAction: actionIndex + 1,
      };
      setNonce((value) => value + 1);
      setRolling(true);
      return;
    }

    const performMove = () => {
      if (generation.current !== runGeneration) return;
      const board = piecesRef.current;
      const resolution = resolveMove(
        board,
        action.player,
        action.piece,
        action.steps,
        action.choice ?? "outer",
      );
      const otherPlayer = (action.player === 0 ? 1 : 0) as 0 | 1;
      let visibleBoard = resolution.board;
      let captureReturn: NonNullable<ActiveMove>["captureReturn"] = null;

      if (resolution.capturedPieces.length > 0) {
        visibleBoard = cloneBoard(resolution.board);
        resolution.capturedPieces.forEach((capturedPiece) => {
          visibleBoard[otherPlayer][capturedPiece] = {
            ...board[otherPlayer][capturedPiece],
          };
        });
        captureReturn = {
          player: otherPlayer,
          pieces: resolution.capturedPieces,
          board: resolution.board,
        };
      }

      moveId.current += 1;
      const move: NonNullable<ActiveMove> = {
        id: moveId.current,
        stage: "advance",
        player: action.player,
        pieces: resolution.movedPieces,
        leader: resolution.movedPieces[resolution.movedPieces.length - 1],
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
        arrivalEffect:
          resolution.capturedPieces.length > 0
            ? "capture"
            : resolution.stackedPieces.length > 0
              ? "stack"
              : null,
        captureReturn,
      };

      setMovePreviews([]);
      updatePieces(visibleBoard);
      activeMoveRef.current = move;
      pendingMoveRef.current = {
        generation: runGeneration,
        nextAction: actionIndex + 1,
      };
      setActiveMove(move);
    };

    const previewMs = action.previewMs ?? 0;
    if (previewMs > 0) {
      setMovePreviews(previewsForMove(piecesRef.current, action));
      schedule(performMove, previewMs);
    } else {
      performMove();
    }
  };

  useEffect(() => {
    clearTimers();
    const runGeneration = generation.current + 1;
    generation.current = runGeneration;
    const initialBoard = cloneBoard(step.board);
    activeMoveRef.current = null;
    pendingMoveRef.current = null;
    pendingThrowRef.current = null;
    updatePieces(initialBoard);
    setActiveMove(null);
    setMovePreviews([]);
    setRolling(false);
    setSettledResult(null);
    setBadge(null);
    setRunId((value) => value + 1);
    schedule(
      () => runAction(0, runGeneration),
      step.showSticks ? 220 : LOOP_START_MS,
    );

    return () => {
      generation.current += 1;
      clearTimers();
      activeMoveRef.current = null;
      pendingMoveRef.current = null;
      pendingThrowRef.current = null;
    };
  }, [reducedMotion, step, t]);

  const handleMoveComplete = () => {
    const move = activeMoveRef.current;
    const pending = pendingMoveRef.current;
    if (!move || !pending || pending.generation !== generation.current) return;

    if (move.captureReturn) {
      gameSfx.playCapture();
      const capture = move.captureReturn;
      updatePieces(capture.board);
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
    pendingMoveRef.current = null;
    setActiveMove(null);
    if (move.arrivalEffect === "stack") gameSfx.playStack();
    schedule(() => runAction(pending.nextAction, pending.generation), 320);
  };

  const handleSettled = (flats: number, backdo: boolean) => {
    const pending = pendingThrowRef.current;
    if (!pending || pending.generation !== generation.current) return;
    const result = backdo ? BACKDO_RESULT : RESULT_BY_FLATS[flats];
    pendingThrowRef.current = null;
    setRolling(false);
    setSettledResult(result);
    gameSfx.playResult(result.steps);
    schedule(
      () => runAction(pending.nextAction, pending.generation),
      THROW_RESULT_HOLD_MS,
    );
  };

  return {
    step,
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
