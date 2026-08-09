import { memo } from "react";
import { cn } from "../lib/utils";

/**
 * Art built specifically for the projected display.
 *
 * These are drawn at a much higher detail density than the phone props,
 * because the difference between 40px on a handset and 400px on a wall is
 * that every shortcut becomes visible. Same construction rule as the Safe —
 * base fill, discrete light zone, discrete dark zone, repeated hardware, one
 * glint, ink outline over everything — just with more of each.
 */

const INK = "#1F1F1F";

/* ================================================================
   RAY BURST — the rotating halo behind the leader.
   Alternating long/short spokes with a tapered tip; an even fan of
   identical triangles reads as a clip-art star.
   ================================================================ */
function RayBurstBase({
  className,
  color = "var(--color-brass)",
  deep = "var(--color-brass-deep)",
  spokes = 20,
}: {
  className?: string;
  color?: string;
  deep?: string;
  spokes?: number;
}) {
  const rays = Array.from({ length: spokes }, (_, i) => {
    const long = i % 2 === 0;
    const a = (i / spokes) * 360;
    const outer = long ? 100 : 74;
    const w = long ? 4.6 : 2.8;
    return { a, outer, w, fill: long ? color : deep };
  });

  return (
    <svg viewBox="-110 -110 220 220" className={cn("h-full w-full", className)} aria-hidden>
      {rays.map((r, i) => (
        <path
          key={i}
          transform={`rotate(${r.a})`}
          // Tapered: wide at the hub, a point at the tip.
          d={`M ${-r.w} 26 L ${-r.w * 0.28} ${-r.outer} L ${r.w * 0.28} ${-r.outer} L ${r.w} 26 Z`}
          fill={r.fill}
        />
      ))}
    </svg>
  );
}
export const RayBurst = memo(RayBurstBase);

/* ================================================================
   LAUREL — the wreath either side of the leader's name.
   Leaves are individually placed along a curve and shrink toward the
   tip, which is what separates a wreath from a row of ovals.
   ================================================================ */
function LaurelBase({ className, flip }: { className?: string; flip?: boolean }) {
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return {
      x: 12 + t * 40,
      y: 74 - t * 56 + Math.sin(t * Math.PI) * 8,
      r: -28 - t * 34,
      s: 1 - t * 0.42,
    };
  });

  return (
    <svg
      viewBox="0 0 66 92"
      className={cn("h-full w-full", className)}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      {/* stem */}
      <path
        d="M10 86 C 22 66, 34 44, 52 20"
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M10 86 C 22 66, 34 44, 52 20"
        fill="none"
        stroke="var(--color-brass-deep)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
          <ellipse rx="13" ry="7" fill="var(--color-brass)" stroke={INK} strokeWidth="3.4" />
          {/* discrete light zone, not a gradient */}
          <path d="M -11 -2 a 13 7 0 0 1 11 -4 l 0 3 a 10 5 0 0 0 -8 3 z" fill="#FFD888" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="var(--color-brass-deep)" strokeWidth="1.6" />
        </g>
      ))}

      {/* the berry at the base, so the stem terminates in something */}
      <circle cx="10" cy="86" r="4.6" fill="var(--color-red)" stroke={INK} strokeWidth="3" />
      <circle cx="8.4" cy="84.4" r="1.4" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
}
export const Laurel = memo(LaurelBase);

/* ================================================================
   RANK MOVEMENT — a chevron that says which way and by how much.
   The single most useful thing on a live board and the thing the
   first pass had no way to show at all.
   ================================================================ */
function RankDeltaBase({
  delta,
  className,
}: {
  /** Positive = climbed, negative = dropped, 0 = held. */
  delta: number;
  className?: string;
}) {
  if (delta === 0) {
    return (
      <span className={cn("flex items-center justify-center", className)}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
          <rect x="5" y="10.5" width="14" height="3.4" rx="1.7" fill={INK} opacity="0.22" />
        </svg>
      </span>
    );
  }

  const up = delta > 0;
  return (
    <span className={cn("flex items-center justify-center gap-[0.12em]", className)}>
      <svg viewBox="0 0 24 24" className="h-full w-auto" aria-hidden>
        <path
          d={up ? "M12 4 L22 16 H15 V21 H9 V16 H2 Z" : "M12 21 L2 9 H9 V4 H15 V9 H22 Z"}
          fill={up ? "var(--color-green)" : "var(--color-red)"}
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn("font-readout font-bold leading-none", up ? "text-green-deep" : "text-red")}
        style={{ fontSize: "0.6em" }}
      >
        {Math.abs(delta)}
      </span>
    </span>
  );
}
export const RankDelta = memo(RankDeltaBase);

/* ================================================================
   HALFTONE — a dot field that gives the flat cream some depth.
   An SVG pattern rather than a raster, so it stays crisp when the
   projector is running at 4K.
   ================================================================ */
function HalftoneBase({ className }: { className?: string }) {
  return (
    <svg className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <pattern id="ov-halftone" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.1" fill={INK} />
          <circle cx="17" cy="17" r="1.3" fill={INK} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ov-halftone)" />
    </svg>
  );
}
export const Halftone = memo(HalftoneBase);

/* ================================================================
   SPARKLINE — the room's progress over the event.
   Broadcast overlays always carry a "what happened when" read; a
   percentage on its own says where the room is but not whether it
   is accelerating.
   ================================================================ */
function SparklineBase({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  const W = 200;
  const H = 46;
  if (points.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} className={className} />;

  const max = Math.max(...points, 0.0001);
  const step = W / (points.length - 1);
  const xy = points.map((p, i) => [i * step, H - (p / max) * (H - 6) - 3] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("w-full", className)} aria-hidden>
      <path d={area} fill="var(--color-green)" opacity="0.18" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-green-deep)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="4" fill="var(--color-green)" stroke={INK} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
export const Sparkline = memo(SparklineBase);
