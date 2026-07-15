import type React from "react";
import type { Player } from "../../game/rules";
import { PLAYERS } from "../../game/config";
import { useI18n } from "../../i18n";

// 구조 분해 기본값(= false)은 React Compiler v1이 아직 컴파일하지 못해 생략합니다.
export function PlayerProgress({
  player,
  ai,
  finished,
  active,
}: {
  player: Player;
  ai?: boolean;
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
      <span
        className="size-6 shrink-0 rounded-full border border-gold-soft/60 bg-[var(--player-color)] shadow-[0_5px_14px] shadow-black/30 max-[760px]:size-4"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5 whitespace-nowrap max-[760px]:gap-1.5">
          <strong className="text-base leading-none font-extrabold text-parchment-bright max-[760px]:text-body">
            {t.team(player)}
            {ai ? " AI" : ""}
          </strong>
          <span className="text-label font-semibold text-parchment-dim max-[760px]:text-micro">
            {t.game.finishedCount(finished)}
          </span>
        </div>
        <div
          className="mt-2 flex items-center gap-3 max-[760px]:hidden"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={`size-[7px] rounded-full border ${index < finished ? "border-gold bg-gold" : "border-gold/50 bg-transparent"}`}
            />
          ))}
        </div>
      </div>
      {active && (
        <span
          className="absolute -bottom-3 left-0 h-px w-full bg-[linear-gradient(90deg,var(--color-gold),transparent)] max-[760px]:-bottom-2"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
