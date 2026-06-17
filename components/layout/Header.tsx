"use client";

import { LogoutButton } from "@/components/student/LogoutButton";
import Link from "next/link";
import { useState } from "react";

type HeaderProps = {
  variant?: "marketing" | "student";
  isLoggedIn?: boolean;
  isAdmin?: boolean;
};

export function Header({ variant = "marketing", isLoggedIn = false, isAdmin = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showSignOut = variant === "student" || isLoggedIn;

  return (
    <header className="header">
      <nav className="nav container">
        <Link href="/" className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">VA English</span>
        </Link>
        <div className="nav-end">
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
              {isAdmin && (
                <li><Link href="/admin/students" onClick={() => setMenuOpen(false)}>Admin</Link></li>
              )}
              <li><Link href="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
            </>
          )}
          </ul>
          {showSignOut && (
            <LogoutButton variant="nav" onAfterLogout={() => setMenuOpen(false)} />
          )}
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
    </header>
  );
}
