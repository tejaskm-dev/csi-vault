import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../context/GameContext";

/**
 * What the operator says, on every phone.
 *
 * The single most useful thing to build for problems nobody predicted, because
 * it does not need to know what the problem is. "Vault 5 is broken, use the
 * skip button" or "everyone to the front, two minutes" resolves an enormous
 * range of situations that no amount of code can anticipate — and until now
 * the host's only channel to sixty students was shouting over them.
 *
 * Deliberately dismissible, and deliberately re-shown when the message
 * changes: a banner that cannot be closed becomes something players tap around
 * for the rest of the game, and one that never comes back is useless the
 * second time something happens.
 */
export function Notice() {
  const { session } = useGame();
  const notice = session?.notice?.trim();
  const stamp = session?.notice_at ?? "";
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Keyed on the timestamp, not the text, so the host can send the same words
  // twice and have them land both times.
  useEffect(() => { setDismissed(null); }, [stamp]);

  const show = Boolean(notice) && dismissed !== stamp;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed inset-x-0 top-0 z-[99] px-3 pt-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <div className="ink mx-auto flex max-w-[460px] items-start gap-3 rounded-plate bg-brass px-4 py-3 shadow-[0_5px_0_0_var(--color-brass-deep)]">
            <span className="mt-0.5 shrink-0 font-display text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Host
            </span>
            <p className="flex-1 font-body text-[14px] font-bold leading-snug text-ink">
              {notice}
            </p>
            <button
              type="button"
              onClick={() => setDismissed(stamp)}
              aria-label="Dismiss"
              className="shrink-0 font-display text-[18px] leading-none text-ink/50"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
