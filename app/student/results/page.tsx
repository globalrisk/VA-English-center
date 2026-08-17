import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { TestScoresGrid, type AttemptWithLesson } from "@/components/student/TestScoresGrid";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentResultsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/student/results");
  if (isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("test_attempts")
    .select(
      "id, student_id, lesson_id, started_at, time_limit_minutes, submitted_at, correct_count, total_questions, percentage, elapsed_seconds, lessons!inner(title, courses!inner(title))"
    )
    .eq("student_id", profile.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const attempts = (data as unknown as AttemptWithLesson[]) ?? [];

  return (
    <>
      <Doodles />
      <Header variant="student" />
      <main className="section">
        <div className="container">
          <Breadcrumbs items={[{ label: "My Learning", href: "/student" }, { label: "Results" }]} />
          <div className="section-header">
            <span className="section-label">Progress</span>
            <h1 className="section-title">My <span className="title-gold">Results</span></h1>
            <p className="section-sub">Your submitted test scores are saved here permanently.</p>
          </div>
          <TestScoresGrid attempts={attempts} />
        </div>
      </main>
    </>
  );
}
