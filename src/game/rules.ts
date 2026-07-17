export type Player = 0 | 1;
export type RouteId = "outer" | "shortcut-a" | "shortcut-b";
export type NodeId = string;
export type RouteChoice = "outer" | "shortcut";

export type PieceState =
  | { status: "home"; route: "outer"; index: -1; stackOrder: 0 }
  | { status: "board"; route: RouteId; index: number; stackOrder: number }
  // 완주한 말의 stackOrder는 완주 순번입니다. 트레이를 바깥부터 채웁니다.
  | { status: "finished"; route: RouteId; index: number; stackOrder: number };

export type BoardState = PieceState[][];

export const HOME_PIECE: PieceState = {
  status: "home",
  route: "outer",
  index: -1,
  stackOrder: 0,
};

export const NODE_POSITIONS: Record<NodeId, [number, number, number]> = {
  O0: [4.6, 0.06, 4.6],
  O1: [4.6, 0.06, 2.76],
  O2: [4.6, 0.06, 0.92],
  O3: [4.6, 0.06, -0.92],
  O4: [4.6, 0.06, -2.76],
  O5: [4.6, 0.06, -4.6],
  O6: [2.76, 0.06, -4.6],
  O7: [0.92, 0.06, -4.6],
  O8: [-0.92, 0.06, -4.6],
  O9: [-2.76, 0.06, -4.6],
  O10: [-4.6, 0.06, -4.6],
  O11: [-4.6, 0.06, -2.76],
  O12: [-4.6, 0.06, -0.92],
  O13: [-4.6, 0.06, 0.92],
  O14: [-4.6, 0.06, 2.76],
  O15: [-4.6, 0.06, 4.6],
  O16: [-2.76, 0.06, 4.6],
  O17: [-0.92, 0.06, 4.6],
  O18: [0.92, 0.06, 4.6],
  O19: [2.76, 0.06, 4.6],
  A1: [3.07, 0.06, -3.07],
  A2: [1.53, 0.06, -1.53],
  A3: [-1.53, 0.06, 1.53],
  A4: [-3.07, 0.06, 3.07],
  B1: [-3.07, 0.06, -3.07],
  B2: [-1.53, 0.06, -1.53],
  B3: [1.53, 0.06, 1.53],
  B4: [3.07, 0.06, 3.07],
  C: [0, 0.06, 0],
};

// 대기 말 8개는 출발점(O0) 반대편인 위 변 바깥 한 줄에, 완주 말 8개는
// 오른쪽 변 바깥의 두 캡슐 트레이에 놓입니다. 두 줄 모두 변의 중앙에
// 정렬합니다: 청·홍 4개씩 미러 대칭이라 가장 바깥 말이 양 꼭지점에서
// 같은 거리에 있습니다. 0번 자리가 각 팀의 바깥쪽 끝입니다.
const SLOT_SPACING = 0.75;
const OUTER_SLOT = 2.92;

export function homeSlotPosition(
  player: Player,
  piece: number,
): [number, number, number] {
  const along = OUTER_SLOT - piece * SLOT_SPACING;
  return [player === 0 ? -along : along, 0.06, -6.15];
}

export function finishSlotPosition(
  player: Player,
  piece: number,
): [number, number, number] {
  const along = OUTER_SLOT - piece * SLOT_SPACING;
  // 보드 밖 바닥은 판 윗면(0.08)보다 낮으므로, 트레이 테두리 선(0.02)에
  // 말이 얹혀 보이도록 y를 낮춥니다.
  return [6.75, 0, player === 0 ? along : -along];
}

export const ROUTES: Record<RouteId, NodeId[]> = {
  // O0 appears at both ends because landing on the finish line and crossing it
  // are distinct states.
  outer: [...Array.from({ length: 20 }, (_, index) => `O${index}`), "O0"],
  "shortcut-a": [
    "O5",
    "A1",
    "A2",
    "C",
    "A3",
    "A4",
    "O15",
    "O16",
    "O17",
    "O18",
    "O19",
    "O0",
  ],
  "shortcut-b": ["O10", "B1", "B2", "C", "B3", "B4", "O0"],
};

export const BOARD_EDGES: [NodeId, NodeId][] = [
  ...Array.from(
    { length: 19 },
    (_, index) => [`O${index}`, `O${index + 1}`] as [NodeId, NodeId],
  ),
  ["O19", "O0"],
  ["O5", "A1"],
  ["A1", "A2"],
  ["A2", "C"],
  ["C", "A3"],
  ["A3", "A4"],
  ["A4", "O15"],
  ["O10", "B1"],
  ["B1", "B2"],
  ["B2", "C"],
  ["C", "B3"],
  ["B3", "B4"],
  ["B4", "O0"],
];

export const BOARD_NODE_IDS = Object.keys(NODE_POSITIONS);
export const MAJOR_NODE_IDS = new Set<NodeId>(["O0", "O5", "O10", "O15", "C"]);

export function createInitialBoard(): BoardState {
  return [
    Array.from({ length: 4 }, () => ({ ...HOME_PIECE })),
    Array.from({ length: 4 }, () => ({ ...HOME_PIECE })),
  ];
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map((side) => side.map((piece) => ({ ...piece })));
}

export function nodeForPiece(piece: PieceState): NodeId | null {
  if (piece.status !== "board") return null;
  return ROUTES[piece.route][piece.index] ?? null;
}

export function sameStack(first: PieceState, second: PieceState): boolean {
  return (
    first.status === "board" &&
    second.status === "board" &&
    first.route === second.route &&
    first.index === second.index
  );
}

export function groupForPiece(
  board: BoardState,
  player: Player,
  pieceIndex: number,
): number[] {
  const piece = board[player][pieceIndex];
  if (piece.status !== "board") return [pieceIndex];
  return board[player]
    .map((candidate, index) => (sameStack(piece, candidate) ? index : -1))
    .filter((index) => index >= 0)
    .sort(
      (first, second) =>
        board[player][first].stackOrder - board[player][second].stackOrder ||
        first - second,
    );
}

export function groupLeader(
  board: BoardState,
  player: Player,
  pieceIndex: number,
): number {
  return groupForPiece(board, player, pieceIndex)[0];
}

export function canChooseRoute(piece: PieceState, steps: number): boolean {
  if (steps <= 0 || piece.status !== "board") return false;
  const node = nodeForPiece(piece);
  return (
    node === "C" ||
    (piece.route === "outer" && (node === "O5" || node === "O10"))
  );
}

export function isMovable(piece: PieceState, steps: number): boolean {
  if (piece.status === "finished") return false;
  if (steps < 0) return piece.status === "board";
  return true;
}

function selectRoute(piece: PieceState, choice: RouteChoice): PieceState {
  if (piece.status !== "board") return { ...piece };
  const node = nodeForPiece(piece);
  if (node === "C") {
    return choice === "shortcut"
      ? {
          status: "board",
          route: "shortcut-b",
          index: 3,
          stackOrder: piece.stackOrder,
        }
      : {
          status: "board",
          route: "shortcut-a",
          index: 3,
          stackOrder: piece.stackOrder,
        };
  }
  if (choice === "outer") return { ...piece };
  if (node === "O5")
    return {
      status: "board",
      route: "shortcut-a",
      index: 0,
      stackOrder: piece.stackOrder,
    };
  if (node === "O10")
    return {
      status: "board",
      route: "shortcut-b",
      index: 0,
      stackOrder: piece.stackOrder,
    };
  return { ...piece };
}

function moveBackward(piece: PieceState): {
  piece: PieceState;
  waypoints: NodeId[];
} {
  if (piece.status !== "board") return { piece: { ...piece }, waypoints: [] };
  if (nodeForPiece(piece) === "O0" && piece.index > 0) {
    return {
      piece: {
        status: "board",
        route: "outer",
        index: 1,
        stackOrder: piece.stackOrder,
      },
      waypoints: ["O1"],
    };
  }
  if (piece.route === "outer" && piece.index === 1) {
    return {
      piece: {
        status: "board",
        route: "outer",
        index: ROUTES.outer.length - 1,
        stackOrder: piece.stackOrder,
      },
      waypoints: ["O0"],
    };
  }
  if (piece.index > 0) {
    const next = {
      status: "board",
      route: piece.route,
      index: piece.index - 1,
      stackOrder: piece.stackOrder,
    } as PieceState;
    return { piece: next, waypoints: [nodeForPiece(next)!] };
  }
  if (piece.route === "shortcut-a") {
    const next = {
      status: "board",
      route: "outer",
      index: 4,
      stackOrder: piece.stackOrder,
    } as PieceState;
    return { piece: next, waypoints: ["O4"] };
  }
  if (piece.route === "shortcut-b") {
    const next = {
      status: "board",
      route: "outer",
      index: 9,
      stackOrder: piece.stackOrder,
    } as PieceState;
    return { piece: next, waypoints: ["O9"] };
  }
  return { piece: { ...HOME_PIECE }, waypoints: [] };
}

function moveForward(
  piece: PieceState,
  steps: number,
  choice: RouteChoice,
): { piece: PieceState; waypoints: NodeId[] } {
  if (piece.status === "finished")
    return { piece: { ...piece }, waypoints: [] };
  if (piece.status === "home") {
    const targetIndex = steps;
    const route = ROUTES.outer;
    const waypoints = route.slice(0, Math.min(targetIndex + 1, route.length));
    if (targetIndex >= route.length) {
      return {
        piece: {
          status: "finished",
          route: "outer",
          index: route.length,
          stackOrder: 0,
        },
        waypoints: [...waypoints, "O0"],
      };
    }
    return {
      piece: {
        status: "board",
        route: "outer",
        index: targetIndex,
        stackOrder: 0,
      },
      waypoints,
    };
  }

  const routedPiece = selectRoute(piece, choice);
  const route = ROUTES[routedPiece.route];
  const targetIndex = routedPiece.index + steps;
  const waypoints = route.slice(
    routedPiece.index + 1,
    Math.min(targetIndex + 1, route.length),
  );
  if (targetIndex >= route.length) {
    return {
      piece: {
        status: "finished",
        route: routedPiece.route,
        index: route.length,
        stackOrder: 0,
      },
      waypoints: [...waypoints, "O0"],
    };
  }
  return {
    piece: {
      status: "board",
      route: routedPiece.route,
      index: targetIndex,
      stackOrder: routedPiece.stackOrder,
    },
    waypoints,
  };
}

export type MoveResolution = {
  board: BoardState;
  movedPieces: number[];
  capturedPieces: number[];
  stackedPieces: number[];
  waypoints: NodeId[];
  destination: PieceState;
  won: boolean;
};

export function resolveMove(
  board: BoardState,
  player: Player,
  pieceIndex: number,
  steps: number,
  choice: RouteChoice = "outer",
): MoveResolution {
  const nextBoard = cloneBoard(board);
  const movedPieces = groupForPiece(board, player, pieceIndex);
  const source = board[player][pieceIndex];
  const movement =
    steps < 0 ? moveBackward(source) : moveForward(source, steps, choice);
  const capturedPieces: number[] = [];
  const stackedPieces: number[] = [];
  const destinationNode = nodeForPiece(movement.piece);

  if (destinationNode && movement.piece.status === "board") {
    const destinationPiece = movement.piece;
    const opponent = (player === 0 ? 1 : 0) as Player;
    const capturedAtDestination = nextBoard[opponent]
      .map((candidate, index) =>
        nodeForPiece(candidate) === destinationNode ? index : -1,
      )
      .filter((index) => index >= 0)
      .sort(
        (first, second) =>
          nextBoard[opponent][first].stackOrder -
            nextBoard[opponent][second].stackOrder || first - second,
      );
    capturedPieces.push(...capturedAtDestination);
    capturedPieces.forEach((index) => {
      nextBoard[opponent][index] = { ...HOME_PIECE };
    });

    const stationaryStack = nextBoard[player]
      .map((candidate, index) =>
        !movedPieces.includes(index) &&
        nodeForPiece(candidate) === destinationNode
          ? index
          : -1,
      )
      .filter((index) => index >= 0)
      .sort(
        (first, second) =>
          nextBoard[player][first].stackOrder -
            nextBoard[player][second].stackOrder || first - second,
      );
    stackedPieces.push(...stationaryStack);

    stationaryStack.forEach((index, order) => {
      nextBoard[player][index] = { ...destinationPiece, stackOrder: order };
    });
    movedPieces.forEach((index, order) => {
      nextBoard[player][index] = {
        ...destinationPiece,
        stackOrder: stationaryStack.length + order,
      };
    });
  } else {
    const finishedBefore = nextBoard[player].filter(
      (candidate, index) =>
        !movedPieces.includes(index) && candidate.status === "finished",
    ).length;
    movedPieces.forEach((index, order) => {
      nextBoard[player][index] =
        movement.piece.status === "finished"
          ? { ...movement.piece, stackOrder: finishedBefore + order }
          : { ...movement.piece, stackOrder: 0 };
    });
  }

  return {
    board: nextBoard,
    movedPieces,
    capturedPieces,
    stackedPieces,
    waypoints: movement.waypoints,
    destination: movement.piece,
    won: nextBoard[player].every((piece) => piece.status === "finished"),
  };
}

export type PieceProgress =
  | { kind: "home" | "finished" | "junction" | "center" | "shortcut" }
  | { kind: "outer"; index: number };

export function pieceProgress(piece: PieceState): PieceProgress {
  if (piece.status === "home") return { kind: "home" };
  if (piece.status === "finished") return { kind: "finished" };
  const node = nodeForPiece(piece);
  if (node === "O5" || node === "O10") return { kind: "junction" };
  if (node === "C") return { kind: "center" };
  if (piece.route === "outer") return { kind: "outer", index: piece.index };
  return { kind: "shortcut" };
}
