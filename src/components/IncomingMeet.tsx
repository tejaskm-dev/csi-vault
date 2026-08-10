import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton } from "./PrimaryButton";
import { Art } from "./Art";
import { CharadesGuess } from "./challenges/CharadesTask";
import { useGame } from "../context/GameContext";
import { playCorrect } from "../lib/sound";
import { dropIn, popIn, riseIn, screenChoreo } from "../lib/motion";

/**
 * "Someone is standing in front of you."
 *
 * This is the other half of every social challenge, and it is mounted at the
 * app shell rather than on a screen — because the player it interrupts is
 * almost never the player who started the interaction. They are mid-way
 * through their own vault, or reading the leaderboard, when a stranger walks
 * up. Wherever they are, this has to arrive.
 *
 * It takes the whole viewport on purpose. A toast loses to a game screen, and
 * losing here means two students standing in silence waiting for a phone that
 * already told them and got ignored.
 */
export function IncomingMeet() {
  const { incoming, players, confirmMeet } = useGame();
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(60);
  /** Charades only: confirmed, now waiting on this phone to name the mime. */
  const [guessing, setGuessing] = useState(false);

  const from = players.find((p) => p.id === incoming?.actor_id);

  // Count down against the server's own expiry rather than a local 60, so a
  // prompt that arrived late shows the time that is actually left on it.
  useEffect(() => {
    if (!incoming) return;
    setBusy(false);
    setGuessing(false);
    const tick = () => {
      const ms = new Date(incoming.expires_at).getTime() - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [incoming]);

  const confirm = async () => {
    if (!incoming || busy) return;
    setBusy(true);
    try {
      if (incoming.kind === "charades") {
        // Do NOT call confirmMeet — that clears `incoming`, and this phone
        // still has a job to do. The round is completed by charades_guess(),
        // which confirms the interaction itself once a guess lands.
        setGuessing(true);
        playCorrect();
        return;
      }
      await confirmMeet(incoming.id);
      playCorrect();
    } catch {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          variants={screenChoreo}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-[100] flex flex-col bg-paper"
        >
          <motion.div
            variants={dropIn}
            className="relative shrink-0 overflow-hidden rounded-b-[28px] bg-blue px-6 pb-16 pt-10 text-center shadow-[0_4px_0_0_var(--color-ink)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 7px, transparent 7px 18px)",
              }}
            />
            <h2
              className="relative font-display text-[40px] uppercase leading-none tracking-tight text-white"
              style={{ textShadow: "0 4px 0 var(--color-ink)" }}
            >
              Someone found you
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
              <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-blue-deep">
                Vault number
              </span>
              <div className="font-display text-[64px] leading-none text-ink">
                {from?.vault_no ?? "?"}
              </div>
              <p className="mt-1 font-display text-[20px] uppercase leading-tight text-ink">
                {from?.name ?? "A player"}
              </p>
              {/* The instruction is the important line, not the name. A
                  first-year reading this has no idea what is being asked of
                  them unless it is said plainly. */}
              {/* Charades splits the flow in two. Confirming only says "yes,
                  they are here" — the round is not over until they have
                  performed and this phone has guessed. So the prompt states
                  the actual job rather than the generic one. */}
              {incoming.kind === "charades" ? (
                <p className="mt-3 font-body text-[15px] font-bold leading-snug text-ink/70">
                  They are about to act something out. Confirm, watch, then pick
                  what you think it was.
                </p>
              ) : (
                <>
                  <p className="mt-3 font-body text-[15px] font-bold leading-snug text-ink/70">
                    They are standing near you. Say hello, answer their question,
                    then tap below.
                  </p>
                  <p className="mt-2 font-body text-[13px] font-semibold text-ink/45">
                    Only tap this if they are actually in front of you.
                  </p>
                </>
              )}

              {/* Once confirmed, the four options replace the instruction in
                  place — no navigation, because the guesser is holding the
                  phone up watching a person, not reading a screen. */}
              {guessing && (
                <div className="mt-4 border-t-3 border-ink/10 pt-4">
                  <CharadesGuess
                    interactionId={incoming.id}
                    onDone={() => setGuessing(false)}
                  />
                </div>
              )}
            </motion.div>
          </div>

          <motion.div variants={riseIn} className="flex flex-col gap-3 p-6">
            {!guessing && (
              <PrimaryButton className="h-16 w-full" disabled={busy || left === 0} onClick={confirm}>
                {busy
                  ? "CONFIRMING…"
                  : left === 0
                  ? "EXPIRED"
                  : incoming.kind === "charades"
                  ? `THEY ARE HERE · ${left}s`
                  : `CONFIRM · ${left}s`}
              </PrimaryButton>
            )}
            {/* No dismiss button. The prompt expires on its own in under a
                minute, and giving a bored player a way to swat away every
                person who approaches them would quietly break the mechanic for
                everyone else in the room. */}
            <p className="text-center font-body text-[12px] font-semibold text-ink/45">
              This clears itself if nobody is there.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
