"use client";

import { AGE_GROUPS, type AgeGroup } from "@/lib/age-groups";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
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
            <span className="section-label">Student Portal</span>
            <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ color: "var(--ink-light)", marginBottom: "1.5rem" }}>
              Sign in to access your courses and lessons.
            </p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
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
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  minLength={6}
                />
              </div>
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter password again"
                    required
                    minLength={6}
                  />
                </div>
              )}
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="age-group">Age group</label>
                  <select
                    id="age-group"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                    required
                  >
                    {AGE_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label} ({group.description})
                      </option>
                    ))}
                  </select>
                  <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                    You will only see courses for your age group.
                  </p>
                </div>
              )}
              {error && (
                <p style={{ color: "var(--red-cta)", fontFamily: "var(--font-hand)" }}>{error}</p>
              )}
              {success && (
                <p
                  style={{
                    color: "var(--blue-teal)",
                    fontFamily: "var(--font-hand)",
                    lineHeight: 1.5,
                  }}
                >
                  {success}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Sign In ✦" : "Sign Up ✦"}
              </button>
            </form>
            <p style={{ marginTop: "1rem", textAlign: "center", fontFamily: "var(--font-hand)" }}>
              {mode === "login" ? (
                <>
                  No account?{" "}
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
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
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
                    Sign in
                  </button>
                </>
              )}
            </p>
            <p style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link href="/" className="course-link">← Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
