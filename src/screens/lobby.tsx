import {
  ArrowRight,
  BookOpen,
  GlobeHemisphereWest,
  Robot,
  UsersThree,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { LobbyScene, type LobbyPreviewMode } from "../scene/lobby-scene";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../i18n/language-switcher";

type LobbyProps = {
  onStartLocal: () => void;
  onStartAi: () => void;
};

const PLAY_MODES = [
  { id: "local", icon: UsersThree, available: true },
  { id: "online", icon: GlobeHemisphereWest, available: false },
  { id: "ai", icon: Robot, available: true },
] as const;

function RuleCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-md border border-gold-soft/10 bg-white/[.025] p-4.5 max-xs:grid-cols-[30px_minmax(0,1fr)] max-xs:gap-2 max-xs:px-3.25 max-xs:py-3.75">
      <span className="text-xs leading-none font-black tracking-label text-gold-deep">
        {icon}
      </span>
      <div>
        <h3 className="mt-[-2px] mb-1.75 text-base leading-[1.2] font-extrabold text-parchment">
          {title}
        </h3>
        {children}
      </div>
    </article>
  );
}

function StatBox({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm bg-white/4 px-2.5 py-2.25">
      <dt className="text-sm font-extrabold text-parchment">{label}</dt>
      <dd className="m-0 text-xs font-semibold text-parchment-faint">
        {value}
      </dd>
    </div>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="rules-backdrop fixed inset-0 z-80 grid place-items-center bg-night/80 p-6 max-xs:p-2.5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="max-h-[min(820px,calc(100svh-48px))] w-[min(760px,100%)] overflow-auto rounded-lg border border-gold-soft/30 bg-[linear-gradient(145deg,var(--color-panel),var(--color-panel-deep))] text-parchment shadow-[0_35px_110px] shadow-black/70 max-xs:max-h-[calc(100svh-20px)] max-xs:rounded-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
      >
        <div className="sticky top-0 z-2 flex items-center justify-between gap-5 border-b border-gold-soft/15 bg-panel px-6.5 pt-6 pb-5 max-xs:p-4.5">
          <div>
            <span className="mb-1.5 block text-xs font-bold tracking-eyebrow text-gold-deep">
              {t.rules.tag}
            </span>
            <h2
              className="m-0 text-2xl font-black tracking-display text-parchment-bright max-xs:text-lg"
              id="rules-title"
            >
              {t.rules.title}
            </h2>
          </div>
          <button
            className="grid size-[38px] cursor-pointer place-items-center rounded-full border border-gold-soft/20 bg-white/4 text-2xl font-light text-parchment hover:bg-white/9"
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={t.rules.close}
          >
            ×
          </button>
        </div>

        <div className="grid gap-2.5 px-6.5 pt-5 pb-6.75 max-xs:p-3.5">
          <RuleCard icon="01" title={t.rules.goal.title}>
            <p className="m-0 text-sm leading-[1.65] font-medium text-parchment-dim">
              {t.rules.goal.body}
            </p>
          </RuleCard>

          <RuleCard icon="02" title={t.rules.throws.title}>
            <dl className="mt-2.75 grid grid-cols-3 gap-1.75 max-xs:grid-cols-2">
              <StatBox label={t.yut.do} value={t.rules.throws.steps(1)} />
              <StatBox label={t.yut.gae} value={t.rules.throws.steps(2)} />
              <StatBox label={t.yut.geol} value={t.rules.throws.steps(3)} />
              <StatBox label={t.yut.yut} value={t.rules.throws.stepsExtra(4)} />
              <StatBox label={t.yut.mo} value={t.rules.throws.stepsExtra(5)} />
              <StatBox label={t.yut.backdo} value={t.rules.throws.backdo} />
            </dl>
          </RuleCard>

          <RuleCard icon="03" title={t.rules.carryCapture.title}>
            <p className="m-0 text-sm leading-[1.65] font-medium text-parchment-dim">
              {t.rules.carryCapture.body}
            </p>
          </RuleCard>

          <RuleCard icon="04" title={t.rules.shortcut.title}>
            <p className="m-0 text-sm leading-[1.65] font-medium text-parchment-dim">
              {t.rules.shortcut.body}
            </p>
          </RuleCard>
        </div>
      </section>
    </div>
  );
}

export function Lobby({ onStartLocal, onStartAi }: LobbyProps) {
  const { t } = useI18n();
  const [showRules, setShowRules] = useState(false);
  const [previewMode, setPreviewMode] = useState<LobbyPreviewMode | null>(null);

  return (
    <main className="lobby-shell relative min-h-svh overflow-hidden text-parchment-bright max-md:overflow-auto">
      <div className="absolute top-6 right-8 z-[3] max-md:top-4 max-md:right-4">
        <LanguageSwitcher />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[64vw] [mask-image:linear-gradient(90deg,transparent_0%,black_18%,black_100%)] max-md:top-[76px] max-md:h-[330px] max-md:w-full max-md:[mask-image:linear-gradient(180deg,black_0%,black_72%,transparent_100%)] max-md:opacity-80 max-xs:h-[285px]"
        aria-hidden="true"
      >
        <div className="pointer-events-auto size-full max-md:pointer-events-none">
          <LobbyScene previewMode={previewMode} />
        </div>
      </div>

      <section className="relative z-[2] mx-auto flex min-h-svh w-[min(1240px,calc(100%-64px))] items-center py-12 max-md:w-[min(620px,calc(100%-36px))] max-md:items-start max-md:pt-10 max-md:pb-16 max-xs:w-[calc(100%-28px)]">
        <div className="w-[min(520px,43vw)] max-md:w-full">
          <h1 className="m-0 text-[clamp(54px,5.5vw,78px)] leading-[1.04] font-extrabold tracking-[.025em] text-balance text-parchment-bright max-md:text-[clamp(42px,11vw,60px)]">
            {t.lobby.title}
          </h1>

          <div
            className="mt-10 border-y border-gold-soft/20 max-md:mt-[305px] max-xs:mt-[260px]"
            aria-label={t.lobby.modeListLabel}
            onPointerLeave={() => setPreviewMode(null)}
          >
            {PLAY_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = previewMode === mode.id;
              const copy = t.lobby.modes[mode.id];
              return (
                <button
                  key={mode.id}
                  className={`group relative grid min-h-[86px] w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-gold-soft/10 bg-transparent px-2 text-left transition-[background-color,border-color] duration-200 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold max-xs:min-h-[78px] max-xs:grid-cols-[42px_minmax(0,1fr)_auto] max-xs:gap-3 ${mode.available ? "cursor-pointer" : "cursor-not-allowed opacity-[.42]"} ${active && mode.available ? "border-b-gold-soft/30 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-gold)_12%,transparent),transparent_76%)]" : ""}`}
                  type="button"
                  disabled={!mode.available}
                  onPointerEnter={() => setPreviewMode(mode.id)}
                  onFocus={() => setPreviewMode(mode.id)}
                  onClick={
                    mode.id === "local"
                      ? onStartLocal
                      : mode.id === "ai"
                        ? onStartAi
                        : undefined
                  }
                >
                  <span
                    className={`transition-transform duration-200 ease-out ${mode.available ? "group-hover:translate-x-1" : ""}`}
                    aria-hidden="true"
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-full border transition-[color,border-color,background-color,box-shadow] duration-200 max-xs:size-10 ${active && mode.available ? "border-gold bg-gold/10 text-parchment shadow-[0_0_24px] shadow-gold/10" : "border-gold-soft/20 text-parchment-faint"}`}
                    >
                      <Icon size={21} weight="regular" />
                    </span>
                  </span>
                  <span
                    className={`min-w-0 transition-transform duration-200 ${mode.available ? "group-hover:translate-x-1" : ""}`}
                  >
                    <strong
                      className={`mb-1.5 block text-lg font-extrabold tracking-snug transition-colors ${active && mode.available ? "text-parchment-bright" : "text-parchment-dim"}`}
                    >
                      {copy.title}
                    </strong>
                    <small className="block overflow-hidden text-xs leading-[1.35] font-medium text-ellipsis whitespace-nowrap text-parchment-faint max-xs:max-w-[210px]">
                      {copy.description}
                    </small>
                  </span>
                  {mode.available ? (
                    <span
                      className={`flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 max-xs:text-[0px] ${active ? "text-gold" : "text-parchment-faint"}`}
                      aria-hidden="true"
                    >
                      {t.lobby.start}{" "}
                      <ArrowRight
                        className="max-xs:size-[18px]"
                        size={20}
                        weight="bold"
                      />
                    </span>
                  ) : (
                    <span className="rounded-full border border-gold-soft/20 px-2.25 py-1.5 text-xs font-bold whitespace-nowrap text-parchment-dim">
                      {t.lobby.comingSoon}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="mt-5 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-bold text-parchment-dim transition-colors hover:text-parchment"
            type="button"
            onClick={() => setShowRules(true)}
          >
            <BookOpen size={20} weight="regular" aria-hidden="true" />
            <span className="border-b border-gold-soft/30 pb-0.5">
              {t.lobby.howToPlay}
            </span>
          </button>
        </div>
      </section>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}
