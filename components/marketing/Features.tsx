"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";
import { RevealCard } from "@/components/ui/RevealCard";

export function Features() {
  const t = useTranslations();
  const features = [
    {
      title: t("Certified Teachers"),
      description: t("Experienced, passionate educators who truly care about your progress."),
      icon: (
        <svg viewBox="0 0 60 60">
          <path d="M10 30 L25 45 L50 15" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30" cy="30" r="28" fill="#FFE066" stroke="#333" strokeWidth="2" opacity="0.5" />
        </svg>
      ),
    },
    {
      title: t("Creative Methods"),
      description: t("Art, music, and real conversations — not boring drills."),
      icon: (
        <svg viewBox="0 0 60 60">
          <rect x="8" y="15" width="44" height="35" rx="4" fill="#7EC8E3" stroke="#333" strokeWidth="2" />
          <line x1="8" y1="25" x2="52" y2="25" stroke="#333" strokeWidth="1.5" />
          <text x="30" y="42" textAnchor="middle" fontFamily="Caveat" fontSize="14" fill="#333">{t("fun!")}</text>
        </svg>
      ),
    },
    {
      title: t("Small Classes"),
      description: t("Max 8 students per class. Everyone gets heard and helped."),
      icon: (
        <svg viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="25" fill="#FFB3C6" stroke="#333" strokeWidth="2" opacity="0.6" />
          <text x="30" y="35" textAnchor="middle" fontFamily="Patrick Hand" fontSize="12" fill="#333">{t("small")}</text>
        </svg>
      ),
    },
    {
      title: t("Flexible Schedule"),
      description: t("Morning, evening, and weekend slots to fit your life."),
      icon: (
        <svg viewBox="0 0 60 60">
          <path d="M15 45 L30 15 L45 45 Z" fill="#C9A0DC" stroke="#333" strokeWidth="2" opacity="0.7" />
          <circle cx="30" cy="38" r="5" fill="#FFE066" stroke="#333" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="section features">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">{t("Why Choose Us")}</span>
          <h2 className="section-title"><span className="scribble-underline">{t("The VA Difference")}</span></h2>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <RevealCard key={feature.title}>
              <div className="feature-item">
                <div className="feature-icon">{feature.icon}</div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}
