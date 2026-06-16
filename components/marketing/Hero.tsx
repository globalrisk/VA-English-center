import Link from "next/link";
import { HeroIllustration } from "@/components/illustrations/HeroIllustration";

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-content">
          <p className="hero-tag scribble-underline">welcome to our cozy corner</p>
          <h1 className="hero-title">
            Learn English<br />
            <span className="title-rainbow">with Joy &amp; Wonder</span>
          </h1>
          <p className="hero-desc">
            A whimsical space where language blooms like watercolor —
            playful classes, caring teachers, and a community that feels like home.
          </p>
          <div className="hero-actions">
            <a href="#courses" className="btn btn-primary">Explore Courses</a>
            <Link href="/login" className="btn btn-secondary">Student Login</Link>
          </div>
          <div className="hero-badges">
            <span className="badge badge-yellow">500+ Happy Students</span>
            <span className="badge badge-teal">Certified Teachers</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-frame">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}
