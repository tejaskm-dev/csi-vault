import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton } from "../PrimaryButton";
import { Pressable } from "../Pressable";
import { Art } from "../Art";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { playTap } from "../../lib/sound";
import { humanError } from "../../lib/errors";
import { riseIn } from "../../lib/motion";
import type { Challenge } from "../../data/mockData";

/**
 * Find & Connect — the mechanic the whole social half rests on.
 *
 * The flow is deliberately two-sided. You tap I FOUND THEM, which lights up
 * *their* phone; they tap CONFIRM. One phone alone proves nothing, and neither
 * player ever touches the other's device, which is Bible §16's hard rule.
 *
 * The state that matters here is WAITING. A player standing in front of a
 * stranger with a spinner is the moment this game either works or dies, so
 * that state gets a countdown, a plain instruction to read out loud, and a way
 * out that is not "give up".
 */

/** The handshake window, mirroring interactions.expires_at in the schema. */
const WINDOW_S = 60;

type Phase = "idle" | "sending" | "waiting" | "expired";

export function ConnectTask({ challenge }: { challenge: Challenge }) {
  const { live, refresh, player: me, players } = useGame();
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(WINDOW_S);
  const [err, setErr] = useState<string | null>(null);
  // Manual entry is the fallback for a target who genuinely cannot be found —
  // Bible §16 says give a route rather than block the player. Offered only
  // after the first attempt times out, so it never becomes the default path.
  const [manualNo, setManualNo] = useState("");
  /**
   * Show the "type a number" panel even though a target IS assigned.
   *
   * Opened by any failed knock. The screenshot that prompted this had the
   * server refusing the assigned target — correctly, it had already been met —
   * while the only control on screen was I FOUND THEM, which knocks that same
   * number again. The player was told to find someone new and given no way to
   * say who. A refusal must always come with a route.
   */
  const [openPick, setOpenPick] = useState(false);
  const timer = useRef<number | null>(null);

  const target = challenge.targetNo;

  // The server repoints a target that has become impossible (retarget_board),
  // so the number here can legitimately change under the player. When it does,
  // the old complaint about the old number is stale.
  useEffect(() => { setErr(null); setOpenPick(false); }, [target]);

  /**
   * Have they met everyone in the room?
   *
   * With N players a board can only ask for N-1 distinct partners, so a small
   * room runs out — three phones can satisfy two social challenges and no
   * more. The server relaxes the no-repeats rule once that happens; this says
   * so, because otherwise the player is left rereading a rule the game has
   * quietly stopped enforcing.
   *
   * Approximate on purpose: the exact check lives server-side. This only
   * decides what the screen says.
   */
  const roomTooSmall = players.length > 0 && players.length <= 3;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // The confirmation arrives as an assignments UPDATE over realtime, which the
  // context turns into a board refresh. When challenge.solved flips, the
  // parent screen navigates — this component just stops counting.
  useEffect(() => {
    if (challenge.solved && timer.current) clearInterval(timer.current);
  }, [challenge.solved]);

  const startCountdown = () => {
    setLeft(WINDOW_S);
    if (timer.current) clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setLeft((t) => {
        if (t <= 1) {
          if (timer.current) clearInterval(timer.current);
          setPhase("expired");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const knock = async (no: number) => {
    if (!challenge.assignmentId) return;
    playTap();
    setErr(null);
    setPhase("sending");
    try {
      await api.requestConnect(challenge.assignmentId, no);
      setPhase("waiting");
      startCountdown();
      // Poll alongside the realtime subscription. A phone that missed a socket
      // frame in a pocket must not leave two people standing there.
      void refresh();
    } catch (e) {
      // This is the screen where a bad message hurts most: the player is
      // standing in front of a stranger, and "[object Object]" told them
      // nothing about whether to try again, find someone else, or give up.
      setErr(humanError(e, "Could not reach them. Try again in a second."));
      setPhase("idle");
      setOpenPick(true);
    }
  };

  /* ---- offline ------------------------------------------------------- */
  // There is no second phone in a mock board, so rather than a button that
  // quietly does nothing, say what this is and what it needs.
  if (!live) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <Art name="bubble" alt="" className="mx-auto h-20 w-20 object-contain" />
        <p className="mt-3 font-display text-[20px] uppercase leading-tight text-ink">
          Two-phone challenge
        </p>
        <p className="mt-2 font-body text-[14px] font-semibold leading-snug text-ink/60">
          This one needs a live session and someone to walk up to. Connect
          Supabase and it comes alive.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* YOUR number, next to THEIRS.
          This was missing, and it broke the mechanic in both directions: the
          other person has to type or verify your number, and you had no way to
          tell them what it was without leaving the challenge. A social task
          that requires information the app hides from you is not a hard task,
          it is a broken one. */}
      {me && (
        <div className="flex items-center justify-center gap-2">
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
            You are
          </span>
          <span className="ink rounded-pill bg-white px-3 py-1 font-display text-[18px] leading-none text-ink shadow-ink-sm">
            #{me.vault_no}
          </span>
        </div>
      )}

      {/* The target, as big as it can legibly be. A player is reading this
          while scanning a room of sixty heads, so the number has to survive
          being glanced at from arm's length in bad light. */}
      <motion.div
        variants={riseIn}
        initial="initial"
        animate="animate"
        className="ink rounded-plate bg-brass p-6 text-center shadow-[0_6px_0_0_var(--color-brass-deep)]"
      >
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">
          Your target
        </span>
        <div
          className="font-display text-[clamp(56px,20vw,96px)] uppercase leading-none tracking-tight text-white"
          style={{ WebkitTextStroke: "3px var(--color-ink)" }}
        >
          {target ?? "ANY"}
        </div>
        <span className="font-body text-[13px] font-bold text-ink/70">
          {target ? "Their vault number is on their screen" : "Anyone you have not met yet"}
        </span>

        {/* A room this small cannot supply a new partner for every social
            challenge — with N players a board can only ask for N-1. The server
            drops the no-repeats rule once you have met everyone; saying so
            here stops the player rereading a rule the game has stopped
            enforcing and assuming they are stuck. */}
        {roomTooSmall && (
          <p className="mt-2 font-body text-[12px] font-semibold leading-snug text-ink/70">
            Small room — once you have met everyone here, repeats start counting
            again.
          </p>
        )}
      </motion.div>

      {/* No assigned target.
          This is not an edge case — it is the first few students through the
          door, who were dealt a board before there was anybody else in the
          room for pick_target() to choose. They get the open version: find
          anyone, type their number. The server still rejects a repeat pair, so
          it cannot be farmed. */}
      {(!target || openPick) && (
        <div className="ink rounded-plate bg-white p-5 shadow-ink">
          <p className="font-display text-[18px] uppercase leading-tight text-ink">
            Your pick
          </p>
          <p className="mt-1 font-body text-[13px] font-semibold leading-snug text-ink/60">
            {target
              ? "Enter the vault number of whoever is actually in front of you."
              : "You got here early, so this one is open. Find anyone you have not met, ask them the question, and enter their vault number."}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              inputMode="numeric"
              value={manualNo}
              onChange={(e) => setManualNo(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="No."
              className="ink w-24 rounded-btn bg-paper-deep px-3 py-2 text-center font-display text-[18px] text-ink shadow-ink-sm focus:outline-none"
            />
            <Pressable
              className="flex-1"
              disabled={!manualNo || phase === "sending" || phase === "waiting"}
              onClick={() => knock(parseInt(manualNo, 10))}
            >
              KNOCK
            </Pressable>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "waiting" && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ink rounded-plate bg-blue p-5 text-center shadow-[0_6px_0_0_var(--color-blue-deep)]"
          >
            <p className="font-display text-[22px] uppercase leading-tight text-white">
              Ask them to tap confirm
            </p>
            <p className="mt-1 font-body text-[13px] font-semibold text-white/80">
              Their phone is buzzing right now.
            </p>
            {/* A bar, not a number. From the player's point of view the only
                question is "do I still have time", and a shrinking bar answers
                it without being read. */}
            <div className="mt-4 h-3 w-full overflow-hidden rounded-pill border-2 border-ink/30 bg-ink/20">
              <motion.div
                className="h-full bg-white"
                animate={{ width: `${(left / WINDOW_S) * 100}%` }}
                transition={{ ease: "linear", duration: 1 }}
              />
            </div>
          </motion.div>
        )}

        {phase === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ink rounded-plate bg-white p-5 shadow-ink"
          >
            <p className="font-display text-[20px] uppercase leading-tight text-ink">
              No confirmation yet
            </p>
            <p className="mt-1 font-body text-[13px] font-semibold leading-snug text-ink/60">
              They may not have looked at their screen. Tap again, or enter the
              number of whoever is actually in front of you.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                inputMode="numeric"
                value={manualNo}
                onChange={(e) => setManualNo(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="No."
                className="ink w-24 rounded-btn bg-paper-deep px-3 py-2 text-center font-display text-[18px] text-ink shadow-ink-sm focus:outline-none"
              />
              <Pressable
                className="flex-1"
                disabled={!manualNo}
                onClick={() => knock(parseInt(manualNo, 10))}
              >
                KNOCK AGAIN
              </Pressable>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && (
        <p className="text-center font-body text-[13px] font-bold text-red-deep">{err}</p>
      )}

      {/* Hidden when there is no assigned target — the panel above owns the
          action in that case, and two competing primary buttons is worse than
          one in the wrong place. */}
      {target && (
        <PrimaryButton
          className="w-full"
          disabled={phase === "sending" || phase === "waiting"}
          onClick={() => knock(target)}
        >
          {phase === "waiting" ? "WAITING FOR THEM…"
            : phase === "sending" ? "KNOCKING…"
            : "I FOUND THEM"}
        </PrimaryButton>
      )}
    </div>
  );
}
