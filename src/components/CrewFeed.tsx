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

  return (
    <div
      className={cn(
        "overflow-hidden border-ink bg-ink transition-[height,border] duration-300",
        event ? "h-8 border-b-3" : "h-0 border-b-0",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {event && (
          <motion.div
            key={event.key}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-8 items-center gap-2 px-4"
          >
            <span className="block h-1.5 w-1.5 shrink-0 rounded-pill bg-green" />
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
