import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Art } from "../Art";
import { playTap } from "../../lib/sound";
import { listStagger, riseIn } from "../../lib/motion";
import { cn } from "../../lib/utils";
import type { TaskProps } from "./types";

/**
 * The fast ones. Bible §11 and §12 — tap what you see, before you can talk
 * yourself out of it.
 *
 * Two micro-games share this component because they share the one mechanic
 * that matters: a single tap, timed from the moment the puzzle is on screen.
 * The elapsed time is sent with the answer and checked server-side against a
 * floor — not to score speed, but because a human cannot see a grid and hit
 * the odd square in 80ms, and a script can.
 */

/** The palette the colour trap draws from, in the app's own tokens. */
const SWATCH: Record<string, { bg: string; deep: string; label: string }> = {
  red:    { bg: "var(--color-red)",    deep: "var(--color-red-deep)",    label: "Red" },
  blue:   { bg: "var(--color-blue)",   deep: "var(--color-blue-deep)",   label: "Blue" },
  green:  { bg: "var(--color-green)",  deep: "var(--color-green-deep)",  label: "Green" },
  yellow: { bg: "var(--color-brass)",  deep: "var(--color-brass-deep)",  label: "Yellow" },
};

export function ObserveTask({ challenge, submit, onCorrect, onWrong, busy }: TaskProps) {
  const payload = challenge.payload ?? {};
  const [locked, setLocked] = useState(false);

  // Started when the puzzle paints, not when the screen mounts — the question
  // card and the header animate in first, and counting that time would punish
  // a player for the app's own entrance.
  const shownAt = useRef(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => { shownAt.current = performance.now(); });
    return () => cancelAnimationFrame(id);
  }, [challenge.id]);

  const answer = async (option: string) => {
    if (locked || busy) return;
    setLocked(true);
    playTap();
    const ms = Math.round(performance.now() - shownAt.current);
    try {
      const result = await submit({ option, ms });
      if (result.correct) onCorrect();
      else { onWrong(); setLocked(false); }
    } catch {
      setLocked(false);
    }
  };

  /* ---------------------------------------------------------------- *
   * Colour trap — read the ink, not the word
   * ---------------------------------------------------------------- */
  if (payload.mode === "colour_trap") {
    const choices = payload.choices ?? Object.keys(SWATCH);
    return (
      <div className="flex flex-col gap-6">
        {/* The word is the whole puzzle, so it gets the whole width and the
            display face at its loudest. Text-stroke rather than a border keeps
            it reading as drawn-on-paper rather than another steel plate — the
            plates here are the four things you can press. */}
        <motion.div
          key={challenge.id}
          initial={{ scale: 0.86, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: -1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="ink rounded-plate bg-white py-10 text-center shadow-ink"
        >
          <span
            className="font-display text-[clamp(48px,17vw,84px)] uppercase leading-none tracking-tight"
            style={{
              color: SWATCH[payload.ink ?? "red"]?.bg,
              WebkitTextStroke: "3px var(--color-ink)",
            }}
          >
            {payload.word}
          </span>
        </motion.div>

        <motion.div
          variants={listStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-4"
        >
          {choices.map((c) => (
            <motion.button
              key={c}
              variants={riseIn}
              type="button"
              disabled={locked || busy}
              onClick={() => answer(c)}
              whileTap={{ x: 4, y: 4 }}
              className="ink rounded-card h-24 font-display text-[20px] uppercase tracking-wide text-white disabled:opacity-40"
              style={{
                backgroundColor: SWATCH[c]?.bg,
                boxShadow: `5px 5px 0 0 var(--color-ink)`,
              }}
            >
              {SWATCH[c]?.label ?? c}
            </motion.button>
          ))}
        </motion.div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- *
   * Find the impostor — one square is not like the others
   * ---------------------------------------------------------------- */
  const count = payload.count ?? 16;
  const oddIndex = payload.odd_index ?? 0;
  // Square-ish grid. 16 wants 4 columns, 25 wants 5 — anything else settles on
  // whatever keeps the cells closest to square on a 390px screen.
  const cols = Math.round(Math.sqrt(count));

  return (
    <motion.div
      key={challenge.id}
      variants={listStagger}
      initial="initial"
      animate="animate"
      className="ink rounded-plate grid gap-2 bg-white p-3 shadow-ink"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.button
          key={i}
          variants={riseIn}
          type="button"
          disabled={locked || busy}
          onClick={() => answer(String(i))}
          whileTap={{ scale: 0.88 }}
          className={cn(
            "aspect-square rounded-btn bg-paper-deep p-1.5 transition-colors",
            "active:bg-blue/25 disabled:opacity-40"
          )}
          // The grid is the puzzle. Naming each cell would hand the answer to a
          // screen reader, so the cells are numbered and the instruction above
          // carries the meaning.
          aria-label={`Square ${i + 1}`}
        >
          <Art
            name={(i === oddIndex ? payload.odd : payload.fill) ?? "circle"}
            alt=""
            className="h-full w-full object-contain"
          />
        </motion.button>
      ))}
    </motion.div>
  );
}
