/**
 * What every minigame gets, and what it hands back.
 *
 * The contract is deliberately tiny. A minigame receives an integer and a
 * submit function; it does not know about challenges, assignments, Supabase or
 * scoring. That is what makes adding the sixth one cheap — the expensive part
 * of a game framework is usually everything except the game.
 */
export interface MinigameProps {
  /**
   * The integer the puzzle is generated from.
   *
   * Generated per player at deal time and stored server-side, so the same
   * player always gets the same maze on a refresh, two players get different
   * ones, and the server can regenerate the puzzle to grade the answer.
   */
  seed: number;
  /** Difficulty knob, 1–3. Bonus vaults pass 3. */
  level?: number;
  /**
   * Whatever the server dealt for this instance, minus anything secret.
   * Used by games whose content is chosen server-side rather than derived
   * from the seed — Anagram reads `letters` from here.
   */
  payload?: { letters?: string; combo?: number[] };
  /** Hand the result to the server. Resolves to whether it was accepted. */
  onSubmit: (answer: Record<string, unknown>) => Promise<{ correct: boolean }>;
  /** Locked while checking, or after a win. */
  busy?: boolean;
}

/** Names the `payload.game` column can take. Mirrored in SQL. */
export type MinigameKey =
  | "tumbler"
  | "maze"
  | "wordbuild"
  | "survival"
  | "pairs"
  | "wires"
  | "anagram";
