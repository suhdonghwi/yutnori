import { useEffect, useRef, useState } from "react";

type LobbyProps = {
  onStartLocal: () => void;
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
    available: false,
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
    <div className="rules-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div className="rules-dialog-header">
          <div>
            <span>HOW TO PLAY</span>
            <h2 id="rules-title">윷놀이 게임 방법</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="게임 방법 닫기">×</button>
        </div>

        <div className="rules-dialog-body">
          <article className="rule-card rule-goal">
            <span className="rule-number">01</span>
            <div>
              <h3>네 말을 먼저 완주시키세요</h3>
              <p>윷을 던져 나온 수만큼 말을 움직이고, 자기 팀의 네 말을 모두 도착시키면 승리합니다.</p>
            </div>
          </article>

          <article className="rule-card">
            <span className="rule-number">02</span>
            <div>
              <h3>윷의 결과</h3>
              <dl className="yut-results">
                <div><dt>도</dt><dd>1칸</dd></div>
                <div><dt>개</dt><dd>2칸</dd></div>
                <div><dt>걸</dt><dd>3칸</dd></div>
                <div className="bonus"><dt>윷</dt><dd>4칸 · 한 번 더</dd></div>
                <div className="bonus"><dt>모</dt><dd>5칸 · 한 번 더</dd></div>
                <div className="backdo"><dt>빽도</dt><dd>뒤로 1칸</dd></div>
              </dl>
            </div>
          </article>

          <article className="rule-card">
            <span className="rule-number">03</span>
            <div>
              <h3>업기와 잡기</h3>
              <p>같은 편 말이 있는 칸에 도착하면 함께 업고 이동합니다. 상대 말을 잡으면 그 말을 대기석으로 보내고 한 번 더 던집니다.</p>
            </div>
          </article>

          <article className="rule-card">
            <span className="rule-number">04</span>
            <div>
              <h3>지름길을 선택하세요</h3>
              <p>갈림길과 중앙에 정확히 도착하면 다음 이동에서 지름길을 선택할 수 있습니다. 예상 경로를 확인하고 유리한 길을 고르세요.</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export function Lobby({ onStartLocal }: LobbyProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <main className="lobby-shell">
      <div className="grain" aria-hidden="true" />
      <section className="lobby-content">
        <div className="lobby-intro">
          <h1>한 판 윷놀이</h1>

          <div className="mode-list" aria-label="플레이 모드 선택">
            {PLAY_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`mode-card ${mode.available ? "available" : "coming-soon"}`}
                type="button"
                disabled={!mode.available}
                onClick={mode.available ? onStartLocal : undefined}
              >
                <span className="mode-icon" aria-hidden="true">{mode.badge}</span>
                <span className="mode-copy">
                  <strong>{mode.title}</strong>
                  <small>{mode.description}</small>
                </span>
                {mode.available
                  ? <span className="mode-action" aria-hidden="true">시작하기 <i>→</i></span>
                  : <span className="mode-status">준비 중</span>}
              </button>
            ))}
          </div>
          <button className="rules-entry lobby-rules-entry" type="button" onClick={() => setShowRules(true)}>
            <span aria-hidden="true">?</span>
            게임 방법
          </button>
        </div>

        <div className="lobby-visual" aria-hidden="true">
          <div className="lobby-orbit orbit-one" />
          <div className="lobby-orbit orbit-two" />
          <div className="lobby-seal">
            <small>우리 놀이</small>
            <strong>윷</strong>
            <span>YUTNORI</span>
          </div>
          <div className="lobby-yut yut-one"><i /><i /><i /></div>
          <div className="lobby-yut yut-two"><i /><i /><i /></div>
          <div className="lobby-yut yut-three"><i /><i /><i /></div>
          <div className="lobby-yut yut-four"><i /><i /><i /></div>
        </div>
      </section>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}
