import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

export function RulesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const sections = [
    { title: t.rules.goal.title, body: t.rules.goal.body },
    {
      title: t.rules.throws.title,
      body: [
        `${t.yut.do} · ${t.rules.throws.steps(1)}`,
        `${t.yut.gae} · ${t.rules.throws.steps(2)}`,
        `${t.yut.geol} · ${t.rules.throws.steps(3)}`,
        `${t.yut.yut} · ${t.rules.throws.stepsExtra(4)}`,
        `${t.yut.mo} · ${t.rules.throws.stepsExtra(5)}`,
        `${t.yut.backdo} · ${t.rules.throws.backdo}`,
      ].join("  ·  "),
    },
    { title: t.rules.carryCapture.title, body: t.rules.carryCapture.body },
    { title: t.rules.shortcut.title, body: t.rules.shortcut.body },
  ];
  return (
    <div
      className="rules-backdrop fixed inset-0 z-80 grid place-items-center bg-[rgba(5,10,8,.82)] p-6 max-[560px]:p-2.5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="max-h-[min(820px,calc(100svh-48px))] w-[min(760px,100%)] overflow-auto rounded-[25px] border border-[rgba(226,196,132,.32)] bg-[linear-gradient(145deg,#17211b,#0d1511)] text-[#eee0c2] shadow-[0_35px_110px_rgba(0,0,0,.72)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
      >
        <div className="sticky top-0 z-2 flex items-center justify-between border-b border-[rgba(226,196,132,.15)] bg-[#141e18] px-[26px] py-5">
          <div>
            <span className="block text-[9px] font-bold tracking-[.18em] text-[#9e8c68]">
              {t.rules.tag}
            </span>
            <h2
              className="m-0 mt-1 text-[26px] font-black text-[#f3e2bd]"
              id="rules-title"
            >
              {t.rules.title}
            </h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={t.rules.close}
            className="grid size-[38px] cursor-pointer place-items-center rounded-full border border-[rgba(226,196,132,.2)] bg-white/4 text-[27px] text-[#d9c8a4]"
          >
            ×
          </button>
        </div>
        <div className="grid gap-2.5 p-[26px] max-[560px]:p-3.5">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="grid grid-cols-[42px_minmax(0,1fr)] gap-3.5 rounded-[15px] border border-[rgba(226,196,132,.12)] bg-white/[.025] p-[18px]"
            >
              <span className="text-xs font-black text-[#b89c5e]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="m-0 mb-2 text-base font-extrabold text-[#ebd8af]">
                  {section.title}
                </h3>
                <p className="m-0 text-[13px] leading-[1.65] font-medium text-[#a69b84]">
                  {section.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
