import { getTranslations } from "@/lib/i18n/server";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const t = await getTranslations();
  return (
    <Suspense
      fallback={
        <main className="loading-page section">
          <div className="loading-page-inner">
            <p className="loading-page-caption">{t("Loading…")}</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
