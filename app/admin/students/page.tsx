import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { StudentDirectoryRow } from "@/types/course";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentAgeGroupEditor } from "./StudentAgeGroupEditor";

export default async function AdminStudentsPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isAdmin(profile)) {
    redirect("/student");
  }

  const supabase = await createClient();
  const { data: students, error } = await supabase.rpc("admin_list_students");

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

          {error && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              Could not load students: {error.message}
            </p>
          )}

          <StudentAgeGroupEditor students={(students as StudentDirectoryRow[]) ?? []} />

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student" className="course-link">← Back to dashboard</Link>
          </p>
        </div>
      </main>
    </>
  );
}
