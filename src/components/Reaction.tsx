import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useReactions } from "../lib/reactions";

/**
 * The GIF itself, on screen.
 *
 * Three decisions worth stating, because each is the opposite of the obvious
 * one:
 *
 * It is NOT a modal. It never blocks a tap, never has a dismiss button, and
 * clears itself in a couple of seconds. A reaction that interrupts play stops
 * being a joke and becomes a dialog you have to close.
 *
 * It is matted like a photo, not bled full-screen. A Tenor GIF dropped raw
 * into this app looks like a different application — hard pixels, no outline,
 * wrong corners. Framed in white with the ink border and the hard offset
 * shadow, it reads as something pinned to the blueprint, which is the language
 * the rest of the game already speaks.
 *
 * It sits bottom-left, above the safe area. Top is the header, centre is the
 * game, and the bottom-right is where a thumb lives on a phone.
 */
export function Reaction() {
  const { current } = useReactions();
  /** Reset per reaction: a 404 on one GIF must not mute the next. */
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [current?.url]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.url}
          initial={{ opacity: 0, y: 24, scale: 0.8, rotate: -6 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: -3 }}
          exit={{ opacity: 0, y: 16, scale: 0.9, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="pointer-events-none fixed bottom-6 left-4 z-[90] w-[min(44vw,190px)]"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Two forms, one slot. A GIF when the file is there, a
              hand-lettered shout when it is not — and a file that 404s falls
              back to the shout rather than vanishing, so the reaction still
              lands on a half-uploaded bucket. */}
          {current.url && !failed ? (
            <div className="ink overflow-hidden rounded-plate bg-white p-2 shadow-ink">
              <img
                src={current.url}
                alt={current.label}
                // Decorative and short-lived. The game state it is reacting to
                // is already announced by the screen underneath, so a screen
                // reader narrating "Ronaldo SIUUU" mid-vault would be noise.
                aria-hidden
                className="aspect-square w-full rounded-btn object-cover"
                loading="eager"
                onError={() => setFailed(true)}
              />
              <p className="pt-1 text-center font-display text-[13px] uppercase tracking-wide text-ink">
                {current.shout}
              </p>
            </div>
          ) : (
            <div className="ink rounded-plate bg-brass px-4 py-3 text-center shadow-[0_6px_0_0_var(--color-brass-deep)]">
              <span
                className="font-display text-[22px] uppercase leading-none text-white"
                style={{ WebkitTextStroke: "2px var(--color-ink)" }}
              >
                {current.shout}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
