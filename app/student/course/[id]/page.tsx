import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { UnitListItem } from "@/components/student/UnitListItem";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course, Lesson, Unit } from "@/types/course";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const userIsAdmin = isAdmin(profile);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url")
    .eq("id", id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: units } = await supabase
    .from("units")
    .select("id, course_id, kind, order_index")
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, unit_id")
    .eq("course_id", id);

  const typedCourse = course as Course;
  const typedUnits = ((units as Unit[]) ?? []).sort((a, b) => a.order_index - b.order_index);
  const typedLessons = (lessons as Pick<Lesson, "id" | "unit_id">[]) ?? [];

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin={userIsAdmin} />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Course</span>
            <h1 className="section-title">{typedCourse.title}</h1>
            {typedCourse.description && (
              <p className="section-sub">{typedCourse.description}</p>
            )}
          </div>

          {typedUnits.length === 0 ? (
            <p style={{ color: "var(--ink-light)" }}>Units coming soon.</p>
          ) : (
            <div className="unit-grid">
              {typedUnits.map((unit) => {
                const lessonCount = typedLessons.filter((l) => l.unit_id === unit.id).length;
                return (
                  <UnitListItem
                    key={unit.id}
                    courseId={id}
                    unit={unit}
                    lessonCount={lessonCount}
                  />
                );
              })}
            </div>
          )}

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student/courses" className="course-link">
              ← All courses
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
