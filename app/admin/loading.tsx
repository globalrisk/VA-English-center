export default function Loading() {
  return (
    <main className="loading-page section">
      <div className="loading-page-inner">
        <span
          className="loading-spinner loading-spinner--lg"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <svg className="loading-spinner-star" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M20 2 L24 14 L36 14 L26 22 L30 36 L20 28 L10 36 L14 22 L4 14 L16 14 Z"
              fill="var(--yellow-gold)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <p className="loading-page-caption">Loading…</p>
      </div>
    </main>
  );
}
