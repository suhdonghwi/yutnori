import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
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

type DockSectionProps = {
  ratio: number;
  minWidth: string;
  children: ReactNode;
  border?: "right" | "none";
  className?: string;
  ariaLabel?: string;
  ariaLive?: "polite";
};

function DockSection({
  ratio,
  minWidth,
  children,
  border = "none",
  className = "",
  ariaLabel,
  ariaLive,
}: DockSectionProps) {
  return (
    <div
      className={`min-w-[var(--dock-min-width)] flex-[var(--dock-ratio)] max-sm:min-w-0 ${border === "right" ? "border-r border-gold/35 max-sm:border-r-0 max-sm:border-b" : ""} ${className}`}
      style={
        {
          "--dock-ratio": `${ratio} 1 0%`,
          "--dock-min-width": minWidth,
        } as CSSProperties
      }
      aria-label={ariaLabel}
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

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
  onCancelRoute,
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
  onCancelRoute: () => void;
  onThrow: () => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const [canHover, setCanHover] = useState(
    () => window.matchMedia("(hover: hover)").matches,
  );
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover)");
    const handleChange = () => setCanHover(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    setSelectedPiece(null);
  }, [current, phase, result]);

  const handlePieceClick = (pieceIndex: number) => {
    if (canHover) {
      onMovePiece(pieceIndex);
      return;
    }
    setSelectedPiece(pieceIndex);
    onHoverToken({ player: current, piece: pieceIndex });
  };

  const confirmSelectedPiece = () => {
    if (selectedPiece === null) return;
    const pieceIndex = selectedPiece;
    setSelectedPiece(null);
    onMovePiece(pieceIndex);
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-5 left-1/2 z-[14] flex min-h-[96px] w-[calc(100%-64px)] max-w-[1380px] -translate-x-1/2 touch-manipulation items-stretch overflow-hidden rounded-xs border border-gold/60 bg-night/80 shadow-[0_20px_60px] shadow-black/35 select-none [-webkit-touch-callout:none] max-sm:bottom-2 max-sm:min-h-[108px] max-sm:w-[calc(100%-16px)] max-sm:flex-col"
      style={{ "--turn-color": PLAYERS[current].color } as CSSProperties}
    >
      <DockSection
        ratio={1.05}
        minWidth="330px"
        border="right"
        className="flex items-center gap-4 px-8 py-4 max-lg:min-w-[270px] max-sm:min-h-[56px] max-sm:w-full max-sm:flex-none max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-2"
        ariaLive="polite"
      >
        <span className="size-[11px] shrink-0 rounded-full border border-gold-soft/65 bg-[var(--turn-color)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--turn-color),transparent_80%)] max-sm:size-[9px]" />
        <div className="min-w-0">
          <small className="mb-1 block text-xs font-medium text-parchment-dim">
            {t.dock.now}
          </small>
          <strong className="block overflow-hidden text-[clamp(16px,1.5vw,21px)] leading-[1.18] font-extrabold text-ellipsis whitespace-nowrap text-parchment-bright max-sm:max-w-[calc(100vw-62px)] max-sm:text-sm">
            {statusText}
          </strong>
        </div>
      </DockSection>

      {phase === "move" && isAiTurn ? (
        <DockSection
          ratio={1.35}
          minWidth="310px"
          className="flex items-center gap-4 px-8 py-4 max-sm:min-h-[56px] max-sm:gap-2 max-sm:px-3.5 max-sm:py-2"
          ariaLive="polite"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-coral/35 text-xs font-black text-coral max-sm:size-8">
            AI
          </span>
          <div>
            <small className="mb-1 block text-xs font-semibold tracking-label text-coral">
              {t.dock.aiChoice(t.team(1))}
            </small>
            <strong className="block text-sm leading-[1.2] font-extrabold whitespace-nowrap text-parchment-bright max-sm:max-w-[68vw] max-sm:overflow-hidden max-sm:text-xs max-sm:text-ellipsis">
              {aiDecision ? t.aiReason[aiDecision.reason] : t.dock.aiThinking}
            </strong>
          </div>
        </DockSection>
      ) : phase === "move" ? (
        <DockSection
          ratio={1.55}
          minWidth="0px"
          className={`grid ${canHover ? "grid-cols-4" : "grid-cols-5"} max-sm:min-h-[56px]`}
          ariaLabel={t.dock.tokenListLabel}
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
                className={`group min-w-[58px] cursor-pointer border-0 border-l border-gold/30 px-3 py-3 text-sm font-extrabold transition-[background-color,color,opacity] enabled:hover:bg-gold/10 enabled:hover:text-gold disabled:cursor-not-allowed disabled:opacity-[.24] max-sm:min-w-0 max-sm:px-1 max-sm:py-1.5 max-sm:text-xs ${!canHover && selectedPiece === index ? "bg-gold/15 text-gold" : "bg-transparent text-parchment"}`}
                disabled={!movable}
                aria-pressed={!canHover ? selectedPiece === index : undefined}
                onPointerEnter={() => {
                  if (canHover) onHoverToken({ player: current, piece: index });
                }}
                onPointerLeave={() => {
                  if (canHover) onHoverToken(null);
                }}
                onFocus={() => onHoverToken({ player: current, piece: index })}
                onBlur={() => {
                  if (canHover || selectedPiece !== index) onHoverToken(null);
                }}
                onClick={() => handlePieceClick(index)}
              >
                {group.length > 1 && !follower
                  ? group.map((member) => t.dock.token(member)).join(" + ")
                  : t.dock.token(index)}
                <span className="mt-1.5 block text-xs font-medium text-parchment-faint group-hover:text-parchment-dim max-sm:mt-0">
                  {follower
                    ? t.dock.stackedWith(leader)
                    : t.pieceProgress(pieceProgress(piece))}
                </span>
              </button>
            );
          })}
          {!canHover && (
            <button
              type="button"
              className="grid cursor-pointer place-items-center border-0 border-l border-gold/30 bg-gold/10 text-gold transition-[background-color,color,opacity] enabled:hover:bg-gold/15 enabled:hover:text-parchment-bright disabled:cursor-not-allowed disabled:opacity-[.24]"
              disabled={selectedPiece === null}
              aria-label={t.dock.confirmMove}
              onClick={confirmSelectedPiece}
            >
              <ArrowRight size={22} weight="bold" aria-hidden="true" />
            </button>
          )}
        </DockSection>
      ) : phase === "route" ? (
        <DockSection
          ratio={1.45}
          minWidth="0px"
          className="grid grid-cols-[auto_1fr_1fr] max-sm:min-h-[56px]"
          ariaLabel={t.dock.routeListLabel}
        >
          <button
            type="button"
            className="grid min-w-14 cursor-pointer place-items-center border-0 border-r border-gold/30 bg-transparent px-3 text-parchment-dim transition-colors hover:bg-white/[.04] hover:text-parchment-bright max-sm:min-w-10 max-sm:px-2"
            aria-label={t.dock.backToTokenSelection}
            onClick={onCancelRoute}
          >
            <ArrowLeft size={22} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="cursor-pointer border-0 border-r border-gold/30 bg-gold/10 px-5 py-3 text-sm font-extrabold text-gold transition-colors hover:bg-gold/15 max-sm:min-w-0 max-sm:px-1.5 max-sm:py-1.75 max-sm:text-xs"
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
          </button>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent px-5 py-3 text-sm font-extrabold text-parchment-dim transition-colors hover:bg-white/[.04] hover:text-parchment-bright max-sm:min-w-0 max-sm:px-1.5 max-sm:py-1.75 max-sm:text-xs"
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
          </button>
        </DockSection>
      ) : (
        <DockSection
          ratio={1.2}
          minWidth="240px"
          className="flex max-sm:min-h-[56px]"
        >
          {phase === "gameover" ? (
            <button
              className="flex w-full cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-gold transition-colors hover:bg-gold/10 hover:text-parchment-bright max-sm:text-sm"
              type="button"
              onClick={onReset}
            >
              {t.dock.playAgain}{" "}
              <ArrowRight size={21} weight="bold" aria-hidden="true" />
            </button>
          ) : (
            <button
              className="flex w-full cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-6 font-black text-gold transition-colors enabled:hover:bg-gold/10 enabled:hover:text-parchment-bright disabled:cursor-wait disabled:opacity-45 max-sm:px-3 max-sm:text-sm"
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
        </DockSection>
      )}
    </div>
  );
}
