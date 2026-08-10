import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";
import type { MinigameProps } from "./types";

/**
 * SCRAMBLED — put the letters in order.
 *
 * This replaces Codeword, which asked players to "build a word of four letters
 * or more" and graded them against a hand-written list. A player built POSE —
 * a real word, from the tiles they were given — and was told they were wrong,
 * because `pose` was not on the list. Neither were `post`, `stop`, `time`,
 * `most` or `item`.
 *
 * No dictionary fixes that. Any list short enough to write by hand is short
 * enough to have holes, and being told you are wrong when you are right is the
 * one failure that makes a player stop trusting every other answer in the game.
 *
 * An anagram removes the class of bug entirely. The tiles are exactly the
 * letters of one word, all of them must be used, and the server knows that word
 * plus its genuine alternates — so LISTEN and SILENT both pass, and no correct
 * answer can be rejected, because there is nothing else to build.
 */
export function Anagram({ payload, onSubmit, busy }: MinigameProps) {
  // Dealt server-side and fixed on the assignment, so the tiles do not
  // reshuffle themselves under the player's thumb on every re-render.
  const letters = useMemo(
    () => (payload?.letters ?? "").toUpperCase().split(""),
    [payload?.letters]
  );

  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { setPicked([]); setNote(null); }, [payload?.letters]);

  const word = picked.map((i) => letters[i]).join("");
  const complete = picked.length === letters.length;

  const tap = (i: number) => {
    if (busy) return;
    playTap();
    setNote(null);
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  const send = async () => {
    if (!complete) return;
    const result = await onSubmit({ word });
    if (!result.correct) {
      setNote(`${word} is not it. Rearrange and try again.`);
      setPicked([]);
    }
  };

  if (!letters.length) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-body text-[14px] font-semibold text-ink/60">
          This puzzle did not deal properly. Go back and open it again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The answer slots, one per letter.
          Showing empty slots rather than a free-form line is the instruction:
          it says without words that every tile is used and how long the answer
          is, which is exactly the information the old version withheld. */}
      <div className="ink flex min-h-16 items-center justify-center gap-1.5 rounded-plate bg-white px-3 shadow-ink">
        {letters.map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-11 w-9 items-center justify-center rounded-btn border-2 font-display text-[22px]",
              picked[i] !== undefined
                ? "border-ink bg-brass text-ink"
                : "border-dashed border-ink/25 text-transparent"
            )}
          >
            {picked[i] !== undefined ? letters[picked[i]] : "·"}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-2">
        {letters.map((ch, i) => {
          const used = picked.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => tap(i)}
              whileTap={{ y: 3 }}
              className={cn(
                "ink aspect-square rounded-card font-display text-[24px] shadow-[4px_4px_0_0_var(--color-ink)]",
                used ? "bg-paper-deep text-ink/25" : "bg-white text-ink"
              )}
            >
              {ch}
            </motion.button>
          );
        })}
      </div>

      {note && (
        <p className="text-center font-body text-[13px] font-bold text-red-deep">{note}</p>
      )}

      <div className="flex gap-2">
        <Pressable className="flex-1" disabled={busy || !picked.length} onClick={() => setPicked([])}>
          CLEAR
        </Pressable>
        <PrimaryButton className="flex-1" disabled={busy || !complete} onClick={send}>
          {complete ? "SUBMIT" : `${picked.length} / ${letters.length}`}
        </PrimaryButton>
      </div>
    </div>
  );
}
