import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LessonPageContent } from "@/components/student/LessonPageContent";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { unitKindLabel } from "@/lib/units";
import type { Lesson, LessonCompletion, TestAttempt, Unit } from "@/types/course";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function LessonDetailPage({ params }: PageProps) {
  const { id: courseId, lessonId } = await params;
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

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, course_id, unit_id, title, content, image_url, video_url, order_index, lesson_type, embed_url, game_cards, builtin_game, test_content"
    )
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .single();

  if (lessonError || !lesson) {
    notFound();
  }

  const typedLesson = lesson as Lesson;

  const { data: unit } = await supabase
    .from("units")
    .select("id, course_id, kind, order_index")
    .eq("id", typedLesson.unit_id)
    .single();
  const typedUnit = unit as Unit | null;

  const { data: unitLessons } = await supabase
    .from("lessons")
    .select("id, order_index")
    .eq("unit_id", typedLesson.unit_id)
    .order("order_index", { ascending: true });

  const lessonIndex =
    (unitLessons as Pick<Lesson, "id" | "order_index">[])?.findIndex((l) => l.id === lessonId) ?? 0;

  const isTestLesson = typedLesson.lesson_type === "test";
  let testAttempt: TestAttempt | null = null;
  let lessonCompletion: LessonCompletion | null = null;

  if (profile && !userIsAdmin) {
    const [completionResult, attemptResult] = await Promise.all([
      supabase
        .from("lesson_completions")
        .select("student_id, lesson_id, completed_at")
        .eq("lesson_id", lessonId)
        .maybeSingle(),
      isTestLesson
        ? supabase
            .from("test_attempts")
            .select(
              "id, student_id, lesson_id, started_at, time_limit_minutes, submitted_at, correct_count, total_questions, percentage, elapsed_seconds"
            )
            .eq("student_id", profile.id)
            .eq("lesson_id", lessonId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    lessonCompletion = (completionResult.data as LessonCompletion | null) ?? null;
    testAttempt = (attemptResult.data as TestAttempt | null) ?? null;
  }

  return (
    <>
      <Doodles />
      <Header variant={userIsAdmin ? "admin" : "student"} />
      <main className={`section ${isTestLesson ? "section-test" : ""}`}>
        <div className={isTestLesson ? "container container-test" : "container"}>
          <Breadcrumbs
            items={[
              { label: userIsAdmin ? "Admin" : "My Learning", href: userIsAdmin ? "/admin" : "/student" },
              { label: userIsAdmin ? "Student courses" : "Courses", href: "/student/courses" },
              { label: course.title, href: `/student/course/${courseId}` },
              {
                label: typedUnit ? unitKindLabel(typedUnit.kind) : "Lessons",
                href: `/student/course/${courseId}/unit/${typedLesson.unit_id}`,
              },
              { label: typedLesson.title },
            ]}
          />

          <LessonPageContent
            lesson={typedLesson}
            index={lessonIndex}
            isAdmin={userIsAdmin}
            testAttempt={testAttempt}
            initialCompletion={lessonCompletion}
          />
        </div>
      </main>
    </>
  );
}
