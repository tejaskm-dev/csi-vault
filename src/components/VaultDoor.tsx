import { motion } from "motion/react";
import { cn } from "../lib/utils";

/**
 * The vault door, in code.
 *
 * Replaces a 636KB + 644KB PNG pair with one component that swings for real:
 * the frame and cavity are static, and the door is a separate layer rotated in
 * 3D on its hinge. Two PNGs could only cross-fade between two fixed drawings.
 *
 * The 3D swing has to be driven from a wrapping <motion.div> with perspective,
 * NOT from an SVG <g> — Framer routes SVG transforms through the `transform`
 * attribute, which has no rotateY, so a swing written inside the SVG silently
 * does nothing.
 */

const INK = "#1F1F1F";

const STEEL = "#B8BCC0";
const STEEL_LIGHT = "#DFE3E6";
const STEEL_MID = "#9AA0A6";
const STEEL_DEEP = "#6E747A";
const STEEL_DARK = "#4A4F54";

const RED = "#E53935";
const RED_LIGHT = "#F5726E";
const RED_DEEP = "#A82A27";

const GOLD = "#FFB02E";
const GREEN = "#2ECC71";
const CREAM = "#F5F2E8";
const WHITE = "#FFFFFF";
const CAVITY = "#171310";

interface VaultDoorProps {
  state: "closed" | "open";
  className?: string;
  /** Extra degrees on the handwheel — Splash and Home drive this. */
  wheelRotate?: number;
  shake?: boolean;
}

/** Bolts around the arch, placed on the arc rather than eyeballed. */
const ARCH_BOLTS = (() => {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI; // 180° → 360°
    out.push({ x: 100 + Math.cos(a) * 58, y: 92 + Math.sin(a) * 58 });
  }
  // down the two jambs
  for (const y of [110, 132, 154]) {
    out.push({ x: 42, y });
    out.push({ x: 158, y });
  }
  return out;
})();

function IndicatorPanel({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="20" height="13" rx="3" fill={STEEL_DEEP} stroke={INK} strokeWidth="2.4" />
      <circle cx={x + 6} cy={y + 6.5} r="2.6" fill={RED} stroke={INK} strokeWidth="1.5" />
      <circle cx={x + 14} cy={y + 6.5} r="2.6" fill={GREEN} stroke={INK} strokeWidth="1.5" />
      <circle cx={x + 5} cy={y + 5.4} r="0.9" fill={WHITE} opacity="0.6" />
    </g>
  );
}

export function VaultDoor({ state, className, wheelRotate = 0, shake }: VaultDoorProps) {
  const isOpen = state === "open";

  return (
    <div
      className={cn("relative mx-auto aspect-square w-64 select-none", className)}
      style={{ perspective: 1100 }}
    >
      <motion.div
        className="h-full w-full"
        animate={shake ? { x: [0, -5, 5, -4, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* ================= STATIC: ground, frame, cavity ================= */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
          {/* ground shadow */}
          <ellipse cx="100" cy="182" rx="70" ry="9" fill={INK} opacity="0.14" />

          {/* threshold plinth */}
          <path d="M28 168 h144 l6 12 H22 z" fill={STEEL_MID} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M28 168 h30 l-4 12 H22 z" fill={STEEL_LIGHT} opacity="0.6" />
          <g fill={STEEL_DEEP} stroke={INK} strokeWidth="1.6">
            <circle cx="42" cy="174" r="2.4" /><circle cx="100" cy="174" r="2.4" />
            <circle cx="158" cy="174" r="2.4" />
          </g>

          {/* outer frame — arch + jambs */}
          <path d="M30 168 V92 a70 70 0 0 1 140 0 v76 z"
            fill={STEEL_MID} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          {/* frame light zone, upper-left */}
          <path d="M30 168 V92 a70 70 0 0 1 40 -60 v14 a56 56 0 0 0 -28 48 v74 z"
            fill={STEEL_LIGHT} opacity="0.55" />
          {/* frame shade, lower-right */}
          <path d="M170 168 V92 a70 70 0 0 0 -28 -54 v15 a56 56 0 0 1 16 41 v74 z"
            fill={STEEL_DEEP} opacity="0.45" />

          {/* cavity — revealed as the door swings */}
          <path d="M44 168 V93 a56 56 0 0 1 112 0 v75 z" fill={CAVITY} stroke={INK} strokeWidth="3" />
          <path d="M56 168 V95 a44 44 0 0 1 88 0 v73 z" fill="#2B2420" />
          {/* warm interior glow + stacked discs, only meaningful once open */}
          <g opacity={isOpen ? 1 : 0} style={{ transition: "opacity .3s .55s" }}>
            <ellipse cx="100" cy="130" rx="40" ry="34" fill={GOLD} opacity="0.2" />
            <g stroke={INK} strokeWidth="2.4">
              <ellipse cx="100" cy="152" rx="26" ry="8" fill={GOLD} />
              <ellipse cx="100" cy="144" rx="22" ry="7" fill={GOLD} />
              <ellipse cx="100" cy="136" rx="17" ry="5.5" fill={GOLD} />
            </g>
          </g>

          {/* hinge barrels on the left jamb */}
          <g fill={STEEL_DEEP} stroke={INK} strokeWidth="3">
            <rect x="26" y="86" width="16" height="26" rx="7" />
            <rect x="26" y="132" width="16" height="26" rx="7" />
          </g>
          <g fill={STEEL_LIGHT} opacity="0.55">
            <rect x="29" y="90" width="4" height="18" rx="2" />
            <rect x="29" y="136" width="4" height="18" rx="2" />
          </g>
        </svg>

        {/* ================= THE DOOR — swings on the left hinge ================= */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "22% 50%", transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ rotateY: isOpen ? -108 : 0 }}
          transition={{ duration: isOpen ? 1.0 : 0.35, ease: [0.32, 1.06, 0.4, 1], delay: isOpen ? 0.25 : 0 }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
            {/* door slab */}
            <path d="M44 168 V93 a56 56 0 0 1 112 0 v75 z"
              fill={STEEL} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />

            {/* inset bevel */}
            <path d="M54 162 V95 a46 46 0 0 1 92 0 v67 z"
              fill="none" stroke={INK} strokeWidth="2.4" opacity="0.4" />

            {/* panel seams — the diagonals from the reference */}
            <g stroke={INK} strokeWidth="2.2" opacity="0.35">
              <line x1="100" y1="48" x2="100" y2="96" />
              <line x1="56" y1="150" x2="100" y2="112" />
              <line x1="144" y1="150" x2="100" y2="112" />
              <line x1="54" y1="150" x2="146" y2="150" />
            </g>

            {/* cast texture */}
            <g fill={STEEL_DEEP} opacity="0.16">
              <circle cx="72" cy="72" r="2.4" /><circle cx="128" cy="66" r="1.9" />
              <circle cx="64" cy="120" r="2.1" /><circle cx="140" cy="128" r="2.6" />
              <circle cx="86" cy="158" r="1.8" /><circle cx="118" cy="90" r="1.6" />
            </g>

            {/* light + shade zones */}
            <path d="M44 168 V93 a56 56 0 0 1 34 -51 v13 a44 44 0 0 0 -22 38 v75 z"
              fill={STEEL_LIGHT} opacity="0.55" />
            <path d="M156 168 V93 a56 56 0 0 0 -24 -46 v14 a44 44 0 0 1 12 32 v75 z"
              fill={STEEL_DEEP} opacity="0.4" />

            {/* perimeter bolts */}
            <g fill={STEEL_MID} stroke={INK} strokeWidth="2">
              {ARCH_BOLTS.map((b, i) => (
                <circle key={i} cx={b.x} cy={b.y} r="4" />
              ))}
            </g>
            <g fill={WHITE} opacity="0.4">
              {ARCH_BOLTS.map((b, i) => (
                <circle key={i} cx={b.x - 1.2} cy={b.y - 1.2} r="1.2" />
              ))}
            </g>

            {/* indicator panels, right side */}
            <IndicatorPanel x={126} y={86} />
            <IndicatorPanel x={126} y={118} />

            {/* ---- handwheel ---- */}
            <g>
              {/* mounting boss */}
              <circle cx="100" cy="112" r="34" fill={STEEL_MID} stroke={INK} strokeWidth="3" />
              <circle cx="100" cy="112" r="34" fill={STEEL_DEEP} opacity="0.25" />
            </g>
            <motion.g
              initial={false}
              animate={{ rotate: (isOpen ? 300 : 0) + wheelRotate }}
              transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              {/* spokes */}
              <g stroke={INK} strokeWidth="13" strokeLinecap="round">
                <line x1="100" y1="84" x2="100" y2="140" />
                <line x1="72" y1="112" x2="128" y2="112" />
              </g>
              <g stroke={RED} strokeWidth="8" strokeLinecap="round">
                <line x1="100" y1="84" x2="100" y2="140" />
                <line x1="72" y1="112" x2="128" y2="112" />
              </g>
              {/* rim */}
              <circle cx="100" cy="112" r="27" fill="none" stroke={INK} strokeWidth="13" />
              <circle cx="100" cy="112" r="27" fill="none" stroke={RED} strokeWidth="8" />
              <circle cx="100" cy="112" r="27" fill="none" stroke={RED_LIGHT} strokeWidth="2.6"
                strokeDasharray="14 60" strokeDashoffset="-8" opacity="0.9" />
              {/* hub */}
              <circle cx="100" cy="112" r="10" fill={RED} stroke={INK} strokeWidth="3.5" />
              <circle cx="100" cy="112" r="4.4" fill={RED_DEEP} stroke={INK} strokeWidth="2" />
              <circle cx="96.6" cy="108.6" r="2.2" fill={WHITE} opacity="0.5" />
            </motion.g>

            {/* door edge highlight, last so it sits on top */}
            <path d="M44 168 V93 a56 56 0 0 1 56 -56 v6 a50 50 0 0 0 -50 50 v75 z"
              fill={WHITE} opacity="0.14" />
          </svg>
        </motion.div>

        {/* door edge slab, visible once swung — the door has thickness */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25, delay: isOpen ? 0.9 : 0 }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
            <path d="M44 168 V93 a56 56 0 0 1 10 -30 v105 z" fill={STEEL_DARK} stroke={INK} strokeWidth="3" />
            <path d="M46 160 V95 a54 54 0 0 1 4 -18 v83 z" fill={STEEL_LIGHT} opacity="0.35" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
