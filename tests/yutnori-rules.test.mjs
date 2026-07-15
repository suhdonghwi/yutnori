import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PLAYERS } from "../src/game/config.ts";
import {
  createInitialBoard,
  groupForPiece,
  resolveMove,
} from "../src/game/rules.ts";

test("keeps Tailwind team colors aligned with the game configuration", async () => {
  const globals = await readFile(
    new URL("../src/globals.css", import.meta.url),
    "utf8",
  );
  const themeColor = (name) =>
    globals.match(new RegExp(`--color-team-${name}:\\s*(#[0-9a-f]{6})`))?.[1];

  assert.equal(themeColor("blue"), PLAYERS[0].color);
  assert.equal(themeColor("red"), PLAYERS[1].color);
});

test("keeps arrival order when a lower-numbered piece joins and moves with a stack", () => {
  let board = createInitialBoard();

  board = resolveMove(board, 0, 3, 1).board;
  board = resolveMove(board, 0, 0, 1).board;
  board = resolveMove(board, 0, 1, 1).board;

  assert.deepEqual(groupForPiece(board, 0, 0), [3, 0, 1]);
  assert.deepEqual(
    [board[0][3].stackOrder, board[0][0].stackOrder, board[0][1].stackOrder],
    [0, 1, 2],
  );

  board = resolveMove(board, 0, 3, 2).board;

  assert.deepEqual(groupForPiece(board, 0, 0), [3, 0, 1]);
  assert.deepEqual(
    [board[0][3].stackOrder, board[0][0].stackOrder, board[0][1].stackOrder],
    [0, 1, 2],
  );
});

test("resets captured pieces and their stack order", () => {
  let board = createInitialBoard();

  board = resolveMove(board, 1, 2, 1).board;
  board = resolveMove(board, 1, 0, 1).board;
  const capture = resolveMove(board, 0, 3, 1);

  assert.deepEqual(capture.capturedPieces, [2, 0]);
  assert.equal(capture.board[1][2].status, "home");
  assert.equal(capture.board[1][0].status, "home");
  assert.equal(capture.board[1][2].stackOrder, 0);
  assert.equal(capture.board[1][0].stackOrder, 0);
});
