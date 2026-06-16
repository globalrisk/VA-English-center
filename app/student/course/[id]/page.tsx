import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import type { Course, Lesson } from "@/types/course";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url")
    .eq("id", id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, course_id, title, content, image_url, video_url, order_index")
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  const typedCourse = course as Course;
  const typedLessons = (lessons as Lesson[]) ?? [];

  return (
    <>
      <Doodles />
      <Header variant="student" />
      <main className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Course</span>
            <h1 className="section-title">{typedCourse.title}</h1>
            {typedCourse.description && (
              <p className="section-sub">{typedCourse.description}</p>
            )}
          </div>

          {typedLessons.length === 0 ? (
            <p style={{ color: "var(--ink-light)" }}>Lessons coming soon.</p>
          ) : (
            <div className="course-grid">
              {typedLessons.map((lesson, index) => (
                <article key={lesson.id} className="course-card" data-color="blue">
                  <h3>Lesson {index + 1}: {lesson.title}</h3>
                  {lesson.content && <p>{lesson.content}</p>}
                  {lesson.image_url && (
                    <img
                      src={lesson.image_url}
                      alt={lesson.title}
                      style={{ width: "100%", borderRadius: "12px", marginTop: "0.75rem" }}
                    />
                  )}
                  {lesson.video_url && (
                    <div style={{ marginTop: "1rem" }}>
                      <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="course-link">
                        Watch video →
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <p style={{ marginTop: "2rem" }}>
            <Link href="/student/courses" className="course-link">← All courses</Link>
          </p>
        </div>
      </main>
    </>
  );
}
