import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../PrimaryButton";
import { useGame } from "../../context/GameContext";
import * as api from "../../lib/api";
import { listStagger, riseIn } from "../../lib/motion";
import { playTap } from "../../lib/sound";
import { cn } from "../../lib/utils";
import type { TaskProps } from "./types";

/**
 * Human Memory — Bible §6.
 *
 * "Who told you that?" is graded against the interaction log, so the only way
 * to answer it is to have been in the conversation. That is what stops memory
 * challenges from degenerating into a trivia round: there is nothing to know
 * here, only someone to remember.
 *
 * The choices are drawn from people this player has actually met, plus a few
 * they have not, so the answer is recallable but not obvious by elimination.
 */
export function RecallTask({ challenge, submit, onCorrect, onWrong, busy }: TaskProps) {
  const { players, player, live } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  // null = still asking the server which meeting this is about.
  const [ready, setReady] = useState<boolean | null>(live ? null : true);

  // The question is bound to a real meeting the first time this screen opens.
  // It cannot be bound at deal time — the player had met nobody then.
  useEffect(() => {
    if (!live || !challenge.assignmentId) return;
    let stop = false;
    api.prepareRecall(challenge.assignmentId)
      .then((r) => { if (!stop) setReady(r.ready); })
      .catch(() => { if (!stop) setReady(false); });
    return () => { stop = true; };
  }, [live, challenge.assignmentId]);

  // A stable shuffle: re-deriving the order on every render would reshuffle the
  // grid under the player's thumb each time the leaderboard poll lands.
  const choices = useMemo(() => {
    const others = players.filter((p) => p.id !== player?.id);
    // Six is the most that fits above the fold at 390px without scrolling, and
    // scrolling a memory question means the option you half-remember is the one
    // off screen.
    return others
      .map((p) => ({ p, k: Math.sin(p.vault_no * 9973) }))
      .sort((a, b) => a.k - b.k)
      .slice(0, 6)
      .map((x) => x.p)
      .sort((a, b) => a.vault_no - b.vault_no);
  }, [players, player?.id]);

  const handleSubmit = async () => {
    if (!picked) return;
    const result = await submit({ player_id: picked });
    if (result.correct) onCorrect();
    else { onWrong(); setPicked(null); }
  };

  if (ready === null) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-body text-[14px] font-semibold text-ink/50">
          Checking who you have met…
        </p>
      </div>
    );
  }

  // `ready === false` is the honest case: this player genuinely has not met
  // anyone yet, so there is no memory to test. Saying so — and pointing them
  // at the fix — beats showing six faces they have never seen.
  if (!ready || choices.length === 0) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-display text-[20px] uppercase leading-tight text-ink">
          Nobody to remember yet
        </p>
        <p className="mt-2 font-body text-[14px] font-semibold leading-snug text-ink/60">
          This one needs a conversation first. Open a vault that sends you
          across the room, then come back — it will be waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        variants={listStagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-3"
      >
        {choices.map((p) => (
          <motion.button
            key={p.id}
            variants={riseIn}
            type="button"
            disabled={busy}
            onClick={() => { playTap(); setPicked(p.id); }}
            whileTap={{ x: 3, y: 3 }}
            className={cn(
              "ink rounded-card aspect-square flex flex-col items-center justify-center gap-1",
              "shadow-[4px_4px_0_0_var(--color-ink)] transition-colors disabled:opacity-40",
              picked === p.id ? "bg-blue text-white" : "bg-white text-ink"
            )}
          >
            <span className="font-display text-[30px] leading-none">{p.vault_no}</span>
            {/* The name under the number, quiet. The number is what was on
                their screen when you met them; the name is the thing you might
                actually remember. Both, in that order of prominence. */}
            <span className="max-w-full truncate px-1 font-body text-[10px] font-bold uppercase tracking-wide opacity-70">
              {p.name}
            </span>
          </motion.button>
        ))}
      </motion.div>

      <PrimaryButton className="w-full" disabled={!picked || busy} onClick={handleSubmit}>
        THAT WAS THEM
      </PrimaryButton>
    </div>
  );
}
