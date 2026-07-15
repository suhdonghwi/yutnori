import type { ThrowResult } from "./types";

// Source of truth for player colors. globals.css mirrors these values for
// static Tailwind utilities.
export const PLAYERS = [
  { color: "#174c6b", glow: "#8bc0d4" },
  { color: "#a63f31", glow: "#e6a28f" },
] as const;

export const RESULT_BY_FLATS: Record<number, ThrowResult> = {
  0: { id: "mo", steps: 5, flats: 0, extraThrow: true },
  1: { id: "do", steps: 1, flats: 1, extraThrow: false },
  2: { id: "gae", steps: 2, flats: 2, extraThrow: false },
  3: { id: "geol", steps: 3, flats: 3, extraThrow: false },
  4: { id: "yut", steps: 4, flats: 4, extraThrow: true },
};

export const BACKDO_RESULT: ThrowResult = {
  id: "backdo",
  steps: -1,
  flats: 1,
  extraThrow: false,
};
