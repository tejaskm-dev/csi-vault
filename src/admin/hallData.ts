/**
 * Mock event feed for the admin surfaces.
 *
 * UI only — there is no backend yet. This exists so the display is designed
 * against a REAL room rather than four rows: sixty players, a spread of
 * progress, and ranks that actually change while you watch. A leaderboard
 * that never moves is easy to make look good and tells you nothing about
 * whether the layout survives someone overtaking on the projector.
 *
 * Everything here is shaped like what a Supabase table would return, so
 * swapping the generator for a subscription later is a one-file change.
 */

export interface HallPlayer {
  id: string;
  name: string;
  initials: string;
  digits: number;
  bonus: boolean;
  /** Seconds since this player started. The tie-break behind digits. */
  elapsed: number;
  /** Set for a few seconds after they score, so the display can react. */
  justScored?: boolean;
}

export interface HallEvent {
  id: number;
  name: string;
  digits: number;
  at: number;
}

const FIRST = [
  "Byte", "Cipher", "Net", "Null", "Proto", "Root", "Stack", "Kernel", "Hex",
  "Loop", "Seg", "Ghost", "Async", "Quantum", "Pixel", "Vector", "Binary",
  "Crypto", "Data", "Echo", "Flux", "Glitch", "Hash", "Index", "Jump",
  "Logic", "Macro", "Node", "Octet", "Parse", "Query", "Regex", "Syntax",
  "Token", "Unix", "Void", "Warp", "Xor", "Yield", "Zero",
];
const SECOND = [
  "Witch", "King", "Surge", "Pointer", "Hax", "Zero", "Trace", "Panik",
  "Runner", "Hole", "Faulty", "Byte", "Wave", "Leap", "Storm", "Forge",
  "Drift", "Spark", "Chase", "Rider",
];

/** Deterministic, so a refresh during the event does not reshuffle the room. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedHall(count = 58): HallPlayer[] {
  const rand = mulberry32(20260806);
  const used = new Set<string>();
  const players: HallPlayer[] = [];

  while (players.length < count) {
    const name =
      FIRST[Math.floor(rand() * FIRST.length)] +
      SECOND[Math.floor(rand() * SECOND.length)];
    if (used.has(name)) continue;
    used.add(name);

    // Weighted toward the middle: a real room has a few runaway leaders, a
    // fat middle, and a tail that is still on their first or second lock.
    const r = rand();
    const digits =
      r > 0.94 ? 9 : r > 0.86 ? 8 : r > 0.74 ? 7 : r > 0.6 ? 6 :
      r > 0.46 ? 5 : r > 0.32 ? 4 : r > 0.2 ? 3 : r > 0.1 ? 2 : 1;

    players.push({
      id: `h${players.length}`,
      name,
      initials: (name.match(/[A-Z]/g) ?? [name[0]]).slice(0, 2).join(""),
      digits,
      bonus: rand() > 0.72,
      elapsed: 240 + Math.floor(rand() * 700),
    });
  }
  return players;
}

/** Digits, then elapsed, then name — identical to the player-facing rule. */
export function rankHall(players: HallPlayer[]) {
  return [...players].sort(
    (a, b) => b.digits - a.digits || a.elapsed - b.elapsed || a.name.localeCompare(b.name)
  );
}

export function hallStats(players: HallPlayer[]) {
  const cracked = players.reduce((n, p) => n + p.digits, 0);
  const finished = players.filter((p) => p.digits === 9).length;
  const bonuses = players.filter((p) => p.bonus).length;
  return {
    players: players.length,
    cracked,
    possible: players.length * 9,
    finished,
    bonuses,
    average: players.length ? cracked / players.length : 0,
  };
}
