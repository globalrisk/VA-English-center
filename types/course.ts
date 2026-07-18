import type { AgeGroup } from "@/lib/age-groups";
import type { BuiltinGame } from "@/lib/builtin-games";
import type { LessonType } from "@/lib/lesson-types";
import type { TestContent } from "@/lib/test-content";
import type { UnitKind } from "@/lib/units";

export type GameCard = {
  term: string;
  definition: string;
};

export type Unit = {
  id: string;
  course_id: string;
  kind: UnitKind;
  order_index: number;
};

export type Lesson = {
  id: string;
  course_id: string;
  unit_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  order_index: number;
  lesson_type?: LessonType;
  embed_url?: string | null;
  builtin_game?: BuiltinGame | null;
  game_cards?: GameCard[];
  test_content?: TestContent | Record<string, unknown> | null;
};

export type CourseAgeGroupRow = {
  age_group: AgeGroup;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  course_age_groups?: CourseAgeGroupRow[];
  units?: Unit[];
  lessons?: Lesson[];
};

export function getCourseAgeGroups(course: Course): AgeGroup[] {
  return course.course_age_groups?.map((row) => row.age_group) ?? [];
}

export type Profile = {
  id: string;
  age_group: AgeGroup;
  role: "student" | "admin";
  created_at: string;
};

export type StudentDirectoryRow = {
  id: string;
  email: string;
  age_group: AgeGroup;
  role: "student" | "admin";
  created_at: string;
};
