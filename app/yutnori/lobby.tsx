import { ArrowRight, BookOpen, GlobeHemisphereWest, Robot, UsersThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { LobbyScene, type LobbyPreviewMode } from "./lobby-scene";

type LobbyProps = {
  onStartLocal: () => void;
  onStartAi: () => void;
};

const PLAY_MODES = [
  {
    id: "local",
    icon: UsersThree,
    title: "로컬 대전",
    description: "한 기기에서 두 사람이 번갈아 플레이합니다.",
    available: true,
  },
  {
    id: "online",
    icon: GlobeHemisphereWest,
    title: "온라인 대전",
    description: "친구를 초대하거나 다른 플레이어와 대전합니다.",
    available: false,
  },
  {
    id: "ai",
    icon: Robot,
    title: "AI 대전",
    description: "컴퓨터 상대와 혼자서 대전합니다.",
    available: true,
  },
] as const;

function RulesDialog({ onClose }: { onClose: () => void }) {
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
    <div className="rules-backdrop fixed inset-0 z-80 grid place-items-center bg-[rgba(5,10,8,.82)] p-6 max-[560px]:p-2.5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="max-h-[min(820px,calc(100svh-48px))] w-[min(760px,100%)] overflow-auto rounded-[25px] border border-[rgba(226,196,132,.32)] bg-[linear-gradient(145deg,#17211b,#0d1511)] text-[#eee0c2] shadow-[0_35px_110px_rgba(0,0,0,.72)] max-[560px]:max-h-[calc(100svh-20px)] max-[560px]:rounded-[19px]" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div className="sticky top-0 z-2 flex items-center justify-between gap-5 border-b border-[rgba(226,196,132,.15)] bg-[#141e18] px-[26px] pt-6 pb-5 max-[560px]:p-[18px]">
          <div>
            <span className="mb-1.5 block text-[9px] leading-none font-bold tracking-[.18em] text-[#9e8c68]">HOW TO PLAY</span>
            <h2 className="m-0 text-[26px] leading-none font-black tracking-[-.04em] text-[#f3e2bd] max-[560px]:text-[22px]" id="rules-title">윷놀이 게임 방법</h2>
          </div>
          <button className="grid size-[38px] cursor-pointer place-items-center rounded-full border border-[rgba(226,196,132,.2)] bg-white/4 text-[27px] leading-none font-light text-[#d9c8a4] hover:bg-white/9" ref={closeButton} type="button" onClick={onClose} aria-label="게임 방법 닫기">×</button>
        </div>

        <div className="grid gap-2.5 px-[26px] pt-5 pb-[27px] max-[560px]:p-3.5">
          <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-[15px] border border-[rgba(214,177,94,.28)] bg-[rgba(173,126,47,.09)] p-[18px] max-[560px]:grid-cols-[30px_minmax(0,1fr)] max-[560px]:gap-2 max-[560px]:px-[13px] max-[560px]:py-[15px]">
            <span className="text-xs leading-none font-black tracking-[.08em] text-[#b89c5e]">01</span>
            <div>
              <h3 className="mt-[-2px] mb-[7px] text-base leading-[1.2] font-extrabold text-[#ebd8af]">네 말을 먼저 완주시키세요</h3>
              <p className="m-0 text-[13px] leading-[1.65] font-medium text-[#a69b84]">윷을 던져 나온 수만큼 말을 움직이고, 자기 팀의 네 말을 모두 도착시키면 승리합니다.</p>
            </div>
          </article>

          <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-[15px] border border-[rgba(226,196,132,.12)] bg-white/[.025] p-[18px] max-[560px]:grid-cols-[30px_minmax(0,1fr)] max-[560px]:gap-2 max-[560px]:px-[13px] max-[560px]:py-[15px]">
            <span className="text-xs leading-none font-black tracking-[.08em] text-[#b89c5e]">02</span>
            <div>
              <h3 className="mt-[-2px] mb-[7px] text-base leading-[1.2] font-extrabold text-[#ebd8af]">윷의 결과</h3>
              <dl className="mt-[11px] grid grid-cols-3 gap-[7px] max-[560px]:grid-cols-2">
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-white/4 px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">도</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#928873]">1칸</dd></div>
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-white/4 px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">개</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#928873]">2칸</dd></div>
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-white/4 px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">걸</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#928873]">3칸</dd></div>
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-[rgba(190,143,51,.13)] px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">윷</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#d6b66c]">4칸 · 한 번 더</dd></div>
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-[rgba(190,143,51,.13)] px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">모</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#d6b66c]">5칸 · 한 번 더</dd></div>
                <div className="flex items-center justify-between gap-2 rounded-[9px] bg-[rgba(164,61,47,.13)] px-2.5 py-[9px]"><dt className="text-[13px] leading-none font-extrabold text-[#ead8b2]">빽도</dt><dd className="m-0 text-[10px] leading-none font-semibold text-[#d98a7c]">뒤로 1칸</dd></div>
              </dl>
            </div>
          </article>

          <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-[15px] border border-[rgba(226,196,132,.12)] bg-white/[.025] p-[18px] max-[560px]:grid-cols-[30px_minmax(0,1fr)] max-[560px]:gap-2 max-[560px]:px-[13px] max-[560px]:py-[15px]">
            <span className="text-xs leading-none font-black tracking-[.08em] text-[#b89c5e]">03</span>
            <div>
              <h3 className="mt-[-2px] mb-[7px] text-base leading-[1.2] font-extrabold text-[#ebd8af]">업기와 잡기</h3>
              <p className="m-0 text-[13px] leading-[1.65] font-medium text-[#a69b84]">같은 편 말이 있는 칸에 도착하면 함께 업고 이동합니다. 상대 말을 잡으면 그 말을 대기석으로 보내고 한 번 더 던집니다.</p>
            </div>
          </article>

          <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-[15px] border border-[rgba(226,196,132,.12)] bg-white/[.025] p-[18px] max-[560px]:grid-cols-[30px_minmax(0,1fr)] max-[560px]:gap-2 max-[560px]:px-[13px] max-[560px]:py-[15px]">
            <span className="text-xs leading-none font-black tracking-[.08em] text-[#b89c5e]">04</span>
            <div>
              <h3 className="mt-[-2px] mb-[7px] text-base leading-[1.2] font-extrabold text-[#ebd8af]">지름길을 선택하세요</h3>
              <p className="m-0 text-[13px] leading-[1.65] font-medium text-[#a69b84]">갈림길과 중앙에 정확히 도착하면 다음 이동에서 지름길을 선택할 수 있습니다. 예상 경로를 확인하고 유리한 길을 고르세요.</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export function Lobby({ onStartLocal, onStartAi }: LobbyProps) {
  const [showRules, setShowRules] = useState(false);
  const [previewMode, setPreviewMode] = useState<LobbyPreviewMode | null>(null);

  return (
    <main className="lobby-shell relative min-h-svh overflow-hidden text-[#f3e6c8] max-[820px]:overflow-auto">
      <div className="grain" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[64vw] [mask-image:linear-gradient(90deg,transparent_0%,#000_18%,#000_100%)] max-[820px]:top-[76px] max-[820px]:h-[330px] max-[820px]:w-full max-[820px]:opacity-80 max-[820px]:[mask-image:linear-gradient(180deg,#000_0%,#000_72%,transparent_100%)] max-[560px]:h-[285px]" aria-hidden="true">
        <div className="pointer-events-auto size-full max-[820px]:pointer-events-none">
          <LobbyScene previewMode={previewMode} />
        </div>
      </div>

      <section className="relative z-[2] mx-auto flex min-h-svh w-[min(1240px,calc(100%-64px))] items-center py-12 max-[820px]:w-[min(620px,calc(100%-36px))] max-[820px]:items-start max-[820px]:pt-10 max-[820px]:pb-16 max-[560px]:w-[calc(100%-28px)]">
        <div className="w-[min(520px,43vw)] max-[820px]:w-full">
          <h1 className="m-0 text-[clamp(54px,5.5vw,78px)] leading-[1.04] font-black tracking-[.025em] text-[#fff0cf] text-balance max-[820px]:text-[clamp(42px,11vw,60px)]">한 판 윷놀이</h1>

          <div className="mt-10 border-y border-[rgba(224,199,148,.18)] max-[820px]:mt-[305px] max-[560px]:mt-[260px]" aria-label="플레이 모드 선택" onPointerLeave={() => setPreviewMode(null)}>
            {PLAY_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = previewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  className={`group relative grid min-h-[86px] w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-[rgba(224,199,148,.12)] bg-transparent px-2 text-left transition-[background-color,border-color] duration-200 last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#d6b667] max-[560px]:min-h-[78px] max-[560px]:grid-cols-[42px_minmax(0,1fr)_auto] max-[560px]:gap-3 ${mode.available ? "cursor-pointer" : "cursor-not-allowed opacity-[.42]"} ${active && mode.available ? "border-b-[rgba(224,199,148,.28)] bg-[linear-gradient(90deg,rgba(205,166,86,.12),transparent_76%)]" : ""}`}
                  type="button"
                  disabled={!mode.available}
                  onPointerEnter={() => setPreviewMode(mode.id)}
                  onFocus={() => setPreviewMode(mode.id)}
                  onClick={mode.id === "local" ? onStartLocal : mode.id === "ai" ? onStartAi : undefined}
                >
                  <span className={`transition-transform duration-200 ease-out ${mode.available ? "group-hover:translate-x-1" : ""}`} aria-hidden="true">
                    <span className={`grid size-11 place-items-center rounded-full border transition-[color,border-color,background-color,box-shadow] duration-200 max-[560px]:size-10 ${active && mode.available ? "border-[#d9b96f] bg-[rgba(215,185,111,.12)] text-[#f3dcaa] shadow-[0_0_24px_rgba(215,185,111,.12)]" : "border-[rgba(224,199,148,.2)] text-[#8d8473]"}`}>
                      <Icon size={21} weight="regular" />
                    </span>
                  </span>
                  <span className={`min-w-0 transition-transform duration-200 ${mode.available ? "group-hover:translate-x-1" : ""}`}>
                    <strong className={`mb-1.5 block text-[19px] leading-none font-extrabold tracking-[-.025em] transition-colors max-[560px]:text-[17px] ${active && mode.available ? "text-[#f5e3bd]" : "text-[#c7baa0]"}`}>{mode.title}</strong>
                    <small className="block overflow-hidden text-xs leading-[1.35] font-medium text-ellipsis whitespace-nowrap text-[#827a6b] max-[560px]:max-w-[210px] max-[560px]:text-[10px]">{mode.description}</small>
                  </span>
                  {mode.available
                    ? <span className={`flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 max-[560px]:text-[0px] ${active ? "text-[#d9bd7c]" : "text-[#716b5f]"}`} aria-hidden="true">시작하기 <ArrowRight className="max-[560px]:size-[18px]" size={20} weight="bold" /></span>
                    : <span className="rounded-full border border-[rgba(210,193,158,.2)] px-[9px] py-1.5 text-[10px] leading-none font-bold whitespace-nowrap text-[#a59a83]">준비 중</span>}
                </button>
              );
            })}
          </div>

          <button className="mt-5 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-bold text-[#aaa087] transition-colors hover:text-[#ead7ad]" type="button" onClick={() => setShowRules(true)}>
            <BookOpen size={20} weight="regular" aria-hidden="true" />
            <span className="border-b border-[rgba(224,199,148,.32)] pb-0.5">게임 방법</span>
          </button>
        </div>
      </section>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}
