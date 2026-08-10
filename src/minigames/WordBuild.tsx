import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { mulberry32, shuffle } from "./seed";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";
import type { MinigameProps } from "./types";

/**
 * WORD BUILD — make a word from seven letters.
 *
 * Verified against a dictionary the SERVER holds, not one shipped here. That
 * matters twice over: the wordlist would be a real chunk of bundle on venue
 * wifi, and a client-side dictionary is a client-side answer key.
 *
 * The letter sets are hand-picked rather than random. Seven random letters is
 * usually unsolvable and always miserable; these are chosen so a four-letter
 * word is nearly free and a six is satisfying.
 */
const SETS = [
  "AETRSLN", "IOTMPSE", "AERDCTS", "ONBLKAE", "IUTRSPE",
  "EAHRTSM", "OARDWNS", "ELPTIAC", "USNRIGE", "OCLDIEA",
];

const MIN_LEN = 4;

export function WordBuild({ seed, onSubmit, busy }: MinigameProps) {
  const letters = useMemo(() => {
    const rand = mulberry32(seed);
    const set = SETS[Math.floor(rand() * SETS.length)];
    return shuffle(rand, set.split(""));
  }, [seed]);

  // Indices into `letters`, so a repeated letter is still two separate tiles.
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const word = picked.map((i) => letters[i]).join("");

  const tap = (i: number) => {
    if (busy) return;
    playTap();
    setNote(null);
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  const send = async () => {
    if (word.length < MIN_LEN) return;
    const result = await onSubmit({ word, letters: letters.join("") });
    if (!result.correct) {
      // Specific, because "wrong" is useless here — the player needs to know
      // whether the word was too short, not a word, or not buildable.
      setNote(`"${word}" is not in the book. Try another.`);
      setPicked([]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The word being built, always visible at size. A player assembling
          letters needs to read what they have without hunting for it. */}
      <div className="ink flex min-h-16 items-center justify-center rounded-plate bg-white px-4 shadow-ink">
        <span className="font-display text-[30px] uppercase tracking-[0.1em] text-ink">
          {word || <span className="text-ink/25">TAP LETTERS</span>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
                "ink aspect-square rounded-card font-display text-[26px] shadow-[4px_4px_0_0_var(--color-ink)]",
                used ? "bg-blue text-white" : "bg-white text-ink"
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
        <PrimaryButton
          className="flex-1"
          disabled={busy || word.length < MIN_LEN}
          onClick={send}
        >
          {word.length < MIN_LEN ? `${MIN_LEN} LETTERS MIN` : "SUBMIT"}
        </PrimaryButton>
      </div>
    </div>
  );
}
