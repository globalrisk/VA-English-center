"use client";

import Link from "next/link";
import { useState } from "react";

type HeaderProps = {
  variant?: "marketing" | "student";
  isLoggedIn?: boolean;
};

export function Header({ variant = "marketing", isLoggedIn = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <nav className="nav container">
        <Link href="/" className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">VA English</span>
        </Link>
        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span></span><span></span><span></span>
        </button>
        <ul className={`nav-links${menuOpen ? " open" : ""}`}>
          {variant === "marketing" ? (
            <>
              <li><a href="#about" onClick={() => setMenuOpen(false)}>About</a></li>
              <li><a href="#courses" onClick={() => setMenuOpen(false)}>Courses</a></li>
              <li><a href="#features" onClick={() => setMenuOpen(false)}>Why Us</a></li>
              <li><a href="#gallery" onClick={() => setMenuOpen(false)}>Life</a></li>
              <li>
                <a href="#contact" className="nav-cta" onClick={() => setMenuOpen(false)}>
                  Join Us
                </a>
              </li>
              <li>
                {isLoggedIn ? (
                  <Link href="/student" onClick={() => setMenuOpen(false)}>My Dashboard</Link>
                ) : (
                  <Link href="/login" onClick={() => setMenuOpen(false)}>Student Login</Link>
                )}
              </li>
            </>
          ) : (
            <>
              <li><Link href="/student" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
              <li><Link href="/student/courses" onClick={() => setMenuOpen(false)}>My Courses</Link></li>
              <li><Link href="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
