import type { ThrowResult } from "./game-types";

export const PLAYERS = [
  { name: "청군", color: "#174c6b", glow: "#8bc0d4" },
  { name: "홍군", color: "#a63f31", glow: "#e6a28f" },
] as const;

export const RESULT_BY_FLATS: Record<number, ThrowResult> = {
  0: { name: "모", steps: 5, flats: 0, extraThrow: true },
  1: { name: "도", steps: 1, flats: 1, extraThrow: false },
  2: { name: "개", steps: 2, flats: 2, extraThrow: false },
  3: { name: "걸", steps: 3, flats: 3, extraThrow: false },
  4: { name: "윷", steps: 4, flats: 4, extraThrow: true },
};

export const BACKDO_RESULT: ThrowResult = {
  name: "빽도",
  steps: -1,
  flats: 1,
  extraThrow: false,
};

export const PHYSICS_THROW_TIMEOUT_MS = 15_000;
