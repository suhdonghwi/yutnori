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
      className="victory-effect"
      style={{ "--victory-color": player.color, "--victory-glow": player.glow } as React.CSSProperties}
      role="status"
      aria-live="assertive"
    >
      <div className="victory-rays" aria-hidden="true" />
      <div className="victory-confetti" aria-hidden="true">
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
      <div className="victory-card">
        <span className="victory-kicker">한판 승부의 주인공</span>
        <strong>{player.name} 승리!</strong>
        <p>네 말을 모두 먼저 냈습니다</p>
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
      className="throw-result-effect"
      style={{ "--result-accent": accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="throw-result-rays">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ "--ray-index": index } as React.CSSProperties} />
        ))}
      </div>
      <div className="throw-result-seal">
        <strong>{effect.result.name}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
