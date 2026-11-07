"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/attendance", label: "Today" },
  { href: "/admin/attendance/roster", label: "Roster" },
  { href: "/admin/attendance/classes", label: "Classes" },
  { href: "/admin/attendance/history", label: "History" },
];

export function AttendanceNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="attendance-tabs" aria-label={t("Attendance workspace")}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
