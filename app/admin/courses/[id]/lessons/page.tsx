import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course, Lesson } from "@/types/course";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonManager } from "./LessonManager";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCourseLessonsPage({ params }: PageProps) {
  const profile = await getCurrentProfile();

  if (!profile || !isAdmin(profile)) {
    redirect("/student");
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("id", id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select(
      "id, course_id, title, content, image_url, video_url, order_index, lesson_type, embed_url, game_cards, builtin_game"
    )
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  const typedCourse = course as Course;

  return (
    <>
      <Doodles />
      <Header variant="student" isAdmin />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Admin · Lessons</span>
            <h1 className="section-title">
              {typedCourse.title}
            </h1>
            <p className="section-sub">
              Create, edit, and delete lessons for this course.
            </p>
          </div>

          <p style={{ marginBottom: "1.5rem" }}>
            <Link href="/admin/courses" className="course-link">← Back to courses</Link>
          </p>

          {lessonsError && (
            <p style={{ color: "var(--red-cta)", marginBottom: "1rem" }}>
              Could not load lessons: {lessonsError.message}
            </p>
          )}

          <LessonManager courseId={id} lessons={(lessons as Lesson[]) ?? []} />
        </div>
      </main>
    </>
  );
}
