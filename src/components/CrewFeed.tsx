import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../context/GameContext";
import { cn } from "../lib/utils";

/**
 * Reports what the rest of the room is doing.
 *
 * This watches the leaderboard for an actual increase in someone's digit count
 * and announces that. It does NOT invent events — an earlier version rotated
 * through fabricated lines, which is decoration cosplaying as data and reads
 * as exactly that. When nothing has happened, this renders nothing and the bar
 * collapses.
 */
interface Event {
  key: number;
  name: string;
  digits: number;
}

export function CrewFeed({ className }: { className?: string }) {
  const { leaderboard } = useGame();
  const seen = useRef<Record<string, number>>({});
  const counter = useRef(0);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    let latest: Event | null = null;

    for (const entry of leaderboard) {
      if (entry.isYou) continue;
      const before = seen.current[entry.id];
      if (before !== undefined && entry.digits > before) {
        latest = { key: counter.current++, name: entry.name, digits: entry.digits };
      }
      seen.current[entry.id] = entry.digits;
    }

    if (latest) setEvent(latest);
  }, [leaderboard]);

  // Let an announcement stand for a while, then clear it rather than looping.
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 5000);
    return () => clearTimeout(t);
  }, [event]);

  // A floating pill straddling the header's bottom edge, not a full-bleed slab
  // welded under it. The slab butted a flat black bar against the header's
  // curve — two different shapes fighting — and it pushed the whole page down
  // whenever someone scored. Absolute positioning means zero layout shift.
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-30 flex -translate-y-1/2 justify-center px-4",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {event && (
          <motion.div
            key={event.key}
            initial={{ y: -18, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="flex max-w-full items-center gap-2 rounded-pill border-3 border-white bg-ink px-3.5 py-1.5 shadow-[0_3px_0_0_var(--color-ink)]"
          >
            <span className="block h-1.5 w-1.5 shrink-0 animate-[pulseGlow_1.6s_ease-in-out_infinite] rounded-pill bg-green" />
            <span className="truncate font-body text-[11px] font-semibold text-white/85">
              <span className="text-brass">{event.name}</span> is on{" "}
              <span className="font-readout text-brass">{event.digits}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
