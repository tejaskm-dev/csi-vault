import { Navigate, useLocation } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { redirectFor } from "../lib/routing";

/**
 * Decides the route DURING RENDER, not in an effect.
 *
 * That distinction is the whole point. The previous version called navigate()
 * from a useEffect, which runs after the commit — so React mounted the wrong
 * screen, painted it, ran its entrance animation, and only then replaced it.
 * Every correction was a visible flash, and a chain of corrections was three
 * of them.
 *
 * Rendering <Navigate> instead means the wrong screen is never mounted at all.
 * React Router swaps the location before anything below this point renders,
 * which is what a framework doing this on the server would achieve.
 *
 * Wraps the routes rather than sitting beside them, because a sibling cannot
 * stop its siblings from rendering.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { live, booted, player, session } = useGame();
  const { pathname } = useLocation();

  const target = redirectFor(
    { live, booted, hasPlayer: Boolean(player), phase: session?.phase },
    pathname
  );

  if (target && target !== pathname) {
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

/**
 * Shown while the app is still working out who this phone is.
 *
 * Without it, a cold load on a game route rendered that screen against an
 * empty board for the length of a round trip — nine locked vaults and a blank
 * leaderboard, indistinguishable from a broken game. A held frame is better
 * than a wrong one.
 */
export function ConnectingGate({ children }: { children: React.ReactNode }) {
  const { live, booted, status } = useGame();
  const { pathname } = useLocation();

  const needsIdentity = !["/", "/name", "/booting"].includes(pathname);

  if (live && !booted && needsIdentity && status !== "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="ink rounded-plate bg-white px-6 py-5 shadow-ink" style={{ rotate: "-1deg" }}>
          <p className="font-display text-[18px] uppercase tracking-wide text-ink">
            Finding your vault
          </p>
          <p className="mt-1 font-body text-[13px] font-semibold text-ink/50">
            One moment.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
