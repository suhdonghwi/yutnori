import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { build } from "vite";
import {
  canChooseRoute,
  groupLeader,
  isMovable,
  nodeForPiece,
  resolveMove,
} from "../src/game/rules.ts";

const outputDirectory = await mkdtemp(join(tmpdir(), "yutnori-tutorial-test-"));

await build({
  configFile: false,
  logLevel: "silent",
  build: {
    ssr: resolve("src/game/tutorial-script.ts"),
    outDir: outputDirectory,
    emptyOutDir: true,
  },
});

const entry = (await readdir(outputDirectory)).find((file) =>
  file.endsWith(".js"),
);
if (!entry) throw new Error("Tutorial script test bundle was not generated");
const { TUTORIAL_STEPS } = await import(
  pathToFileURL(join(outputDirectory, entry)).href
);

after(() => rm(outputDirectory, { recursive: true, force: true }));

const stepById = Object.fromEntries(
  TUTORIAL_STEPS.map((step) => [step.id, step]),
);

function replay(step) {
  const initialBoard = structuredClone(step.board);
  let board = structuredClone(step.board);
  const resolutions = [];

  step.actions.forEach((action, actionIndex) => {
    if (action.kind !== "move") return;

    const piece = board[action.player][action.piece];
    const context = `${step.id} action ${actionIndex + 1}`;
    assert.equal(
      isMovable(piece, action.steps),
      true,
      `${context} must move a movable piece`,
    );
    assert.equal(
      groupLeader(board, action.player, action.piece),
      action.piece,
      `${context} must address the group leader`,
    );
    if (action.choice !== undefined) {
      assert.equal(
        canChooseRoute(piece, action.steps),
        true,
        `${context} must make its route choice at a branch`,
      );
    }

    const resolution = resolveMove(
      board,
      action.player,
      action.piece,
      action.steps,
      action.choice ?? "outer",
    );
    resolutions.push(resolution);
    board = resolution.board;
  });

  assert.deepEqual(
    step.board,
    initialBoard,
    `${step.id} replay must not mutate its reusable initial board`,
  );
  return { board, resolutions };
}

test("defines the five tutorial steps and confines physics to throwing", () => {
  assert.deepEqual(
    TUTORIAL_STEPS.map((step) => step.id),
    ["goal", "throw", "shortcut", "capture-stack", "win"],
  );
  assert.equal(
    TUTORIAL_STEPS.flatMap((step) => step.actions).filter(
      (action) => action.kind === "move",
    ).length,
    9,
  );

  TUTORIAL_STEPS.forEach((step) => {
    assert.equal(step.board.length, 2);
    assert.deepEqual(
      step.board.map((pieces) => pieces.length),
      [4, 4],
    );
    assert.equal(step.showSticks, step.id === "throw");
    assert.equal(
      step.actions.filter((action) => action.kind === "throw").length,
      step.id === "throw" ? 1 : 0,
    );
  });
});

test("replays every scripted move as a legal group-leader move", () => {
  TUTORIAL_STEPS.forEach((step) => replay(step));
});

test("goal makes one readable outer lap in four moves", () => {
  const { board, resolutions } = replay(stepById.goal);

  assert.deepEqual(
    resolutions.map((resolution) => nodeForPiece(resolution.destination)),
    ["O5", "O10", "O15", null],
  );
  assert.deepEqual(resolutions.at(-1).waypoints, [
    "O16",
    "O17",
    "O18",
    "O19",
    "O0",
  ]);
  assert.equal(board[0][0].status, "finished");
  assert.equal(resolutions.at(-1).won, false);
});

test("shortcut lands on O5 before taking shortcut A through the center", () => {
  const step = stepById.shortcut;
  assert.equal(nodeForPiece(step.board[0][0]), "O2");

  const { resolutions } = replay(step);
  assert.equal(nodeForPiece(resolutions[0].destination), "O5");
  assert.deepEqual(resolutions[0].waypoints, ["O3", "O4", "O5"]);
  assert.deepEqual(resolutions[1].destination, {
    status: "board",
    route: "shortcut-a",
    index: 5,
    stackOrder: 0,
  });
  assert.deepEqual(resolutions[1].waypoints, ["A1", "A2", "C", "A3", "A4"]);
});

test("capture-stack captures red, then stacks two blue pieces at O2", () => {
  const { board, resolutions } = replay(stepById["capture-stack"]);
  const [capture, stack] = resolutions;

  assert.deepEqual(capture.capturedPieces, [0]);
  assert.deepEqual(capture.stackedPieces, []);
  assert.deepEqual(capture.board[1][0], {
    status: "home",
    route: "outer",
    index: -1,
    stackOrder: 0,
  });

  assert.deepEqual(stack.capturedPieces, []);
  assert.deepEqual(stack.stackedPieces, [1]);
  assert.equal(nodeForPiece(board[0][1]), "O2");
  assert.equal(nodeForPiece(board[0][2]), "O2");
  assert.deepEqual([board[0][1].stackOrder, board[0][2].stackOrder], [0, 1]);
});

test("win crosses O0 and finishes the fourth blue piece", () => {
  const step = stepById.win;
  assert.equal(
    step.board[0].filter((piece) => piece.status === "finished").length,
    3,
  );
  assert.equal(nodeForPiece(step.board[0][3]), "B4");

  const { board, resolutions } = replay(step);
  const resolution = resolutions[0];
  assert.deepEqual(resolution.waypoints, ["O0"]);
  assert.equal(resolution.won, true);
  assert.equal(
    board[0].every((piece) => piece.status === "finished"),
    true,
  );
});
