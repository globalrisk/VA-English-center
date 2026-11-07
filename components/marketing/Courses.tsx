"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";
import { RevealCard } from "@/components/ui/RevealCard";

export function Courses() {
  const t = useTranslations();
  const courses = [
    {
      color: "pink",
      title: t("Kids English"),
      description: t("Playful lessons for ages 4–10. Songs, games, and stories that make English stick."),
      meta: [t("4–10 yrs"), t("2×/week")],
      illustration: (
        <svg viewBox="0 0 120 100">
          <circle cx="60" cy="50" r="40" fill="#FFB3C6" stroke="#333" strokeWidth="2" />
          <circle cx="48" cy="45" r="5" fill="#333" />
          <circle cx="72" cy="45" r="5" fill="#333" />
          <path d="M45 58 Q60 68 75 58" fill="none" stroke="#333" strokeWidth="2" />
          <text x="60" y="90" textAnchor="middle" fontFamily="Patrick Hand" fontSize="10" fill="#666">{t("Little Learners")}</text>
        </svg>
      ),
    },
    {
      color: "blue",
      title: t("Teen & Exam Prep"),
      description: t("IELTS, TOEIC, and school English. Structured paths with real confidence-building."),
      meta: [t("11–18 yrs"), t("3×/week")],
      illustration: (
        <svg viewBox="0 0 120 100">
          <rect x="30" y="25" width="60" height="45" rx="4" fill="#7EC8E3" stroke="#333" strokeWidth="2" />
          <line x1="60" y1="25" x2="60" y2="70" stroke="#333" strokeWidth="1.5" />
          <text x="42" y="52" fontFamily="Caveat" fontSize="12" fill="#333">IELTS</text>
          <text x="60" y="90" textAnchor="middle" fontFamily="Patrick Hand" fontSize="10" fill="#666">{t("Exam Ready")}</text>
        </svg>
      ),
    },
    {
      color: "yellow",
      title: t("Adult Conversation"),
      description: t("Relaxed speaking clubs and business English. Learn over tea, not textbooks."),
      meta: [t("18+ yrs"), t("Flexible")],
      illustration: (
        <svg viewBox="0 0 120 100">
          <ellipse cx="60" cy="45" rx="35" ry="30" fill="#FFE066" stroke="#333" strokeWidth="2" />
          <path d="M35 55 Q60 75 85 55" fill="none" stroke="#333" strokeWidth="2" />
          <circle cx="48" cy="40" r="4" fill="#333" />
          <circle cx="72" cy="40" r="4" fill="#333" />
          <text x="60" y="90" textAnchor="middle" fontFamily="Patrick Hand" fontSize="10" fill="#666">{t("Coffee Chat")}</text>
        </svg>
      ),
    },
    {
      color: "purple",
      title: t("Private Tutoring"),
      description: t("One teacher, one student. Fully customized to your goals and pace."),
      meta: [t("All ages"), t("Your schedule")],
      illustration: (
        <svg viewBox="0 0 120 100">
          <circle cx="60" cy="50" r="35" fill="#C9A0DC" stroke="#333" strokeWidth="2" opacity="0.8" />
          <text x="60" y="48" textAnchor="middle" fontFamily="Caveat" fontSize="16" fill="#333">{t("1-on-1")}</text>
          <text x="60" y="90" textAnchor="middle" fontFamily="Patrick Hand" fontSize="10" fill="#666">{t("Personal")}</text>
        </svg>
      ),
    },
  ];

  return (
    <section id="courses" className="section courses">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">{t("Our Courses")}</span>
          <h2 className="section-title">{t("Pick Your ")}<span className="title-gold">{t("Adventure")}</span></h2>
          <p className="section-sub">{t("Each course is a little story waiting to unfold")}</p>
        </div>
        <div className="course-grid">
          {courses.map((course, i) => (
            <RevealCard key={course.title} delay={i * 0.1}>
              <article className="course-card" data-color={course.color}>
                <div className="course-illustration">{course.illustration}</div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="course-meta">
                  {course.meta.map((m) => <span key={m}>{m}</span>)}
                </div>
                <a href="#contact" className="course-link">{t("Enroll →")}</a>
              </article>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}
