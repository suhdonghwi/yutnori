import { useEffect, useRef, useState } from "react";

type LobbyProps = {
  onStartLocal: () => void;
  onStartAi: () => void;
};

const PLAY_MODES = [
  {
    id: "local",
    badge: "2P",
    title: "로컬 대전",
    description: "한 기기에서 두 사람이 번갈아 플레이합니다.",
    available: true,
  },
  {
    id: "online",
    badge: "ON",
    title: "온라인 대전",
    description: "친구를 초대하거나 다른 플레이어와 대전합니다.",
    available: false,
  },
  {
    id: "ai",
    badge: "AI",
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

  return (
    <main className="lobby-shell relative min-h-svh overflow-hidden text-[#f3e6c8] max-[900px]:overflow-auto">
      <div className="grain" aria-hidden="true" />
      <section className="relative z-2 mx-auto grid min-h-svh w-[min(1240px,calc(100%-48px))] grid-cols-[minmax(430px,.95fr)_minmax(420px,1.05fr)] items-center gap-[clamp(28px,6vw,92px)] py-[42px] pb-[68px] max-[900px]:w-[min(680px,calc(100%-36px))] max-[900px]:grid-cols-1 max-[900px]:pt-[54px] max-[560px]:w-[calc(100%-28px)] max-[560px]:py-[38px] max-[560px]:pb-[74px]">
        <div className="max-w-[610px] max-[900px]:max-w-none">
          <h1 className="m-0 text-[clamp(46px,5.2vw,76px)] leading-[1.04] font-black tracking-[-.015em] text-[#fff0cf] text-balance max-[560px]:text-[clamp(40px,12vw,56px)]">한 판 윷놀이</h1>

          <div className="mt-[30px] grid gap-2.5" aria-label="플레이 모드 선택">
            {PLAY_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`relative grid min-h-[88px] w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[17px] border px-[18px] py-3.5 pl-3.5 text-left text-[#e9dabc] transition duration-200 max-[560px]:min-h-[82px] max-[560px]:grid-cols-[50px_minmax(0,1fr)_auto] max-[560px]:gap-[11px] max-[560px]:p-3 ${mode.available ? "cursor-pointer border-[rgba(222,190,121,.42)] bg-[linear-gradient(110deg,rgba(167,122,49,.22),rgba(255,255,255,.045))] shadow-[inset_3px_0_#d6b667] hover:translate-x-[5px] hover:border-[rgba(233,204,137,.78)] hover:bg-[linear-gradient(110deg,rgba(167,122,49,.34),rgba(255,255,255,.07))]" : "cursor-not-allowed border-[rgba(224,199,148,.16)] bg-white/[.035] opacity-48"}`}
                type="button"
                disabled={!mode.available}
                onClick={mode.id === "local" ? onStartLocal : mode.id === "ai" ? onStartAi : undefined}
              >
                <span className="grid size-[58px] place-items-center rounded-[14px] bg-[rgba(209,173,94,.12)] text-[15px] leading-none font-black tracking-[-.03em] text-[#f3dfaf] max-[560px]:size-[50px] max-[560px]:rounded-xl max-[560px]:text-[13px]" aria-hidden="true">{mode.badge}</span>
                <span className="min-w-0">
                  <strong className="mb-1.5 block text-[19px] leading-none font-extrabold tracking-[-.03em] text-[#f4e5c5] max-[560px]:text-[17px]">{mode.title}</strong>
                  <small className="block overflow-hidden text-xs leading-[1.35] font-medium text-ellipsis whitespace-nowrap text-[#9e9480] max-[560px]:max-w-[190px] max-[560px]:text-[10px]">{mode.description}</small>
                </span>
                {mode.available
                  ? <span className="flex items-center gap-[9px] text-xs leading-none font-extrabold whitespace-nowrap text-[#e0c47e] max-[560px]:text-[0px]" aria-hidden="true">시작하기 <i className="grid size-[30px] place-items-center rounded-full bg-[#d4b66e] text-[17px] leading-none font-black text-[#231c13] max-[560px]:text-base">→</i></span>
                  : <span className="rounded-full border border-[rgba(210,193,158,.2)] px-[9px] py-1.5 text-[10px] leading-none font-bold whitespace-nowrap text-[#a59a83]">준비 중</span>}
              </button>
            ))}
          </div>
          <button className="mt-[18px] flex w-max cursor-pointer items-center gap-2 rounded-full border border-[rgba(224,199,148,.25)] bg-white/4 py-[9px] pr-[15px] pl-2.5 text-[13px] leading-none font-bold text-[#d7c8a9] transition duration-200 hover:-translate-y-px hover:border-[rgba(224,199,148,.55)] hover:bg-white/7 max-[560px]:pr-[11px] max-[560px]:text-[11px]" type="button" onClick={() => setShowRules(true)}>
            <span className="grid size-[25px] place-items-center rounded-full bg-[rgba(215,189,130,.14)] text-sm text-[#e1c98f]" aria-hidden="true">?</span>
            게임 방법
          </button>
        </div>

        <div className="lobby-visual relative grid min-h-[590px] place-items-center [perspective:1100px] max-[900px]:hidden" aria-hidden="true">
          <div className="lobby-board-art">
            <svg className="lobby-board-map" viewBox="0 0 520 520" fill="none">
              <rect className="art-frame" x="28" y="28" width="464" height="464" rx="34" />
              <rect className="art-paper" x="43" y="43" width="434" height="434" rx="25" />
              <path className="art-route" d="M92 92H428V428H92V92ZM92 92L428 428M428 92L92 428" />
              <g className="art-nodes minor">
                <circle cx="159" cy="92" r="8" /><circle cx="226" cy="92" r="8" /><circle cx="294" cy="92" r="8" /><circle cx="361" cy="92" r="8" />
                <circle cx="428" cy="159" r="8" /><circle cx="428" cy="226" r="8" /><circle cx="428" cy="294" r="8" /><circle cx="428" cy="361" r="8" />
                <circle cx="361" cy="428" r="8" /><circle cx="294" cy="428" r="8" /><circle cx="226" cy="428" r="8" /><circle cx="159" cy="428" r="8" />
                <circle cx="92" cy="361" r="8" /><circle cx="92" cy="294" r="8" /><circle cx="92" cy="226" r="8" /><circle cx="92" cy="159" r="8" />
                <circle cx="176" cy="176" r="7" /><circle cx="344" cy="176" r="7" /><circle cx="176" cy="344" r="7" /><circle cx="344" cy="344" r="7" />
              </g>
              <g className="art-nodes major">
                <circle cx="92" cy="92" r="16" /><circle cx="428" cy="92" r="16" /><circle cx="428" cy="428" r="16" /><circle cx="92" cy="428" r="16" /><circle cx="260" cy="260" r="18" />
              </g>
            </svg>
            <span className="art-piece blue-piece"><i /></span>
            <span className="art-piece red-piece"><i /></span>
          </div>
        </div>
      </section>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}
