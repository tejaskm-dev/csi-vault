import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "./Modal";
import { PrimaryButton } from "./PrimaryButton";
import { Pressable } from "./Pressable";
import { useGame } from "../context/GameContext";
import { playTap } from "../lib/sound";

/**
 * The way back in after a wiped browser.
 *
 * Anonymous auth lives in localStorage. Refreshing, closing the tab and
 * backgrounding the browser are all fine and always were — but "clear browsing
 * data" mints a new identity, and without this the student's row is stranded
 * on the leaderboard while they start again from zero.
 *
 * Two surfaces, because they serve opposite moments:
 *
 *   the CHIP  small, always on the home screen, so the number is visible
 *             before anyone needs it. Nobody reads a warning; they do glance
 *             at their own screen.
 *
 *   the MODAL the first time only, once, with enough weight to be screenshotted.
 *
 * Neither is scary. It is a four-digit number next to a vault number, framed
 * as a badge rather than a security instruction, because ninety-five percent
 * of players will never need it.
 */
export function RecoveryChip() {
  const { pin, player, live } = useGame();
  const [open, setOpen] = useState(false);

  if (!live || !pin || !player) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => { playTap(); setOpen(true); }}
        className="ink flex items-center gap-2 rounded-pill bg-white px-3 py-1.5 shadow-ink-sm"
      >
        <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
          You are
        </span>
        <span className="font-display text-[15px] leading-none text-ink">
          #{player.vault_no}
        </span>
        <span className="h-3 w-px bg-ink/20" />
        <span className="font-readout text-[13px] font-bold tracking-widest text-ink/70">
          {pin}
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <h2 className="text-[24px] font-extrabold uppercase leading-tight text-ink">
          Your crew tag
        </h2>
        <p className="font-body text-[15px] font-bold leading-relaxed text-ink/70">
          Vault number <strong>{player.vault_no}</strong>, code{" "}
          <strong className="font-readout tracking-widest">{pin}</strong>.
        </p>
        <p className="font-body text-[13px] font-semibold leading-snug text-ink/50">
          Other players use your number to find you. The code is only needed if
          you clear your browser or switch phone — then it gets your progress
          back.
        </p>
        <PrimaryButton onClick={() => setOpen(false)} className="mt-2 w-full">
          GOT IT
        </PrimaryButton>
      </Modal>
    </>
  );
}

/**
 * The reclaim form, for someone whose storage is already gone.
 *
 * Lives on the name screen, folded away behind one line of text — a first-year
 * arriving for the first time should see a name field and a button, not a
 * recovery form they have to reason about and dismiss.
 */
export function ReclaimPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { reclaim, live } = useGame();
  // Opened for them when the doors are shut — that player has no other route
  // in, and making them find a collapsed link first is an obstacle for its
  // own sake.
  const [open, setOpen] = useState(defaultOpen);
  const [no, setNo] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!live) return null;

  const go = async () => {
    if (!no || pin.length !== 4 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await reclaim(parseInt(no, 10), pin);
      // No navigation here. The context now holds a player and a board, and
      // the name screen's own effect takes it from there — the same path a
      // fresh join follows, so there is only one route into the game.
    } catch (e) {
      setErr(
        e instanceof Error && /too many/i.test(e.message)
          ? "Too many tries. Wait a few minutes, or ask the host."
          : "That number and code do not match."
      );
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ink rounded-plate bg-white p-4 shadow-ink-sm">
              <p className="font-body text-[13px] font-bold leading-snug text-ink/70">
                Enter your vault number and 4-digit code to pick up where you
                left off.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  inputMode="numeric"
                  value={no}
                  onChange={(e) => setNo(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="No."
                  className="ink w-20 rounded-btn bg-paper-deep px-2 py-2 text-center font-display text-[17px] text-ink shadow-ink-sm focus:outline-none"
                />
                <input
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Code"
                  className="ink flex-1 rounded-btn bg-paper-deep px-2 py-2 text-center font-readout text-[17px] tracking-widest text-ink shadow-ink-sm focus:outline-none"
                />
              </div>
              {err && (
                <p className="mt-2 font-body text-[12px] font-bold text-red-deep">{err}</p>
              )}
              <Pressable
                className="mt-3 w-full"
                disabled={!no || pin.length !== 4 || busy}
                onClick={go}
              >
                {busy ? "CHECKING…" : "GET ME BACK IN"}
              </Pressable>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="link"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { playTap(); setOpen(true); }}
            className="w-full text-center font-body text-[12px] font-bold uppercase tracking-[0.12em] text-ink/40 underline decoration-ink/20 underline-offset-4"
          >
            Already playing? Recover your run
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
