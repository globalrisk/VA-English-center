"use client";

import { AGE_GROUPS, ageGroupLabel, type AgeGroup } from "@/lib/age-groups";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { StudentDirectoryRow, TestScoreSummary } from "@/types/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  students: StudentDirectoryRow[];
  testScores: TestScoreSummary[];
};

export function StudentAgeGroupEditor({ students, testScores }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleChange(studentId: string, newAgeGroup: AgeGroup) {
    setMessage(null);
    setError(null);
    setPendingId(studentId);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_update_student_age_group", {
      student_id: studentId,
      new_age_group: newAgeGroup,
    });

    setPendingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage(`Updated ${students.find((s) => s.id === studentId)?.email ?? "student"} to ${ageGroupLabel(newAgeGroup)}.`);
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p style={{ color: "var(--red-cta)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {error}
        </p>
      )}
      {message && (
        <p style={{ color: "var(--blue-teal)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {message}
        </p>
      )}

      <div className="course-grid">
        {students
          .filter((student) => student.role === "student")
          .map((student) => {
            const scores = testScores.filter(
              (score) => score.student_id === student.id
            );
            return (
              <article key={student.id} className="course-card" data-color="yellow">
                <h3>{student.email}</h3>
                <p style={{ color: "var(--ink-light)", marginBottom: "0.75rem" }}>
                  Current: <strong>{ageGroupLabel(student.age_group)}</strong>
                </p>
                <Link
                  href={`/admin/students/${student.id}`}
                  className="btn btn-secondary btn-sm admin-student-progress-link"
                >
                  View course progress →
                </Link>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={`age-${student.id}`}>Age group</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <select
                      id={`age-${student.id}`}
                      value={student.age_group}
                      disabled={pendingId === student.id}
                      onChange={(e) => handleChange(student.id, e.target.value as AgeGroup)}
                      style={{ flex: 1 }}
                    >
                      {AGE_GROUPS.map((group) => (
                        <option key={group.value} value={group.value}>
                          {group.label} ({group.description})
                        </option>
                      ))}
                    </select>
                    {pendingId === student.id && <LoadingSpinner size="sm" label="Updating age group" />}
                  </div>
                </div>
                <div className="admin-student-scores">
                  <h4>Permanent test scores</h4>
                  {scores.length > 0 ? (
                    <ul>
                      {scores.map((score) => (
                        <li key={score.id}>
                          <span>
                            {score.course_title} · {score.lesson_title}
                          </span>
                          <strong>
                            {score.correct_count}/{score.total_questions} (
                            {formatPercentage(score.percentage)}%)
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No submitted tests.</p>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      {students.some((s) => s.role === "admin") && (
        <p style={{ marginTop: "1.5rem", color: "var(--ink-light)", fontFamily: "var(--font-hand)" }}>
          Admin: {students.filter((s) => s.role === "admin").map((s) => s.email).join(", ")}
        </p>
      )}

      {students.filter((s) => s.role === "student").length === 0 && (
        <p style={{ color: "var(--ink-light)" }}>No student accounts yet.</p>
      )}
    </div>
  );
}

function formatPercentage(value: number | null) {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}
