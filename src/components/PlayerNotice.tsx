import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../context/GameContext";
import * as api from "../lib/api";

/**
 * A message for ONE player.
 *
 * Notice.tsx is the room-wide banner — one thing the host says to sixty
 * phones. This is the other kind: something that happened to you and nobody
 * else, and right now that means an invigilator judged your evidence.
 *
 * It exists because a vault closing on its own is indistinguishable from a bug.
 * The player is two vaults further on by the time a photo is reviewed; their
 * board quietly shrinks, the tile they already beat goes live again, and
 * without this they would reasonably conclude the game had broken and stop
 * trusting it. The rejection has to arrive as a sentence, not as a state
 * change.
 *
 * Red rather than the host banner's brass, because it always needs an action.
 */
export function PlayerNotice() {
  const { player, session, refresh } = useGame();
  const notice = player?.notice?.trim();
  const stamp = player?.notice_at ?? "";
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Keyed on the timestamp, so a second rejection shows even if it says the
  // same words as the first.
  useEffect(() => { setDismissed(null); }, [stamp]);

  const show = Boolean(notice) && dismissed !== stamp;

  const close = () => {
    setDismissed(stamp);
    // Cleared server-side too. Dismissing only in local state would bring it
    // back on the next reload, for the rest of the game.
    if (session) {
      void api.clearMyNotice(session.id).then(() => refresh());
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed inset-x-0 top-0 z-[100] px-3 pt-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <div className="ink mx-auto flex max-w-[460px] items-start gap-3 rounded-plate bg-red px-4 py-3 shadow-[0_5px_0_0_var(--color-red-deep)]">
            <span className="mt-0.5 shrink-0 font-display text-[11px] uppercase tracking-[0.16em] text-white/70">
              Evidence
            </span>
            <p className="flex-1 font-body text-[14px] font-bold leading-snug text-white">
              {notice}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss"
              className="shrink-0 font-display text-[18px] leading-none text-white/70"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
