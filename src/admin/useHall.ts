import { useEffect, useMemo, useRef, useState } from "react";
import {
  seedHall,
  rankHall,
  hallStats,
  type HallPlayer,
  type HallEvent,
} from "./hallData";

/**
 * The live feed, faked.
 *
 * One interval advances a random player, which is enough to exercise every
 * moving part of the display: rank changes, the leader swapping, the ticker,
 * and the counters climbing. When Supabase lands, this hook is the only thing
 * that changes — the components take `players`, `ranked`, `stats` and
 * `events`, and none of them know where those came from.
 *
 * The tick is deliberately slow. On a projector, rows that reorder every
 * second are unreadable; every ~2.2s a single row moves, which is legible
 * from the back of a hall and still feels alive.
 */
const TICK_MS = 2200;
const EVENT_LIMIT = 6;

export function useHall(live = true) {
  const [players, setPlayers] = useState<HallPlayer[]>(() => seedHall());
  const [events, setEvents] = useState<HallEvent[]>([]);
  const counter = useRef(0);
  const clearScored = useRef<Record<string, number>>({});

  // A mirror of the current players, so the tick can choose a target WITHOUT
  // reading state inside a setState updater. Updaters have to stay pure —
  // firing setEvents and scheduling a timeout from inside one runs twice under
  // StrictMode and double-logs every unlock.
  const latest = useRef(players);
  latest.current = players;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const movable = latest.current.filter((p) => p.digits < 9);
      if (!movable.length) return;
      const target = movable[Math.floor(Math.random() * movable.length)];
      const reached = target.digits + 1;

      setPlayers((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, digits: reached, justScored: true } : p))
      );

      setEvents((e) =>
        [{ id: counter.current++, name: target.name, digits: reached, at: Date.now() }, ...e].slice(
          0,
          EVENT_LIMIT
        )
      );

      // Clear the flash a beat later so the row stops glowing.
      window.clearTimeout(clearScored.current[target.id]);
      clearScored.current[target.id] = window.setTimeout(() => {
        setPlayers((cur) =>
          cur.map((p) => (p.id === target.id ? { ...p, justScored: false } : p))
        );
      }, 2600);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    const timers = clearScored.current;
    return () => Object.values(timers).forEach(window.clearTimeout);
  }, []);

  const ranked = useMemo(() => rankHall(players), [players]);
  const stats = useMemo(() => hallStats(players), [players]);

  return { players, ranked, stats, events };
}
