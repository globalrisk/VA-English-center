import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { LessonListItem } from "@/components/student/LessonListItem";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { unitKindLabel } from "@/lib/units";
import type { Course, Lesson, Unit } from "@/types/course";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; unitId: string }>;
};

export default async function CourseUnitPage({ params }: PageProps) {
  const { id: courseId, unitId } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const userIsAdmin = isAdmin(profile);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, course_id, kind, order_index")
    .eq("id", unitId)
    .eq("course_id", courseId)
    .single();

  if (unitError || !unit) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, course_id, unit_id, title, content, order_index, lesson_type, embed_url, builtin_game"
    )
    .eq("unit_id", unitId)
    .order("order_index", { ascending: true });

  const typedCourse = course as Course;
  const typedUnit = unit as Unit;
  const typedLessons = ((lessons as Lesson[]) ?? []).sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin={userIsAdmin} />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">{typedCourse.title}</span>
            <h1 className="section-title">{unitKindLabel(typedUnit.kind)}</h1>
            <p className="section-sub">Choose a lesson to start learning.</p>
          </div>

          {typedLessons.length === 0 ? (
            <p style={{ color: "var(--ink-light)" }}>No lessons in this unit yet.</p>
          ) : (
            <div className="course-grid">
              {typedLessons.map((lesson, index) => (
                <LessonListItem
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                  index={index}
                />
              ))}
            </div>
          )}

          <p style={{ marginTop: "2rem" }}>
            <Link href={`/student/course/${courseId}`} className="course-link">
              ← Back to units
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
