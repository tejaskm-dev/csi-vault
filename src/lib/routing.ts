/**
 * Where the player belongs, decided in one pure function.
 *
 * The routing felt unpolished for three structural reasons, and they were all
 * the same reason wearing different hats:
 *
 *   1. The guard redirected from inside an effect. Effects run AFTER render, so
 *      the wrong screen mounted, painted, and played its entrance animation
 *      before being replaced. Every correction was visible as a flash.
 *
 *   2. Four different components decided navigation on their own — the guard,
 *      the name screen, the boot sequence, and the challenge screen. Joining a
 *      lobby ran /name -> /booting -> /home -> /waiting, and each hop animated.
 *
 *   3. Nothing distinguished "we do not know yet" from "you do not belong
 *      here", so a cold load could bounce a returning player to the door while
 *      their session was still being fetched.
 *
 * The fix is this file: one pure function that maps state to a destination,
 * called during RENDER so a redirect never mounts the wrong screen, and used
 * by every component that needs to know where to send someone. Adding a rule
 * means editing one `if`, not auditing four files.
 */

export type Phase = "lobby" | "live" | "ended";

export interface RouteState {
  /** Talking to Supabase. Offline is unguarded — it is the design sandbox. */
  live: boolean;
  /** Have we finished working out who this phone is? */
  booted: boolean;
  /** Null when never joined, or when the host wiped the room. */
  hasPlayer: boolean;
  phase?: Phase;
}

/** Reachable without a player. */
const PRE_GAME = new Set(["/", "/name", "/booting"]);

/** Reachable once the game is over, by anyone. */
const RESULTS = new Set(["/winner", "/leaderboard"]);

/** Design pages, opened directly on purpose. Never guarded. */
const EXEMPT = ["/safes", "/assets", "/admin"];

/**
 * Where a player with this state should be sitting right now.
 *
 * Returns null when `pathname` is already valid — which is the common case, so
 * the usual cost of calling this is one Set lookup.
 */
export function redirectFor(s: RouteState, pathname: string): string | null {
  if (!s.live) return null;
  if (EXEMPT.some((p) => pathname.startsWith(p))) return null;

  // Still resolving identity. Deliberately NOT a redirect: bouncing someone to
  // the door while their own session is mid-fetch is the exact bug that made
  // a refresh feel like being logged out.
  if (!s.booted) return null;

  // Game over. Anyone may read the results; only players are held on them.
  if (s.phase === "ended") {
    if (RESULTS.has(pathname)) return null;
    return s.hasPlayer ? "/winner" : PRE_GAME.has(pathname) ? null : "/name";
  }

  if (!s.hasPlayer) return PRE_GAME.has(pathname) ? null : "/name";

  /* --- from here on, there IS a player ------------------------------------ */

  // Standing at the door with a board already dealt: go through the boot
  // sequence. Without this the guard would send a lobby join straight to
  // /waiting the moment `player` appeared — skipping the boot animation
  // entirely, which is what most joins would have looked like.
  if (pathname === "/" || pathname === "/name") return "/booting";

  // Let the animation finish. Booting asks landingFor() where to hand over, so
  // it lands correctly the first time instead of being corrected afterwards.
  if (pathname === "/booting") return null;

  // Joined, waiting for the host to start.
  if (s.phase === "lobby" && pathname !== "/waiting") return "/waiting";

  // Live. The one push rather than a block: the host presses start and every
  // phone in the waiting room moves to the board by itself.
  if (s.phase === "live" && pathname === "/waiting") return "/home";

  return null;
}

/**
 * Where the boot sequence should hand over to.
 *
 * Booting used to hardcode "/home", which the guard then corrected to
 * "/waiting" a frame later — so a player joining a lobby saw the board flash
 * past on the way to the waiting room. Asking here instead means the handover
 * lands in the right place the first time.
 */
export function landingFor(s: RouteState): string {
  return redirectFor(s, "/home") ?? "/home";
}
