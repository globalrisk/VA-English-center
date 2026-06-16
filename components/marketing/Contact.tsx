"use client";

import { FormEvent, useState } from "react";

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Form submitted:", data);
    setName((data.name as string) || "friend");
    setSubmitted(true);
  }

  return (
    <section id="contact" className="section contact">
      <div className="container">
        <div className="contact-card">
          <div className="contact-info">
            <span className="section-label">Get in Touch</span>
            <h2 className="section-title">
              Ready to Start<br />
              <span className="title-rainbow">Your Journey?</span>
            </h2>
            <p>Book a free trial class or drop us a message. We&apos;d love to meet you!</p>
            <ul className="contact-details">
              <li>
                <span className="contact-icon">📍</span>
                <span>123 Learning Street, Your City</span>
              </li>
              <li>
                <span className="contact-icon">📞</span>
                <span>+84 123 456 789</span>
              </li>
              <li>
                <span className="contact-icon">✉️</span>
                <span>hello@vaenglish.com</span>
              </li>
            </ul>
          </div>
          {submitted ? (
            <div className="form-success">
              <p>Thank you, {name}! ✦</p>
              <p style={{ fontFamily: "Nunito, sans-serif", fontSize: "1rem", color: "#666", marginTop: "0.5rem" }}>
                We&apos;ll get back to you soon. Can&apos;t wait to meet you!
              </p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input type="text" id="name" name="name" placeholder="e.g. Minh" required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@email.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="course">Interested In</label>
                <select id="course" name="course">
                  <option value="">Select a course...</option>
                  <option value="kids">Kids English</option>
                  <option value="teen">Teen &amp; Exam Prep</option>
                  <option value="adult">Adult Conversation</option>
                  <option value="private">Private Tutoring</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={4} placeholder="Tell us about yourself..." />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Send Message ✦</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
