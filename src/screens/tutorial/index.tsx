import { Canvas } from "@react-three/fiber";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { Suspense, useEffect, useState } from "react";
import { TUTORIAL_STEPS } from "../../game/tutorial-script";
import { useI18n } from "../../i18n";
import { TutorialScene } from "../../scene/tutorial-scene";
import { useTutorialPlayer } from "./use-tutorial-player";

export function TutorialScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const player = useTutorialPlayer(step);
  const last = stepIndex === TUTORIAL_STEPS.length - 1;
  const goBack = () => setStepIndex((value) => Math.max(0, value - 1));
  const goNext = () => {
    if (last) onClose();
    else setStepIndex((value) => value + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [last, onClose]);

  const copy = t.tutorial.steps[step.id];
  return (
    <main className="relative grid h-svh min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[#0d1713] text-[#eee0c2]">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(18px,env(safe-area-inset-top))] right-5 z-20 flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-[#111b16]/85 px-4 py-2.5 text-xs font-bold text-[#d8c9aa] backdrop-blur"
        aria-label={t.tutorial.skip}
      >
        <X size={17} aria-hidden="true" />
        {t.tutorial.skip}
      </button>
      <section
        className="pointer-events-none relative min-h-0"
        aria-label={t.tutorial.canvasLabel}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 12.5, 8.5], fov: 42 }}
        >
          <Suspense fallback={null}>
            <TutorialScene
              pieces={player.pieces}
              movePreviews={player.movePreviews}
              activeMove={player.activeMove}
              rolling={player.rolling}
              nonce={player.nonce}
              showSticks={step.showSticks}
              runId={player.runId}
              onMoveComplete={player.handleMoveComplete}
              onSettled={player.handleSettled}
            />
          </Suspense>
        </Canvas>
        {player.badge && (
          <div className="result-stamp absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-[#e5c576] bg-[#18231c]/95 px-7 py-4 text-2xl font-black text-[#ffe4a2] shadow-2xl">
            {player.badge === "extraThrow"
              ? t.tutorial.throwAgainBadge
              : t.tutorial.finishedBadge}
          </div>
        )}
      </section>

      <section
        className="relative z-10 border-t border-[rgba(226,196,132,.2)] bg-[linear-gradient(145deg,#17211b,#0d1511)] px-[max(24px,env(safe-area-inset-left))] pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(0,0,0,.3)]"
        aria-live="polite"
      >
        <div className="mx-auto w-[min(820px,100%)]">
          <h1 className="mb-2 text-[clamp(22px,4vw,31px)] leading-tight font-black tracking-[-.03em] text-[#f3e2bd]">
            {copy.title}
          </h1>
          <p className="m-0 min-h-[2.8em] text-[14px] leading-[1.55] font-medium text-[#aaa089]">
            {copy.body}
          </p>
          {step.id === "throw" && (
            <div className="mt-2 text-sm text-[#e4c77f]">
              {player.settledResult
                ? t.tutorial.throwReading(
                    player.settledResult.flats,
                    t.yut[player.settledResult.id],
                    player.settledResult.steps,
                  )
                : t.tutorial.throwWaiting}
              <span className="ml-2 text-xs text-[#887f6d]">
                {t.tutorial.throwFootnote}
              </span>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-4">
            <div
              className="flex gap-2"
              aria-label={t.tutorial.stepLabel(
                stepIndex + 1,
                TUTORIAL_STEPS.length,
              )}
            >
              {TUTORIAL_STEPS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  aria-label={t.tutorial.stepLabel(
                    index + 1,
                    TUTORIAL_STEPS.length,
                  )}
                  aria-current={index === stepIndex ? "step" : undefined}
                  className={`size-2.5 cursor-pointer rounded-full border-0 p-0 ${index === stepIndex ? "bg-[#e0bd6c]" : "bg-[#586057]"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="flex cursor-pointer items-center gap-1 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-bold text-[#c8bda5] disabled:cursor-default disabled:opacity-30"
              >
                <ArrowLeft size={16} />
                {t.tutorial.back}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex cursor-pointer items-center gap-1 rounded-xl border border-[#d7b662]/45 bg-[#b48b37]/20 px-5 py-3 text-sm font-black text-[#f5d993]"
              >
                {last ? t.tutorial.done : t.tutorial.next}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
