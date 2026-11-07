"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { AGE_GROUPS, type AgeGroup } from "@/lib/age-groups";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("kids");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          setError(authError.message);
          return;
        }
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match. Please try again.");
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/student`,
            data: { age_group: ageGroup },
          },
        });
        if (authError) {
          setError(authError.message);
          return;
        }

        // Email confirmation enabled — no session until user confirms
        if (!data.session) {
          setSuccess(
            "Account created! Check your email and click the confirmation link, then sign in here."
          );
          setMode("login");
          return;
        }
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center" }}>
      <div className="container" style={{ maxWidth: "480px" }}>
        <div className="contact-card" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <div className="login-language"><span className="section-label">{t("Student Portal")}</span><LanguageSwitcher /></div>
            <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>
              {mode === "login" ? t("Welcome back") : t("Create account")}
            </h1>
            <p style={{ color: "var(--ink-light)", marginBottom: "1.5rem" }}>
              {t("Sign in to access your courses and lessons.")}</p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">{t("Email")}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">{t("Password")}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("Your password")}
                  required
                  minLength={6}
                />
              </div>
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="confirm-password">{t("Confirm password")}</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("Enter password again")}
                    required
                    minLength={6}
                  />
                </div>
              )}
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="age-group">{t("Age group")}</label>
                  <select
                    id="age-group"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                    required
                  >
                    {AGE_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {t(group.label)} ({t(group.description)})
                      </option>
                    ))}
                  </select>
                  <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                    {t("You will only see courses for your age group.")}</p>
                </div>
              )}
              {error && (
                <p style={{ color: "var(--red-cta)", fontFamily: "var(--font-hand)" }}>{t(error)}</p>
              )}
              {success && (
                <p
                  style={{
                    color: "var(--blue-teal)",
                    fontFamily: "var(--font-hand)",
                    lineHeight: 1.5,
                  }}
                >
                  {t(success)}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-full btn-loading" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    {mode === "login" ? t("Signing in…") : t("Signing up…")}
                  </>
                ) : (
                  mode === "login" ? t("Sign In ✦") : t("Sign Up ✦")
                )}
              </button>
            </form>
            <p style={{ marginTop: "1rem", textAlign: "center", fontFamily: "var(--font-hand)" }}>
              {mode === "login" ? (
                <>
                  {t("No account?")}{" "}
                  <button
                    type="button"
                    className="course-link"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => {
                      setMode("signup");
                      setConfirmPassword("");
                      setError(null);
                    }}
                  >
                    {t("Sign up")}</button>
                </>
              ) : (
                <>
                  {t("Already have an account?")}{" "}
                  <button
                    type="button"
                    className="course-link"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => {
                      setMode("login");
                      setConfirmPassword("");
                      setError(null);
                    }}
                  >
                    {t("Sign in")}</button>
                </>
              )}
            </p>
            <p style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link href="/" className="course-link">{t("← Back to home")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
