import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

/**
 * The safe. Nine colours × three states from one component, so the board needs
 * no exported art and the matrix stays free.
 *
 * Structure matters here: the cavity and the door are ALWAYS both rendered,
 * and "open" is the door's scaleX collapsing toward its left hinge. That means
 * the open state is a real swing rather than a different drawing — which is
 * what lets it animate, and also what stops the static open state reading as a
 * dark rectangle with a stripe next to it.
 */

export type SafeState = "available" | "solved" | "locked";

interface Shades {
  base: string;
  deep: string;
  light: string;
}

export const SAFE_SHADES: Shades[] = [
  { base: "#2ECC71", deep: "#1E8E4E", light: "#63E39D" },
  { base: "#4CAF50", deep: "#357A38", light: "#7FC982" },
  { base: "#6C5CE7", deep: "#4A3FA8", light: "#9B8FF0" },
  { base: "#FFB02E", deep: "#C47D0C", light: "#FFCA69" },
  { base: "#3498DB", deep: "#21688F", light: "#6DB9E8" },
  { base: "#D9CBB0", deep: "#A89676", light: "#EFE5D2" },
  { base: "#5A5A5A", deep: "#333333", light: "#8C8C8C" },
  { base: "#E53935", deep: "#9E2420", light: "#F27672" },
  { base: "#00B894", deep: "#008066", light: "#52D7BE" },
];

const LOCKED: Shades = { base: "#C9C4B8", deep: "#9E9A90", light: "#E4E0D6" };

const INK = "#1F1F1F";
const CREAM = "#F5F2E8";
const BRASS = "#FFB02E";

/** Timings for the unlock sequence, in ms. */
const SPIN_MS = 620;
const SWING_MS = 460;
const SWING_DELAY = 560;

interface SafeProps {
  digit: number;
  state?: SafeState;
  /** Force the unlock sequence to replay — used by the preview page. */
  replayKey?: number;
  className?: string;
}

export function Safe({ digit, state = "available", replayKey, className }: SafeProps) {
  const open = state === "solved";
  const locked = state === "locked";
  const s = locked ? LOCKED : SAFE_SHADES[(digit - 1) % 9];

  // Only animate an unlock the player is actually watching. A tile that mounts
  // already-solved renders open and still. Derived during render, not in an
  // effect — the door mounts on the same commit the state flips, so an
  // effect-set flag lands a frame late and the swing never plays.
  const prev = useRef<SafeState>(state);
  const [justOpened, setJustOpened] = useState(false);

  if (prev.current !== state) {
    const opening = state === "solved" && prev.current !== "solved";
    prev.current = state;
    if (opening) setJustOpened(true);
  }

  useEffect(() => {
    if (replayKey === undefined) return;
    setJustOpened(true);
  }, [replayKey]);

  useEffect(() => {
    if (!justOpened) return;
    const t = setTimeout(() => setJustOpened(false), SWING_DELAY + SWING_MS + 200);
    return () => clearTimeout(t);
  }, [justOpened]);

  const playing = justOpened;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label={`Safe ${digit}, ${state}`}
    >
      {/* hinges, behind everything */}
      <g>
        <rect x="88" y="24" width="8" height="12" rx="3" fill={s.deep} stroke={INK} strokeWidth="2.5" />
        <rect x="88" y="64" width="8" height="12" rx="3" fill={s.deep} stroke={INK} strokeWidth="2.5" />
      </g>

      {/* ---- body ---- */}
      <rect x="6" y="6" width="86" height="88" rx="13" fill={s.base} stroke={INK} strokeWidth="4" />
      <path d="M6 64 h86 v17 a13 13 0 0 1 -13 13 H19 A13 13 0 0 1 6 81 Z" fill={s.deep} opacity="0.5" />
      <path d="M19 6 h60 a13 13 0 0 1 13 13 v4 H6 v-4 A13 13 0 0 1 19 6 Z" fill={s.light} opacity="0.5" />

      {/* ---- cavity: always present, revealed as the door swings ---- */}
      <g>
        <rect x="17" y="17" width="66" height="66" rx="9" fill="#171310" />
        {/* back wall catches a little light, so it has depth not just darkness */}
        <rect x="24" y="23" width="52" height="54" rx="6" fill="#2B2420" />
        {/* top inner shadow — sells the recess */}
        <path d="M17 17 h66 v10 a0 0 0 0 1 0 0 H17 Z" fill="#000000" opacity="0.35" />

        {/* the recovered digit, sitting inside */}
        <motion.text
          x="54"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fill={BRASS}
          fontSize="30"
          fontWeight="800"
          fontFamily="var(--font-display), system-ui, sans-serif"
          initial={false}
          animate={
            open
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.5 }
          }
          transition={
            playing
              ? { delay: (SWING_DELAY + SWING_MS * 0.55) / 1000, duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }
              : { duration: 0 }
          }
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {digit}
        </motion.text>
      </g>

      {/* ---- the door: collapses toward its left hinge to open ---- */}
      <motion.g
        initial={false}
        animate={{ scaleX: open ? 0.2 : 1 }}
        transition={
          playing
            ? { delay: SWING_DELAY / 1000, duration: SWING_MS / 1000, ease: [0.5, 0, 0.3, 1] }
            : { duration: 0 }
        }
        style={{ transformBox: "view-box", transformOrigin: "17px 50px" }}
      >
        {/* door face */}
        <rect x="17" y="17" width="66" height="66" rx="9" fill={s.base} stroke={INK} strokeWidth="3.5" />
        <path d="M17 58 h66 v16 a9 9 0 0 1 -9 9 H26 a9 9 0 0 1 -9 -9 Z" fill={s.deep} opacity="0.4" />
        {/* recessed inner panel */}
        <rect
          x="24" y="24" width="52" height="52" rx="7"
          fill={s.deep} opacity="0.3" stroke={INK} strokeWidth="2.5"
        />

        {/* bolts around the panel */}
        {[
          [30, 30], [70, 30], [30, 70], [70, 70],
          [50, 27], [50, 73],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="2.4"
            fill={locked ? "#B0ABA0" : "#00000030"}
            stroke={INK}
            strokeWidth="1.4"
          />
        ))}

        {/* handwheel — spins first, then the door gives */}
        <motion.g
          initial={false}
          animate={{ rotate: open ? 900 : 0 }}
          transition={
            playing
              ? { duration: SPIN_MS / 1000, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0 }
          }
          style={{ transformBox: "view-box", transformOrigin: "50px 50px" }}
        >
          <circle cx="50" cy="50" r="17" fill={locked ? "#8A857C" : "#4A4A4A"} stroke={INK} strokeWidth="3" />
          <circle cx="50" cy="50" r="12.5" fill={locked ? "#6E6A62" : "#2B2B2B"} stroke={INK} strokeWidth="2" />
          <g stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" opacity={locked ? 0.45 : 0.92}>
            <line x1="50" y1="39" x2="50" y2="61" />
            <line x1="39" y1="50" x2="61" y2="50" />
          </g>
          <circle cx="50" cy="50" r="3.4" fill={CREAM} stroke={INK} strokeWidth="1.6" />
          <circle cx="43" cy="43" r="2.2" fill="#FFFFFF" opacity="0.32" />
        </motion.g>
      </motion.g>

      {/* body outline on top, so the door never bleeds past the frame */}
      <rect x="6" y="6" width="86" height="88" rx="13" fill="none" stroke={INK} strokeWidth="4" />

      {/* ---- number badge ---- */}
      <g>
        <rect x="13" y="9" width="21" height="16" rx="5" fill={CREAM} stroke={INK} strokeWidth="3" />
        <text
          x="23.5" y="17.6"
          textAnchor="middle" dominantBaseline="central"
          fill={INK} fontSize="11" fontWeight="800"
          fontFamily="var(--font-display), system-ui, sans-serif"
        >
          {digit}
        </text>
      </g>
    </svg>
  );
}
