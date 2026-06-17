"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  variant?: "default" | "nav";
  onAfterLogout?: () => void;
};

export function LogoutButton({ variant = "default", onAfterLogout }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onAfterLogout?.();
    router.push("/");
    router.refresh();
  }

  if (variant === "nav") {
    return (
      <button type="button" className="nav-sign-out" onClick={handleLogout}>
        Sign Out
      </button>
    );
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={handleLogout}>
      Sign Out
    </button>
  );
}
