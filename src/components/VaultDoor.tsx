import { motion } from "motion/react";
import { cn } from "../lib/utils";

/**
 * The vault door.
 *
 * Built the same way as the Safe, because that approach works and the 3D one
 * did not: no perspective, no preserve-3d, no second plane. The door is a group
 * whose scaleX collapses toward its left hinge, its face detail fades out over
 * the back half of the swing, and a plain edge slab fades in behind it.
 *
 * Compressing a detailed face reads fine as motion and wrong at rest — edge-on
 * you see a door's edge, not a squashed picture of its front. The handoff to a
 * clean slab is the whole trick.
 *
 * Framer ignores CSS transform-origin on SVG and uses its own originX/originY,
 * defaulting to the bbox centre. originX: 0 pins the collapse to the hinge.
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
const GOLD_LIGHT = "#FFD888";
const GOLD_DEEP = "#C4820C";
const GREEN = "#2ECC71";
const WHITE = "#FFFFFF";
const CAVITY = "#171310";

/** Swing timings, mirroring the Safe. */
const SPIN_MS = 620;
const SWING_MS = 620;
const SWING_DELAY = 540;

interface VaultDoorProps {
  state: "closed" | "open";
  className?: string;
  /** Extra degrees on the handwheel — Splash and Home drive this. */
  wheelRotate?: number;
  shake?: boolean;
}

/** Bolts along the arch, computed rather than eyeballed. */
const ARCH_BOLTS = (() => {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    out.push({ x: 100 + Math.cos(a) * 46, y: 93 + Math.sin(a) * 46 });
  }
  for (const y of [118, 140, 158]) {
    out.push({ x: 56, y });
    out.push({ x: 144, y });
  }
  return out;
})();

function IndicatorPanel({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="18" height="12" rx="3" fill={STEEL_DEEP} stroke={INK} strokeWidth="2.2" />
      <circle cx={x + 5.5} cy={y + 6} r="2.4" fill={RED} stroke={INK} strokeWidth="1.4" />
      <circle cx={x + 12.5} cy={y + 6} r="2.4" fill={GREEN} stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

export function VaultDoor({ state, className, wheelRotate = 0, shake }: VaultDoorProps) {
  const isOpen = state === "open";

  return (
    <div className={cn("relative mx-auto aspect-square w-64 select-none", className)}>
      <motion.div
        className="h-full w-full"
        animate={shake ? { x: [0, -5, 5, -4, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
          {/* ---------------- STATIC: ground, frame, cavity ---------------- */}
          <ellipse cx="100" cy="182" rx="70" ry="9" fill={INK} opacity="0.14" />

          {/* threshold */}
          <path d="M28 168 h144 l6 12 H22 z" fill={STEEL_MID} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M28 168 h30 l-4 12 H22 z" fill={STEEL_LIGHT} opacity="0.6" />
          <g fill={STEEL_DEEP} stroke={INK} strokeWidth="1.6">
            <circle cx="42" cy="174" r="2.4" /><circle cx="100" cy="174" r="2.4" />
            <circle cx="158" cy="174" r="2.4" />
          </g>

          {/* outer frame */}
          <path d="M30 168 V92 a70 70 0 0 1 140 0 v76 z"
            fill={STEEL_MID} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M30 168 V92 a70 70 0 0 1 40 -60 v14 a56 56 0 0 0 -28 48 v74 z"
            fill={STEEL_LIGHT} opacity="0.55" />
          <path d="M170 168 V92 a70 70 0 0 0 -28 -54 v15 a56 56 0 0 1 16 41 v74 z"
            fill={STEEL_DEEP} opacity="0.45" />

          {/* cavity */}
          <path d="M44 168 V93 a56 56 0 0 1 112 0 v75 z" fill={CAVITY} stroke={INK} strokeWidth="3" />
          <path d="M56 168 V95 a44 44 0 0 1 88 0 v73 z" fill="#2B2420" />
          <path d="M44 93 a56 56 0 0 1 112 0 h-12 a44 44 0 0 0 -88 0 z" fill="#000" opacity="0.3" />

          {/* interior: shelf and two coin stacks */}
          <motion.g
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.3, delay: isOpen ? (SWING_DELAY + SWING_MS * 0.5) / 1000 : 0 }}
          >
            <ellipse cx="104" cy="134" rx="38" ry="30" fill={GOLD} opacity="0.16" />
            <rect x="66" y="128" width="72" height="4" rx="2" fill={STEEL_DARK} opacity="0.5" />
            <g stroke={INK} strokeWidth="2">
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect x="82" y={152 - i * 7} width="26" height="5" fill={GOLD_DEEP} />
                  <ellipse cx="95" cy={152 - i * 7} rx="13" ry="4.8" fill={GOLD} />
                </g>
              ))}
              <ellipse cx="95" cy="131" rx="13" ry="4.8" fill={GOLD_LIGHT} />
            </g>
            <g stroke={INK} strokeWidth="2">
              {[0, 1].map((i) => (
                <g key={i}>
                  <rect x="114" y={154 - i * 7} width="22" height="5" fill={GOLD_DEEP} />
                  <ellipse cx="125" cy={154 - i * 7} rx="11" ry="4.2" fill={GOLD} />
                </g>
              ))}
              <ellipse cx="125" cy="147" rx="11" ry="4.2" fill={GOLD_LIGHT} />
            </g>
          </motion.g>

          {/* FIXED hinge barrels — frame side, never move */}
          <g fill={STEEL_DEEP} stroke={INK} strokeWidth="3">
            <rect x="33" y="88" width="15" height="24" rx="7" />
            <rect x="33" y="136" width="15" height="24" rx="7" />
          </g>
          <g fill={STEEL_LIGHT} opacity="0.5">
            <rect x="36" y="92" width="4" height="16" rx="2" />
            <rect x="36" y="140" width="4" height="16" rx="2" />
          </g>

          {/* ---------------- DOOR EDGE ----------------
              The crescent you see once the door has swung: a slab hugging the
              left of the arch, in the shadowed shade with a lit leading face.
              Fades in over the back half of the swing. */}
          <motion.g
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{
              duration: (SWING_MS * 0.4) / 1000,
              delay: isOpen ? (SWING_DELAY + SWING_MS * 0.55) / 1000 : 0,
            }}
          >
            <path d="M44 168 V93 A56 56 0 0 1 52 64 L66 71 A44 44 0 0 0 58 95 V168 Z"
              fill={STEEL_DARK} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M47 164 V95 A53 53 0 0 1 51 74 L56 77 A48 48 0 0 0 52 96 V164 Z"
              fill={STEEL_LIGHT} opacity="0.4" />
          </motion.g>

          {/* ---------------- DOOR FACE ----------------
              Collapses toward the hinge, then fades so the resting open state
              is the clean slab above rather than a squashed front. */}
          <motion.g
            initial={false}
            animate={{ scaleX: isOpen ? 0.12 : 1, opacity: isOpen ? 0 : 1 }}
            transition={{
              scaleX: { duration: SWING_MS / 1000, delay: isOpen ? SWING_DELAY / 1000 : 0, ease: [0.5, 0, 0.3, 1] },
              opacity: {
                duration: (SWING_MS * 0.35) / 1000,
                delay: isOpen ? (SWING_DELAY + SWING_MS * 0.6) / 1000 : 0,
              },
            }}
            style={{ originX: 0, originY: 0.5 }}
          >
            {/* slab */}
            <path d="M44 168 V93 a56 56 0 0 1 112 0 v75 z"
              fill={STEEL} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
            {/* moving hinge leaves — on the door, so they swing with it */}
            <g fill={STEEL_MID} stroke={INK} strokeWidth="2.8">
              <rect x="44" y="90" width="16" height="20" rx="4" />
              <rect x="44" y="138" width="16" height="20" rx="4" />
            </g>

            {/* light / shade zones */}
            <path d="M44 168 V93 a56 56 0 0 1 32 -50 v13 a44 44 0 0 0 -20 37 v75 z"
              fill={STEEL_LIGHT} opacity="0.55" />
            <path d="M156 168 V93 a56 56 0 0 0 -22 -45 v14 a44 44 0 0 1 10 31 v75 z"
              fill={STEEL_DEEP} opacity="0.4" />

            {/* inset bevel + panel seams */}
            <path d="M56 160 V95 a44 44 0 0 1 88 0 v65 z" fill="none" stroke={INK} strokeWidth="2.2" opacity="0.35" />
            <g stroke={INK} strokeWidth="2" opacity="0.3">
              <line x1="100" y1="50" x2="100" y2="92" />
              <line x1="60" y1="152" x2="100" y2="116" />
              <line x1="140" y1="152" x2="100" y2="116" />
            </g>

            {/* bolts */}
            <g fill={STEEL_MID} stroke={INK} strokeWidth="2">
              {ARCH_BOLTS.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r="3.6" />)}
            </g>
            <g fill={WHITE} opacity="0.4">
              {ARCH_BOLTS.map((b, i) => <circle key={i} cx={b.x - 1} cy={b.y - 1} r="1.1" />)}
            </g>

            <IndicatorPanel x={126} y={92} />
            <IndicatorPanel x={126} y={122} />

            {/* handwheel */}
            <circle cx="96" cy="116" r="32" fill={STEEL_MID} stroke={INK} strokeWidth="2.8" />
            <circle cx="96" cy="116" r="32" fill={STEEL_DEEP} opacity="0.22" />
            <motion.g
              initial={false}
              animate={{ rotate: (isOpen ? 300 : 0) + wheelRotate }}
              transition={{ duration: SPIN_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <g stroke={INK} strokeWidth="12" strokeLinecap="round">
                <line x1="96" y1="90" x2="96" y2="142" />
                <line x1="70" y1="116" x2="122" y2="116" />
              </g>
              <g stroke={RED} strokeWidth="7" strokeLinecap="round">
                <line x1="96" y1="90" x2="96" y2="142" />
                <line x1="70" y1="116" x2="122" y2="116" />
              </g>
              <circle cx="96" cy="116" r="25" fill="none" stroke={INK} strokeWidth="12" />
              <circle cx="96" cy="116" r="25" fill="none" stroke={RED} strokeWidth="7" />
              <circle cx="96" cy="116" r="25" fill="none" stroke={RED_LIGHT} strokeWidth="2.4"
                strokeDasharray="12 56" opacity="0.9" />
              <circle cx="96" cy="116" r="9" fill={RED} stroke={INK} strokeWidth="3.2" />
              <circle cx="96" cy="116" r="4" fill={RED_DEEP} stroke={INK} strokeWidth="1.8" />
              <circle cx="93" cy="113" r="2" fill={WHITE} opacity="0.5" />
            </motion.g>
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
