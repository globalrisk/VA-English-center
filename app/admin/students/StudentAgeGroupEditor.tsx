"use client";

import { AGE_GROUPS, ageGroupLabel, type AgeGroup } from "@/lib/age-groups";
import { createClient } from "@/lib/supabase/client";
import type { StudentDirectoryRow } from "@/types/course";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  students: StudentDirectoryRow[];
};

export function StudentAgeGroupEditor({ students }: Props) {
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
          .map((student) => (
          <article key={student.id} className="course-card" data-color="yellow">
            <h3>{student.email}</h3>
            <p style={{ color: "var(--ink-light)", marginBottom: "0.75rem" }}>
              Current: <strong>{ageGroupLabel(student.age_group)}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor={`age-${student.id}`}>Age group</label>
              <select
                id={`age-${student.id}`}
                value={student.age_group}
                disabled={pendingId === student.id}
                onChange={(e) => handleChange(student.id, e.target.value as AgeGroup)}
              >
                {AGE_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label} ({group.description})
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))}
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
