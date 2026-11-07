"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  variant?: "default" | "nav" | "menu";
  onAfterLogout?: () => void;
};

export function LogoutButton({ variant = "default", onAfterLogout }: LogoutButtonProps) {
  const t = useTranslations();
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
        {t("Sign Out")}</button>
    );
  }

  if (variant === "menu") {
    return (
      <button type="button" className="account-menu-action" onClick={handleLogout}>
        {t("Sign out")}</button>
    );
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={handleLogout}>
      {t("Sign Out")}</button>
  );
}
