import confetti from "canvas-confetti";

// SETTLE — screen entry: y: 16 → 0, opacity: 0 → 1, 220ms ease-out.
export const settleVariants = {
  initial: { y: 16, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.22, ease: "easeOut" as any } },
  exit: { y: -16, opacity: 0, transition: { duration: 0.15, ease: "easeIn" as any } },
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
