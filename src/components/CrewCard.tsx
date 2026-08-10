import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../context/GameContext";
import { playTap } from "../lib/sound";

/**
 * Everything anyone might ask you for, reachable from anywhere.
 *
 * The social challenges assume both players know things the app only ever
 * showed to one of them. A stranger walks up and says "what's your number?" —
 * and unless that player happened to be on the home screen, or on a connect
 * challenge of their own, there was nowhere to look. They had to navigate away
 * from whatever they were doing, losing their place, to answer a question
 * about themselves.
 *
 * So this floats on every game screen: a tab on the right edge, a full card
 * when tapped. Vault number, name, recovery code, progress, and a plain
 * explanation of what each is for — because a first-year holding a phone in a
 * loud room is not going to infer it.
 */
export function CrewCard() {
  const { live, player, pin, unlockedVaults, bonusSolved, session } = useGame();
  const [open, setOpen] = useState(false);

  if (!live || !player) return null;

  const vaults = unlockedVaults.length;

  return (
    <>
      {/* The tab. Right edge, vertically centred, deliberately small — it has
          to be findable without competing with the game. Bottom-left is the
          reaction, bottom-right is the thumb, so the right edge it is. */}
      <button
        type="button"
        onClick={() => { playTap(); setOpen(true); }}
        aria-label="Show my crew card"
        className="ink fixed right-0 top-1/2 z-[95] -translate-y-1/2 rounded-l-plate border-r-0 bg-brass py-4 pl-2 pr-1 shadow-[0_4px_0_0_var(--color-brass-deep)]"
      >
        <span className="flex flex-col items-center gap-1">
          <span className="font-body text-[8px] font-bold uppercase tracking-[0.14em] text-ink/60">
            You
          </span>
          <span className="font-display text-[19px] leading-none text-ink">
            {player.vault_no}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/60 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: -1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="ink w-full max-w-sm overflow-hidden rounded-plate bg-paper shadow-ink"
            >
              <div className="relative overflow-hidden bg-red px-5 py-4 text-center">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 7px, transparent 7px 18px)",
                  }}
                />
                <span className="relative font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  Crew card
                </span>
                <div
                  className="relative font-display text-[26px] uppercase leading-tight text-white"
                  style={{ textShadow: "0 3px 0 var(--color-ink)" }}
                >
                  {player.name}
                </div>
              </div>

              <div className="space-y-3 p-5">
                {/* The number, biggest thing on the card. It is the single
                    fact other players actually need from you. */}
                <div className="ink rounded-plate bg-brass px-4 py-3 text-center shadow-[0_4px_0_0_var(--color-brass-deep)]">
                  <span className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-ink/60">
                    Your vault number
                  </span>
                  <div
                    className="font-display text-[52px] leading-none text-white"
                    style={{ WebkitTextStroke: "3px var(--color-ink)" }}
                  >
                    {player.vault_no}
                  </div>
                  <p className="mt-1 font-body text-[12px] font-bold text-ink/70">
                    This is what people mean when they ask "what's your number?"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Fact label="Vaults open" value={`${vaults}/9`} />
                  <Fact label="Bonus" value={bonusSolved ? "Yes" : "—"} />
                </div>

                {pin && (
                  <div className="ink rounded-plate bg-white px-4 py-3 shadow-ink-sm">
                    <span className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
                      Recovery code
                    </span>
                    <div className="font-readout text-[24px] font-bold tracking-widest text-ink">
                      {pin}
                    </div>
                    <p className="mt-1 font-body text-[12px] font-semibold leading-snug text-ink/55">
                      Only needed if you clear your browser or swap phone. Nobody
                      else should ask you for this.
                    </p>
                  </div>
                )}

                <div className="ink rounded-plate bg-paper-deep px-4 py-3 shadow-ink-sm">
                  <p className="font-body text-[12px] font-bold uppercase tracking-[0.14em] text-ink/50">
                    How the social ones work
                  </p>
                  <ul className="mt-2 space-y-1.5 font-body text-[13px] font-semibold leading-snug text-ink/70">
                    <li>· Your challenge names a number. Go and find that person.</li>
                    <li>· They ask yours — it is the big number above.</li>
                    <li>· One of you taps, the other confirms. Both phones.</li>
                    <li>· You cannot pair with the same person twice.</li>
                  </ul>
                </div>

                {session && (
                  <p className="text-center font-body text-[11px] font-semibold text-ink/35">
                    Room {session.join_code} · {session.phase}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ink w-full rounded-btn bg-ink py-3 font-display text-[15px] uppercase tracking-wide text-white"
                >
                  Back to it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="ink rounded-plate bg-white px-3 py-2 text-center shadow-ink-sm">
      <div className="font-display text-[22px] leading-none text-ink">{value}</div>
      <div className="mt-1 font-body text-[9px] font-bold uppercase tracking-[0.14em] text-ink/45">
        {label}
      </div>
    </div>
  );
}
