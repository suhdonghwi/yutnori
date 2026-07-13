import { Canvas } from "@react-three/fiber";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "../../i18n";
import { TUTORIAL_STEPS } from "../../game/tutorial-script";
import { TutorialScene } from "../../scene/tutorial-scene";
import { useTutorialPlayer } from "./use-tutorial-player";

function TutorialCelebration({ label }: { label: string }) {
  const confetti = Array.from({ length: 14 }, (_, index) => ({
    angle: index * (360 / 14),
    delay: (index % 5) * 0.055,
    color:
      index % 3 === 0 ? "#f4d283" : index % 2 === 0 ? "#8bc0d4" : "#fff1c9",
  }));

  return (
    <div
      className="tutorial-celebration pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden"
      role="status"
    >
      <div
        className="victory-confetti absolute top-1/2 left-1/2 size-px"
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
              } as CSSProperties
            }
          />
        ))}
      </div>
      <strong className="tutorial-finished-stamp rounded-full border border-[rgba(244,210,131,.7)] bg-[rgba(18,29,23,.92)] px-6 py-3 text-[clamp(18px,2.4vw,28px)] leading-none font-black tracking-[-.03em] text-[#fff0c8] shadow-[0_12px_45px_rgba(0,0,0,.55),0_0_30px_rgba(244,210,131,.18)] backdrop-blur-md">
        {label}
      </strong>
    </div>
  );
}

export function Tutorial({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const player = useTutorialPlayer(stepIndex);
  const copy = t.tutorial.steps[player.step.id];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStepIndex((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (stepIndex === TUTORIAL_STEPS.length - 1) onExit();
        else setStepIndex((index) => index + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit, stepIndex]);

  const goBack = () => setStepIndex((index) => Math.max(0, index - 1));
  const goNext = () => {
    if (isLastStep) onExit();
    else setStepIndex((index) => index + 1);
  };

  return (
    <main className="tutorial-shell fixed inset-0 isolate flex h-svh min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(102,75,44,.28),transparent_42%),linear-gradient(145deg,#13221b_0%,#09120e_54%,#111b17_100%)] text-[#eee0c2]">
      <header className="pointer-events-none absolute top-0 right-0 left-0 z-30 flex items-start justify-end px-7 pt-[max(22px,env(safe-area-inset-top))] max-[600px]:px-4 max-[600px]:pt-[max(14px,env(safe-area-inset-top))]">
        <button
          className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(226,196,132,.22)] bg-[rgba(12,21,17,.78)] px-4 py-2.5 text-[12px] font-bold text-[#d9c8a4] shadow-[0_8px_28px_rgba(0,0,0,.25)] backdrop-blur-md transition-colors hover:bg-[rgba(35,50,41,.92)] hover:text-[#fff0cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6b667]"
          type="button"
          onClick={onExit}
          aria-label={t.tutorial.skip}
        >
          <X size={17} weight="bold" aria-hidden="true" />
          <span>{t.tutorial.skip}</span>
        </button>
      </header>

      <section
        className="relative min-h-0 flex-1"
        aria-label={t.tutorial.canvasLabel}
      >
        <div className="pointer-events-none absolute inset-0 [&_canvas]:touch-none">
          <Canvas
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [0, 12.5, 8.5], fov: 42 }}
            onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
          >
            <Suspense fallback={null}>
              <TutorialScene
                pieces={player.pieces}
                rolling={player.rolling}
                nonce={player.nonce}
                onSettled={player.handleSettled}
                showSticks={player.step.showSticks}
                movePreviews={player.movePreviews}
                activeMove={player.activeMove}
                onMoveComplete={player.handleMoveComplete}
                runId={player.runId}
              />
            </Suspense>
          </Canvas>
        </div>

        {player.badge === "extraThrow" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center"
            role="status"
          >
            <strong className="tutorial-extra-badge rounded-full border border-[rgba(244,210,131,.66)] bg-[rgba(132,90,25,.93)] px-5 py-2.5 text-[15px] leading-none font-black text-[#fff0bd] shadow-[0_10px_34px_rgba(0,0,0,.5),0_0_25px_rgba(226,180,70,.18)]">
              {t.tutorial.throwAgainBadge}
            </strong>
          </div>
        )}
        {player.badge === "finished" && (
          <TutorialCelebration label={t.tutorial.finishedBadge} />
        )}
      </section>

      <section className="relative z-30 shrink-0 border-t border-[rgba(226,196,132,.22)] bg-[linear-gradient(145deg,rgba(23,33,27,.98),rgba(13,21,17,.99))] px-6 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-22px_70px_rgba(0,0,0,.36)] max-[600px]:px-4 max-[600px]:pt-4">
        <div className="mx-auto grid w-[min(1040px,100%)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-10 gap-y-4 max-[760px]:grid-cols-1 max-[760px]:gap-y-3">
          <div>
            <div
              className="mb-3 flex items-center gap-3"
              aria-label={t.tutorial.navigationLabel}
            >
              <span className="text-[9px] leading-none font-bold tracking-[.16em] text-[#a98f58]">
                {t.tutorial.title}
              </span>
              <div className="flex items-center gap-2">
                {TUTORIAL_STEPS.map((tutorialStep, index) => (
                  <button
                    key={tutorialStep.id}
                    className={`cursor-pointer rounded-full border-0 p-0 transition-[width,background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6b667] ${index === stepIndex ? "h-2.5 w-7 bg-[#d6b667] shadow-[0_0_14px_rgba(214,182,103,.38)]" : "size-2.5 bg-[rgba(226,196,132,.24)] hover:bg-[rgba(226,196,132,.5)]"}`}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    aria-label={t.tutorial.stepLabel(
                      index + 1,
                      TUTORIAL_STEPS.length,
                    )}
                    aria-current={index === stepIndex ? "step" : undefined}
                  />
                ))}
              </div>
            </div>

            <div aria-live="polite" aria-atomic="true">
              <h1 className="m-0 text-[clamp(22px,2.7vw,34px)] leading-[1.1] font-bold tracking-[-.035em] text-[#f3e2bd]">
                {copy.title}
              </h1>
              <p className="mt-2 mb-0 max-w-[720px] text-[13px] leading-[1.55] font-medium text-[#aaa08b] max-[600px]:text-[12px]">
                {copy.body}
              </p>

              {player.step.id === "throw" && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <strong className="rounded-lg border border-[rgba(139,192,212,.28)] bg-[rgba(23,76,107,.24)] px-3 py-2 text-[13px] leading-none font-extrabold text-[#d8edf3]">
                    {player.rolling
                      ? t.tutorial.throwWaiting
                      : player.settledResult
                        ? t.tutorial.throwReading(
                            player.settledResult.flats,
                            t.yut[player.settledResult.id],
                            player.settledResult.steps,
                          )
                        : t.tutorial.throwWaiting}
                  </strong>
                  <small className="text-[10px] leading-[1.45] font-semibold text-[#8f8572]">
                    {t.tutorial.extraThrowFootnote} ·{" "}
                    {t.tutorial.backdoFootnote}
                  </small>
                </div>
              )}
            </div>
          </div>

          <nav
            className="flex min-w-[300px] items-center justify-end gap-2.5 max-[760px]:min-w-0 max-[760px]:justify-between"
            aria-label={t.tutorial.navigationLabel}
          >
            <button
              className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(226,196,132,.2)] bg-white/[.035] px-4 text-[12px] font-bold text-[#c4b594] transition-colors hover:bg-white/[.08] hover:text-[#f3e2bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6b667] disabled:cursor-not-allowed disabled:opacity-30"
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              {t.tutorial.back}
            </button>
            <button
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[rgba(226,196,132,.42)] bg-[rgba(180,135,48,.2)] px-5 text-[12px] font-extrabold text-[#f5dfad] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-colors hover:bg-[rgba(180,135,48,.3)] hover:text-[#fff0cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6b667]"
              type="button"
              onClick={goNext}
            >
              {isLastStep ? t.tutorial.done : t.tutorial.next}
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </section>
    </main>
  );
}
