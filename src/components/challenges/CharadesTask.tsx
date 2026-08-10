import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../PrimaryButton";
import { ConnectTask } from "./ConnectTask";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { humanError } from "../../lib/errors";
import { riseIn } from "../../lib/motion";
import type { Challenge } from "../../data/mockData";

/**
 * CHARADES — the actor's side.
 *
 * This is the answer to "the social challenges are dry". The old ones asked
 * two strangers to both press a button and called it an interaction; nothing
 * was verified and nothing was fun. Here the phone hands you a secret, you
 * perform it in front of someone, and their guess is graded by the server
 * against the word you were given. It is a real party game that happens to
 * mark its own homework.
 *
 * The word is fetched by RPC and never lives in the bundle. The guesser's four
 * options come from a different RPC that only their phone may call.
 */
export function CharadesTask({ challenge }: { challenge: Challenge }) {
  const { live } = useGame();
  const [word, setWord] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!live || !challenge.assignmentId) return;
    let stop = false;
    api.charadesBrief(challenge.assignmentId)
      .then((r) => { if (!stop) setWord(r.word); })
      .catch((e) => { if (!stop) setErr(humanError(e, "Could not get your word.")); });
    return () => { stop = true; };
  }, [live, challenge.assignmentId]);

  if (!live) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-display text-[20px] uppercase leading-tight text-ink">
          Charades
        </p>
        <p className="mt-2 font-body text-[14px] font-semibold leading-snug text-ink/60">
          Needs a live session and someone to perform at.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The word, behind a tap.
          A secret printed on a screen in a crowded room is not a secret — the
          person you are about to perform for is standing right next to you and
          can read it over your shoulder. Hiding it until you deliberately look
          is the difference between a game and a spoiler. */}
      <motion.div
        variants={riseIn}
        initial="initial"
        animate="animate"
        className="ink rounded-plate bg-ink p-6 text-center shadow-ink"
      >
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
          Your secret
        </span>

        {revealed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 font-display text-[30px] uppercase leading-tight text-brass"
          >
            {word ?? "…"}
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-3 w-full rounded-btn border-3 border-white/25 bg-white/10 py-4 font-display text-[18px] uppercase tracking-wide text-white"
          >
            Tap to peek
          </button>
        )}

        <p className="mt-3 font-body text-[12px] font-semibold leading-snug text-white/55">
          No talking. No spelling it out. No pointing at the word.
        </p>
      </motion.div>

      {err && (
        <p className="text-center font-body text-[13px] font-bold text-red-deep">{err}</p>
      )}

      {/* Finding the person is the same handshake as everything else, so it is
          the same component. Their phone shows the four options the moment
          they confirm. */}
      <ConnectTask key={challenge.assignmentId} challenge={challenge} />
    </div>
  );
}

/**
 * CHARADES — the guesser's side.
 *
 * Rendered inside the incoming-meet prompt, because that is where the guesser
 * already is: someone walked up to them and their phone lit up. Four options,
 * one tap, graded server-side.
 */
export function CharadesGuess({
  interactionId,
  onDone,
}: {
  interactionId: string;
  onDone: () => void;
}) {
  const [options, setOptions] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; word: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    api.charadesOptions(interactionId)
      .then((r) => { if (!stop) setOptions(r.options); })
      .catch((e) => { if (!stop) setErr(humanError(e, "Could not load the options.")); });
    return () => { stop = true; };
  }, [interactionId]);

  const guess = async (choice: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.charadesGuess(interactionId, choice);
      setResult(r);
      // Hold the result on screen for a beat before clearing. Both players are
      // looking at this phone and the reveal is the payoff of the whole round.
      setTimeout(onDone, 2200);
    } catch (e) {
      setErr(humanError(e, "That guess did not go through."));
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="text-center">
        <p className="font-display text-[26px] uppercase leading-tight text-ink">
          {result.correct ? "Got it!" : "Not quite"}
        </p>
        <p className="mt-2 font-body text-[15px] font-bold text-ink/70">
          It was <strong>{result.word}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-center font-body text-[13px] font-bold uppercase tracking-[0.14em] text-ink/50">
        What are they doing?
      </p>

      {err && (
        <p className="mt-2 text-center font-body text-[13px] font-bold text-red-deep">{err}</p>
      )}

      <div className="mt-3 grid gap-2">
        {(options ?? []).map((o) => (
          <button
            key={o}
            type="button"
            disabled={busy}
            onClick={() => guess(o)}
            className="ink rounded-card bg-white px-4 py-3 text-left font-body text-[15px] font-bold text-ink shadow-[4px_4px_0_0_var(--color-ink)] disabled:opacity-40"
          >
            {o}
          </button>
        ))}
        {!options && !err && (
          <p className="text-center font-body text-[13px] font-semibold text-ink/40">
            Loading…
          </p>
        )}
      </div>
    </div>
  );
}
