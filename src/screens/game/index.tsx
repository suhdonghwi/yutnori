import { Canvas } from "@react-three/fiber";
import {
  DoorOpen,
  Plus,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { Suspense, useState } from "react";
import type { GameMode } from "../../game/types";
import { Scene } from "../../scene/game-scene";
import { gameSfx } from "../../audio/game-sfx";
import { ThrowResultEffect, VictoryEffect } from "../result-effects";
import { Lobby } from "../lobby";
import { useGameSession } from "./use-game-session";
import { PlayerProgress } from "./player-progress";
import { ControlDock } from "./control-dock";
import { useI18n } from "../../i18n";

function GameSession({ mode, onExit }: { mode: GameMode; onExit: () => void }) {
  const { t } = useI18n();
  const session = useGameSession(mode);
  const {
    current,
    phase,
    pieces,
    throwResultEffect,
    visibleWinner,
    sfxEnabled,
    toggleSfx,
    reset,
  } = session;

  return (
    <main className="game-shell fixed inset-0 isolate block h-svh min-h-0 w-full overflow-hidden">
      {throwResultEffect && <ThrowResultEffect effect={throwResultEffect} />}
      {visibleWinner !== null && <VictoryEffect winner={visibleWinner} />}

      <section
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-label={t.game.canvasLabel}
      >
        <div className="pointer-events-auto absolute top-7 left-8 z-20 max-[760px]:top-4 max-[760px]:left-3">
          <PlayerProgress
            player={0}
            finished={
              pieces[0].filter((piece) => piece.status === "finished").length
            }
            active={current === 0 && phase !== "gameover"}
          />
        </div>

        <div className="pointer-events-auto absolute top-7 right-8 z-20 flex items-start gap-7 max-[760px]:top-4 max-[760px]:right-3 max-[760px]:gap-3">
          <PlayerProgress
            player={1}
            ai={mode === "ai"}
            finished={
              pieces[1].filter((piece) => piece.status === "finished").length
            }
            active={current === 1 && phase !== "gameover"}
          />
          <div className="flex items-start gap-4 border-l border-gold/35 pl-5 max-[760px]:gap-2 max-[760px]:pl-3">
            <button
              className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-parchment-dim transition-colors hover:text-parchment"
              type="button"
              onClick={toggleSfx}
              aria-label={sfxEnabled ? t.game.sfxOff : t.game.sfxOn}
              aria-pressed={sfxEnabled}
            >
              {sfxEnabled ? (
                <SpeakerHigh size={21} weight="regular" aria-hidden="true" />
              ) : (
                <SpeakerSlash size={21} weight="regular" aria-hidden="true" />
              )}
              <span className="max-[760px]:hidden">{t.game.sfx}</span>
            </button>
            <button
              className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-parchment-dim transition-colors hover:text-parchment"
              type="button"
              onClick={onExit}
              aria-label={t.game.toLobbyLabel}
            >
              <DoorOpen size={21} weight="regular" aria-hidden="true" />
              <span className="max-[760px]:hidden">{t.game.toLobby}</span>
            </button>
            <button
              className="group flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-parchment-dim transition-colors hover:text-parchment"
              type="button"
              onClick={reset}
              aria-label={t.game.newGameLabel}
            >
              <Plus size={21} weight="regular" aria-hidden="true" />
              <span className="max-[760px]:hidden">{t.game.newGame}</span>
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1] block min-w-0">
          <div className="pointer-events-auto absolute inset-0 h-full min-h-0 w-full [&_canvas]:touch-none">
            <Canvas
              shadows
              dpr={[1, 1.6]}
              camera={{ position: [0, 10.8, 11.8], fov: 44 }}
            >
              <Suspense fallback={null}>
                <Scene
                  pieces={pieces}
                  rolling={phase === "rolling"}
                  nonce={session.nonce}
                  onSettled={session.settleThrow}
                  hoveredToken={session.hoveredToken}
                  movePreviews={session.movePreviews}
                  activeMove={session.activeMove}
                  onMoveComplete={session.handleMoveComplete}
                />
              </Suspense>
            </Canvas>
          </div>

          <ControlDock
            statusText={session.statusText}
            current={current}
            phase={phase}
            isAiTurn={session.isAiTurn}
            aiDecision={session.aiDecision}
            pieces={pieces}
            result={session.result}
            routeChoiceFromCenter={session.routeChoiceFromCenter}
            onHoverToken={session.setHoveredToken}
            onMovePiece={session.movePiece}
            onHoverRoute={session.setHoveredRouteChoice}
            onChooseRoute={session.chooseRoute}
            onThrow={session.throwYut}
            onReset={reset}
          />
        </div>
      </section>

      <footer className="hidden">
        <p>{t.game.footerHintRules}</p>
        <span>{t.game.footerHintExtraThrow}</span>
      </footer>
    </main>
  );
}

export default function YutnoriGame() {
  const [screen, setScreen] = useState<"lobby" | GameMode>("lobby");

  const startGame = (mode: GameMode) => {
    gameSfx.unlock();
    setScreen(mode);
  };

  return screen === "lobby" ? (
    <Lobby
      onStartLocal={() => startGame("local")}
      onStartAi={() => startGame("ai")}
    />
  ) : (
    <GameSession mode={screen} onExit={() => setScreen("lobby")} />
  );
}
