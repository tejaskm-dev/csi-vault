import { useEffect, useMemo, useRef, useState } from "react";
import {
  seedHall,
  rankHall,
  hallStats,
  type HallPlayer,
  type HallEvent,
} from "./hallData";
import { isLive, supabase } from "../lib/supabase";
import * as api from "../lib/api";

/**
 * The live feed for the hall display.
 *
 * The previous version of this file promised that when Supabase landed, this
 * hook would be the only thing that changed — the components take `players`,
 * `ranked`, `stats` and `events` and none of them know where those came from.
 * That held: everything below the return statement is untouched, and the
 * display, the ticker and the counters are unaware there is a database now.
 *
 * Offline it still fakes a room of 58, because you cannot design a projector
 * screen against an empty table, and you will spend far more time looking at
 * this on a laptop than in an actual hall.
 */
const TICK_MS = 2200;
const EVENT_LIMIT = 6;

/**
 * How often the live board re-polls.
 *
 * Not a realtime subscription, deliberately. Sixty players solving vaults
 * would push a recompute several times a second, and a projector where rows
 * reorder faster than you can follow them is worse than one that lags by two
 * seconds. The subscription below only listens for the *fact* that something
 * changed, and lets this interval do the reading.
 */
const POLL_MS = 2500;

export function useHall(live = true) {
  const [players, setPlayers] = useState<HallPlayer[]>(() =>
    isLive ? [] : seedHall()
  );
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

  /* ------------------------------------------------------------------ *
   * LIVE
   * ------------------------------------------------------------------ */

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) return;
    api.defaultSession().then((s) => setSessionId(s?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLive || !sessionId || !live) return;
    let stopped = false;

    const pull = async () => {
      try {
        const rows = await api.fetchLeaderboard(sessionId, 200);
        if (stopped) return;

        const next: HallPlayer[] = rows.map((r) => ({
          id: r.player_id,
          name: r.name,
          initials: (r.name.trim().charAt(0) || "?").toUpperCase(),
          digits: Number(r.vaults),
          bonus: Number(r.bonus) > 0,
          elapsed: r.elapsed,
        }));

        // Diff against the previous pull to find what actually happened. The
        // server has no event stream — it has state — so the ticker's "X just
        // cracked their 4th" is derived here by comparing two snapshots.
        const before = new Map(latest.current.map((p) => [p.id, p]));
        const fresh: HallEvent[] = [];
        for (const p of next) {
          const was = before.get(p.id);
          if (was && p.digits > was.digits) {
            fresh.push({
              id: counter.current++,
              name: p.name,
              digits: p.digits,
              at: Date.now(),
            });
            p.justScored = true;
            p.justBonus = p.bonus && !was.bonus;

            // Clear the flash a beat later so the row stops glowing.
            window.clearTimeout(clearScored.current[p.id]);
            clearScored.current[p.id] = window.setTimeout(() => {
              setPlayers((cur) =>
                cur.map((x) =>
                  x.id === p.id ? { ...x, justScored: false, justBonus: false } : x
                )
              );
            }, 2600);
          }
        }

        setPlayers(next);
        if (fresh.length) {
          setEvents((e) => [...fresh.reverse(), ...e].slice(0, EVENT_LIMIT));
        }
      } catch {
        // A dropped poll is not worth clearing the board over — the projector
        // keeps showing the last good state and the next tick recovers.
      }
    };

    void pull();
    const id = setInterval(pull, POLL_MS);

    // Nudge, don't subscribe to the data. An INSERT on assignments means
    // something moved; the poll above is what reads it.
    const channel = supabase
      ?.channel("hall")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "assignments" },
        () => { void pull(); }
      )
      .subscribe();

    return () => {
      stopped = true;
      clearInterval(id);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [sessionId, live]);

  /* ------------------------------------------------------------------ *
   * OFFLINE — the faked room
   * ------------------------------------------------------------------ */
  // One interval advances a random player, which is enough to exercise every
  // moving part of the display: rank changes, the leader swapping, the ticker,
  // and the counters climbing.
  //
  // The tick is deliberately slow. On a projector, rows that reorder every
  // second are unreadable; every ~2.2s a single row moves, which is legible
  // from the back of a hall and still feels alive.
  useEffect(() => {
    if (isLive || !live) return;
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
