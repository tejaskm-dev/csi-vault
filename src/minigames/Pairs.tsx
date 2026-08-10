import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Art } from "../components/Art";
import { mulberry32, shuffle } from "./seed";
import { playTap, playCorrect } from "../lib/sound";
import { cn } from "../lib/utils";
import type { MinigameProps } from "./types";

/**
 * MEMORY PAIRS — flip two, match them, clear the board.
 *
 * The gentlest thing in the set, and it earns its place for exactly that
 * reason: a board of nine challenges needs somewhere for a player who is
 * flustered to succeed. Nobody fails this one, which is the point.
 *
 * Graded on move count. The server knows how many cards were dealt, so the
 * theoretical minimum is known — a submission below it is impossible, and
 * anything at or above it means the board really was cleared.
 */
const GLYPHS = ["star", "rocket", "key", "flame", "leaf", "droplet", "hexagon", "wave"] as const;
const PAIRS_BY_LEVEL = [6, 8, 8];

export function Pairs({ seed, level = 1, onSubmit, busy }: MinigameProps) {
  const pairCount = PAIRS_BY_LEVEL[Math.min(level, 3) - 1];

  const deck = useMemo(() => {
    const rand = mulberry32(seed);
    const chosen = shuffle(rand, [...GLYPHS]).slice(0, pairCount);
    return shuffle(rand, [...chosen, ...chosen]);
  }, [seed, pairCount]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const sent = useRef(false);

  const flip = (i: number) => {
    if (busy || lock.current) return;
    if (flipped.includes(i) || matched.includes(i)) return;
    playTap();
    const next = [...flipped, i];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      lock.current = true;
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        playCorrect();
        // Short hold so the second card is actually seen before it settles.
        window.setTimeout(() => {
          setMatched((m) => [...m, a, b]);
          setFlipped([]);
          lock.current = false;
        }, 320);
      } else {
        // Longer, because this is the one the player has to memorise.
        window.setTimeout(() => {
          setFlipped([]);
          lock.current = false;
        }, 780);
      }
    }
  };

  useEffect(() => {
    if (matched.length === deck.length && deck.length && !sent.current) {
      sent.current = true;
      void onSubmit({ moves, pairs: pairCount });
    }
  }, [matched, deck.length, moves, pairCount, onSubmit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
          Pairs found
        </span>
        <span className="font-display text-[20px] text-ink">
          {matched.length / 2} / {pairCount}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {deck.map((glyph, i) => {
          const open = flipped.includes(i) || matched.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => flip(i)}
              whileTap={{ scale: 0.94 }}
              animate={{ rotateY: open ? 0 : 180 }}
              transition={{ duration: 0.22 }}
              className={cn(
                "ink relative aspect-square rounded-card p-2 shadow-[4px_4px_0_0_var(--color-ink)]",
                matched.includes(i) ? "bg-green/30" : open ? "bg-white" : "bg-paper-deep"
              )}
              aria-label={open ? `Card ${i + 1}, ${glyph}` : `Card ${i + 1}, face down`}
            >
              {open ? (
                <Art name={glyph} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-[20px] text-ink/25">
                  ?
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="text-center font-body text-[13px] font-semibold text-ink/55">
        Flip two. If they match they stay open.
      </p>
    </div>
  );
}
