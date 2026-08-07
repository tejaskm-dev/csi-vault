import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../context/GameContext";
import { cn } from "../lib/utils";

/**
 * A live wire from the rest of the room.
 *
 * Sixty students are playing at once and the app never once acknowledged it.
 * This is the cheapest possible fix: a single ink strip that reports what the
 * crew is doing. It makes a solo screen feel like a shared event.
 *
 * MOCK — derived from the same simulated leaderboard as everything else.
 * Swap the message source when a real feed exists.
 */
const VERBS = [
  "cracked digit",
  "recovered digit",
  "burned digit",
  "popped digit",
];

export function CrewFeed({ className }: { className?: string }) {
  const { leaderboard } = useGame();
  const [index, setIndex] = useState(0);

  const crew = leaderboard.filter((e) => !e.isYou && e.digits > 0);

  useEffect(() => {
    if (crew.length === 0) return;
    const t = setInterval(() => setIndex((i) => i + 1), 3400);
    return () => clearInterval(t);
  }, [crew.length]);

  if (crew.length === 0) return null;

  const entry = crew[index % crew.length];
  const verb = VERBS[index % VERBS.length];

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2.5 overflow-hidden border-b-3 border-ink bg-ink px-4",
        className
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="block h-1.5 w-1.5 animate-[pulseGlow_1.6s_ease-in-out_infinite] rounded-pill bg-green" />
        <span className="font-body text-[9px] font-bold uppercase tracking-[0.2em] text-green">
          Live
        </span>
      </span>

      <span className="h-3 w-px shrink-0 bg-white/25" />

      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="truncate font-body text-[11px] font-semibold text-white/85"
        >
          <span className="text-brass">{entry.name.replace(" (You)", "")}</span>{" "}
          {verb}{" "}
          <span className="font-readout text-brass">{entry.digits}</span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
