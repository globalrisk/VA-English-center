"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { LogoutButton } from "@/components/student/LogoutButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HeaderVariant = "marketing" | "student" | "admin";

type HeaderProps = {
  variant?: HeaderVariant;
  isLoggedIn?: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  activePrefixes?: string[];
  exact?: boolean;
  cta?: boolean;
};

const marketingItems: NavigationItem[] = [
  { href: "/#about", label: "About" },
  { href: "/#courses", label: "Courses" },
  { href: "/check-in", label: "Check in" },
  { href: "/#features", label: "Why VA" },
  { href: "/#contact", label: "Contact" },
  { href: "/#contact", label: "Book a trial", cta: true },
];

const studentItems: NavigationItem[] = [
  { href: "/student", label: "My Learning", exact: true },
  {
    href: "/student/courses",
    label: "Courses",
    activePrefixes: ["/student/courses", "/student/course/"],
  },
  { href: "/student/results", label: "Results", exact: true },
];

const adminItems: NavigationItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/attendance", label: "Attendance", activePrefixes: ["/admin/attendance"] },
  { href: "/admin/courses", label: "Courses", activePrefixes: ["/admin/courses"] },
  { href: "/admin/students", label: "Learning Students", activePrefixes: ["/admin/students"] },
];

export function Header({ variant = "marketing", isLoggedIn = false }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const hasAccount = variant !== "marketing" || isLoggedIn;
  const logoHref = variant === "admin" ? "/admin" : "/";
  const items =
    variant === "admin" ? adminItems : variant === "student" ? studentItems : marketingItems;

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    const previousOverflow = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [accountOpen, menuOpen]);

  function closeMenus() {
    setMenuOpen(false);
    setAccountOpen(false);
  }

  function isItemActive(item: NavigationItem) {
    if (variant === "marketing") return false;
    if (item.exact) return pathname === item.href;
    return (item.activePrefixes ?? [item.href]).some((prefix) => pathname.startsWith(prefix));
  }

  return (
    <>
      <header className="header">
        <nav className="nav container" aria-label={t("Primary navigation")}>
        <Link href={logoHref} className="logo" onClick={closeMenus}>
          <span className="logo-icon" aria-hidden="true">✦</span>
          <span className="logo-text">VA English</span>
          {variant === "admin" ? <span className="logo-context">{t("Admin")}</span> : null}
        </Link>

        <div className="nav-end">
          <LanguageSwitcher />
          <ul id="primary-navigation" className={`nav-links${menuOpen ? " open" : ""}`}>
            {items.map((item) => {
              const active = isItemActive(item);
              return (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className={`${item.cta ? "nav-cta" : ""}${active ? " active" : ""}`.trim()}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenus}
                  >
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}

            {!hasAccount ? (
              <li><Link href="/login" onClick={closeMenus}>{t("Log in")}</Link></li>
            ) : (
              <li className="nav-mobile-account">
                <span className="nav-mobile-label">{t("Account ")}</span>
                {variant === "admin" ? (
                  <Link href="/student" onClick={closeMenus}>{t("View student site")}</Link>
                ) : null}
                {variant === "marketing" ? (
                  <Link href="/student" onClick={closeMenus}>{t("My Learning")}</Link>
                ) : null}
                {variant === "admin" ? (
                  <Link href="/" onClick={closeMenus}>{t("Visit public website")}</Link>
                ) : null}
                <LogoutButton variant="menu" onAfterLogout={closeMenus} />
              </li>
            )}
          </ul>

          {hasAccount ? (
            <div className="nav-account" ref={accountRef}>
              <button
                type="button"
                className="nav-account-trigger"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {t("Account ")}<span aria-hidden="true">⌄</span>
              </button>
              {accountOpen ? (
                <div className="nav-account-panel" aria-label={t("Account options")}>
                  {variant === "admin" ? (
                    <Link href="/student" onClick={closeMenus}>{t("View student site")}</Link>
                  ) : null}
                  {variant === "marketing" ? (
                    <Link href="/student" onClick={closeMenus}>{t("My Learning")}</Link>
                  ) : null}
                  {variant === "admin" ? (
                    <Link href="/" onClick={closeMenus}>{t("Visit public website")}</Link>
                  ) : null}
                  <LogoutButton variant="menu" onAfterLogout={closeMenus} />
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className={`nav-toggle${menuOpen ? " open" : ""}`}
            aria-label={menuOpen ? t("Close menu") : t("Open menu")}
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
        </nav>
      </header>
      {menuOpen ? (
        <button
          type="button"
          className="nav-menu-backdrop"
          aria-label={t("Close navigation")}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </>
  );
}
