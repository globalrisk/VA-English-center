import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type {
  StudentDirectoryRow,
  TestAttempt,
  TestScoreSummary,
} from "@/types/course";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentAgeGroupEditor } from "./StudentAgeGroupEditor";

type AttemptWithLesson = TestAttempt & {
  lessons: {
    title: string;
    courses: { title: string };
  };
};

export default async function AdminStudentsPage() {
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
      <Header variant="student" isAdmin />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Admin</span>
            <h1 className="section-title">
              Manage <span className="title-gold">Students</span>
            </h1>
            <p className="section-sub">
              Set each student&apos;s age group. They will only see courses for that group.
            </p>
          </div>

          <p style={{ marginBottom: "1.5rem" }}>
            <AdminNavLink href="/admin/courses" pendingLabel="Opening courses">
              Manage courses →
            </AdminNavLink>
          </p>

          {error && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              Could not load students: {error.message}
            </p>
          )}

          <StudentAgeGroupEditor
            students={(students as StudentDirectoryRow[]) ?? []}
            testScores={testScores}
          />

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student" className="course-link">← Back to dashboard</Link>
          </p>
        </div>
      </main>
    </>
  );
}
