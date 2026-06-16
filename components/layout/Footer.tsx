import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-text">VA English Center</span>
          <p>Learning English with joy, every day.</p>
        </div>
        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#courses">Courses</a>
          <a href="#contact">Contact</a>
        </div>
        <p className="footer-copy">&copy; 2026 VA English Center. Made with ♥ and doodles.</p>
      </div>
    </footer>
  );
}
