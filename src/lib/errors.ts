/**
 * Turning whatever went wrong into a sentence a first-year can act on.
 *
 * The bug this exists to kill: `String(e)` on a Supabase error yields
 * "[object Object]", because PostgrestError is a plain object and not an
 * Error. That string was reaching actual players. Worse, several genuine
 * failures had no message at all — you typed a vault number that did not
 * exist and the screen simply did nothing.
 *
 * Two rules:
 *   1. Never show a raw server string. They are written for me, not for a
 *      student standing in a loud room holding a phone.
 *   2. Never show nothing. Silence is the worst error state — the player
 *      cannot tell whether they mis-tapped, the wifi died, or the game is
 *      broken, so they just tap again harder.
 */

/** Shape of the errors supabase-js hands back. Not an Error instance. */
interface Postgrestish {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Server text → what a player is told.
 *
 * Matched loosely, because the same condition surfaces with different wording
 * depending on whether it came from a `raise exception`, a constraint, or
 * PostgREST itself. Order matters: the first match wins, so the specific
 * patterns are above the general ones.
 */
const FRIENDLY: [RegExp, string][] = [
  // --- Find & connect -------------------------------------------------------
  [/no player with that number/i,
   "Nobody in this room has that number. Check their screen and try again."],
  [/already met|pair farming|interactions_no_pair_farming|duplicate key/i,
   "You have already teamed up with them, and there are still people here you have not met. Find someone new."],
  [/that is you/i,
   "That is your own number. You need someone else's."],
  [/not your target/i,
   "That is not the person you were sent to find. Check the number on your screen."],
  [/only the person being met can confirm/i,
   "Only they can confirm this one — ask them to tap the button on their phone."],
  [/no longer open|timed out/i,
   "That request expired. Ask them to tap I FOUND THEM again."],
  [/no such request/i,
   "That request is gone. Ask them to try again."],

  // --- Session state --------------------------------------------------------
  [/session is not live/i,
   "The game has not started yet. Hang tight — the host will start it."],
  [/session has ended/i,
   "The game is over. Head to the leaderboard."],
  [/no such session|no open session/i,
   "No game is open right now. Ask the host to start one."],
  // The important one. A student who cleared their storage mid-game hits this,
  // and the message has to send them to reclaim rather than leave them poking
  // at a name field that will never work.
  [/doors are closed/i,
   "The game has already started, so new players cannot join. If you were already playing, use \u201cRecover your run\u201d below."],

  // --- Identity -------------------------------------------------------------
  [/not signed in|anonymous.*disabled/i,
   "Could not sign you in. Ask the host to check the app settings."],
  [/number and code do not match/i,
   "That vault number and code do not match. Check both and try again."],
  [/too many attempts/i,
   "Too many tries. Wait a couple of minutes, or ask the host."],
  [/not your assignment|not hosting/i,
   "That is not yours to do."],

  // --- Photos ---------------------------------------------------------------
  [/bad upload path|does not take a photo/i,
   "That photo could not be attached to this challenge. Try retaking it."],
  [/exceeded the maximum allowed size|payload too large/i,
   "That photo is too big. Retake it — the app will shrink it for you."],

  // --- Transport ------------------------------------------------------------
  [/failed to fetch|networkerror|load failed/i,
   "Lost connection. Check your signal and try again."],
  [/jwt|token.*expired/i,
   "Your session timed out. Pull down to refresh the page."],
  [/permission denied/i,
   "The app is not set up correctly for that yet. Tell the host."],
];

/**
 * The one function every catch block should call.
 *
 * `fallback` is what a player sees when nothing matched — keep it specific to
 * the screen, because a generic "something went wrong" tells them nothing
 * about what to do next.
 */
/**
 * Set by the app at startup so this module can report without importing api.ts
 * (which imports supabase, which would make this a cycle).
 */
let reporter: ((where: string, message: string) => void) | null = null;
export function setErrorReporter(fn: typeof reporter) { reporter = fn; }

export function humanError(
  e: unknown,
  fallback = "Something went wrong. Try that again.",
  where = "app"
): string {
  const raw = rawMessage(e);
  if (!raw) return fallback;

  // Every error a player is shown is also sent to the operator. That is the
  // whole point: a student whose phone is failing does not walk over and tell
  // you, they quietly stop playing.
  reporter?.(where, raw.slice(0, 400));

  for (const [pattern, friendly] of FRIENDLY) {
    if (pattern.test(raw)) return friendly;
  }

  // Unmatched. Show the fallback to the player and put the real text in the
  // console, so an unhandled case is debuggable without ever being displayed.
  console.warn("[vault] unmapped error:", raw, e);
  return fallback;
}

/** Everything the thrown value might actually be, flattened to one string. */
function rawMessage(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e;

  if (e instanceof Error) return e.message;

  if (typeof e === "object") {
    const p = e as Postgrestish;
    // Concatenated rather than picked: a Postgres constraint violation puts
    // the useful part in `details` and a bare "duplicate key value violates
    // unique constraint" in `message`, and which one identifies the problem
    // varies by error.
    const parts = [p.message, p.details, p.hint, p.code].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    try {
      return JSON.stringify(e);
    } catch {
      return "";
    }
  }

  return String(e);
}
