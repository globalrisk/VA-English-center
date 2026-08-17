import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Doodles } from "@/components/layout/Doodles";
import { Header } from "@/components/layout/Header";
import { ProgressSummary } from "@/components/student/ProgressSummary";
import { ageGroupLabel } from "@/lib/age-groups";
import { summarizeProgress } from "@/lib/course-progress";
import { getCurrentProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { unitKindLabel } from "@/lib/units";
import type {
  Course,
  CourseCompletion,
  Lesson,
  LessonCompletion,
  StudentDirectoryRow,
  Unit,
} from "@/types/course";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentProgressPage({ params }: PageProps) {
  const { id: studentId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !isAdmin(profile)) redirect("/student");

  const supabase = await createClient();
  const { data: directory, error: directoryError } = await supabase.rpc(
    "admin_list_students"
  );
  const student = ((directory as StudentDirectoryRow[] | null) ?? []).find(
    (entry) => entry.id === studentId && entry.role === "student"
  );

  if (directoryError || !student) notFound();

  const { data: assignments, error: assignmentError } = await supabase
    .from("course_age_groups")
    .select("course_id")
    .eq("age_group", student.age_group);
  const courseIds = (assignments ?? []).map((assignment) => assignment.course_id);

  const [coursesResult, unitsResult, lessonsResult, lessonCompletionsResult, courseCompletionsResult] =
    courseIds.length > 0
      ? await Promise.all([
          supabase
            .from("courses")
            .select("id, title, description, cover_image_url, created_at")
            .in("id", courseIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("units")
            .select("id, course_id, kind, order_index")
            .in("course_id", courseIds),
          supabase
            .from("lessons")
            .select("id, course_id, unit_id, title, order_index")
            .in("course_id", courseIds),
          supabase
            .from("lesson_completions")
            .select("student_id, lesson_id, completed_at")
            .eq("student_id", studentId),
          supabase
            .from("course_completions")
            .select("student_id, course_id, completed_at")
            .eq("student_id", studentId),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const loadError =
    assignmentError ||
    coursesResult.error ||
    unitsResult.error ||
    lessonsResult.error ||
    lessonCompletionsResult.error ||
    courseCompletionsResult.error;
  const courses = (coursesResult.data as Course[] | null) ?? [];
  const units = (unitsResult.data as Unit[] | null) ?? [];
  const lessons =
    (lessonsResult.data as Pick<Lesson, "id" | "course_id" | "unit_id" | "title" | "order_index">[] | null) ?? [];
  const lessonCompletions =
    (lessonCompletionsResult.data as LessonCompletion[] | null) ?? [];
  const courseCompletions =
    (courseCompletionsResult.data as CourseCompletion[] | null) ?? [];
  const completedLessonIds = new Set(lessonCompletions.map((row) => row.lesson_id));
  const courseCompletionDates = new Map(
    courseCompletions.map((row) => [row.course_id, row.completed_at])
  );
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const completedCourseCount = courses.filter((course) =>
    Boolean(courseCompletionDates.get(course.id))
  ).length;

  return (
    <>
      <Doodles />
      <Header variant="admin" />
      <main className="section">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Students", href: "/admin/students" },
              { label: student.email },
            ]}
          />

          <div className="section-header">
            <span className="section-label">Student progress</span>
            <h1 className="section-title">{student.email}</h1>
            <p className="section-sub">
              {ageGroupLabel(student.age_group)} · {completedCourseCount} of {courses.length}{" "}
              {courses.length === 1 ? "course" : "courses"} completed
            </p>
          </div>

          {loadError ? (
            <p className="admin-progress-error">
              Could not load this student&apos;s progress: {loadError.message}
            </p>
          ) : courses.length === 0 ? (
            <p className="section-sub">No courses are assigned to this student&apos;s age group.</p>
          ) : (
            <div className="admin-progress-list">
              {courses.map((course) => {
                const courseLessons = lessons
                  .filter((lesson) => lesson.course_id === course.id)
                  .sort((a, b) => {
                    const unitA = unitsById.get(a.unit_id)?.order_index ?? 0;
                    const unitB = unitsById.get(b.unit_id)?.order_index ?? 0;
                    return unitA - unitB || a.order_index - b.order_index;
                  });
                const progress = summarizeProgress(
                  courseLessons.map((lesson) => lesson.id),
                  completedLessonIds,
                  courseCompletionDates.get(course.id) ?? null
                );

                return (
                  <details key={course.id} className="admin-progress-course" open={courses.length === 1}>
                    <summary>
                      <span>
                        <strong>{course.title}</strong>
                        <small>
                          {progress.completed} of {progress.total} lessons · {progress.percentage}%
                        </small>
                      </span>
                      <span className={`admin-progress-status${progress.isComplete ? " is-complete" : ""}`}>
                        {progress.isComplete ? "✓ Completed" : "In progress"}
                      </span>
                    </summary>

                    <div className="admin-progress-course-body">
                      <ProgressSummary progress={progress} />
                      {courseLessons.length > 0 ? (
                        <ul className="admin-progress-lessons">
                          {courseLessons.map((lesson) => {
                            const unit = unitsById.get(lesson.unit_id);
                            const completed = completedLessonIds.has(lesson.id);
                            return (
                              <li key={lesson.id} className={completed ? "is-complete" : ""}>
                                <span>
                                  <small>{unit ? unitKindLabel(unit.kind) : "Lesson"}</small>
                                  <strong>{lesson.title}</strong>
                                </span>
                                <span>{completed ? "✓ Completed" : "Not completed"}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="section-sub">This course has no lessons yet.</p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
