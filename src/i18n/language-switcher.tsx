import { Translate } from "@phosphor-icons/react";
import { LOCALES, useI18n, type LocaleId } from ".";

// 등록된 언어가 하나뿐이면 아무것도 그리지 않습니다.
// locales에 두 번째 언어를 등록하는 순간 자동으로 나타납니다.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const entries = Object.entries(LOCALES) as [
    LocaleId,
    (typeof LOCALES)[LocaleId],
  ][];
  if (entries.length < 2) return null;

  return (
    <label className={`flex items-center gap-2 text-[#aaa087] ${className}`}>
      <Translate size={18} weight="regular" aria-hidden="true" />
      <select
        className="cursor-pointer rounded-[3px] border border-[rgba(224,199,148,.28)] bg-[rgba(7,15,12,.8)] px-2 py-1.5 text-xs font-bold text-[#e7d5ac] transition-colors hover:border-[rgba(224,199,148,.5)]"
        aria-label={t.languageSwitcherLabel}
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleId)}
      >
        {entries.map(([id, definition]) => (
          <option key={id} value={id}>
            {definition.label}
          </option>
        ))}
      </select>
    </label>
  );
}
