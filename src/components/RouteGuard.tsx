import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

/**
 * Keeps the URL honest about what is actually true.
 *
 * Until this existed, every navigation in the app was a button press and
 * nothing else. That works right up until the state changes underneath the
 * player, and then the URL is simply wrong:
 *
 *   · the host wipes the room → the phone sits on /home showing a board of
 *     nine locked vaults belonging to a player row that no longer exists
 *   · a student joins before the host presses Start → lands on /home, taps a
 *     vault, and gets "the game has not started yet" as an ERROR, rather than
 *     being shown a waiting room
 *   · the host ends the game → phones stay mid-challenge, submitting answers
 *     into a session that is closed
 *   · someone types /home before joining at all → renders an empty board
 *
 * All four are the same missing rule: a route is only valid for certain
 * states. This enforces it in one place rather than scattering redirects.
 */

/** Reachable before you have a player. Everything else needs one. */
const PRE_GAME = new Set(["/", "/name", "/booting"]);

/** Design/reference pages. Never guarded — they exist to be opened directly. */
const EXEMPT = ["/safes", "/assets"];

export function RouteGuard() {
  const { live, booted, player, session, evicted } = useGame();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Offline is the design environment. Guarding it would make it impossible
    // to open a screen directly to work on it, which is the whole point of
    // having an offline mode.
    if (!live) return;

    // Still deciding who we are. Redirecting on a null player here would throw
    // a returning student out of their own game during the rejoin round trip.
    if (!booted) return;

    if (EXEMPT.some((p) => pathname.startsWith(p))) return;

    const phase = session?.phase;

    // 0. The game is over.
    //
    //    Only players who actually PLAYED are held on the results. That
    //    distinction matters: forcing someone with no player row onto the
    //    podium strands them on a screen about a game they were not in, with
    //    no way off it — and if the room finished empty, on three blank
    //    placeholder slots that read as a broken app.
    //
    //    Someone without a row can still look at the results; they are simply
    //    not pinned there, and can sit at the door instead.
    if (phase === "ended") {
      const RESULTS = pathname === "/winner" || pathname === "/leaderboard";
      if (player && !RESULTS) {
        navigate("/winner", { replace: true });
      } else if (!player && !RESULTS && !PRE_GAME.has(pathname)) {
        navigate("/name", { replace: true });
      }
      return;
    }

    // 1. No player. Either never joined, or the room was reset under them.
    //    RoomReset shows the explanation; this puts the page behind it right.
    if (!player) {
      if (!PRE_GAME.has(pathname)) navigate("/name", { replace: true });
      return;
    }

    // 2. Joined, but the host has not started. This is the normal state for
    //    the first few minutes of an event and it deserves a real screen —
    //    previously these players got a board that errored on every tap.
    if (phase === "lobby") {
      if (pathname !== "/waiting" && pathname !== "/booting") {
        navigate("/waiting", { replace: true });
      }
      return;
    }

    // 3. Live. The one push rather than a block: the host presses Start and
    //    every phone sitting in the waiting room moves to the board by itself.
    if (phase === "live" && pathname === "/waiting") {
      navigate("/home", { replace: true });
    }
  }, [live, booted, player, session?.phase, evicted, pathname, navigate]);

  return null;
}
