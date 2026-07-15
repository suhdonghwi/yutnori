import type React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import {
  groupForPiece,
  isMovable,
  pieceProgress,
  type BoardState,
  type Player,
  type RouteChoice,
} from "../../game/rules";
import { PLAYERS } from "../../game/config";
import type { AiDecision } from "../../game/ai-player";
import type { HoveredToken, Phase, ThrowResult } from "../../game/types";
import { useI18n } from "../../i18n";

export function ControlDock({
  statusText,
  current,
  phase,
  isAiTurn,
  aiDecision,
  pieces,
  result,
  routeChoiceFromCenter,
  onHoverToken,
  onMovePiece,
  onHoverRoute,
  onChooseRoute,
  onThrow,
  onReset,
}: {
  statusText: string;
  current: Player;
  phase: Phase;
  isAiTurn: boolean;
  aiDecision: AiDecision | null;
  pieces: BoardState;
  result: ThrowResult | null;
  routeChoiceFromCenter: boolean;
  onHoverToken: (token: HoveredToken) => void;
  onMovePiece: (pieceIndex: number) => void;
  onHoverRoute: (choice: RouteChoice | null) => void;
  onChooseRoute: (choice: RouteChoice) => void;
  onThrow: () => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="pointer-events-auto absolute bottom-5 left-1/2 z-[14] flex min-h-[96px] w-[calc(100%-64px)] max-w-[1380px] -translate-x-1/2 touch-manipulation items-stretch overflow-hidden rounded-xs border border-gold/60 bg-night/80 shadow-[0_20px_60px] shadow-black/35 select-none [-webkit-touch-callout:none] max-[760px]:bottom-2 max-[760px]:min-h-[108px] max-[760px]:w-[calc(100%-16px)] max-[760px]:flex-col"
      style={{ "--turn-color": PLAYERS[current].color } as React.CSSProperties}
    >
      <div
        className="flex min-w-[330px] flex-[1.05] items-center gap-4 border-r border-gold/35 px-8 py-4 max-[900px]:min-w-[270px] max-[760px]:min-h-[52px] max-[760px]:w-full max-[760px]:min-w-0 max-[760px]:flex-none max-[760px]:gap-2.5 max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-3.5 max-[760px]:py-2"
        aria-live="polite"
      >
        <span className="size-[11px] shrink-0 rounded-full border border-gold-soft/65 bg-[var(--turn-color)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--turn-color),transparent_80%)] max-[760px]:size-[9px]" />
        <div className="min-w-0">
          <small className="mb-1 block text-label font-medium text-parchment-dim max-[760px]:mb-0 max-[760px]:text-micro">
            {t.dock.now}
          </small>
          <strong className="block overflow-hidden text-[clamp(16px,1.5vw,21px)] leading-[1.18] font-extrabold text-ellipsis whitespace-nowrap text-parchment-bright max-[760px]:max-w-[calc(100vw-62px)] max-[760px]:text-body">
            {statusText}
          </strong>
        </div>
      </div>

      {phase === "move" && isAiTurn ? (
        <div
          className="flex min-w-[310px] flex-[1.35] items-center gap-4 px-8 py-4 max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:gap-2 max-[760px]:px-3.5 max-[760px]:py-2"
          aria-live="polite"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-coral/35 text-label font-black text-coral max-[760px]:size-8">
            AI
          </span>
          <div>
            <small className="mb-1 block text-micro font-semibold tracking-label text-coral">
              {t.dock.aiChoice(t.team(1))}
            </small>
            <strong className="block text-sm leading-[1.2] font-extrabold whitespace-nowrap text-parchment-bright max-[760px]:max-w-[68vw] max-[760px]:overflow-hidden max-[760px]:text-label max-[760px]:text-ellipsis">
              {aiDecision ? t.aiReason[aiDecision.reason] : t.dock.aiThinking}
            </strong>
          </div>
        </div>
      ) : phase === "move" ? (
        <div
          className="grid flex-[1.55] grid-cols-4 max-[760px]:min-h-[58px] max-[760px]:grid-cols-4"
          aria-label={t.dock.tokenListLabel}
        >
          {pieces[current].map((piece, index) => {
            const group = groupForPiece(pieces, current, index);
            const leader = group[0];
            const follower = piece.status === "board" && leader !== index;
            const movable = isMovable(piece, result?.steps ?? 0) && !follower;
            return (
              <button
                key={index}
                type="button"
                className="group min-w-[58px] cursor-pointer border-0 border-l border-gold/30 bg-transparent px-3 py-3 text-sm font-extrabold text-parchment transition-[background-color,color,opacity] enabled:hover:bg-gold/10 enabled:hover:text-gold disabled:cursor-not-allowed disabled:opacity-[.24] max-[760px]:min-w-0 max-[760px]:px-1 max-[760px]:py-1.5 max-[760px]:text-label"
                disabled={!movable}
                onPointerEnter={() =>
                  onHoverToken({ player: current, piece: index })
                }
                onPointerLeave={() => onHoverToken(null)}
                onFocus={() => onHoverToken({ player: current, piece: index })}
                onBlur={() => onHoverToken(null)}
                onClick={() => onMovePiece(index)}
              >
                {group.length > 1 && !follower
                  ? group.map((member) => t.dock.token(member)).join(" + ")
                  : t.dock.token(index)}
                <span className="mt-1.5 block text-micro font-medium text-parchment-faint group-hover:text-parchment-dim max-[760px]:mt-0.5">
                  {follower
                    ? t.dock.stackedWith(leader)
                    : t.pieceProgress(pieceProgress(piece))}
                </span>
              </button>
            );
          })}
        </div>
      ) : phase === "route" ? (
        <div
          className="grid flex-[1.45] grid-cols-2 max-[760px]:min-h-[58px]"
          aria-label={t.dock.routeListLabel}
        >
          <button
            type="button"
            className="cursor-pointer border-0 border-r border-gold/30 bg-gold/10 px-5 py-3 text-sm font-extrabold text-gold transition-colors hover:bg-gold/15 max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-1.75 max-[760px]:text-label"
            onPointerEnter={() => onHoverRoute("shortcut")}
            onPointerLeave={() => onHoverRoute(null)}
            onFocus={() => onHoverRoute("shortcut")}
            onBlur={() => onHoverRoute(null)}
            onClick={() => onChooseRoute("shortcut")}
          >
            {
              (routeChoiceFromCenter
                ? t.dock.shortcutFromCenter
                : t.dock.shortcutFromBranch
              ).label
            }
            <span className="mt-0.75 block text-micro font-medium text-parchment/65">
              {
                (routeChoiceFromCenter
                  ? t.dock.shortcutFromCenter
                  : t.dock.shortcutFromBranch
                ).description
              }
            </span>
          </button>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent px-5 py-3 text-sm font-extrabold text-parchment-dim transition-colors hover:bg-white/[.04] hover:text-parchment-bright max-[760px]:min-w-0 max-[760px]:px-1.5 max-[760px]:py-1.75 max-[760px]:text-label"
            onPointerEnter={() => onHoverRoute("outer")}
            onPointerLeave={() => onHoverRoute(null)}
            onFocus={() => onHoverRoute("outer")}
            onBlur={() => onHoverRoute(null)}
            onClick={() => onChooseRoute("outer")}
          >
            {
              (routeChoiceFromCenter
                ? t.dock.outerFromCenter
                : t.dock.outerFromBranch
              ).label
            }
            <span className="mt-0.75 block text-micro font-medium text-parchment/65">
              {
                (routeChoiceFromCenter
                  ? t.dock.outerFromCenter
                  : t.dock.outerFromBranch
                ).description
              }
            </span>
          </button>
        </div>
      ) : phase === "gameover" ? (
        <button
          className="flex min-w-[240px] flex-[1.2] cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-gold transition-colors hover:bg-gold/10 hover:text-parchment-bright max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:text-sm"
          type="button"
          onClick={onReset}
        >
          {t.dock.playAgain}{" "}
          <ArrowRight size={21} weight="bold" aria-hidden="true" />
        </button>
      ) : (
        <button
          className="flex min-w-[240px] flex-[1.2] cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-gold transition-colors enabled:hover:bg-gold/10 enabled:hover:text-parchment-bright disabled:cursor-wait disabled:opacity-45 max-[760px]:min-h-[56px] max-[760px]:min-w-0 max-[760px]:px-3 max-[760px]:text-sm"
          type="button"
          onClick={onThrow}
          disabled={isAiTurn || phase === "rolling" || phase === "moving"}
        >
          <span>
            {isAiTurn && phase === "ready"
              ? t.dock.throwButton.ai
              : phase === "rolling"
                ? t.dock.throwButton.rolling
                : phase === "moving"
                  ? t.dock.throwButton.moving
                  : t.dock.throwButton.ready}
          </span>
          <ArrowRight size={22} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
