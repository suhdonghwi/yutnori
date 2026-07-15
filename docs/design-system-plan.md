# Design system migration plan

**Status:** proposed · **Date:** 2026-07-15

## 1. Background

The UI is art-directed around a coherent theme — dark night surfaces, warm
parchment text, gold accents — but that theme was never written down as
tokens. Every component re-derives it with arbitrary Tailwind values, so the
same semantic role appears as dozens of slightly different literals.

Current state (all counts from `src/**/*.tsx`, 6 UI component files):

| Symptom                       | Count                                                                | Example                                                                                        |
| ----------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unique text hex colors        | 40+ (most used once)                                                 | `#ead8b2`, `#ebd8af`, `#ead6a9` — all "primary parchment text"                                 |
| rgba border/surface variants  | 20+                                                                  | `rgba(226,196,132,.2)`, `rgba(224,199,148,.12)`, `rgba(217,186,112,.28)` — all "gold hairline" |
| Arbitrary font sizes          | 11 distinct (`text-[13px]` ×13, `text-[10px]` ×12, …)                | no Tailwind scale used at all                                                                  |
| Arbitrary radii               | 7 distinct (`rounded-[9px]`, `rounded-[15px]`, `rounded-[25px]`, …)  | only `rounded-full` is non-arbitrary                                                           |
| Arbitrary tracking            | 12 distinct                                                          | `tracking-[.18em]` / `[.24em]` / `[.25em]` — all "eyebrow label"                               |
| Copy-pasted component recipes | 4 major (rule card ×4, stat box ×6, dock section ×5, icon button ×3) | ~200-char className strings duplicated verbatim                                                |

Meanwhile `src/globals.css` already declares `--color-ink/paper/night/team-blue/team-red`
in `@theme` — and **no className references them**. The token layer exists but
was abandoned.

Heaviest files, in order: `src/screens/lobby.tsx`, `src/screens/game/control-dock.tsx`,
`src/screens/result-effects.tsx`, `src/screens/game/player-progress.tsx`,
`src/screens/game/index.tsx`, `src/i18n/language-switcher.tsx`.

## 2. Goals and non-goals

**Goals**

- One named token per semantic role; no raw hex/rgba in `className`.
- Small named scales for font size, radius, and tracking.
- Extract the four proven repeated recipes into components.
- Keep the visual result essentially identical — snapping near-duplicate
  shades to a single token is acceptable and desired ("slight design changes
  for consistency" are explicitly OK).

**Non-goals**

- No component library, no cva/variants machinery, no new runtime
  dependencies. Six screens don't justify it.
- No tokenizing of intentional one-off art direction (victory/throw-result
  display typography, text shadows, confetti animation vars).
- No restyling of the Three.js scene (`src/scene/`) beyond sharing team
  colors. Board wood tones stay scene-local JS constants.
- Spacing stays on Tailwind's numeric scale (see §3.5) — no semantic spacing
  tokens.

## 3. Token specification

All tokens go in the existing `@theme` block in `src/globals.css` (Tailwind
v4, CSS-first — no config file). The current `--color-ink` / `--color-paper`
declarations are unused and get replaced by this set.

### 3.1 Colors

```css
@theme {
  /* surfaces */
  --color-night: #0d1713; /* app background (existing) */
  --color-panel: #17211b; /* dialogs, docks, sticky headers */
  --color-panel-deep: #0d1511; /* panel gradient bottom stop */

  /* text */
  --color-parchment-bright: #fff0cf; /* headings, emphasis, big numerals */
  --color-parchment: #ead8b2; /* primary body text */
  --color-parchment-dim: #a89b80; /* secondary/muted text */
  --color-parchment-faint: #928873; /* de-emphasized helper text */

  /* accent */
  --color-gold: #d9ba70; /* active states, highlights, progress */
  --color-gold-deep: #b89c5e; /* eyebrow labels, quiet accents */
  --color-gold-soft: #e0c794; /* hairline borders (used with /alpha) */

  /* status */
  --color-coral: #d98a7c; /* danger, backdo, AI indicator */

  /* players (existing, kept) */
  --color-team-blue: #174c6b;
  --color-team-red: #a63f31;
}
```

Transparent variants use Tailwind's opacity modifier (`border-gold-soft/20`,
`bg-night/85`) — this alone collapses the 20+ rgba literals. Standardize
alpha steps to multiples of 5.

**Mapping table — text/bg/border hexes → token.** "Snap" means the literal
changes to the token value; all deltas are a few RGB points and visually
negligible unless noted.

| Token              | Absorbs these literals                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `parchment-bright` | `#fff0cf` `#fff7df` `#fff3d4` `#fff0c8` `#fff0bd` `#f5e3bd` `#f3e2bd` `#f3e6c8` `#f1dfb9` `#f0e2c5` `#f0dfbb` `#eee0c2` |
| `parchment`        | `#ead8b2` `#ebd8af` `#ead6a9` `#ead7ad` `#e8d9b8` `#e7d5ac` `#f3dcaa` `#d9c8a4` `#d7c8a8`                               |
| `parchment-dim`    | `#a89b80` `#a69b84` `#aaa087` `#bbae91` `#cabea5` `#c7baa0` `#c5b590`                                                   |
| `parchment-faint`  | `#928873` `#8d8473` `#827a6b` `#716b5f`                                                                                 |
| `gold`             | `#d9ba70` `#d9bd7c` `#d9b96f` `#d6b66c` `#d6b667` `#f4d99b` `#f4dba1` `#efd49a`                                         |
| `gold-deep`        | `#b89c5e` `#9e8c68`                                                                                                     |
| `coral`            | `#d98a7c` `#e2a294` `#b99b91` `#efd6cb`* `#ffe3d8`*                                                                     |
| `panel`            | `#17211b` `#141e18`                                                                                                     |
| `panel-deep`       | `#0d1511`                                                                                                               |

\* `#efd6cb` / `#ffe3d8` are pale-coral text on coral backgrounds; if `coral`
reads too dark in place, use `coral/…` on a light base or fold into
`parchment-bright` — judgment call at migration time.

**Mapping table — rgba families → token/alpha:**

| Literal family                                                                             | Replacement                             |
| ------------------------------------------------------------------------------------------ | --------------------------------------- |
| `rgba(217,186,112,α)` (= `#d9ba70`)                                                        | `gold/α`                                |
| `rgba(224,199,148,α)`, `rgba(226,196,132,α)`, `rgba(245,222,168,α)`, `rgba(215,185,111,α)` | `gold-soft/α`                           |
| `rgba(255,242,205,α)`, `rgba(255,239,196,α)`                                               | `parchment-bright/α`                    |
| `rgba(7,15,12,α)`, `rgba(5,10,8,α)`                                                        | `night/α`                               |
| `rgba(190,143,51,α)`, `rgba(173,126,47,α)`                                                 | `gold-deep/α`                           |
| `rgba(164,61,47,α)`                                                                        | `team-red/α`                            |
| `rgba(226,162,143,α)`                                                                      | `coral/α`                               |
| `bg-white/4`, `bg-white/9`                                                                 | keep as-is (`white` is already a token) |

Explicitly **left alone**: `color-mix(...)` expressions and
`var(--victory-*)` / `var(--result-accent)` / `var(--turn-color)` /
`var(--player-color)` dynamic styling in `result-effects.tsx` and the game
screens — that machinery is correct as-is (though the literal hex fallbacks
inside `color-mix`, e.g. `#d9c89f`, `#bbae91`, `#e8d9b8`, should switch to
the theme vars, e.g. `var(--color-parchment-dim)`).

### 3.2 Typography

Font sizes, defined as `--text-*` theme tokens (each generates a `text-*`
utility):

| Token          | Value | Absorbs                      | Usage count today                                                 |
| -------------- | ----- | ---------------------------- | ----------------------------------------------------------------- |
| `text-micro`   | 9px   | `text-[8px]`, `text-[9px]`   | 8 (eyebrow labels, tiny helpers)                                  |
| `text-caption` | 10px  | `text-[10px]`                | 12                                                                |
| `text-label`   | 11px  | `text-[11px]`                | 8                                                                 |
| `text-body`    | 13px  | `text-[13px]`                | 13                                                                |
| `text-heading` | 18px  | `text-[17px]`, `text-[19px]` | 2 (dialog h3s)                                                    |
| `text-title`   | 26px  | `text-[26px]`, `text-[27px]` | 2 (modal titles; the `27px` is the close-button glyph — see note) |

Set each token's default line-height to `1` (`--text-micro--line-height: 1`,
etc. — `leading-none` is the dominant pairing today), overriding per-use
where the current code uses `leading-[1.2]`/`[1.4]`/`[1.65]`.

Notes:

- `text-[22px]` is the mobile variant of a 26px title — becomes
  `max-[560px]:text-[22px]` → acceptable to keep arbitrary, or snap to
  `text-heading`+ size if it reads fine. Judgment call.
- The three `text-[clamp(...)]` display sizes (lobby title, throw result,
  victory) are intentional one-offs; keep inline.
- The `text-[27px]` on the lobby close button is an icon-glyph size, not
  typography — snapping to 26 is fine.
- `text-[0px]` (visually-hidden trick) stays.
- Weights are already on Tailwind's named scale — no change. `font-sans` is
  already wired to Pretendard via `@theme`; no change.

### 3.3 Radius

| Token         | Value | Absorbs                                                                  |
| ------------- | ----- | ------------------------------------------------------------------------ |
| `--radius-xs` | 3px   | `rounded-[2px]`, `rounded-[3px]` (dock chips)                            |
| `--radius-sm` | 9px   | `rounded-[9px]` (stat boxes)                                             |
| `--radius-md` | 15px  | `rounded-[15px]` (rule cards)                                            |
| `--radius-lg` | 25px  | `rounded-[25px]` (modals); mobile `rounded-[19px]` snaps to `rounded-md` |

`rounded-full` stays.

### 3.4 Letter spacing

| Token                | Value   | Absorbs                                                   |
| -------------------- | ------- | --------------------------------------------------------- |
| `--tracking-display` | -0.05em | `-.055em` `-.045em` `-.04em` (big display numerals)       |
| `--tracking-snug`    | -0.02em | `-.02em` `-.025em`                                        |
| `--tracking-label`   | 0.08em  | `.08em` `.1em` (`.04em` backdo special case stays inline) |
| `--tracking-eyebrow` | 0.2em   | `.18em` `.24em` `.25em`                                   |

The eyebrow merge (0.18→0.2, 0.25→0.2) is the most visible snap in the whole
plan; verify by eye on the lobby header and victory card.

### 3.5 Spacing

No new tokens. Tailwind v4's numeric spacing scale accepts any quarter step,
so arbitrary pixel values become scale values mechanically:
`px-[26px]` → `px-6.5`, `py-[9px]` → `py-2.25`, `gap-[7px]` → `gap-1.75`,
`px-[13px]` → `px-3.25`. Where a value is within 1px of a whole step, prefer
the whole step (`px-[26px]` → `px-6` is fine). Sizes that encode layout
geometry (`size-[38px]`, `min-h-[86px]`, `grid-cols-[42px_…]`) stay as-is —
they'll mostly disappear into extracted components anyway.

## 4. Component extraction

Extract only recipes that already repeat verbatim. All are small function
components co-located with their sole consumer — **no** `src/components/`
directory yet; create one only when a component gains a second consumer file.

| Component     | Lives in                            | Replaces                      | Props                                                             |
| ------------- | ----------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `RuleCard`    | `src/screens/lobby.tsx`             | 4 copies (rules dialog)       | `icon`, `title`, `children`                                       |
| `StatBox`     | `src/screens/lobby.tsx`             | 6 copies (rules dialog stats) | `label`, `value`                                                  |
| `DockSection` | `src/screens/game/control-dock.tsx` | 5 copies                      | `ratio` (flex grow), `minWidth`, `children`, border side variants |
| `IconButton`  | `src/screens/game/index.tsx`        | 3 copies                      | `icon`, `label`, `onClick`                                        |

Conditional classes stay template literals — do not add `clsx`/
`tailwind-merge` in this pass. Revisit only if the extracted components grow
real variant logic.

## 5. Team colors: single source of truth

Team blue/red currently live in three places: `src/styles/base.css`
(`--blue`/`--red`), `src/game/config.ts` (JS constants incl. glow variants),
and Three.js materials in `src/scene/`.

**Recommended:** make `src/game/config.ts` the single source (it already
holds the glow variants, and game logic stays DOM-free). The DOM
already receives player colors via inline `--player-color` /
`--turn-color` / `--victory-color` style props, so:

1. Scene materials import from `config.ts` (may already — verify).
2. Audit uses of `--team-blue` / `--team-red` Tailwind tokens; if any static
   className needs a team color, keep the CSS vars but add a one-line comment
   in both files pointing at each other. If none, drop the tokens from
   `@theme`.

Also clean up while there: `--font-geist-sans` / `--font-noto-serif-kr` in
`base.css` are leftover aliases of `--font-primary` (the body `font-family`
even lists a `serif` fallback that contradicts the sans stack) — collapse to
`--font-primary` only.

## 6. Migration phases

Ordered so each phase lands independently and the app is releasable after
every phase. Suggested one commit per phase (or per file in phase 2).

| Phase                                            | Work                                                                                                                                                                                                                                          | Effort  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **0. Tokens**                                    | Rewrite `@theme` in `globals.css` per §3 (colors + text + radius + tracking). Remove dead `ink`/`paper` tokens. No component changes — purely additive, zero visual diff.                                                                     | ~30 min |
| **1. Color migration**                           | File-by-file find-and-replace per §3.1 mapping tables, smallest first: `language-switcher` → `player-progress` → `game/index` → `result-effects` → `control-dock` → `lobby`. Each file: replace, run dev server, eyeball the affected screen. | 2–3 h   |
| **2. Type/radius/tracking/spacing**              | Same file order, per §3.2–3.5. The snaps with visible deltas (eyebrow tracking, 19→15px mobile radius, 17/19→18px headings) get a deliberate look.                                                                                            | 1–2 h   |
| **3. Component extraction**                      | The four components in §4. Behavior-preserving refactor; the responsive variants move inside the components.                                                                                                                                  | 1–2 h   |
| **4. Team color unification + base.css cleanup** | Per §5.                                                                                                                                                                                                                                       | ~30 min |

## 7. Verification

After each phase:

- `pnpm format:check`, `pnpm typecheck`, and `pnpm build`.
- Manual visual pass of the four surfaces: lobby (incl. rules dialog), game
  screen with control dock through a full turn, throw-result effect, victory
  screen. Check both desktop and a ≤560px viewport (the responsive variants
  are where snapping mistakes will show).
- Before starting phase 1, capture reference screenshots of those four
  surfaces at both widths to diff against.

## 8. Open judgment calls (resolve during migration, by eye)

1. Eyebrow tracking unification at 0.2em (§3.4) — largest visible snap.
2. Pale-coral text tokens (§3.1 footnote) — `coral` vs `parchment-bright`.
3. Mobile modal radius 19px → 15px (§3.3).
4. Whether any static className genuinely needs `team-blue`/`team-red`
   tokens or the inline-var pattern covers everything (§5).
