import type { CSSProperties } from "react";
import { TiltCard } from "@/components/ui/TiltCard";

export function Gallery() {
  return (
    <section id="gallery" className="section gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Student Life</span>
          <h2 className="section-title">Moments from Our <span className="title-gold">Sketchbook</span></h2>
        </div>
        <div className="gallery-collage">
          <TiltCard className="gallery-item gallery-item--large">
            <div className="gallery-art" style={{ "--accent": "#FFB3C6" } as CSSProperties}>
              <svg viewBox="0 0 300 250">
                <rect width="300" height="250" fill="#FCF9F2" />
                <ellipse cx="150" cy="140" rx="60" ry="70" fill="#FFF5E6" stroke="#333" strokeWidth="2" />
                <path d="M90 120 Q80 60 150 50 Q220 60 210 120" fill="#7EC8E3" stroke="#333" strokeWidth="2" />
                <circle cx="130" cy="125" r="6" fill="#333" />
                <circle cx="170" cy="125" r="6" fill="#333" />
                <path d="M125 150 Q150 165 175 150" fill="none" stroke="#333" strokeWidth="2" />
                <rect x="120" y="175" width="60" height="40" rx="3" fill="#FFE066" stroke="#333" strokeWidth="1.5" />
                <text x="20" y="230" fontFamily="Patrick Hand" fontSize="14" fill="#888">Reading Club ☕</text>
              </svg>
            </div>
          </TiltCard>
          <TiltCard className="gallery-item">
            <div className="gallery-art" style={{ "--accent": "#FFE066" } as CSSProperties}>
              <svg viewBox="0 0 200 180">
                <rect width="200" height="180" fill="#FCF9F2" />
                <circle cx="100" cy="80" r="50" fill="#FFE066" stroke="#333" strokeWidth="2" opacity="0.7" />
                <text x="100" y="85" textAnchor="middle" fontFamily="Caveat" fontSize="24" fill="#333">🎵</text>
                <text x="100" y="160" textAnchor="middle" fontFamily="Patrick Hand" fontSize="12" fill="#888">Music &amp; Songs</text>
              </svg>
            </div>
          </TiltCard>
          <TiltCard className="gallery-item">
            <div className="gallery-art" style={{ "--accent": "#7EC8E3" } as CSSProperties}>
              <svg viewBox="0 0 200 180">
                <rect width="200" height="180" fill="#FCF9F2" />
                <ellipse cx="100" cy="90" rx="55" ry="45" fill="#7EC8E3" stroke="#333" strokeWidth="2" opacity="0.6" />
                <text x="100" y="95" textAnchor="middle" fontFamily="Caveat" fontSize="20" fill="#333">Art Day</text>
                <text x="100" y="160" textAnchor="middle" fontFamily="Patrick Hand" fontSize="12" fill="#888">Creative Projects</text>
              </svg>
            </div>
          </TiltCard>
          <TiltCard className="gallery-item gallery-item--wide">
            <div className="gallery-art" style={{ "--accent": "#C9A0DC" } as CSSProperties}>
              <svg viewBox="0 0 400 160">
                <rect width="400" height="160" fill="#FCF9F2" />
                <circle cx="80" cy="70" r="30" fill="#FFB3C6" stroke="#333" strokeWidth="1.5" />
                <circle cx="160" cy="70" r="30" fill="#7EC8E3" stroke="#333" strokeWidth="1.5" />
                <circle cx="240" cy="70" r="30" fill="#FFE066" stroke="#333" strokeWidth="1.5" />
                <circle cx="320" cy="70" r="30" fill="#C9A0DC" stroke="#333" strokeWidth="1.5" />
                <text x="200" y="130" textAnchor="middle" fontFamily="Patrick Hand" fontSize="14" fill="#888">Our wonderful community ✦</text>
              </svg>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
