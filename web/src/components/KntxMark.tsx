/**
 * KNTX brand mark — a diamond ring (rotated square with a square cut-out).
 * Inherits color from `currentColor`, so set `className="text-accent"` (or any
 * text color) on the element. Crisp at any size; no external asset needed.
 */
export function KntxMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer diamond with an inner diamond hole (even-odd fill). */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1 L23 12 L12 23 L1 12 Z M12 8 L16 12 L12 16 L8 12 Z"
        fill="currentColor"
      />
    </svg>
  );
}
