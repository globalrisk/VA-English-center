import type { AgeGroup } from "@/lib/age-groups";

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  order_index: number;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  age_group: AgeGroup;
  created_at: string;
  lessons?: Lesson[];
};

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
