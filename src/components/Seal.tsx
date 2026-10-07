/**
 * Minimal rendition of the Pragjyotish College seal: a double ring with a
 * stylized shankha (conch), the college's crest motif. Uses `currentColor`
 * so it can render in navy on light backgrounds or white on dark ones.
 */
export function Seal({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle
        cx="50"
        cy="50"
        r="41"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      {/* conch body */}
      <path
        d="M50 27c9.5 7.4 16 17.8 16 27.4C66 65.8 58.9 73 50 73s-16-7.2-16-18.6C34 44.8 40.5 34.4 50 27Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* central rib */}
      <path
        d="M50 31.5c2.6 9.4 2.8 27.4 0 38"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* side ribs */}
      <path
        d="M42.5 37.5c-3 7.4-3.6 20-.6 28.4M57.5 37.5c3 7.4 3.6 20 .6 28.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* finial */}
      <circle cx="50" cy="22.4" r="2.2" fill="currentColor" />
    </svg>
  );
}

export default Seal;
