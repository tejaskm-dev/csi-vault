/**
 * Deterministic randomness, shared with the server.
 *
 * Every minigame is generated from one integer. The server stores that
 * integer, the client builds the maze/board/letters from it, and when the
 * player submits, the server regenerates the same thing and checks the answer
 * against it. No puzzle content ever travels with its solution — the same
 * principle as `challenge_answers`, applied to procedural content.
 *
 * mulberry32 because it is four lines, has no state beyond a uint32, and is
 * trivially portable to plpgsql — which matters, because the whole scheme
 * depends on both sides producing byte-identical sequences.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export function randInt(rand: () => number, n: number) {
  return Math.floor(rand() * n);
}

/** Fisher–Yates, seeded. Same seed, same order, on any device. */
export function shuffle<T>(rand: () => number, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rand, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
