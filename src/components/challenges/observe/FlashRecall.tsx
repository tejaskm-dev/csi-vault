import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Art } from "../../Art";
import { playTap } from "../../../lib/sound";
import { listStagger, riseIn } from "../../../lib/motion";
import { cn } from "../../../lib/utils";
import type { GlyphKey } from "../../../data/mockData";

/**
 * FLASH RECALL — see a row, lose it, name what was there.
 *
 * Added because the observe category had exactly two mechanics in it: tap the
 * odd one, and tap the colour. Eleven challenges, two things to actually DO.
 * More rows of the same puzzle does not fix "I keep seeing the same question";
 * only a different verb does.
 *
 * This one is a different verb — hold something in your head for two seconds —
 * and it needs no new art, because the whole point is that the symbols vanish.
 */
export function FlashRecall({
  symbols,
  askIndex,
  choices,
  onAnswer,
  busy,
}: {
  symbols: GlyphKey[];
  askIndex: number;
  choices: GlyphKey[];
  onAnswer: (glyph: string) => void;
  busy?: boolean;
}) {
  /** showing → the row is visible · asking → it is gone and the question is up */
  const [phase, setPhase] = useState<"ready" | "showing" | "asking">("ready");

  /**
   * One second look, and only one.
   *
   * Two seconds of a five-symbol row, with no warning of which position will
   * be asked, is a genuinely hard ask — and a player who blinked had nothing
   * left but a one-in-four guess, with no way to earn the answer. That is the
   * same shape as the clue-less anagram: a wall rather than a route.
   *
   * Once, not unlimited, because unlimited looks means the row is never gone
   * and there is no memory in the memory game.
   */
  const [replays, setReplays] = useState(1);

  useEffect(() => {
    if (phase !== "showing") return;
    const t = setTimeout(() => setPhase("asking"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  const ordinal = ["first", "second", "third", "fourth", "fifth"][askIndex] ?? `${askIndex + 1}th`;

  return (
    <div className="flex flex-col gap-5">
      <div className="ink flex min-h-36 items-center justify-center rounded-plate bg-white p-4 shadow-ink">
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.button
              key="ready"
              type="button"
              disabled={busy}
              onClick={() => { playTap(); setPhase("showing"); }}
              className="font-display text-[20px] uppercase tracking-wide text-ink"
            >
              Tap when you are ready
            </motion.button>
          )}

          {phase === "showing" && (
            <motion.div
              key="showing"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="flex items-center gap-3"
            >
              {symbols.map((g, i) => (
                <div key={i} className="h-14 w-14">
                  <Art name={g} alt="" className="h-full w-full object-contain" />
                </div>
              ))}
            </motion.div>
          )}

          {phase === "asking" && (
            <motion.p
              key="asking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center font-display text-[22px] uppercase leading-tight text-ink"
            >
              Which was {ordinal}?
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Choices stay hidden until the row is gone — visible options would let
          a player match by eye instead of remembering, which is the entire
          mechanic. */}
      {phase === "asking" && (
        <motion.div
          variants={listStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-4 gap-3"
        >
          {choices.map((g) => (
            <motion.button
              key={g}
              variants={riseIn}
              type="button"
              disabled={busy}
              onClick={() => { playTap(); onAnswer(g); }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "ink aspect-square rounded-card bg-white p-2",
                "shadow-[4px_4px_0_0_var(--color-ink)] disabled:opacity-40"
              )}
              aria-label={g}
            >
              <Art name={g} alt="" className="h-full w-full object-contain" />
            </motion.button>
          ))}
        </motion.div>
      )}

      {phase === "asking" && replays > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => { playTap(); setReplays(0); setPhase("showing"); }}
          className="mx-auto font-body text-[12px] font-bold uppercase tracking-[0.14em] text-ink/40 underline decoration-ink/20 underline-offset-4"
        >
          Show it once more
        </button>
      )}

      {phase !== "asking" && (
        <p className="text-center font-body text-[13px] font-semibold text-ink/55">
          {phase === "ready"
            ? "You get one look, for about two seconds."
            : "Remember the order…"}
        </p>
      )}
    </div>
  );
}
