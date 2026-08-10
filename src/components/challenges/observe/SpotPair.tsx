import { useState } from "react";
import { motion } from "motion/react";
import { Art } from "../../Art";
import { playTap } from "../../../lib/sound";
import { listStagger, riseIn } from "../../../lib/motion";
import { cn } from "../../../lib/utils";
import type { GlyphKey } from "../../../data/mockData";

/**
 * SPOT THE PAIR — a grid where exactly two tiles match. Tap both.
 *
 * The third observe mechanic, and deliberately the opposite search to the
 * impostor: there you hunt for the one thing that differs, here you hunt for
 * the two that agree. Same grid, completely different way of looking at it —
 * which is what "more variety" actually needs, rather than another impostor
 * with a different icon in it.
 *
 * It is also the only tap→tap challenge outside Wires, an input the Bible
 * lists and the game barely used.
 */
export function SpotPair({
  tiles,
  onAnswer,
  busy,
}: {
  tiles: GlyphKey[];
  onAnswer: (indices: number[]) => void;
  busy?: boolean;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const cols = Math.min(5, Math.round(Math.sqrt(tiles.length)));

  const tap = (i: number) => {
    if (busy) return;
    playTap();
    if (picked.includes(i)) { setPicked(picked.filter((x) => x !== i)); return; }

    const next = [...picked, i];
    if (next.length === 2) {
      // Submitted on the second tap rather than behind a confirm button. The
      // answer IS the pair; asking a player to then press SUBMIT adds a step
      // that can only be got wrong.
      setPicked(next);
      onAnswer(next);
      // Clear shortly after so a wrong pair does not stay stuck on screen.
      window.setTimeout(() => setPicked([]), 600);
      return;
    }
    setPicked(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        variants={listStagger}
        initial="initial"
        animate="animate"
        className="ink grid gap-2 rounded-plate bg-white p-3 shadow-ink"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tiles.map((g, i) => (
          <motion.button
            key={i}
            variants={riseIn}
            type="button"
            disabled={busy}
            onClick={() => tap(i)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "aspect-square rounded-btn p-1.5 transition-colors",
              picked.includes(i) ? "bg-blue/30 ring-3 ring-ink" : "bg-paper-deep",
              "disabled:opacity-40"
            )}
            aria-label={`Tile ${i + 1}`}
          >
            <Art name={g} alt="" className="h-full w-full object-contain" />
          </motion.button>
        ))}
      </motion.div>

      <p className="text-center font-body text-[13px] font-semibold text-ink/55">
        {picked.length === 1
          ? "Now find its twin."
          : "Exactly two of these are the same. Tap both."}
      </p>
    </div>
  );
}
