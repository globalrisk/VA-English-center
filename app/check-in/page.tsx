import { getTranslations } from "@/lib/i18n/server";
import { Doodles } from "@/components/layout/Doodles";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import type { PublicAttendanceSession } from "@/types/attendance";
import { CheckInClient } from "./CheckInClient";

export default async function CheckInPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const result = await supabase.rpc("public_open_attendance_sessions");
  const initialSessions = (result.data as PublicAttendanceSession[] | null) ?? [];

  return (
    <>
      <Doodles />
      <Header />
      <main className="section check-in-page">
        <div className="container check-in-shell">
          <div className="section-header">
            <span className="section-label">{t("Welcome to class")}</span>
            <h1 className="section-title"><span className="title-gold">{t("Student Check-In")}</span></h1>
            <p className="section-sub">{t("Choose your class and name. Check-in opens 15 minutes before class.")}</p>
          </div>
          <CheckInClient initialSessions={initialSessions} initialError={Boolean(result.error)} />
        </div>
      </main>
      <Footer />
    </>
  );
}
