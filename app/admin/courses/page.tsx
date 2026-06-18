import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/types/course";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CourseAgeGroupEditor } from "./CourseAgeGroupEditor";

export default async function AdminCoursesPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isAdmin(profile)) {
    redirect("/student");
  }

  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url, created_at, course_age_groups(age_group)")
    .order("title", { ascending: true });

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Admin</span>
            <h1 className="section-title">
              Manage <span className="title-gold">Courses</span>
            </h1>
            <p className="section-sub">
              Create, edit, and delete courses. Assign one or more age groups per course.
            </p>
          </div>

          <p style={{ marginBottom: "1.5rem" }}>
            <Link href="/admin/students" className="course-link">Manage students →</Link>
          </p>

          {error && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              Could not load courses: {error.message}
            </p>
          )}

          <CourseAgeGroupEditor courses={(courses as Course[]) ?? []} />

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student" className="course-link">← Back to dashboard</Link>
          </p>
        </div>
      </main>
    </>
  );
}
