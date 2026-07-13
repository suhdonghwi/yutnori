import {
  ArrowRight,
  BookOpen,
  GlobeHemisphereWest,
  Robot,
  UsersThree,
} from "@phosphor-icons/react";
import { useState } from "react";
import { LobbyScene, type LobbyPreviewMode } from "../scene/lobby-scene";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../i18n/language-switcher";

type LobbyProps = {
  onStartLocal: () => void;
  onStartAi: () => void;
  onOpenTutorial: () => void;
};

const PLAY_MODES = [
  { id: "local", icon: UsersThree, available: true },
  { id: "online", icon: GlobeHemisphereWest, available: false },
  { id: "ai", icon: Robot, available: true },
] as const;

export function Lobby({ onStartLocal, onStartAi, onOpenTutorial }: LobbyProps) {
  const { t } = useI18n();
  const [previewMode, setPreviewMode] = useState<LobbyPreviewMode | null>(null);

  return (
    <main className="lobby-shell relative min-h-svh overflow-hidden text-[#f3e6c8] max-[820px]:overflow-auto">
      <div className="absolute top-6 right-8 z-[3] max-[820px]:top-4 max-[820px]:right-4">
        <LanguageSwitcher />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[64vw] [mask-image:linear-gradient(90deg,transparent_0%,#000_18%,#000_100%)] max-[820px]:top-[76px] max-[820px]:h-[330px] max-[820px]:w-full max-[820px]:[mask-image:linear-gradient(180deg,#000_0%,#000_72%,transparent_100%)] max-[820px]:opacity-80 max-[560px]:h-[285px]"
        aria-hidden="true"
      >
        <div className="pointer-events-auto size-full max-[820px]:pointer-events-none">
          <LobbyScene previewMode={previewMode} />
        </div>
      </div>

      <section className="relative z-[2] mx-auto flex min-h-svh w-[min(1240px,calc(100%-64px))] items-center py-12 max-[820px]:w-[min(620px,calc(100%-36px))] max-[820px]:items-start max-[820px]:pt-10 max-[820px]:pb-16 max-[560px]:w-[calc(100%-28px)]">
        <div className="w-[min(520px,43vw)] max-[820px]:w-full">
          <h1 className="m-0 text-[clamp(54px,5.5vw,78px)] leading-[1.04] font-extrabold tracking-[.025em] text-balance text-[#fff0cf] max-[820px]:text-[clamp(42px,11vw,60px)]">
            {t.lobby.title}
          </h1>

          <div
            className="mt-10 border-y border-[rgba(224,199,148,.18)] max-[820px]:mt-[305px] max-[560px]:mt-[260px]"
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
                  className={`group relative grid min-h-[86px] w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-[rgba(224,199,148,.12)] bg-transparent px-2 text-left transition-[background-color,border-color] duration-200 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#d6b667] max-[560px]:min-h-[78px] max-[560px]:grid-cols-[42px_minmax(0,1fr)_auto] max-[560px]:gap-3 ${mode.available ? "cursor-pointer" : "cursor-not-allowed opacity-[.42]"} ${active && mode.available ? "border-b-[rgba(224,199,148,.28)] bg-[linear-gradient(90deg,rgba(205,166,86,.12),transparent_76%)]" : ""}`}
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
                      className={`grid size-11 place-items-center rounded-full border transition-[color,border-color,background-color,box-shadow] duration-200 max-[560px]:size-10 ${active && mode.available ? "border-[#d9b96f] bg-[rgba(215,185,111,.12)] text-[#f3dcaa] shadow-[0_0_24px_rgba(215,185,111,.12)]" : "border-[rgba(224,199,148,.2)] text-[#8d8473]"}`}
                    >
                      <Icon size={21} weight="regular" />
                    </span>
                  </span>
                  <span
                    className={`min-w-0 transition-transform duration-200 ${mode.available ? "group-hover:translate-x-1" : ""}`}
                  >
                    <strong
                      className={`mb-1.5 block text-[19px] leading-none font-extrabold tracking-[-.025em] transition-colors max-[560px]:text-[17px] ${active && mode.available ? "text-[#f5e3bd]" : "text-[#c7baa0]"}`}
                    >
                      {copy.title}
                    </strong>
                    <small className="block overflow-hidden text-xs leading-[1.35] font-medium text-ellipsis whitespace-nowrap text-[#827a6b] max-[560px]:max-w-[210px] max-[560px]:text-[10px]">
                      {copy.description}
                    </small>
                  </span>
                  {mode.available ? (
                    <span
                      className={`flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 max-[560px]:text-[0px] ${active ? "text-[#d9bd7c]" : "text-[#716b5f]"}`}
                      aria-hidden="true"
                    >
                      {t.lobby.start}{" "}
                      <ArrowRight
                        className="max-[560px]:size-[18px]"
                        size={20}
                        weight="bold"
                      />
                    </span>
                  ) : (
                    <span className="rounded-full border border-[rgba(210,193,158,.2)] px-[9px] py-1.5 text-[10px] leading-none font-bold whitespace-nowrap text-[#a59a83]">
                      {t.lobby.comingSoon}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="mt-5 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-bold text-[#aaa087] transition-colors hover:text-[#ead7ad]"
            type="button"
            onClick={onOpenTutorial}
          >
            <BookOpen size={20} weight="regular" aria-hidden="true" />
            <span className="border-b border-[rgba(224,199,148,.32)] pb-0.5">
              {t.lobby.howToPlay}
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
