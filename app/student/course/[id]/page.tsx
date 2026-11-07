import { getTranslations } from "@/lib/i18n/server";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProgressSummary } from "@/components/student/ProgressSummary";
import { UnitListItem } from "@/components/student/UnitListItem";
import { summarizeProgress } from "@/lib/course-progress";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseCompletion, Lesson, LessonCompletion, Unit } from "@/types/course";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailPage({ params }: PageProps) {
  const t = await getTranslations();
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
  const [{ data: lessonCompletions }, { data: courseCompletion }] =
    profile && !userIsAdmin && typedLessons.length > 0
      ? await Promise.all([
          supabase.from("lesson_completions").select("student_id, lesson_id, completed_at").in("lesson_id", typedLessons.map((lesson) => lesson.id)),
          supabase.from("course_completions").select("student_id, course_id, completed_at").eq("course_id", id).maybeSingle(),
        ])
      : [{ data: [] }, { data: null }];
  const completedLessonIds = new Set(
    ((lessonCompletions as LessonCompletion[] | null) ?? []).map((row) => row.lesson_id)
  );
  const progress = summarizeProgress(
    typedLessons.map((lesson) => lesson.id),
    completedLessonIds,
    (courseCompletion as CourseCompletion | null)?.completed_at ?? null
  );

  return (
    <>
      <Doodles />
      <Header variant={userIsAdmin ? "admin" : "student"} />
      <main className="section">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: userIsAdmin ? t("Admin") : t("My Learning"), href: userIsAdmin ? "/admin" : "/student" },
              { label: userIsAdmin ? t("Student courses") : t("Courses"), href: "/student/courses" },
              { label: typedCourse.title },
            ]}
          />
          <div className="section-header">
            <span className="section-label">{t("Course")}</span>
            <h1 className="section-title">{typedCourse.title}</h1>
            {typedCourse.description && (
              <p className="section-sub">{typedCourse.description}</p>
            )}
          </div>

          {!userIsAdmin ? <ProgressSummary progress={progress} /> : null}

          {typedUnits.length === 0 ? (
            <p style={{ color: "var(--ink-light)" }}>{t("Units coming soon.")}</p>
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
                    completedCount={typedLessons.filter((lesson) => lesson.unit_id === unit.id && completedLessonIds.has(lesson.id)).length}
                  />
                );
              })}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
