import { getTranslations } from "@/lib/i18n/server";
import { AttendanceNav } from "@/components/admin/AttendanceNav";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AttendanceLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const profile = await getCurrentProfile();
  if (!profile || !isAdmin(profile)) redirect("/student");

  return (
    <>
      <Doodles />
      <Header variant="admin" />
      <main className="section attendance-workspace">
        <div className="container">
          <Breadcrumbs items={[{ label: t("Admin"), href: "/admin" }, { label: t("Attendance") }]} />
          <div className="section-header attendance-heading">
            <span className="section-label">{t("Attendance")}</span>
            <h1 className="section-title"><span className="title-gold">{t("Class Check-In")}</span></h1>
            <p className="section-sub">{t("Live attendance, parent follow-up, rosters, and class schedules.")}</p>
          </div>
          <AttendanceNav />
          {children}
        </div>
      </main>
    </>
  );
}
