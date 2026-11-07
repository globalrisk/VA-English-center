"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";
import Link from "next/link";

export function Footer() {
  const t = useTranslations();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-text">VA English Center</span>
          <p>{t("Learning English with joy, every day.")}</p>
        </div>
        <div className="footer-links">
          <a href="#about">{t("About")}</a>
          <a href="#courses">{t("Courses")}</a>
          <a href="#contact">{t("Contact")}</a>
        </div>
        <p className="footer-copy">{t("© 2026 VA English Center. Made with ♥ and doodles.")}</p>
      </div>
    </footer>
  );
}
