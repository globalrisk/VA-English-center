export function Doodles() {
  return (
    <div className="doodles" aria-hidden="true">
      <svg className="doodle doodle-star" viewBox="0 0 40 40">
        <path
          d="M20 2 L24 14 L36 14 L26 22 L30 36 L20 28 L10 36 L14 22 L4 14 L16 14 Z"
          fill="#FFE066"
          stroke="#333"
          strokeWidth="1.5"
        />
      </svg>
      <svg className="doodle doodle-heart" viewBox="0 0 30 30">
        <path
          d="M15 26 C5 18 2 10 8 6 C12 3 15 8 15 8 C15 8 18 3 22 6 C28 10 25 18 15 26 Z"
          fill="#FFB3C6"
          stroke="#333"
          strokeWidth="1.5"
        />
      </svg>
      <svg className="doodle doodle-paw" viewBox="0 0 36 36">
        <ellipse cx="10" cy="14" rx="5" ry="6" fill="#333" />
        <ellipse cx="26" cy="14" rx="5" ry="6" fill="#333" />
        <ellipse cx="6" cy="24" rx="4" ry="5" fill="#333" />
        <ellipse cx="30" cy="24" rx="4" ry="5" fill="#333" />
        <ellipse cx="18" cy="28" rx="7" ry="6" fill="#333" />
      </svg>
      <svg className="doodle doodle-squiggle" viewBox="0 0 60 20">
        <path
          d="M2 10 Q15 2, 30 10 T58 10"
          fill="none"
          stroke="#7EC8E3"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <svg className="doodle doodle-zigzag" viewBox="0 0 50 20">
        <path
          d="M2 10 L10 4 L18 16 L26 4 L34 16 L42 4 L48 10"
          fill="none"
          stroke="#C9A0DC"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
