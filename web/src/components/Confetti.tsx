"use client";

// Lightweight, dependency-free confetti burst. Mounts once (e.g. when a session
// settles), plays a single fall animation, then idles. Pure CSS transforms/opacity,
// pointer-events: none, and disabled under prefers-reduced-motion. Non-technical
// people read "settled" much more warmly when it's celebrated.

const COLORS = ["#6b52f9", "#8270fb", "#22d3a8", "#ffffff", "#a78bfa"];
const PIECES = 44;

// Computed once at module load (outside React render) so the burst is varied but
// the render stays pure — no Math.random during render.
const SHARDS = Array.from({ length: PIECES }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.25,
  duration: 1.1 + Math.random() * 0.9,
  rotate: Math.random() * 360,
  color: COLORS[i % COLORS.length],
  size: 6 + Math.random() * 6,
  drift: (Math.random() - 0.5) * 120,
}));

export function Confetti() {
  return (
    <div className="kntx-confetti pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {SHARDS.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-5%",
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.4}px`,
            background: p.color,
            borderRadius: "1px",
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rotate}deg`,
            animation: `kntx-confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
