import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { mulberry32, randInt } from "./seed";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";
import type { MinigameProps } from "./types";

/**
 * MAZE ESCAPE — steer from the corner to the vault.
 *
 * Generated from the seed by depth-first backtracking, which gives a perfect
 * maze (exactly one route between any two cells). That property is why it is
 * gradeable: the server regenerates the same maze and checks the submitted
 * path is legal and ends on the exit — it does not have to trust a "won: true"
 * flag from a phone.
 *
 * A PAD, NOT A SWIPE, and the reasoning that put a swipe here was wrong.
 *
 * It said a four-button pad is a fiddly target on a phone held one-handed and
 * a swipe anywhere on the grid is not. True in the abstract, and irrelevant:
 * on iOS Safari — which is most of this room — a horizontal swipe that starts
 * near the left edge is the system back gesture. The player does not move
 * left; they leave the game. `touch-action: none` does not stop it, because
 * the edge gesture belongs to the OS and not the page.
 *
 * A control that sometimes navigates away is not a control. The pad below is
 * four 56px targets, which is larger than the thing the swipe was avoiding.
 */
const SIZE = [7, 9, 11]; // by level

interface Cell { n: boolean; e: boolean; s: boolean; w: boolean }

function carve(seed: number, n: number): Cell[][] {
  const rand = mulberry32(seed);
  const grid: Cell[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ n: true, e: true, s: true, w: true }))
  );
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;

  while (stack.length) {
    const [y, x] = stack[stack.length - 1];
    const options: [number, number, keyof Cell, keyof Cell][] = [];
    if (y > 0 && !seen[y - 1][x]) options.push([y - 1, x, "n", "s"]);
    if (x < n - 1 && !seen[y][x + 1]) options.push([y, x + 1, "e", "w"]);
    if (y < n - 1 && !seen[y + 1][x]) options.push([y + 1, x, "s", "n"]);
    if (x > 0 && !seen[y][x - 1]) options.push([y, x - 1, "w", "e"]);

    if (!options.length) { stack.pop(); continue; }

    const [ny, nx, wall, back] = options[randInt(rand, options.length)];
    grid[y][x][wall] = false;
    grid[ny][nx][back] = false;
    seen[ny][nx] = true;
    stack.push([ny, nx]);
  }
  return grid;
}

export function Maze({ seed, level = 1, onSubmit, busy }: MinigameProps) {
  const n = SIZE[Math.min(level, SIZE.length) - 1];
  const grid = useMemo(() => carve(seed, n), [seed, n]);

  const [pos, setPos] = useState<[number, number]>([0, 0]);
  // The route taken, submitted for verification. Not the final square — a
  // final square alone could be typed by hand; a legal path could not.
  const [path, setPath] = useState<string[]>([]);
  const sent = useRef(false);

  const move = (dir: "n" | "e" | "s" | "w") => {
    if (busy || sent.current) return;
    setPos(([y, x]) => {
      if (grid[y][x][dir]) return [y, x];   // wall
      playTap();
      const [ny, nx] =
        dir === "n" ? [y - 1, x] : dir === "e" ? [y, x + 1]
        : dir === "s" ? [y + 1, x] : [y, x - 1];
      setPath((p) => [...p, dir]);
      return [ny, nx];
    });
  };

  // Reaching the far corner submits by itself. Asking a player who has just
  // escaped a maze to then find a button is an anticlimax.
  useEffect(() => {
    if (pos[0] === n - 1 && pos[1] === n - 1 && !sent.current) {
      sent.current = true;
      void onSubmit({ path, moves: path.length });
    }
  }, [pos, n, path, onSubmit]);

  // Keyboard for desktop review; the phone uses the pad below.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "n" | "e" | "s" | "w"> = {
        ArrowUp: "n", ArrowRight: "e", ArrowDown: "s", ArrowLeft: "w",
      };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** Is there a wall that way? Used to grey out a pad button. */
  const blocked = (dir: "n" | "e" | "s" | "w") => grid[pos[0]][pos[1]][dir];

  return (
    <div className="flex flex-col gap-3">
      <div className="ink relative overflow-hidden rounded-plate bg-white p-2 shadow-ink">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${y}-${x}`}
                className={cn(
                  "relative aspect-square",
                  y === n - 1 && x === n - 1 && "bg-green/25"
                )}
                style={{
                  borderTop:    cell.n ? "2px solid var(--color-ink)" : "2px solid transparent",
                  borderRight:  cell.e ? "2px solid var(--color-ink)" : "2px solid transparent",
                  borderBottom: cell.s ? "2px solid var(--color-ink)" : "2px solid transparent",
                  borderLeft:   cell.w ? "2px solid var(--color-ink)" : "2px solid transparent",
                }}
              />
            ))
          )}
        </div>

        {/* The runner, positioned in percentages so it tracks the grid at any
            screen width without measuring anything. */}
        <motion.div
          className="pointer-events-none absolute rounded-full bg-red shadow-[0_2px_0_0_var(--color-red-deep)]"
          animate={{
            left: `calc(${(pos[1] + 0.5) * (100 / n)}% )`,
            top: `calc(${(pos[0] + 0.5) * (100 / n)}% )`,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          style={{
            width: `${60 / n}%`,
            height: `${60 / n}%`,
            translateX: "-50%",
            translateY: "-50%",
          }}
        />
      </div>

      {/* The pad. Three columns so up sits above down and left/right flank it,
          which is the shape a thumb already knows. A direction with a wall in
          it dims rather than disappearing — a pad whose buttons come and go is
          harder to aim at than one that simply says no. */}
      <div className="mx-auto grid w-full max-w-[240px] grid-cols-3 gap-2">
        <span />
        <PadKey dir="n" label="▲" onMove={move} disabled={busy || blocked("n")} />
        <span />
        <PadKey dir="w" label="◀" onMove={move} disabled={busy || blocked("w")} />
        <span />
        <PadKey dir="e" label="▶" onMove={move} disabled={busy || blocked("e")} />
        <span />
        <PadKey dir="s" label="▼" onMove={move} disabled={busy || blocked("s")} />
        <span />
      </div>

      <p className="text-center font-body text-[13px] font-semibold text-ink/55">
        Get to the green corner.
      </p>
    </div>
  );
}

function PadKey({
  dir,
  label,
  onMove,
  disabled,
}: {
  dir: "n" | "e" | "s" | "w";
  label: string;
  onMove: (d: "n" | "e" | "s" | "w") => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onMove(dir)}
      whileTap={{ y: 3 }}
      aria-label={{ n: "Up", e: "Right", s: "Down", w: "Left" }[dir]}
      className={cn(
        "ink flex h-14 items-center justify-center rounded-btn font-display text-[20px] text-ink",
        "shadow-[4px_4px_0_0_var(--color-ink)] transition-opacity",
        disabled ? "bg-paper-deep opacity-30" : "bg-white"
      )}
    >
      {label}
    </motion.button>
  );
}
