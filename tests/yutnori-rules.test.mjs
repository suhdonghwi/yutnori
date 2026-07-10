import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialBoard,
  groupForPiece,
  resolveMove,
} from "../app/yutnori/rules.ts";

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
