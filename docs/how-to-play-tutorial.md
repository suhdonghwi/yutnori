# Interactive "How to Play" Tutorial — Implementation Plan

## Summary

Replace the static rules dialog as the primary onboarding path with a **guided demo**: a
full-screen tutorial that plays short, looping, scripted animations on the _real_ 3D board —
same `BoardSurface`, same lacquered `Token` meshes, same Rapier yut-stick physics — with a
caption card and step navigation below. The user watches and taps Next; no interaction inside
the scene. The tutorial is the only rules/onboarding surface; there is no separate detailed-rules
dialog.

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
- Backdo is taught on a separate screen and is out of scope for this five-result step.
- No coach-marks overlay on a real game.
- No changes to game logic; `rules.ts` gains at most one extracted pure helper.

---

## 1. UX specification

### Entry & navigation

- The lobby's **"How to Play"** button (`src/screens/lobby.tsx`) opens the tutorial.
- The tutorial is a **screen, not a dialog**: `YutnoriGame` (`src/screens/game/index.tsx`)
  extends its union to `"lobby" | "tutorial" | GameMode`. A full-screen route avoids nesting a
  `<Canvas>` inside a scrolling dialog and reuses the existing screen-switching pattern.
- Controls: step dots + **Back / Next** buttons, **Skip/Close** (top-right, plus `Escape`),
  `←`/`→` keyboard navigation. Last step's primary button is "Got it → back to lobby".
- The step dots replace numeric labels such as `01`, `02`, and sit immediately above the current
  step title. There is no duplicate progress label in the canvas header.

### Layout

```
┌────────────────────────────────────────┐
│                              [✕ Skip]  │
│                                        │
│            <Canvas>                    │  ← fixed camera, pointer-events: none
│         (board + animation)            │
│                                        │
├────────────────────────────────────────┤
│  ● ● ○ ○ ○                            │
│  Step title                            │
│  One or two sentences of caption.      │  ← DOM caption card (Tailwind, same
│                                        │    dark green / gold palette)
│                        [Back]  [Next →] │
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

| #   | id              | Concept                                            | Initial board                                                                     | Scripted actions (loop)                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `goal`          | Race around the board and home                     | All pieces home                                                                   | Blue piece 0 enters at `O0` and travels the full outer ring to finish, as 4 chained moves of 5 steps each (`steps: 5` × 4) so the arc-hop animation stays readable but the lap is quick. Path edges glow ahead of it via the existing preview mechanism.                                                                                                                                                                     |
| 2   | `throw`         | Read the five standard throw results               | Split demonstration (desktop: left/right; mobile: top/bottom)                     | **Left:** the real board continuously throws physical yut sticks; the random outcome is intentionally not labeled. After the sticks settle, hold for ~0.8 s and throw again. **Right:** four floating, deterministic `YutStickMesh` instances rotate through Do → Gae → Geol → Yut → Mo. Each state holds long enough to read and shows its name, flat-side count, movement (`+1`…`+5`), and an extra-throw note for Yut/Mo. |
| 3   | `shortcut`      | Corners unlock diagonals                           | Blue piece 0 at `outer` index 2 (`O2`)                                            | Move 3 steps → lands exactly on corner `O5`. Pause: both route previews glow (destination rings + path glow, shortcut colored `#f2cb72` as in the game). Then move 5 with `choice: "shortcut"` → piece cuts through `A1 A2 C A3 A4`.                                                                                                                                                                                         |
| 4   | `capture-stack` | Capture sends home + extra throw; own pieces stack | Blue piece 0 at `O1`; red piece 0 at `O4`; blue piece 1 at `O2` is used in beat 2 | Beat 1: blue piece 0 moves 3 → lands `O4`, red piece pops back home (the existing `captureReturn` two-stage move animates this), "Throw again!" badge. Beat 2: blue piece 2 enters from home with 2 steps → lands `O2` where blue piece 1 sits → stack forms, stack label ("B2 + B3") appears automatically via `tokenPlacement`.                                                                                            |
| 5   | `win`           | First to finish all 4 wins                         | Blue: 3 finished, piece 3 at `shortcut-b` index 5 (`B4`)                          | Move 1 → piece crosses `O0` and finishes (`resolveMove` returns `won: true`). Small celebratory stamp (reuse the `result-stamp`/confetti CSS from `src/styles/effects.css` — _not_ the full `VictoryEffect`, which is a takeover).                                                                                                                                                                                           |

Step 4 beat 2 exact layout (verified against `resolveMove` semantics): blue piece 1 sits at
`outer` index 2 the whole step; after beat 1, blue piece 2 enters from home with `steps: 2` →
destination `O2` is occupied by a stationary own piece → `stackedPieces` is non-empty, both
get stacked `stackOrder`s, and the stack label renders with no extra work. The two beats fold
over one board state, so the script needs no mid-step reset.

All board-movement steps are plain `resolveMove()` calls — captures, stacking, route choice,
finishing and `won` all come back in the `MoveResolution`, and the waypoints feed the existing
`Token` animation.

### Step 2 split layout and timing

Step 2 is deliberately different from the board-movement storyboard. It separates atmospheric
motion from the actual lesson so a slow or unusual physics settle cannot block comprehension.

```
Desktop
┌─────────────────────────────┬──────────────────────┐
│ Real board + YutPhysics     │  Four floating sticks│
│ throw → settle → 0.8 s → ↻ │  rotate to next state│
│ no random-result label      │  DO                  │
│                             │  1 flat side · +1    │
└─────────────────────────────┴──────────────────────┘

Mobile
┌────────────────────────────────────────────────────┐
│ Compact real-board throw loop                      │
├────────────────────────────────────────────────────┤
│ Four-stick result showcase + current explanation   │
└────────────────────────────────────────────────────┘
```

- Desktop ratio starts near `55 / 45`; the explanatory right side is the semantic focus.
- The right-side cycle order is fixed: **Do → Gae → Geol → Yut → Mo**. Transition for ~0.5 s,
  then hold each readable state for ~1.8 s (tune during QA).
- Flat-facing sticks use the canonical flat-up orientation; the remaining sticks show their
  rounded side. The highlighted flat count and the text must always agree.
- Copy by state: `Do · 1 flat · +1`, `Gae · 2 flat · +2`, `Geol · 3 flat · +3`,
  `Yut · 4 flat · +4 · throw again`, `Mo · 0 flat · +5 · throw again`.
- The physical loop on the left ignores its random result entirely.
- On `prefers-reduced-motion`, the left side holds a settled throw and the right side shows the
  five results as a static compact list rather than rotating automatically.

---

## 2. Architecture

### Reuse map

| Existing code                                                                         | Used for                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `resolveMove`, `createInitialBoard`, `NODE_POSITIONS`, `ROUTES` (`src/game/rules.ts`) | All scripted move outcomes and waypoints                                                                                  |
| `BoardSurface`, `boardEdgeKey` (`src/scene/board.tsx`)                                | Board + path-glow (`previewEdgeColors`)                                                                                   |
| `Token`, `tokenPlacement` (`src/scene/token.tsx`)                                     | Piece rendering, waypoint hop animation, stacking, stack labels — driven by the same `activeMoveId`/`moveWaypoints` props |
| `YutPhysics` (`src/scene/yut-physics.tsx`)                                            | Step 2 left-side continuous physics loop; its random result is ignored                                                    |
| `YutStickMesh` (`src/scene/yut-physics.tsx`)                                          | Step 2 right-side deterministic four-stick result showcase                                                                |
| `PreviewPathNode`, `MoveDestinationPreview` (`src/scene/game-scene.tsx`)              | Route-preview glow in steps 1 and 3 — **needs to be exported** (currently module-private)                                 |
| `RESULT_BY_FLATS`, `PLAYERS` (`src/game/config.ts`)                                   | Five standard result values and token colors                                                                              |
| Lighting/`ContactShadows` block from `Scene`                                          | Copied (~20 lines) into `TutorialScene`; not worth extracting                                                             |

### New files

```
src/game/tutorial-script.ts        # pure data + types: steps, boards, actions (no React)
src/screens/tutorial/index.tsx     # screen shell: canvas, caption card, dots, nav, a11y
src/screens/tutorial/use-tutorial-player.ts   # the script player hook
src/screens/tutorial/use-throw-showcase.ts    # independent left throw + right result cycles
src/scene/tutorial-scene.tsx       # slim Scene variant (fixed camera, no controls/hover)
src/scene/tutorial-throw-scene.tsx # ThrowLoopScene + ThrowResultShowcaseScene
tests/tutorial-script.test.mjs     # replays every scripted move through resolveMove
```

### Modified files

```
src/screens/game/index.tsx         # screen union + tutorial route
src/screens/lobby.tsx              # How to Play button → onOpenTutorial
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
      steps: number;
      choice?: RouteChoice; // default "outer"
      previewMs?: number; // show path/destination glow this long before moving
    }
  | { kind: "badge"; key: TutorialBadgeKey; ms: number }; // e.g. "extraThrow", "finished"

export type TutorialStep = {
  id: TutorialStepId;
  board: BoardState; // initial layout for this step
  layout: "board" | "throw-split";
  actions: TutorialAction[];
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  /* the 5 steps from the storyboard */
];

export const TUTORIAL_THROW_RESULT_IDS = [
  "do",
  "gae",
  "geol",
  "yut",
  "mo",
] as const;
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
  badge: TutorialBadgeKey | null;
  runId: number;                  // bumped on every loop restart / step change
  handleMoveComplete: () => void; // wired to TutorialScene
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

Step 2 does not run through this action queue. `useThrowShowcase` owns two independent clocks:

```ts
{
  rolling: boolean;
  nonce: number;                  // increments after each left-side settle hold
  resultIndex: number;            // deterministic Do → Gae → Geol → Yut → Mo cycle
  handleSettled: () => void;      // callback arguments are intentionally ignored
}
```

- `handleSettled` intentionally ignores both callback values, waits ~0.8 s, then increments
  `nonce` and starts the next physical throw.
- A separate timer advances `resultIndex` every ~2.3 s (transition + readable hold), so a slow
  physical settle never delays the explanation.
- Step change/unmount clears both cycles and guards stale physics callbacks with a generation id.

### 3.3 `TutorialScene` (`src/scene/tutorial-scene.tsx`)

A slim variant of `Scene` (`src/scene/game-scene.tsx`):

- Same background color, lights, `ContactShadows` (copied).
- `BoardSurface` with `previewEdgeColors` derived from the player's `movePreviews` (identical
  mapping loop as `game-scene.tsx:140-148`).
- Tokens rendered exactly as in `Scene` (placement, stack labels, `activeMove` wiring) but
  with `highlighted={false}` and no hover logic. Key includes `runId`.
- `PreviewPathNode` / `MoveDestinationPreview` for the preview windows (imported after export).
- **No `OrbitControls`**; camera set via `<Canvas camera={...}>` in the screen. Canvas gets
  `pointer-events: none` so taps fall through to the nav controls.

Step 2 swaps the regular scene for a responsive split component:

- **Left `ThrowLoopScene` canvas**: `BoardSurface`, standard lights/shadows, and `YutPhysics`.
  It receives only `rolling`, `nonce`, and `handleSettled`; no result badge or caption is tied
  to the random settle.
- **Right `ThrowResultShowcaseScene` canvas**: four `YutStickMesh` groups without Rapier.
  Each group interpolates between explicit flat-up and round-up quaternions. A small stagger
  makes the transition readable, but all four settle before the result copy changes.
- The right-side result name and explanation are DOM, not `<Html>`, for crisp localization and
  responsive layout. The showcase canvas is decorative (`aria-hidden`); a hidden static list of
  all five mappings gives assistive technology the complete lesson without repeated live-region
  announcements.
- Desktop uses a two-column grid; mobile stacks a compact throw loop above the larger result
  showcase. Both canvases remain `pointer-events: none`.

### 3.4 Screen shell (`src/screens/tutorial/index.tsx`)

- Structure per the layout sketch with the existing dark green, parchment, and gold palette.
- A11y: the caption region is `aria-live="polite"`; buttons have labels from i18n; `Escape`
  and `←`/`→` handled at the screen level.
- Step 2 renders the split layout in the canvas area. The current deterministic result uses
  `t.yut[result.id]` plus a localized flat-count/movement line. Yut and Mo also show the
  localized extra-throw label.
- `prefers-reduced-motion`: skip the loop replay (play each step's script once, then hold).

### 3.5 i18n additions

Add to **`ko.ts` first** (source of truth — the `Messages` type is inferred from it), then
`en.ts`, `bn.ts`:

```ts
tutorial: {
  title: string;                      // "How to Play"
  skip: string; back: string; next: string; done: string;
  stepLabel: (current: number, total: number) => string;
  steps: Record<TutorialStepId, { title: string; body: string }>;
  throwShowcase: {
    flatSides: (count: number) => string;
    move: (steps: number) => string;   // e.g. "+3 steps"
    extraThrow: string;
    accessibleSummary: string;         // all five standard mappings
  };
  throwAgainBadge: string; finishedBadge: string;
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
- **Step 2 uses two canvases** — one physics board and one lightweight deterministic stick
  showcase. Lobby, tutorial, and game are still exclusive screens, so two simultaneous WebGL
  contexts is the maximum and is acceptable on target mobile browsers.
- **Physics nondeterminism is decorative in step 2** — it never changes the explanatory result,
  board state, or right-side timer. Do not map `onSettled` to visible result copy.
- **Keep the two cycles independent** — a long physics settle must not freeze Do/Gae/Geol/Yut/Mo,
  and changing steps must stop both timers immediately.
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
   - step `throw`: uses `layout: "throw-split"`, has no move actions, and exposes the fixed
     result order `do, gae, geol, yut, mo` with steps `1, 2, 3, 4, 5`.

   This pins the scripted choreography to the real rules — if `rules.ts` ever changes, the
   tutorial breaks in CI, not in front of a user.

2. **`pnpm typecheck`** covers the i18n catalogs and prop wiring.
3. **Manual QA via `/verify`-style run**: each step loops cleanly; Back/Next mid-animation
   doesn't leak timers (rapid-click test); step 2 keeps rethrowing with a settle-to-rethrow gap
   under ~1 s; the right sticks and copy cycle in fixed order and always agree; Yut/Mo show
   "throw again"; mobile portrait stacks the two panels cleanly; `Escape`/keyboard nav;
   reduced-motion static fallback.

## 6. Implementation order

Each phase leaves `main` shippable.

1. **Foundations** — export `PreviewPathNode`/`MoveDestinationPreview` and `YutStickMesh`;
   extract `waypointClearances()` into `rules.ts` and use it from `useGameSession`. Pure
   refactor, no behavior change (`pnpm test`).
2. **Script + tests** — `tutorial-script.ts` with all 5 steps' boards/actions;
   `tests/tutorial-script.test.mjs` green.
3. **Player + scene + shell, movement steps** — `use-tutorial-player.ts`, `TutorialScene`,
   tutorial screen with steps 1/3/4/5 (everything except physics), routing from lobby,
   i18n `tutorial` namespace in all three catalogs.
4. **Split throw step** — step 2 left-side continuous `YutPhysics` loop, right-side deterministic
   `YutStickMesh` result cycle, DOM copy, and a static reduced-motion fallback.
5. **Polish** — independent-cycle timing, desktop/mobile split layout, reduced-motion, SFX pass,
   and rapid navigation cleanup.

Rough size: phases 1–2 are small (≈150 new lines + tests); phase 3 is the bulk (≈400–500
lines across hook/scene/screen); phases 4–5 are small. No step blocks on design decisions —
the only judgment calls left are copywriting and timing values.

## 7. Open questions (non-blocking, defaults chosen)

- **Auto-open for first-time visitors?** Default: no for v1 (a `localStorage` flag +
  auto-open is a 5-line follow-up if wanted).
- **Interactive throw in step 2** ("press to throw yourself"): deliberately deferred; the
  left throw loop remains observational in v1.
