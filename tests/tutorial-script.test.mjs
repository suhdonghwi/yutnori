import assert from "node:assert/strict";
import test from "node:test";
import { cloneBoard, resolveMove } from "../src/game/rules.ts";
import { TUTORIAL_STEPS } from "../src/game/tutorial-script.ts";

test("every tutorial move is legal and resolves deterministically", () => {
  for (const step of TUTORIAL_STEPS) {
    let board = cloneBoard(step.board);
    for (const action of step.actions) {
      if (action.kind !== "move") continue;
      const before = board[action.player][action.piece];
      assert.notEqual(
        before.status,
        "finished",
        `${step.id}: moved a finished piece`,
      );
      const result = resolveMove(
        board,
        action.player,
        action.piece,
        action.steps,
        action.choice ?? "outer",
      );
      assert.ok(result.movedPieces.length > 0, `${step.id}: no pieces moved`);
      assert.ok(
        result.waypoints.length > 0,
        `${step.id}: move has no waypoints`,
      );
      board = result.board;
    }
  }
});

test("tutorial demonstrates capture, stacking, shortcut, and victory", () => {
  const seen = new Set();
  for (const step of TUTORIAL_STEPS) {
    let board = cloneBoard(step.board);
    for (const action of step.actions) {
      if (action.kind !== "move") continue;
      const result = resolveMove(
        board,
        action.player,
        action.piece,
        action.steps,
        action.choice ?? "outer",
      );
      if (result.capturedPieces.length) seen.add("capture");
      if (result.stackedPieces.length) seen.add("stack");
      if (result.destination.route.startsWith("shortcut")) seen.add("shortcut");
      if (result.won) seen.add("win");
      board = result.board;
    }
  }
  assert.deepEqual([...seen].sort(), ["capture", "shortcut", "stack", "win"]);
});
