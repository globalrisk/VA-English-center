import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/course";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, age_group, role, created_at")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}
