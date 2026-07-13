import type { BoardState, NodeId, Player } from "./rules";
import type { MessageRef } from "../i18n";

export type Phase = "ready" | "rolling" | "move" | "route" | "moving" | "gameover";
export type GameMode = "local" | "ai";

export type YutResultId = "backdo" | "do" | "gae" | "geol" | "yut" | "mo";

export type ThrowResult = {
  id: YutResultId;
  steps: number;
  flats: number;
  extraThrow: boolean;
};

export type ThrowResultEffectState = { id: number; result: ThrowResult } | null;
export type HoveredToken = { player: Player; piece: number } | null;

export type MovePreview = {
  key: string;
  position: [number, number, number];
  label: string;
  action: "capture" | "stack" | null;
  color: string;
  pathNodes: NodeId[];
};

export type ActiveMove = {
  id: number;
  stage: "advance" | "capture-return";
  player: Player;
  pieces: number[];
  leader: number;
  waypoints: NodeId[];
  waypointClearances: number[];
  nextPlayer: Player;
  winner: Player | null;
  notice: MessageRef | null;
  arrivalEffect: "stack" | "capture" | null;
  captureReturn: {
    player: Player;
    pieces: number[];
    board: BoardState;
  } | null;
} | null;

export type PendingRoute = { piece: number } | null;
