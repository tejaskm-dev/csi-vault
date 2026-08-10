import { lazy, Suspense } from "react";
import type { MinigameKey, MinigameProps } from "./types";

/**
 * The registry. One entry per game, and adding a seventh is one line here plus
 * one row in SQL.
 *
 * Lazily loaded, and that is not premature: the canvas game alone is a couple
 * of hundred lines that a player who never draws that challenge should never
 * download. A board is nine challenges out of a pool of many, so most phones
 * fetch two or three of these and no more.
 */
const GAMES: Record<MinigameKey, React.LazyExoticComponent<React.FC<MinigameProps>>> = {
  tumbler:   lazy(() => import("./Tumbler").then((m) => ({ default: m.Tumbler }))),
  maze:      lazy(() => import("./Maze").then((m) => ({ default: m.Maze }))),
  wordbuild: lazy(() => import("./WordBuild").then((m) => ({ default: m.WordBuild }))),
  survival:  lazy(() => import("./Survival").then((m) => ({ default: m.Survival }))),
  pairs:     lazy(() => import("./Pairs").then((m) => ({ default: m.Pairs }))),
  wires:     lazy(() => import("./Wires").then((m) => ({ default: m.Wires }))),
  anagram:   lazy(() => import("./Anagram").then((m) => ({ default: m.Anagram }))),
};

export function Minigame({ game, ...props }: MinigameProps & { game: string }) {
  const Component = GAMES[game as MinigameKey];

  if (!Component) {
    return (
      <div className="ink rounded-plate bg-white p-6 text-center shadow-ink">
        <p className="font-display text-[18px] uppercase text-ink">Unknown gadget</p>
        <p className="mt-2 font-body text-[13px] font-semibold text-ink/60">
          This vault wants a tool this build does not have. Skip it and come back.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="ink flex min-h-64 items-center justify-center rounded-plate bg-white shadow-ink">
          <span className="font-body text-[13px] font-bold uppercase tracking-[0.16em] text-ink/40">
            Loading…
          </span>
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
}

export type { MinigameProps, MinigameKey } from "./types";
