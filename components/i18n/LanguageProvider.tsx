"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createTranslator, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  pending: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    updateLocale(next);
    startTransition(() => router.refresh());
  }, [router]);

  const value = useMemo(() => ({ locale, setLocale, pending }), [locale, setLocale, pending]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}

export function useTranslations() {
  const { locale } = useLanguage();
  return useMemo(() => createTranslator(locale), [locale]);
}
