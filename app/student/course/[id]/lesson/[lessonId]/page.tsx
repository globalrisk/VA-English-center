import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { LessonPageContent } from "@/components/student/LessonPageContent";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/types/course";
import Link from "next/link";
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

  const { data: unitLessons } = await supabase
    .from("lessons")
    .select("id, order_index")
    .eq("unit_id", typedLesson.unit_id)
    .order("order_index", { ascending: true });

  const lessonIndex =
    (unitLessons as Pick<Lesson, "id" | "order_index">[])?.findIndex((l) => l.id === lessonId) ?? 0;

  const isTestLesson = typedLesson.lesson_type === "test";

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin={userIsAdmin} />
      <main className={`section ${isTestLesson ? "section-test" : ""}`}>
        <div className={isTestLesson ? "container container-test" : "container"}>
          <p style={{ marginBottom: isTestLesson ? "1rem" : "1.5rem" }}>
            <Link
              href={`/student/course/${courseId}/unit/${typedLesson.unit_id}`}
              className="course-link"
            >
              ← Back to lessons
            </Link>
          </p>

          <LessonPageContent lesson={typedLesson} index={lessonIndex} />
        </div>
      </main>
    </>
  );
}
