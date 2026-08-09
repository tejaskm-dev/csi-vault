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
  const tick = useRef(0);
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
      // Every fourth tick, award a bonus instead of a digit. The seeded data
      // set bonuses once and never changed them, so the display had no way to
      // ever show a bonus arriving — only that one had already been won.
      tick.current += 1;
      if (tick.current % 4 === 0) {
        const eligible = latest.current.filter((p) => !p.bonus);
        if (eligible.length) {
          const lucky = eligible[Math.floor(Math.random() * eligible.length)];
          setPlayers((prev) =>
            prev.map((p) => (p.id === lucky.id ? { ...p, bonus: true, justBonus: true } : p))
          );
          window.clearTimeout(clearScored.current[`b${lucky.id}`]);
          clearScored.current[`b${lucky.id}`] = window.setTimeout(() => {
            setPlayers((cur) =>
              cur.map((p) => (p.id === lucky.id ? { ...p, justBonus: false } : p))
            );
          }, 3000);
          return;
        }
      }

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

  /**
   * How far each player moved since the last reshuffle.
   *
   * A live board that shows position but not MOVEMENT is a table. The arrow
   * is the thing that tells a room something just happened, and it is the one
   * read the first version had no way to express.
   */
  const prevRanks = useRef<Record<string, number>>({});
  const deltas = useMemo(() => {
    const next: Record<string, number> = {};
    const out: Record<string, number> = {};
    ranked.forEach((p, i) => {
      const rank = i + 1;
      const before = prevRanks.current[p.id];
      out[p.id] = before === undefined ? 0 : before - rank; // + = climbed
      next[p.id] = rank;
    });
    prevRanks.current = next;
    return out;
  }, [ranked]);

  /** Room progress over the event — the "what happened when" a percentage cannot give. */
  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    setHistory((h) => [...h, stats.cracked].slice(-40));
  }, [stats.cracked]);

  return { players, ranked, stats, events, deltas, history };
}
