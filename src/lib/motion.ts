import confetti from "canvas-confetti";

/**
 * SETTLE — screen entry.
 *
 * A plain fade-and-slide reads as a website. Games push the incoming screen in
 * with a little scale so it arrives with weight, and overshoot slightly on the
 * spring so it settles rather than stops. The outgoing screen shrinks away
 * instead of sliding, which stops the two reading as one long drift.
 */
export const settleVariants = {
  initial: { y: 22, scale: 0.96, opacity: 0 },
  animate: {
    y: 0,
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 26, mass: 0.8 },
  },
  exit: {
    scale: 0.97,
    opacity: 0,
    transition: { duration: 0.14, ease: "easeIn" as any },
  },
};

// BOUNCE_IN — list/grid entrance, spring stiffness 480 damping 18, stagger 0.05s.
export const listContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const bounceInVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 480,
      damping: 18,
    },
  },
};

// POP — scale: [0.8, 1.12, 1], 400ms. Overshoot, always.
export const popVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.12, 1],
    opacity: 1,
    transition: {
      duration: 0.4,
      times: [0, 0.6, 1],
      ease: "easeOut" as any,
    },
  },
};

// SHAKE — wrong answer: x: [0,-8,8,-8,8,-8,8,0] over 360ms
export const shakeVariants = {
  shake: {
    x: [0, -8, 8, -8, 8, -8, 8, 0],
    transition: {
      duration: 0.36,
      ease: "easeInOut" as any,
    },
  },
};

/* ------------------------------------------------------------------ *
 * GAME FEEL
 *
 * Durations follow the standard perceived-responsiveness bands: ~100ms for
 * simple state feedback, 150–200ms for a press, 200–300ms for a change that
 * moves a lot of pixels. Interactive springs sit at stiffness 200–300 so the
 * response is immediate and spends its time settling rather than travelling.
 * ------------------------------------------------------------------ */

/** Press. Real squash — widen as it flattens, so it deforms instead of
 *  merely shrinking. This is the difference between "smaller" and "squishy". */
export const SQUASH = { scaleX: 1.04, scaleY: 0.93 };

export const PRESS_SPRING = {
  type: "spring" as const,
  stiffness: 280,
  damping: 18,
  mass: 0.7,
};

/**
 * ANTICIPATION — a small pull-back before a large move.
 *
 * Disney's second principle, and the cheapest way to make a payoff feel
 * earned rather than merely triggered. The tile flinches inward for 90ms
 * before the unlock wipe runs, which reads as the mechanism taking up slack.
 */
export const anticipateVariants = {
  rest: { scale: 1 },
  wind: {
    scale: 0.93,
    transition: { duration: 0.09, ease: "easeIn" as const },
  },
  release: {
    scale: [0.93, 1.08, 1],
    transition: { duration: 0.32, times: [0, 0.55, 1], ease: "easeOut" as const },
  },
};

/**
 * HIT-STOP — freeze for a beat on impact.
 *
 * Fighting games hold a frame when a hit lands; the pause is what sells the
 * weight. Await this between "answer is correct" and navigating away so the
 * confirmation registers before the screen changes.
 */
export function hitStop(ms = 90) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** A single digit landing in the combination readout: overshoot and settle. */
export const digitLandVariants = {
  initial: { scale: 0.4, y: -8, opacity: 0 },
  animate: {
    scale: [0.4, 1.18, 1],
    y: 0,
    opacity: 1,
    transition: { duration: 0.34, times: [0, 0.6, 1], ease: "easeOut" as const },
  },
};

// CELEBRATE — canvas-confetti, 1.2s.
export function celebrate() {
  const duration = 1200;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ["#E8332B", "#FFC93C", "#35C46A", "#2B6BE4", "#9B5DE5"],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: ["#E8332B", "#FFC93C", "#35C46A", "#2B6BE4", "#9B5DE5"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
