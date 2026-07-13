import {
  createInitialBoard,
  type BoardState,
  type PieceState,
  type Player,
  type RouteChoice,
  type RouteId,
} from "./rules.ts";

export type TutorialStepId =
  "goal" | "throw" | "shortcut" | "capture-stack" | "win";
export type TutorialBadgeKey = "extraThrow" | "finished";
export type TutorialAction =
  | { kind: "pause"; ms: number }
  | {
      kind: "move";
      player: Player;
      piece: number;
      steps: number;
      choice?: RouteChoice;
      previewMs?: number;
    }
  | { kind: "throw" }
  | { kind: "badge"; key: TutorialBadgeKey; ms: number };
export type TutorialStep = {
  id: TutorialStepId;
  board: BoardState;
  showSticks: boolean;
  actions: TutorialAction[];
};

function onBoard(route: RouteId, index: number): PieceState {
  return { status: "board", route, index, stackOrder: 0 };
}

function boardWith(changes: Array<[Player, number, PieceState]>): BoardState {
  const board = createInitialBoard();
  changes.forEach(([player, piece, state]) => {
    board[player][piece] = state;
  });
  return board;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "goal",
    board: createInitialBoard(),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 900 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 350 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 350 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 350 },
    ],
  },
  {
    id: "throw",
    board: createInitialBoard(),
    showSticks: true,
    actions: [{ kind: "throw" }, { kind: "pause", ms: 1800 }],
  },
  {
    id: "shortcut",
    board: boardWith([[0, 0, onBoard("outer", 2)]]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 3, previewMs: 900 },
      { kind: "pause", ms: 650 },
      {
        kind: "move",
        player: 0,
        piece: 0,
        steps: 5,
        choice: "shortcut",
        previewMs: 1400,
      },
    ],
  },
  {
    id: "capture-stack",
    board: boardWith([
      [0, 0, onBoard("outer", 1)],
      [1, 0, onBoard("outer", 4)],
      [0, 1, onBoard("outer", 2)],
    ]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 3, previewMs: 1000 },
      { kind: "badge", key: "extraThrow", ms: 1100 },
      { kind: "move", player: 0, piece: 2, steps: 2, previewMs: 900 },
    ],
  },
  {
    id: "win",
    board: boardWith([
      [0, 0, { status: "finished", route: "outer", index: 20, stackOrder: 0 }],
      [0, 1, { status: "finished", route: "outer", index: 20, stackOrder: 0 }],
      [0, 2, { status: "finished", route: "outer", index: 20, stackOrder: 0 }],
      [0, 3, onBoard("shortcut-b", 5)],
    ]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 3, steps: 1, previewMs: 1100 },
      { kind: "badge", key: "finished", ms: 1800 },
    ],
  },
];
