import type React from "react";
import type { Player } from "../game/rules";
import { PLAYERS } from "../game/config";
import type { ThrowResultEffectState } from "../game/types";
import { useI18n } from "../i18n";

export function VictoryEffect({ winner }: { winner: Player }) {
  const { t } = useI18n();
  const player = PLAYERS[winner];
  const confetti = Array.from({ length: 18 }, (_, index) => ({
    angle: index * 20,
    delay: (index % 6) * 0.06,
    color:
      index % 3 === 0 ? "#f4d283" : index % 2 === 0 ? player.glow : "#fff1c9",
  }));

  return (
    <div
      className="victory-effect pointer-events-none fixed inset-0 z-[38] grid place-items-center overflow-hidden"
      style={
        {
          "--victory-color": player.color,
          "--victory-glow": player.glow,
        } as React.CSSProperties
      }
      role="status"
      aria-live="assertive"
    >
      <div
        className="victory-confetti absolute top-1/2 left-1/2 z-[2] size-px"
        aria-hidden="true"
      >
        {confetti.map((piece, index) => (
          <i
            key={index}
            style={
              {
                "--confetti-angle": `${piece.angle}deg`,
                "--confetti-delay": `${piece.delay}s`,
                "--confetti-color": piece.color,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="victory-card relative isolate z-[3] w-[min(680px,calc(100vw-40px))] px-7 py-11 text-center text-[#fff3d4] max-[560px]:py-8">
        <span
          className="victory-team-dot mx-auto mb-5 block size-5 rounded-full border border-[rgba(255,239,196,.72)] bg-[var(--victory-color)] shadow-[0_0_24px_var(--victory-color)]"
          aria-hidden="true"
        />
        <span className="mb-4 block text-[11px] leading-none font-bold tracking-[.24em] text-[color-mix(in_srgb,var(--victory-glow)_62%,#d9c89f)]">
          {t.victory.tag}
        </span>
        <strong className="block text-[clamp(52px,7.5vw,88px)] leading-none font-black tracking-[-.045em] text-[#fff0cf] [text-shadow:0_0_30px_color-mix(in_srgb,var(--victory-color)_65%,transparent)]">
          {t.victory.winner(t.team(winner))}
        </strong>
        <p className="mt-5 mb-0 text-[clamp(14px,1.3vw,18px)] leading-[1.4] font-semibold text-[#bbae91]">
          {t.victory.subtitle}
        </p>
      </div>
    </div>
  );
}

export function ThrowResultEffect({
  effect,
}: {
  effect: NonNullable<ThrowResultEffectState>;
}) {
  const { t } = useI18n();
  const accent =
    effect.result.steps < 0
      ? "#dc5543"
      : effect.result.extraThrow
        ? "#e1b44d"
        : "#8ebfd0";
  const detail =
    effect.result.steps < 0
      ? t.throwEffect.backdo
      : effect.result.extraThrow
        ? t.throwEffect.stepsExtra(effect.result.steps)
        : t.throwEffect.steps(effect.result.steps);

  return (
    <div
      key={effect.id}
      className="throw-result-effect pointer-events-none fixed inset-0 z-40 grid place-items-center"
      style={{ "--result-accent": accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="throw-result-lockup relative isolate z-[2] w-[min(700px,calc(100vw-24px))] px-8 py-9 text-center max-[560px]:px-4 max-[560px]:py-7">
        <span className="mb-5 block text-[10px] leading-none font-bold tracking-[.25em] text-[color-mix(in_srgb,var(--result-accent)_44%,#bbae91)]">
          {t.throwEffect.tag}
        </span>
        <div className="flex items-center justify-center gap-6 max-[560px]:gap-3">
          <i
            className="h-px min-w-8 flex-1 bg-[linear-gradient(90deg,transparent,var(--result-accent))] opacity-70"
            aria-hidden="true"
          />
          <strong
            className={`block text-[clamp(64px,9vw,112px)] leading-[.9] font-black whitespace-nowrap text-[#fff0cf] [text-shadow:0_0_30px_color-mix(in_srgb,var(--result-accent)_58%,transparent)] ${effect.result.id === "backdo" ? "tracking-[.04em]" : "tracking-[-.055em]"}`}
          >
            {t.yut[effect.result.id]}
          </strong>
          <i
            className="h-px min-w-8 flex-1 bg-[linear-gradient(90deg,var(--result-accent),transparent)] opacity-70"
            aria-hidden="true"
          />
        </div>
        <small className="mt-6 block text-[13px] leading-none font-bold tracking-[.08em] text-[color-mix(in_srgb,var(--result-accent)_48%,#e8d9b8)]">
          {detail}
        </small>
      </div>
    </div>
  );
}
