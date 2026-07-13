import { useSyncExternalStore } from "react";
import { ko } from "./locales/ko";
import { en } from "./locales/en";
import { bn } from "./locales/bn";

export type Messages = typeof ko;

// 화면에 바로 그려지는 문자열 대신 상태에 저장하는 메시지 참조.
// 렌더 시점의 카탈로그로 평가되므로 언어를 바꿔도 이미 쌓인 알림이 옛 언어로 남지 않습니다.
export type MessageRef = (t: Messages) => string;

// 새 언어 추가: locales/<id>.ts에 `const en: Messages = { ... }`를 만들고 여기 등록하면
// 언어 선택 UI와 브라우저 언어 감지에 자동으로 포함됩니다.
export const LOCALES = {
  ko: { label: "한국어", messages: ko },
  en: { label: "English", messages: en },
  bn: { label: "বাংলা", messages: bn },
} as const satisfies Record<string, { label: string; messages: Messages }>;

export type LocaleId = keyof typeof LOCALES;

const STORAGE_KEY = "yutnori:locale";
const DEFAULT_LOCALE: LocaleId = "ko";

function isLocaleId(value: string | null | undefined): value is LocaleId {
  return value != null && value in LOCALES;
}

function detectLocale(): LocaleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocaleId(stored)) return stored;
  } catch {
    // 저장소 접근이 막힌 환경에서는 브라우저 언어로만 판단합니다.
  }
  for (const language of navigator.languages ?? [navigator.language]) {
    const base = language?.toLowerCase().split("-")[0];
    if (isLocaleId(base)) return base;
  }
  return DEFAULT_LOCALE;
}

let currentLocale: LocaleId = detectLocale();
const listeners = new Set<() => void>();

function applyDocumentLocale() {
  document.documentElement.lang = currentLocale;
  document.title = LOCALES[currentLocale].messages.appTitle;
}

export function getLocale(): LocaleId {
  return currentLocale;
}

export function setLocale(locale: LocaleId) {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 저장 실패 시에도 이번 세션의 언어 전환은 유지합니다.
  }
  applyDocumentLocale();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  return { locale, setLocale, t: LOCALES[locale].messages };
}

applyDocumentLocale();
