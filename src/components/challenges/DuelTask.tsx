import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectTask } from "./ConnectTask";
import { Art } from "../Art";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { humanError } from "../../lib/errors";
import { playTap, playCorrect } from "../../lib/sound";
import { riseIn } from "../../lib/motion";
import { cn } from "../../lib/utils";
import type { Challenge } from "../../data/mockData";

/**
 * THE DUEL — rock, paper, scissors against the person in front of you.
 *
 * Every other social challenge reduces to the same verb: find someone, both
 * tap. This is the first one where you actually PLAY against them, on two
 * phones, at the same time — which is a different kind of moment entirely, and
 * the reason it exists.
 *
 * Neither phone learns the other's throw until both have committed; the server
 * holds them and only reveals once. So there is no version of this where
 * watching the screen beats playing the game.
 *
 * BOTH PLAYERS PASS, win or lose. The challenge is having the encounter.
 * Making it depend on winning would leave half the room holding something that
 * trying harder cannot solve.
 */
const THROWS = [
  { id: "rock",     label: "Rock",     glyph: "circle" },
  { id: "paper",    label: "Paper",    glyph: "box" },
  { id: "scissors", label: "Scissors", glyph: "shield" },
] as const;

export function DuelTask({ challenge }: { challenge: Challenge }) {
  const { live, refresh } = useGame();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "waiting" | "round" | "over">("idle");
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [last, setLast] = useState<{ you: string; them: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Find the confirmed duel this challenge belongs to. It appears once the
  // handshake below has been accepted by the other phone.
  useEffect(() => {
    if (!live || !challenge.assignmentId || interactionId) return;
    let stop = false;
    const look = async () => {
      try {
        const row = await api.myInteraction(challenge.assignmentId!);
        if (!stop && row) setInteractionId(row.id);
      } catch { /* the poll retries */ }
    };
    void look();
    const t = setInterval(look, 2500);
    return () => { stop = true; clearInterval(t); };
  }, [live, challenge.assignmentId, interactionId]);

  // While waiting on the opponent's throw, poll for the round resolving.
  useEffect(() => {
    if (state !== "waiting" || !interactionId) return;
    const t = setInterval(async () => {
      try {
        const s = await api.duelState(interactionId);
        if (!s.pending) {
          setScore(s.score as [number, number]);
          setState(s.over ? "over" : "round");
          if (s.over) { playCorrect(); void refresh(); }
        }
      } catch { /* retries */ }
    }, 1500);
    return () => clearInterval(t);
  }, [state, interactionId, refresh]);

  if (!live) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-display text-[20px] uppercase leading-tight text-ink">Duel</p>
        <p className="mt-2 font-body text-[14px] font-semibold text-ink/60">
          Needs a live session and somebody to play against.
        </p>
      </div>
    );
  }

  // Until the handshake lands, this IS a find-and-connect.
  if (!interactionId) {
    return (
      <div className="flex flex-col gap-5">
        <div className="ink rounded-plate bg-purple p-5 text-center shadow-[0_6px_0_0_var(--color-purple-deep)]">
          <p className="font-display text-[22px] uppercase leading-tight text-white">
            Best of three
          </p>
          <p className="mt-1 font-body text-[13px] font-bold text-white/80">
            Find them first. Then you both throw on your own phones.
          </p>
        </div>
        <ConnectTask key={challenge.assignmentId} challenge={challenge} />
      </div>
    );
  }

  const throwIt = async (choice: string) => {
    if (state === "waiting" || state === "over") return;
    playTap();
    setErr(null);
    setState("waiting");
    try {
      const r = await api.duelThrow(interactionId, choice);
      if (r.state === "waiting") return;                 // opponent still deciding
      setScore(r.score as [number, number]);
      if (r.you && r.them) setLast({ you: r.you, them: r.them });
      if (r.state === "over") {
        setState("over"); setResult(r.result ?? null); playCorrect(); void refresh();
      } else setState("round");
    } catch (e) {
      setErr(humanError(e, "That throw did not go through."));
      setState("round");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="ink flex items-center justify-around rounded-plate bg-white py-4 shadow-ink">
        <Side label="You" score={score[0]} />
        <span className="font-display text-[16px] uppercase text-ink/35">vs</span>
        <Side label="Them" score={score[1]} />
      </div>

      <AnimatePresence mode="wait">
        {last && (
          <motion.div
            key={`${last.you}-${last.them}-${score.join()}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ink flex items-center justify-around rounded-plate bg-paper-deep py-4 shadow-ink-sm"
          >
            <Hand id={last.you} />
            <Hand id={last.them} />
          </motion.div>
        )}
      </AnimatePresence>

      {err && <p className="text-center font-body text-[13px] font-bold text-red-deep">{err}</p>}

      {state === "over" ? (
        <div className="ink rounded-plate bg-green p-5 text-center shadow-[0_6px_0_0_var(--color-green-deep)]">
          <p className="font-display text-[26px] uppercase leading-tight text-white">
            {result === "won" ? "You win" : result === "lost" ? "They win" : "Dead heat"}
          </p>
          {/* Said explicitly, because a player who lost will assume they failed
              the challenge — and the whole point is that they did not. */}
          <p className="mt-1 font-body text-[13px] font-bold text-white/85">
            Either way, the vault opens. You played.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {THROWS.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              disabled={state === "waiting"}
              onClick={() => throwIt(t.id)}
              whileTap={{ y: 4 }}
              className={cn(
                "ink flex flex-col items-center gap-1 rounded-card bg-white p-3",
                "shadow-[5px_5px_0_0_var(--color-ink)] disabled:opacity-40"
              )}
            >
              <Art name={t.glyph} alt="" className="h-12 w-12 object-contain" />
              <span className="font-display text-[13px] uppercase text-ink">{t.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      <p className="text-center font-body text-[13px] font-semibold text-ink/55">
        {state === "waiting"
          ? "Waiting for their throw…"
          : state === "over"
          ? "Done."
          : "Count to three out loud, then both tap."}
      </p>
    </div>
  );
}

function Side({ label, score }: { label: string; score: number }) {
  return (
    <div className="text-center">
      <div className="font-display text-[34px] leading-none text-ink">{score}</div>
      <div className="mt-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </div>
    </div>
  );
}

function Hand({ id }: { id: string }) {
  const t = THROWS.find((x) => x.id === id);
  return (
    <div className="flex flex-col items-center gap-1">
      <Art name={t?.glyph ?? "circle"} alt="" className="h-14 w-14 object-contain" />
      <span className="font-body text-[11px] font-bold uppercase text-ink/60">{t?.label}</span>
    </div>
  );
}
