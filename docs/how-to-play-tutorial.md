# Interactive "How to Play" Tutorial — Implementation Plan

## Summary

Replace the static rules dialog as the primary onboarding path with a **guided demo**: a
full-screen tutorial that plays short, looping, scripted animations on the _real_ 3D board —
same `BoardSurface`, same lacquered `Token` meshes, same Rapier yut-stick physics — with a
caption card and step navigation below. The user watches and taps Next; no interaction inside
the scene. The existing text rules stay available as a secondary "detailed rules" reference.

Everything renders through components that already exist and are driven purely by props/state
(`src/scene/*`), and all move outcomes come from the pure `resolveMove()` in
`src/game/rules.ts` — so the tutorial is essentially **a small deterministic script player
substituted for `useGameSession`**, plus data.

## Goals

- Teach the five core concepts visually, without reading: goal/route, throwing & reading
  sticks, shortcuts, capture & stacking, winning.
- Zero new art. Reuse board, tokens, sticks, path-glow, and effect visuals.
- Fully localized through the existing i18n system (`ko` catalog is the source of truth).
- Works on mobile (portrait) — the game already runs there.

## Non-goals (v1)

- No interactive "try it yourself" steps (the script player is designed so this can be added
  later, e.g. letting the user press the throw button in step 2).
- No coach-marks overlay on a real game.
- No changes to game logic; `rules.ts` gains at most one extracted pure helper.

---

## 1. UX specification

### Entry & navigation

- The lobby's **"How to Play"** button (`src/screens/lobby.tsx`) opens the tutorial instead of
  `RulesDialog`.
- The tutorial is a **screen, not a dialog**: `YutnoriGame` (`src/screens/game/index.tsx`)
  extends its union to `"lobby" | "tutorial" | GameMode`. A full-screen route avoids nesting a
  `<Canvas>` inside a scrolling dialog and reuses the existing screen-switching pattern.
- Controls: step dots + **Back / Next** buttons, **Skip/Close** (top-right, plus `Escape`),
  `←`/`→` keyboard navigation. Last step's primary button is "Got it → back to lobby".
- A small **"Detailed rules"** text link (footer or last step) opens the existing
  `RulesDialog` on top of the tutorial, for people who want the reference text.

### Layout

```
┌────────────────────────────────────────┐
│                              [✕ Skip]  │
│                                        │
│            <Canvas>                    │  ← fixed camera, pointer-events: none
│         (board + animation)            │
│                                        │
├────────────────────────────────────────┤
│  Step title                            │
│  One or two sentences of caption.      │  ← DOM caption card (Tailwind, same
│                                        │    palette as RulesDialog)
│  ● ● ○ ○ ○         [Back]  [Next →]    │
└────────────────────────────────────────┘
```

- Camera: fixed, slightly more top-down and closer than the game camera so the route reads
  clearly (start near `position: [0, 12.5, 8.5]`, `fov: 42`, no `OrbitControls`). Route
  comprehension is the #1 confusion point for non-Korean players; the flat game angle hides it.
- Each step's animation **loops**: play the scripted actions, hold ~1.5 s, reset, replay.
- On mobile the caption card docks to the bottom with safe-area padding; canvas fills the rest.

### Step storyboard

Node/route vocabulary below refers to `ROUTES` / `NODE_POSITIONS` in `src/game/rules.ts`
(outer ring `O0..O19`, shortcut A through corners `O5→A1→A2→C→A3→A4→O15…`, shortcut B
`O10→B1→B2→C→B3→B4→finish`).

| #   | id              | Concept                                            | Initial board                                                                     | Scripted actions (loop)                                                                                                                                                                                                                                                                                                                                 |
| --- | --------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `goal`          | Race around the board and home                     | All pieces home                                                                   | Blue piece 0 enters at `O0` and travels the full outer ring to finish, as 4 chained moves of 5 steps each (`steps: 5` × 4) so the arc-hop animation stays readable but the lap is quick. Path edges glow ahead of it via the existing preview mechanism.                                                                                                |
| 2   | `throw`         | Throw sticks, count flat sides                     | All pieces home; sticks visible                                                   | Real physics throw (`YutPhysics`). On `onSettled(flats, backdo)` the caption card counts up flat sides and stamps the result name: "3 flat = Geol = move 3" (reusing `RESULT_BY_FLATS`). Replay gives a _different_ result each loop — that is a feature: it teaches reading throws. Footnote line covers Yut/Mo → throw again, Backdo → one step back. |
| 3   | `shortcut`      | Corners unlock diagonals                           | Blue piece 0 at `outer` index 2 (`O2`)                                            | Move 3 steps → lands exactly on corner `O5`. Pause: both route previews glow (destination rings + path glow, shortcut colored `#f2cb72` as in the game). Then move 5 with `choice: "shortcut"` → piece cuts through `A1 A2 C A3 A4`.                                                                                                                    |
| 4   | `capture-stack` | Capture sends home + extra throw; own pieces stack | Blue piece 0 at `O1`; red piece 0 at `O4`; blue piece 1 at `O2` is used in beat 2 | Beat 1: blue piece 0 moves 3 → lands `O4`, red piece pops back home (the existing `captureReturn` two-stage move animates this), "Throw again!" badge. Beat 2: blue piece 2 enters from home with 2 steps → lands `O2` where blue piece 1 sits → stack forms, stack label ("B2 + B3") appears automatically via `tokenPlacement`.                       |
| 5   | `win`           | First to finish all 4 wins                         | Blue: 3 finished, piece 3 at `shortcut-b` index 5 (`B4`)                          | Move 1 → piece crosses `O0` and finishes (`resolveMove` returns `won: true`). Small celebratory stamp (reuse the `result-stamp`/confetti CSS from `src/styles/effects.css` — _not_ the full `VictoryEffect`, which is a takeover).                                                                                                                      |

Step 4 beat 2 exact layout (verified against `resolveMove` semantics): blue piece 1 sits at
`outer` index 2 the whole step; after beat 1, blue piece 2 enters from home with `steps: 2` →
destination `O2` is occupied by a stationary own piece → `stackedPieces` is non-empty, both
get stacked `stackOrder`s, and the stack label renders with no extra work. The two beats fold
over one board state, so the script needs no mid-step reset.

All of these are plain `resolveMove()` calls — captures, stacking, route choice, finishing and
`won` all come back in the `MoveResolution`, and the waypoints feed the existing `Token`
animation.

---

## 2. Architecture

### Reuse map

| Existing code                                                                         | Used for                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `resolveMove`, `createInitialBoard`, `NODE_POSITIONS`, `ROUTES` (`src/game/rules.ts`) | All scripted move outcomes and waypoints                                                                                  |
| `BoardSurface`, `boardEdgeKey` (`src/scene/board.tsx`)                                | Board + path-glow (`previewEdgeColors`)                                                                                   |
| `Token`, `tokenPlacement` (`src/scene/token.tsx`)                                     | Piece rendering, waypoint hop animation, stacking, stack labels — driven by the same `activeMoveId`/`moveWaypoints` props |
| `YutPhysics` (`src/scene/yut-physics.tsx`)                                            | Step 2 physics throw, unchanged API (`rolling`, `nonce`, `onSettled`)                                                     |
| `PreviewPathNode`, `MoveDestinationPreview` (`src/scene/game-scene.tsx`)              | Route-preview glow in steps 1 and 3 — **needs to be exported** (currently module-private)                                 |
| `RESULT_BY_FLATS`, `BACKDO_RESULT`, `PLAYERS` (`src/game/config.ts`)                  | Step 2 result naming, token colors                                                                                        |
| `ThrowResultEffect` (`src/screens/result-effects.tsx`)                                | Step 2 result stamp (optional; the caption counter may be enough)                                                         |
| Lighting/`ContactShadows` block from `Scene`                                          | Copied (~20 lines) into `TutorialScene`; not worth extracting                                                             |
| `RulesDialog` (`src/screens/lobby.tsx`)                                               | "Detailed rules" fallback — **extract to `src/screens/rules-dialog.tsx`** so both lobby and tutorial can render it        |

### New files

```
src/game/tutorial-script.ts        # pure data + types: steps, boards, actions (no React)
src/screens/tutorial/index.tsx     # screen shell: canvas, caption card, dots, nav, a11y
src/screens/tutorial/use-tutorial-player.ts   # the script player hook
src/scene/tutorial-scene.tsx       # slim Scene variant (fixed camera, no controls/hover)
tests/tutorial-script.test.mjs     # replays every scripted move through resolveMove
```

### Modified files

```
src/screens/game/index.tsx         # screen union + tutorial route
src/screens/lobby.tsx              # How to Play button → onOpenTutorial; RulesDialog moves out
src/screens/rules-dialog.tsx       # (new home for the extracted RulesDialog)
src/scene/game-scene.tsx           # export PreviewPathNode / MoveDestinationPreview
src/game/rules.ts (or new util)    # extracted waypointClearances() helper (see 3.2)
src/i18n/locales/{ko,en,bn}.ts     # t.tutorial.* namespace (ko first — source of truth)
```

---

## 3. Detailed design

### 3.1 Script data model (`src/game/tutorial-script.ts`)

Pure TypeScript, no React imports — this keeps it testable under
`node --experimental-strip-types --test` exactly like `tests/yutnori-rules.test.mjs`.

```ts
import type { BoardState, Player, RouteChoice } from "./rules";

export type TutorialStepId =
  "goal" | "throw" | "shortcut" | "capture-stack" | "win";

export type TutorialAction =
  | { kind: "pause"; ms: number }
  | {
      kind: "move";
      player: Player;
      piece: number;
      steps: number; // -1 allowed if we ever demo backdo
      choice?: RouteChoice; // default "outer"
      previewMs?: number; // show path/destination glow this long before moving
    }
  | { kind: "throw" } // step 2 only: trigger YutPhysics
  | { kind: "badge"; key: TutorialBadgeKey; ms: number }; // e.g. "extraThrow", "finished"

export type TutorialStep = {
  id: TutorialStepId;
  board: BoardState; // initial layout for this step
  showSticks: boolean; // mount YutPhysics only when true (step 2)
  actions: TutorialAction[];
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  /* the 5 steps from the storyboard */
];
```

Board literals are built with a tiny local helper
(`onBoard(route, index): PieceState`) plus spread over `createInitialBoard()` — no new rules
API needed.

Captions/titles are **not** in this file; the screen looks them up as
`t.tutorial.steps[step.id]`, keeping game data string-free per the i18n architecture.

### 3.2 Script player (`use-tutorial-player.ts`)

A cut-down sibling of `useGameSession` (`src/screens/game/use-game-session.ts`). It owns:

```ts
{
  pieces: BoardState;             // current board
  activeMove: ActiveMove;         // same type from game/types.ts → feeds Token props
  movePreviews: MovePreview[];    // only during a move action's previewMs window
  rolling: boolean; nonce: number;      // for YutPhysics in step 2
  settledResult: ThrowResult | null;    // step 2 caption counter
  badge: TutorialBadgeKey | null;
  runId: number;                  // bumped on every loop restart / step change
  handleMoveComplete: () => void; // wired to TutorialScene
  handleSettled: (flats: number, backdo: boolean) => void;
}
```

Mechanics, all mirroring proven `useGameSession` code:

- **`move` action**: optional preview window (build one `MovePreview` exactly like the
  `movePreviews` block in `use-game-session.ts:100-145`), then call `resolveMove`, compute
  `waypointClearances`, set `activeMove` (including `captureReturn` for the capture beat —
  copy the `executeMove` shape at `use-game-session.ts:215-302`), and wait for
  `handleMoveComplete` before advancing to the next action.
- **`waypointClearances`**: the 10-line occupant-count computation in
  `use-game-session.ts:229-239` is pure — extract it as
  `waypointClearances(board, player, movedPieces, waypoints)` into `src/game/rules.ts` and
  call it from both places. Only shared-logic refactor in this plan.
- **`throw` action**: `setNonce(n+1); setRolling(true)`; on `handleSettled`, map via
  `RESULT_BY_FLATS`/`BACKDO_RESULT`, expose `settledResult`, advance after a beat. No forced
  outcome — the caption reacts to whatever the physics produced.
- **Looping**: after the last action, `pause`, then reset `pieces` to `step.board` and bump
  `runId`. `runId` is part of each `Token`'s React `key`, so reset is an instant remount
  rather than tokens gliding backwards across the board (which `Token`'s
  settle-toward-target behavior would otherwise do).
- **Step change / unmount**: clear all pending timeouts (single `useRef<number[]>` of timer
  ids, cleared in one place). Back/Next simply set the step index; the effect that runs the
  script keys off `(stepIndex, runId)`.
- **Sound**: reuse `gameSfx` piece-step/capture/stack sounds (they fire inside `Token` and via
  the player, same as the game). Respect the existing global SFX toggle.

Timing constants (tune during QA): preview window ~1.4 s, pause between beats ~0.9 s,
loop hold ~1.6 s.

### 3.3 `TutorialScene` (`src/scene/tutorial-scene.tsx`)

A slim variant of `Scene` (`src/scene/game-scene.tsx`):

- Same background color, lights, `ContactShadows` (copied).
- `BoardSurface` with `previewEdgeColors` derived from the player's `movePreviews` (identical
  mapping loop as `game-scene.tsx:140-148`).
- Tokens rendered exactly as in `Scene` (placement, stack labels, `activeMove` wiring) but
  with `highlighted={false}` and no hover logic. Key includes `runId`.
- `PreviewPathNode` / `MoveDestinationPreview` for the preview windows (imported after export).
- `YutPhysics` mounted only when `step.showSticks` (mounting Rapier's `<Physics>` world for
  steps that never use it is wasted work; conversely mounting it fresh on entering step 2 is
  cheap and matches its `nonce === 0` idle state).
- **No `OrbitControls`**; camera set via `<Canvas camera={...}>` in the screen. Canvas gets
  `pointer-events: none` so taps fall through to the nav controls.

### 3.4 Screen shell (`src/screens/tutorial/index.tsx`)

- Structure per the layout sketch; styling borrows the `RulesDialog` palette
  (`#eee0c2` text, `linear-gradient(145deg,#17211b,#0d1511)` card, gold accents) so it feels
  like the same product.
- A11y: the caption region is `aria-live="polite"`; buttons have labels from i18n; `Escape`
  and `←`/`→` handled at the screen level (same pattern as `RulesDialog`'s key handling).
- Step 2 caption: when `settledResult` arrives, render "N flat sides → **Geol** — move 3"
  using `t.yut[result.id]` + `t.tutorial.throwReading(...)`; a ~350 ms/step tick-up of the
  counter is a nice-to-have, plain text is acceptable for v1.
- `prefers-reduced-motion`: skip the loop replay (play each step's script once, then hold).

### 3.5 i18n additions

Add to **`ko.ts` first** (source of truth — the `Messages` type is inferred from it), then
`en.ts`, `bn.ts`:

```ts
tutorial: {
  title: string;                      // "How to Play"
  skip: string; back: string; next: string; done: string;
  detailedRules: string;              // link to RulesDialog
  stepLabel: (current: number, total: number) => string;
  steps: Record<TutorialStepId, { title: string; body: string }>;
  throwReading: (flats: number, name: string, steps: number) => string;
  throwAgainBadge: string; finishedBadge: string;
  backdoFootnote: string; extraThrowFootnote: string;
},
```

Missing entries in `en`/`bn` are compile errors, so nothing can ship half-translated.

---

## 4. Gotchas & constraints

- **React Compiler**: no destructured prop defaults in any new component (they silently bail
  compilation with `@rolldown/plugin-babel` + compiler v1 — see the note at
  `src/scene/token.tsx:30`). Use explicit `?? default` in bodies.
- **`Token` reset behavior**: without the `runId` remount, changing `pieces` back to the
  step's initial board makes tokens glide to their reset positions (the `useEffect` at
  `token.tsx:191-231` queues the new target). Remount keys are the deliberate fix.
- **`MoveDestinationPreview` uses `<Html>`** with game-specific labels; the tutorial passes
  `label` from `t.tutorial` (the component is already label-agnostic via `preview.label`).
- **Two canvases never coexist** — lobby, tutorial, and game are exclusive screens, so there
  is no WebGL context pressure.
- **Physics nondeterminism is confined to step 2** and never affects board state — the script
  only _displays_ the result; it doesn't move pieces with it.
- **Bundle**: no new dependencies. The tutorial reuses already-loaded three/rapier code.

## 5. Testing

1. **`tests/tutorial-script.test.mjs`** (add to the `test` script in `package.json`, same
   runner flags as `test:rules`): for every step, start from `step.board` and fold over its
   `move` actions through `resolveMove`, asserting:
   - every move is legal (`isMovable`, group leader, route choice valid via `canChooseRoute`);
   - step `shortcut`: first move lands on `O5`, second uses route `shortcut-a`;
   - step `capture-stack`: beat 1 yields `capturedPieces.length === 1`, beat 2 yields
     `stackedPieces.length === 1`;
   - step `win`: final resolution has `won === true`.
     This pins the scripted choreography to the real rules — if `rules.ts` ever changes, the
     tutorial breaks in CI, not in front of a user.
2. **`pnpm typecheck`** covers the i18n catalogs and prop wiring.
3. **Manual QA via `/verify`-style run**: each step loops cleanly; Back/Next mid-animation
   doesn't leak timers (rapid-click test); step 2 result caption matches the physical sticks,
   including a Backdo settle; mobile portrait layout; `Escape`/keyboard nav; reduced-motion.

## 6. Implementation order

Each phase leaves `main` shippable.

1. **Foundations** — extract `RulesDialog` to `src/screens/rules-dialog.tsx`; export
   `PreviewPathNode`/`MoveDestinationPreview`; extract `waypointClearances()` into `rules.ts`
   and use it from `useGameSession`. Pure refactor, no behavior change (`pnpm test`).
2. **Script + tests** — `tutorial-script.ts` with all 5 steps' boards/actions;
   `tests/tutorial-script.test.mjs` green.
3. **Player + scene + shell, movement steps** — `use-tutorial-player.ts`, `TutorialScene`,
   tutorial screen with steps 1/3/4/5 (everything except physics), routing from lobby,
   i18n `tutorial` namespace in all three catalogs.
4. **Physics step** — step 2 with live throw + result reading caption.
5. **Polish** — timings, mobile layout, reduced-motion, SFX pass, "Detailed rules" link,
   remove the lobby's direct `RulesDialog` path (button now opens the tutorial).

Rough size: phases 1–2 are small (≈150 new lines + tests); phase 3 is the bulk (≈400–500
lines across hook/scene/screen); phases 4–5 are small. No step blocks on design decisions —
the only judgment calls left are copywriting and timing values.

## 7. Open questions (non-blocking, defaults chosen)

- **Does the lobby keep a separate text-rules button?** Default: no — one "How to Play"
  entry; text rules live behind the link inside the tutorial.
- **Auto-open for first-time visitors?** Default: no for v1 (a `localStorage` flag +
  auto-open is a 5-line follow-up if wanted).
- **Interactive throw in step 2** ("press to throw yourself"): deliberately deferred; the
  player hook's `throw` action is already the seam where a user-triggered variant would go.
