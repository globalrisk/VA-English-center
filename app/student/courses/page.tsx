import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { ageGroupLabel } from "@/lib/age-groups";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/types/course";
import Link from "next/link";

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const userIsAdmin = isAdmin(profile);

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url, age_group, created_at")
    .order("created_at", { ascending: true });

  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co";

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin={userIsAdmin} />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Study</span>
            <h1 className="section-title">My <span className="title-gold">Courses</span></h1>
            {profile && (
              <p className="section-sub">
                {userIsAdmin
                  ? "Admin view: all courses"
                  : `Showing ${ageGroupLabel(profile.age_group)} courses only`}
              </p>
            )}
          </div>

          {!hasSupabase && (
            <div className="contact-card" style={{ gridTemplateColumns: "1fr", marginBottom: "2rem" }}>
              <p>
                <strong>Supabase not configured yet.</strong> Copy <code>.env.local.example</code> to{" "}
                <code>.env.local</code> and add your project URL and anon key. Then run the SQL schema in{" "}
                <code>supabase/schema.sql</code>.
              </p>
            </div>
          )}

          {error && hasSupabase && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              Could not load courses. Make sure the database tables exist (see supabase/schema.sql).
            </p>
          )}

          {courses && courses.length > 0 ? (
            <div className="course-grid">
              {(courses as Course[]).map((course) => (
                <article key={course.id} className="course-card" data-color="pink">
                  {course.cover_image_url && (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      style={{ width: "100%", borderRadius: "12px", marginBottom: "1rem" }}
                    />
                  )}
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <Link href={`/student/course/${course.id}`} className="course-link">
                    Start learning →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            hasSupabase &&
            !error && (
              <p style={{ color: "var(--ink-light)" }}>
                No courses yet. Your teacher will add courses soon.
              </p>
            )
          )}

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student" className="course-link">← Back to dashboard</Link>
          </p>
        </div>
      </main>
    </>
  );
}
