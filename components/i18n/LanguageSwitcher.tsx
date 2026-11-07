"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, pending } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"} aria-busy={pending}>
      <button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed={locale === "vi"} disabled={pending} onClick={() => setLocale("vi")}>VI</button>
      <button type="button" lang="en" aria-label="English" aria-pressed={locale === "en"} disabled={pending} onClick={() => setLocale("en")}>EN</button>
    </div>
  );
}
