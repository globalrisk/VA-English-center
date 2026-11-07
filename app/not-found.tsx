"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n/LanguageProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  const t = useTranslations();
  return (
    <>
      <Header />
      <main className="section">
        <div className="container">
          <span className="section-label">404</span>
          <h1 className="section-title">{t("Page not found")}</h1>
          <p className="section-sub">{t("The page you are looking for does not exist.")}</p>
          <Link href="/" className="btn btn-primary">{t("← Back to home")}</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
