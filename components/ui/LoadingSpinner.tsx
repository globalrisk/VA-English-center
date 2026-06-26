"use client";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

export function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
  return (
    <span
      className={`loading-spinner loading-spinner--${size}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <svg className="loading-spinner-star" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 2 L24 14 L36 14 L26 22 L30 36 L20 28 L10 36 L14 22 L4 14 L16 14 Z"
          fill="var(--yellow-gold)"
          stroke="var(--ink)"
          strokeWidth="1.5"
        />
      </svg>
      {label && <span className="loading-spinner-label">{label}</span>}
    </span>
  );
}
