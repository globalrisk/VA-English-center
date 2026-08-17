import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { TestScoresGrid, type AttemptWithLesson } from "@/components/student/TestScoresGrid";
import { ageGroupLabel } from "@/lib/age-groups";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getCurrentProfile();
  const userIsAdmin = isAdmin(profile);
  let testScores: AttemptWithLesson[] = [];

  if (profile && !userIsAdmin) {
    const { data } = await supabase
      .from("test_attempts")
      .select(
        "id, student_id, lesson_id, started_at, time_limit_minutes, submitted_at, correct_count, total_questions, percentage, elapsed_seconds, lessons!inner(title, courses!inner(title))"
      )
      .eq("student_id", profile.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });
    testScores = (data as unknown as AttemptWithLesson[]) ?? [];
  }

  return (
    <>
      <Doodles />
      <Header variant={userIsAdmin ? "admin" : "student"} />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Student Portal</span>
            <h1 className="section-title">
              Hello, <span className="title-gold">{user?.email?.split("@")[0] ?? "Student"}</span>
            </h1>
            <p className="section-sub">
              Ready to continue your English adventure?
              {profile && (
                <> · <span className="title-gold">{ageGroupLabel(profile.age_group)}</span> courses</>
              )}
              {userIsAdmin && (
                <> · <span className="title-gold">Admin</span></>
              )}
            </p>
          </div>
          <div className="course-grid" style={{ marginBottom: "2rem" }}>
            <article className="course-card" data-color="blue">
              <h3>My Courses</h3>
              <p>View enrolled courses and start studying your lessons.</p>
              <Link href="/student/courses" className="course-link">Go to courses →</Link>
            </article>
            {userIsAdmin && (
              <article className="course-card" data-color="pink">
                <h3>Manage students</h3>
                <p>Set age groups so each student sees the right courses.</p>
                <Link href="/admin/students" className="course-link">Open admin →</Link>
              </article>
            )}
          </div>

          {!userIsAdmin && (
            <section className="student-test-scores" id="test-scores">
              <div className="section-header">
                <span className="section-label">Permanent results</span>
                <h2 className="section-title">My Test Scores</h2>
              </div>
              <TestScoresGrid attempts={testScores} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
