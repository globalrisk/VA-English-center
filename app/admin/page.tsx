import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { StudentDirectoryRow } from "@/types/course";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminOverviewPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdmin(profile)) redirect("/student");

  const supabase = await createClient();
  const [coursesResult, studentsResult] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.rpc("admin_list_students"),
  ]);
  const directory = (studentsResult.data as StudentDirectoryRow[] | null) ?? [];
  const studentCount = directory.filter((entry) => entry.role === "student").length;

  return (
    <>
      <Doodles />
      <Header variant="admin" />
      <main className="section">
        <div className="container">
          <Breadcrumbs items={[{ label: "Admin overview" }]} />
          <div className="section-header">
            <span className="section-label">Administration</span>
            <h1 className="section-title">Center <span className="title-gold">Overview</span></h1>
            <p className="section-sub">Choose an area to manage. Student-facing pages are available from the Account menu.</p>
          </div>

          <div className="course-grid admin-overview-grid">
            <article className="course-card" data-color="blue">
              <p className="admin-overview-count">{coursesResult.count ?? 0}</p>
              <h2>Courses</h2>
              <p>Create courses, assign age groups, and organize lessons.</p>
              <Link href="/admin/courses" className="course-link">Manage courses →</Link>
            </article>
            <article className="course-card" data-color="pink">
              <p className="admin-overview-count">{studentCount}</p>
              <h2>Students</h2>
              <p>Manage age groups, review course progress, and check test results.</p>
              <Link href="/admin/students" className="course-link">Manage students →</Link>
            </article>
          </div>
        </div>
      </main>
    </>
  );
}
