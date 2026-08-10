import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton } from "./PrimaryButton";
import { Art } from "./Art";
import { useGame } from "../context/GameContext";
import { dropIn, popIn, riseIn, screenChoreo } from "../lib/motion";

/**
 * "The host reset the game."
 *
 * host_reset() deletes every player row. Before this existed, the phones did
 * not notice: each one kept its `player` object, kept asking for a board that
 * had been deleted, and kept getting an empty one — so the student sat looking
 * at nine locked vaults with no explanation and no way back to the door.
 *
 * Mounted at the shell, next to IncomingMeet, for the same reason: it has to
 * reach a player wherever they are, and after a reset there is nowhere they
 * can be that is still valid.
 *
 * Note what it does NOT do. It does not sign them out of Supabase — that
 * identity is still fine, it just owns nothing now — and it does not clear
 * their name. Being made to retype your name because an admin pressed a button
 * is a bad way to start the second attempt at a game.
 */
export function RoomReset() {
  const { evicted, clearEviction, username } = useGame();

  // Routing is NOT done here. evict() clears `player`, and RouteGuard moves the
  // page underneath this overlay — one component owns navigation, so the two
  // cannot fight over it or double-navigate.

  return (
    <AnimatePresence>
      {evicted && (
        <motion.div
          variants={screenChoreo}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-[110] flex flex-col bg-paper"
        >
          <motion.div
            variants={dropIn}
            className="relative shrink-0 overflow-hidden rounded-b-[28px] bg-brass px-6 pb-16 pt-10 text-center shadow-[0_4px_0_0_var(--color-ink)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.18) 0 7px, transparent 7px 18px)",
              }}
            />
            <h2
              className="relative font-display text-[38px] uppercase leading-none tracking-tight text-white"
              style={{ textShadow: "0 4px 0 var(--color-ink)" }}
            >
              Vaults resealed
            </h2>
          </motion.div>

          <div className="flex flex-1 flex-col justify-center gap-4 px-6">
            <motion.div variants={popIn} className="-mt-20 flex shrink-0 justify-center">
              <Art
                name="mascot-thinking"
                alt=""
                className="h-[min(11rem,20vh)] w-[min(11rem,20vh)] object-contain"
              />
            </motion.div>

            <motion.div
              variants={riseIn}
              style={{ rotate: -1 }}
              className="ink rounded-plate bg-white p-6 text-center shadow-ink"
            >
              <p className="font-display text-[22px] uppercase leading-tight text-ink">
                The host restarted the game
              </p>
              {/* Said plainly, including the part they will care about. A
                  vague "something changed" leaves a student wondering whether
                  they broke it. */}
              <p className="mt-3 font-body text-[15px] font-bold leading-snug text-ink/70">
                Everyone is back at the door, and every board has been reshuffled.
                Your old progress is gone — so is everybody else's.
              </p>
              <p className="mt-2 font-body text-[13px] font-semibold text-ink/45">
                You will get a new vault number when you go back in.
              </p>
            </motion.div>
          </div>

          <motion.div variants={riseIn} className="flex flex-col gap-3 p-6">
            <PrimaryButton className="h-16 w-full" onClick={clearEviction}>
              {username ? `BACK IN AS ${username.toUpperCase()}` : "BACK TO THE DOOR"}
            </PrimaryButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
