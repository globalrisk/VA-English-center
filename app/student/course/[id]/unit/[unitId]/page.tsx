import { getTranslations } from "@/lib/i18n/server";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LessonListItem } from "@/components/student/LessonListItem";
import { ProgressSummary } from "@/components/student/ProgressSummary";
import { summarizeProgress } from "@/lib/course-progress";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { unitKindLabel } from "@/lib/units";
import type { Course, Lesson, LessonCompletion, Unit } from "@/types/course";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; unitId: string }>;
};

export default async function CourseUnitPage({ params }: PageProps) {
  const t = await getTranslations();
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
  const { data: lessonCompletions } = profile && !userIsAdmin && typedLessons.length > 0
    ? await supabase
        .from("lesson_completions")
        .select("student_id, lesson_id, completed_at")
        .in("lesson_id", typedLessons.map((lesson) => lesson.id))
    : { data: [] };
  const completedLessonIds = new Set(
    ((lessonCompletions as LessonCompletion[] | null) ?? []).map((row) => row.lesson_id)
  );
  const progress = summarizeProgress(
    typedLessons.map((lesson) => lesson.id),
    completedLessonIds
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
              { label: typedCourse.title, href: `/student/course/${courseId}` },
              { label: t(unitKindLabel(typedUnit.kind)) },
            ]}
          />
          <div className="section-header">
            <span className="section-label">{typedCourse.title}</span>
            <h1 className="section-title">{t(unitKindLabel(typedUnit.kind))}</h1>
            <p className="section-sub">{t("Choose a lesson to start learning.")}</p>
          </div>

          {!userIsAdmin ? <ProgressSummary progress={progress} label={t("Unit progress")} /> : null}

          {typedLessons.length === 0 ? (
            <p style={{ color: "var(--ink-light)" }}>{t("No lessons in this unit yet.")}</p>
          ) : (
            <div className="course-grid">
              {typedLessons.map((lesson, index) => (
                <LessonListItem
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                  index={index}
                  completed={completedLessonIds.has(lesson.id)}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
