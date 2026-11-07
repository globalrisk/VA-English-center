import { getTranslations } from "@/lib/i18n/server";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type {
  StudentDirectoryRow,
  TestAttempt,
  TestScoreSummary,
} from "@/types/course";
import { redirect } from "next/navigation";
import { StudentAgeGroupEditor } from "./StudentAgeGroupEditor";

type AttemptWithLesson = TestAttempt & {
  lessons: {
    title: string;
    courses: { title: string };
  };
};

export default async function AdminStudentsPage() {
  const t = await getTranslations();
  const profile = await getCurrentProfile();

  if (!profile || !isAdmin(profile)) {
    redirect("/student");
  }

  const supabase = await createClient();
  const { data: students, error } = await supabase.rpc("admin_list_students");
  const { data: attemptRows } = await supabase
    .from("test_attempts")
    .select(
      "id, student_id, lesson_id, started_at, time_limit_minutes, submitted_at, correct_count, total_questions, percentage, elapsed_seconds, lessons!inner(title, courses!inner(title))"
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const testScores: TestScoreSummary[] = (
    (attemptRows as unknown as AttemptWithLesson[]) ?? []
  ).map((attempt) => ({
    ...attempt,
    lesson_title: attempt.lessons.title,
    course_title: attempt.lessons.courses.title,
  }));

  return (
    <>
      <Doodles />
      <Header variant="admin" />
      <main className="section">
        <div className="container">
          <Breadcrumbs items={[{ label: t("Admin"), href: "/admin" }, { label: t("Students") }]} />
          <div className="section-header">
            <span className="section-label">{t("Admin")}</span>
            <h1 className="section-title">
              {t("Manage ")}<span className="title-gold">{t("Students")}</span>
            </h1>
            <p className="section-sub">
              {t("Set age groups, review course progress, and check permanent test scores.")}</p>
          </div>

          {error && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              {t("Could not load students: ")}{error.message}
            </p>
          )}

          <StudentAgeGroupEditor
            students={(students as StudentDirectoryRow[]) ?? []}
            testScores={testScores}
          />

        </div>
      </main>
    </>
  );
}
