import type { Transition, Variants, TargetAndTransition } from "framer-motion";
import confetti from "canvas-confetti";

/**
 * The five motion primitives. Every animation in the app is one of these.
 * If you're writing a bespoke `animate={{...}}` on a screen, check here first.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ *
 * 1. PRESS — every button and tile. 1 -> 0.96 on tap-down, spring back.
 * ------------------------------------------------------------------ */

export const PRESS = { scale: 0.96 } as const;

export const PRESS_TRANSITION: Transition = {
  type: "spring",
  stiffness: 900,
  damping: 32,
  mass: 0.5,
};

/* ------------------------------------------------------------------ *
 * 2. SETTLE — screen transitions. Up 12px + fade, 200ms ease-out.
 *    Owned by <PageWrapper>. Screens must NOT add their own entrance.
 * ------------------------------------------------------------------ */

export const SETTLE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: EASE_OUT },
} as const;

/** Staggered variant of settle, for lists/grids that settle in sequence. */
export const SETTLE_STAGGER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export const SETTLE_ITEM: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

/* ------------------------------------------------------------------ *
 * 3. UNLOCK — the signature animation. VaultTile locked -> solved:
 *    green fill wipes up from the bottom while the icon cross-fades
 *    to a checkmark. 350ms total.
 * ------------------------------------------------------------------ */

export const UNLOCK_MS = 350;

/** The fill sweeping up from the bottom edge. */
export const UNLOCK_WIPE: Transition = {
  duration: UNLOCK_MS / 1000,
  ease: [0.16, 1, 0.3, 1], // decisive start, soft landing — reads as "sealing"
};

/** Old icon leaving: fades and shrinks slightly, front-loaded so the
 *  check is never fighting the padlock for attention. */
export const UNLOCK_ICON_OUT: Transition = {
  duration: (UNLOCK_MS * 0.4) / 1000,
  ease: "easeIn",
};

/** Checkmark arriving: overlaps the back half of the wipe, lands with
 *  a little overshoot so it feels stamped on rather than faded in. */
export const UNLOCK_ICON_IN: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 20,
  mass: 0.7,
  delay: (UNLOCK_MS * 0.35) / 1000,
};

/** One-off scale bump on the tile itself as the fill completes. */
export const UNLOCK_TILE_POP: TargetAndTransition = {
  scale: [1, 1.045, 1],
  transition: { duration: UNLOCK_MS / 1000, ease: EASE_OUT, times: [0, 0.55, 1] },
};

/* ------------------------------------------------------------------ *
 * 4. CELEBRATE — 1.2s confetti burst.
 *    ONLY the Success screen and the Vault Complete screen.
 *    Deliberately not exported to Bonus Found — the restraint is the point.
 * ------------------------------------------------------------------ */

const CELEBRATE_MS = 1200;

const CELEBRATE_COLORS = ["#E8332B", "#F4B93E", "#3AA65A", "#FBF6EF"];

export function celebrate(colors: string[] = CELEBRATE_COLORS) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const end = Date.now() + CELEBRATE_MS;
  let cancelled = false;

  const frame = () => {
    if (cancelled) return;
    const shared = {
      particleCount: 4,
      spread: 62,
      startVelocity: 46,
      ticks: 130,
      colors,
      disableForReducedMotion: true,
    };
    confetti({ ...shared, angle: 62, origin: { x: 0, y: 0.72 } });
    confetti({ ...shared, angle: 118, origin: { x: 1, y: 0.72 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();

  return () => {
    cancelled = true;
  };
}

/* ------------------------------------------------------------------ *
 * 5. SHAKE — incorrect answer. 3 horizontal cycles at ~120ms each.
 *    Applied to the wrong OPTION, never the whole screen, and never
 *    at the same time as Celebrate or Unlock.
 * ------------------------------------------------------------------ */

export const SHAKE_CYCLE_MS = 120;
export const SHAKE_CYCLES = 3;
export const SHAKE_TOTAL_MS = SHAKE_CYCLE_MS * SHAKE_CYCLES;

export const SHAKE: TargetAndTransition = {
  x: [0, -7, 7, -7, 7, -7, 7, 0],
  transition: { duration: SHAKE_TOTAL_MS / 1000, ease: "linear" },
};

/* ------------------------------------------------------------------ *
 * PHASE 2 PRIMITIVES — POP, SQUASH, WIGGLE, BREATHE, BOUNCE_IN
 * ------------------------------------------------------------------ */

/** Overshoot pop — lands past its target then settles. */
export const POP: TargetAndTransition = {
  scale: [0.8, 1.12, 1],
  transition: { duration: 0.4, times: [0, 0.6, 1], ease: EASE_OUT },
};

/** Squash on press — for chunky elements that also need character. */
export const SQUASH: TargetAndTransition = { scaleY: 0.94, scaleX: 1.04 };

/** Attention wiggle — idle nudge on the next playable tile. */
export const WIGGLE: TargetAndTransition = {
  rotate: [0, -4, 4, -3, 3, 0],
  transition: { duration: 0.5, ease: "easeInOut" },
};

/** Slow breathing — anything alive. */
export const BREATHE: TargetAndTransition = {
  scale: [1, 1.035, 1],
  transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
};

/** Bouncy entrance for lists/grids. */
export const BOUNCE_IN: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.85 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 480, damping: 18, mass: 0.7 },
  },
};

