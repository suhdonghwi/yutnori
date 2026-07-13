import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { build } from "vite";

const outputDirectory = await mkdtemp(join(tmpdir(), "yutnori-ai-test-"));

await build({
  configFile: false,
  logLevel: "silent",
  build: {
    ssr: resolve("src/game/ai-player.ts"),
    outDir: outputDirectory,
    emptyOutDir: true,
  },
});

const entry = (await readdir(outputDirectory)).find((file) => file.endsWith(".js"));
if (!entry) throw new Error("AI test bundle was not generated");
const { chooseAiMove } = await import(pathToFileURL(join(outputDirectory, entry)).href);

after(() => rm(outputDirectory, { recursive: true, force: true }));

const home = () => ({ status: "home", route: "outer", index: -1, stackOrder: 0 });

test("chooses a capture when the current throw can catch an opponent", () => {
  const board = [
    [{ status: "board", route: "outer", index: 3, stackOrder: 0 }, home(), home(), home()],
    [{ status: "board", route: "outer", index: 1, stackOrder: 0 }, home(), home(), home()],
  ];

  const decision = chooseAiMove(board, { id: "gae", steps: 2, flats: 2, extraThrow: false });

  assert.equal(decision?.pieceIndex, 0);
  assert.equal(decision?.reason, "capture");
});

test("chooses a move that immediately finishes a piece", () => {
  const board = [
    [home(), home(), home(), home()],
    [{ status: "board", route: "outer", index: 19, stackOrder: 0 }, home(), home(), home()],
  ];

  const decision = chooseAiMove(board, { id: "do", steps: 1, flats: 1, extraThrow: false });

  assert.equal(decision?.pieceIndex, 0);
  assert.match(decision?.reason ?? "", /finish/i);
});
