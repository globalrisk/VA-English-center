import { TiltCard } from "@/components/ui/TiltCard";

export function About() {
  return (
    <section id="about" className="section about">
      <div className="container">
        <div className="section-header">
          <span className="section-label">About Us</span>
          <h2 className="section-title">
            A Little Corner of<br />
            <span className="scribble-underline">English Magic</span>
          </h2>
        </div>
        <div className="about-grid">
          <div className="about-text">
            <p>
              At <strong>VA English Center</strong>, we believe learning a language should feel
              like opening a sketchbook — full of color, curiosity, and gentle encouragement.
            </p>
            <p>
              Whether you&apos;re a little learner doodling your first words, a teen preparing for exams,
              or an adult sipping tea while practicing conversation — there&apos;s a cozy spot here for you.
            </p>
            <ul className="about-list">
              <li>Small classes, big attention</li>
              <li>Creative, conversation-first approach</li>
              <li>Warm community &amp; flexible schedules</li>
            </ul>
          </div>
          <div className="about-icons">
            <TiltCard className="icon-sticker">
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="#FFE066" stroke="#333" strokeWidth="2" />
                <text x="40" y="48" textAnchor="middle" fontFamily="Caveat" fontSize="22" fill="#333">Tea</text>
                <text x="40" y="62" textAnchor="middle" fontFamily="Patrick Hand" fontSize="10" fill="#666">Time Club</text>
              </svg>
            </TiltCard>
            <TiltCard className="icon-sticker">
              <svg viewBox="0 0 80 80">
                <rect x="15" y="20" width="50" height="40" rx="4" fill="#7EC8E3" stroke="#333" strokeWidth="2" />
                <text x="40" y="48" textAnchor="middle" fontFamily="Caveat" fontSize="18" fill="#333">Books</text>
              </svg>
            </TiltCard>
            <TiltCard className="icon-sticker">
              <svg viewBox="0 0 80 80">
                <ellipse cx="40" cy="45" rx="30" ry="25" fill="#FFB3C6" stroke="#333" strokeWidth="2" />
                <text x="40" y="50" textAnchor="middle" fontFamily="Caveat" fontSize="16" fill="#333">Chat</text>
              </svg>
            </TiltCard>
            <TiltCard className="icon-sticker">
              <svg viewBox="0 0 80 80">
                <polygon points="40,10 55,35 70,35 58,50 63,70 40,58 17,70 22,50 10,35 25,35" fill="#C9A0DC" stroke="#333" strokeWidth="2" />
                <text x="40" y="48" textAnchor="middle" fontFamily="Caveat" fontSize="14" fill="#333">Star</text>
              </svg>
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}
