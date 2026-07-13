import {
  ROUTES,
  canChooseRoute,
  groupLeader,
  isMovable,
  resolveMove,
  type BoardState,
  type MoveResolution,
  type PieceState,
  type Player,
  type RouteChoice,
} from "./rules";
import type { ThrowResult } from "./types";

export type AiReason =
  | "win"
  | "finish"
  | "capture"
  | "stack"
  | "shortcut"
  | "prepareShortcut"
  | "backdoRetreat"
  | "expectedFinish";

export type AiDecision = {
  pieceIndex: number;
  routeChoice: RouteChoice;
  reason: AiReason;
  score: number;
};

type Candidate = {
  pieceIndex: number;
  routeChoice: RouteChoice;
  resolution: MoveResolution;
};

type WeightedThrow = {
  probability: number;
  result: ThrowResult;
};

const AI_PLAYER: Player = 1;
const FUTURE_THROW_DEPTH = 2;
const WIN_SCORE = 100_000;

const THROW_DISTRIBUTION: WeightedThrow[] = [
  { probability: 1 / 16, result: { id: "mo", steps: 5, flats: 0, extraThrow: true } },
  { probability: 3 / 16, result: { id: "do", steps: 1, flats: 1, extraThrow: false } },
  { probability: 1 / 16, result: { id: "backdo", steps: -1, flats: 1, extraThrow: false } },
  { probability: 6 / 16, result: { id: "gae", steps: 2, flats: 2, extraThrow: false } },
  { probability: 4 / 16, result: { id: "geol", steps: 3, flats: 3, extraThrow: false } },
  { probability: 1 / 16, result: { id: "yut", steps: 4, flats: 4, extraThrow: true } },
];

function otherPlayer(player: Player): Player {
  return player === 0 ? 1 : 0;
}

function legalCandidates(board: BoardState, player: Player, result: ThrowResult): Candidate[] {
  const candidates: Candidate[] = [];

  board[player].forEach((piece, pieceIndex) => {
    if (!isMovable(piece, result.steps)) return;
    if (groupLeader(board, player, pieceIndex) !== pieceIndex) return;

    const choices: RouteChoice[] = canChooseRoute(piece, result.steps)
      ? ["shortcut", "outer"]
      : ["outer"];
    choices.forEach((routeChoice) => {
      candidates.push({
        pieceIndex,
        routeChoice,
        resolution: resolveMove(board, player, pieceIndex, result.steps, routeChoice),
      });
    });
  });

  return candidates;
}

function pieceValue(piece: PieceState): number {
  if (piece.status === "home") return 0;
  if (piece.status === "finished") return 220;
  const remainingSteps = ROUTES[piece.route].length - piece.index;
  return 200 - remainingSteps * 8;
}

function stackBonus(board: BoardState, player: Player): number {
  const stacks = new Map<string, number>();
  board[player].forEach((piece) => {
    if (piece.status !== "board") return;
    const key = `${piece.route}:${piece.index}`;
    stacks.set(key, (stacks.get(key) ?? 0) + 1);
  });
  return [...stacks.values()].reduce((score, count) => score + Math.max(0, count - 1) * 14, 0);
}

function evaluateBoard(board: BoardState): number {
  const teamScore = (player: Player) => (
    board[player].reduce((score, piece) => score + pieceValue(piece), 0)
    + stackBonus(board, player)
  );
  return teamScore(AI_PLAYER) - teamScore(0);
}

function boardKey(board: BoardState): string {
  return board
    .flatMap((pieces) => pieces.map((piece) => `${piece.status[0]}:${piece.route}:${piece.index}:${piece.stackOrder}`))
    .join("|");
}

function expectedThrowValue(
  board: BoardState,
  player: Player,
  remainingThrows: number,
  memo: Map<string, number>,
): number {
  if (remainingThrows <= 0) return evaluateBoard(board);
  const key = `${player}:${remainingThrows}:${boardKey(board)}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const value = THROW_DISTRIBUTION.reduce((sum, outcome) => (
    sum + outcome.probability * bestKnownThrowValue(board, player, outcome.result, remainingThrows, memo)
  ), 0);
  memo.set(key, value);
  return value;
}

function candidateValue(
  candidate: Candidate,
  player: Player,
  result: ThrowResult,
  remainingThrows: number,
  memo: Map<string, number>,
): number {
  if (candidate.resolution.won) return player === AI_PLAYER ? WIN_SCORE : -WIN_SCORE;
  const keepsTurn = result.extraThrow || candidate.resolution.capturedPieces.length > 0;
  const nextPlayer = keepsTurn ? player : otherPlayer(player);
  return expectedThrowValue(candidate.resolution.board, nextPlayer, remainingThrows - 1, memo);
}

function bestKnownThrowValue(
  board: BoardState,
  player: Player,
  result: ThrowResult,
  remainingThrows: number,
  memo: Map<string, number>,
): number {
  const candidates = legalCandidates(board, player, result);
  if (candidates.length === 0) {
    return expectedThrowValue(board, otherPlayer(player), remainingThrows - 1, memo);
  }

  const values = candidates.map((candidate) => candidateValue(candidate, player, result, remainingThrows, memo));
  return player === AI_PLAYER ? Math.max(...values) : Math.min(...values);
}

function decisionReason(candidate: Candidate, result: ThrowResult): AiReason {
  if (candidate.resolution.won) return "win";
  if (candidate.resolution.destination.status === "finished") return "finish";
  if (candidate.resolution.capturedPieces.length > 0) return "capture";
  if (candidate.resolution.stackedPieces.length > 0) return "stack";
  if (candidate.routeChoice === "shortcut") return "shortcut";
  if (canChooseRoute(candidate.resolution.destination, result.steps)) return "prepareShortcut";
  if (result.steps < 0) return "backdoRetreat";
  return "expectedFinish";
}

export function chooseAiMove(board: BoardState, result: ThrowResult): AiDecision | null {
  const candidates = legalCandidates(board, AI_PLAYER, result);
  if (candidates.length === 0) return null;

  const memo = new Map<string, number>();
  let bestCandidate = candidates[0];
  let bestScore = -Infinity;

  candidates.forEach((candidate) => {
    const score = candidateValue(candidate, AI_PLAYER, result, FUTURE_THROW_DEPTH + 1, memo);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  });

  return {
    pieceIndex: bestCandidate.pieceIndex,
    routeChoice: bestCandidate.routeChoice,
    reason: decisionReason(bestCandidate, result),
    score: bestScore,
  };
}
