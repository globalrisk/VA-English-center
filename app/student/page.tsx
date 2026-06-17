import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
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

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin={userIsAdmin} />
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
              <a href="/student/courses" className="course-link">Go to courses →</a>
            </article>
            {userIsAdmin && (
              <article className="course-card" data-color="pink">
                <h3>Manage students</h3>
                <p>Set age groups so each student sees the right courses.</p>
                <Link href="/admin/students" className="course-link">Open admin →</Link>
              </article>
            )}
            <article className="course-card" data-color="yellow">
              <h3>Need help?</h3>
              <p>Contact your teacher or the center for support.</p>
              <a href="/#contact" className="course-link">Contact us →</a>
            </article>
          </div>
        </div>
      </main>
    </>
  );
}
