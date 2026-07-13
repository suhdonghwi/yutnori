import {
  createInitialBoard,
  type BoardState,
  type Player,
  type RouteChoice,
} from "./rules";

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

function boardWith(
  placements: Array<{
    player: Player;
    piece: number;
    state: BoardState[number][number];
  }>,
): BoardState {
  const board = createInitialBoard();
  placements.forEach(({ player, piece, state }) => {
    board[player][piece] = { ...state };
  });
  return board;
}

function onBoard(
  route: "outer" | "shortcut-a" | "shortcut-b",
  index: number,
  stackOrder = 0,
): BoardState[number][number] {
  return { status: "board", route, index, stackOrder };
}

function finished(
  route: "outer" | "shortcut-a" | "shortcut-b" = "outer",
): BoardState[number][number] {
  const routeLength = route === "outer" ? 20 : route === "shortcut-a" ? 11 : 6;
  return { status: "finished", route, index: routeLength, stackOrder: 0 };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "goal",
    board: createInitialBoard(),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 900 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 700 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 700 },
      { kind: "move", player: 0, piece: 0, steps: 5, previewMs: 700 },
    ],
  },
  {
    id: "throw",
    board: createInitialBoard(),
    showSticks: true,
    actions: [{ kind: "throw" }],
  },
  {
    id: "shortcut",
    board: boardWith([{ player: 0, piece: 0, state: onBoard("outer", 2) }]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 3, previewMs: 1_000 },
      { kind: "pause", ms: 900 },
      {
        kind: "move",
        player: 0,
        piece: 0,
        steps: 5,
        choice: "shortcut",
        previewMs: 1_400,
      },
    ],
  },
  {
    id: "capture-stack",
    board: boardWith([
      { player: 0, piece: 0, state: onBoard("outer", 1) },
      { player: 1, piece: 0, state: onBoard("outer", 4) },
      { player: 0, piece: 1, state: onBoard("outer", 2) },
    ]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 0, steps: 3, previewMs: 1_000 },
      { kind: "badge", key: "extraThrow", ms: 900 },
      { kind: "move", player: 0, piece: 2, steps: 2, previewMs: 1_000 },
    ],
  },
  {
    id: "win",
    board: boardWith([
      { player: 0, piece: 0, state: finished() },
      { player: 0, piece: 1, state: finished() },
      { player: 0, piece: 2, state: finished() },
      { player: 0, piece: 3, state: onBoard("shortcut-b", 5) },
    ]),
    showSticks: false,
    actions: [
      { kind: "move", player: 0, piece: 3, steps: 1, previewMs: 1_000 },
      { kind: "badge", key: "finished", ms: 1_600 },
    ],
  },
];
