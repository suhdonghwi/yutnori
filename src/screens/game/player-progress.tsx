import type React from "react";
import type { Player } from "../../game/rules";
import { PLAYERS } from "../../game/config";
import { useI18n } from "../../i18n";

export type PlayerRole = "player" | "ai" | "first" | "second";

export function PlayerProgress({
  player,
  role,
  finished,
  active,
}: {
  player: Player;
  role: PlayerRole;
  finished: number;
  active: boolean;
}) {
  const { t } = useI18n();
  const config = PLAYERS[player];

  return (
    <div
      className={`relative flex items-center gap-3 transition-opacity duration-300 max-[760px]:gap-2 ${active ? "opacity-100" : "opacity-55"}`}
      style={{ "--player-color": config.color } as React.CSSProperties}
    >
      <span className="size-6 shrink-0 rounded-full border border-[rgba(245,222,168,.62)] bg-[var(--player-color)] shadow-[0_5px_14px_rgba(0,0,0,.28)] max-[760px]:size-4" aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5 whitespace-nowrap max-[760px]:gap-1.5">
          <strong className="text-base leading-none font-extrabold text-[#f0dfbb] max-[760px]:text-[13px]">{t.team(player)}{role === "ai" ? " AI" : ""}</strong>
          <span className="text-[11px] font-semibold text-[#a69a80] max-[760px]:text-[9px]">{t.game.finishedCount(finished)}</span>
          <small className="text-[9px] font-medium tracking-[.08em] text-[#736c5e] max-[960px]:hidden">{t.game.roles[role]}</small>
        </div>
        <div className="mt-2 flex items-center gap-3 max-[760px]:hidden" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className={`size-[7px] rounded-full border ${index < finished ? "border-[#d9ba70] bg-[#d9ba70]" : "border-[rgba(217,186,112,.48)] bg-transparent"}`} />
          ))}
        </div>
      </div>
      {active && <span className="absolute -bottom-3 left-0 h-px w-full bg-[linear-gradient(90deg,#d9ba70,transparent)] max-[760px]:-bottom-2" aria-hidden="true" />}
    </div>
  );
}
