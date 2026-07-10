import type React from "react";
import type { Player } from "./rules";
import { PLAYERS } from "./game-config";
import type { ThrowResultEffectState } from "./game-types";

export function VictoryEffect({ winner }: { winner: Player }) {
  const player = PLAYERS[winner];
  const confetti = Array.from({ length: 18 }, (_, index) => ({
    angle: index * 20,
    delay: (index % 6) * 0.06,
    color: index % 3 === 0 ? "#f4d283" : index % 2 === 0 ? player.glow : "#fff1c9",
  }));

  return (
    <div
      className="victory-effect pointer-events-none fixed inset-0 z-[38] grid place-items-center overflow-hidden"
      style={{ "--victory-color": player.color, "--victory-glow": player.glow } as React.CSSProperties}
      role="status"
      aria-live="assertive"
    >
      <div className="victory-rays absolute z-[1] aspect-square w-[min(820px,90vw)] rounded-full opacity-[.38]" aria-hidden="true" />
      <div className="victory-confetti absolute top-1/2 left-1/2 z-[2] size-px" aria-hidden="true">
        {confetti.map((piece, index) => (
          <i
            key={index}
            style={{
              "--confetti-angle": `${piece.angle}deg`,
              "--confetti-delay": `${piece.delay}s`,
              "--confetti-color": piece.color,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="victory-card relative z-[3] w-[min(520px,calc(100vw-42px))] rounded-[32px] border-2 px-7 pt-[42px] pb-[38px] text-center text-[#fff3d4]">
        <span className="mb-[13px] block text-[13px] leading-none font-extrabold tracking-[.16em] text-[color-mix(in_srgb,var(--victory-glow)_68%,#fff2c6)]">한판 승부의 주인공</span>
        <strong className="block text-[clamp(48px,7vw,82px)] leading-none font-black tracking-[-.06em] [text-shadow:0_5px_0_rgba(0,0,0,.28),0_0_32px_var(--victory-color)]">{player.name} 승리!</strong>
        <p className="mt-[17px] mb-0 text-[clamp(15px,1.5vw,19px)] leading-[1.4] font-bold text-[#d9caa9]">네 말을 모두 먼저 냈습니다</p>
      </div>
    </div>
  );
}

export function ThrowResultEffect({ effect }: { effect: NonNullable<ThrowResultEffectState> }) {
  const accent = effect.result.steps < 0
    ? "#dc5543"
    : effect.result.extraThrow
      ? "#e1b44d"
      : "#8ebfd0";
  const detail = effect.result.steps < 0
    ? "한 칸 뒤로"
    : effect.result.extraThrow
      ? `${effect.result.steps}칸 · 한 번 더!`
      : `${effect.result.steps}칸 전진`;

  return (
    <div
      key={effect.id}
      className="throw-result-effect pointer-events-none fixed inset-0 z-40 grid place-items-center"
      style={{ "--result-accent": accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="throw-result-rays absolute top-1/2 left-1/2 z-[1] size-px">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ "--ray-index": index } as React.CSSProperties} />
        ))}
      </div>
      <div className="throw-result-seal relative z-[2] grid aspect-square w-[clamp(180px,20vw,250px)] place-content-center gap-[7px] rounded-full border-2 text-center">
        <strong className="text-[clamp(66px,8vw,108px)] leading-[.85] font-black tracking-[-.12em] text-[#fff0c8] indent-[-.12em] [text-shadow:0_4px_0_rgba(0,0,0,.35),0_0_28px_var(--result-accent)]">{effect.result.name}</strong>
        <small className="text-xs leading-none font-extrabold tracking-[.08em] text-[color-mix(in_srgb,var(--result-accent)_54%,#fff4d7)]">{detail}</small>
      </div>
    </div>
  );
}
