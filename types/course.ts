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
  created_at: string;
  lessons?: Lesson[];
};
