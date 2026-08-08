import { motion } from "motion/react";
import { Medal } from "./Props";
import { cn } from "../lib/utils";

interface LeaderboardRowProps {
  id: string;
  rank: number;
  name: string;
  initials: string;
  digits: number;
  isYou?: boolean;
  delta?: number;
}

/**
 * Initials on a deterministic colour.
 *
 * This used to draw a chevron, a dot cluster or a bar depending on a hash of
 * the id, and accepted `initials` without ever using it — which is why every
 * avatar on the board showed a stray ">" or "•••" and no two of them told you
 * whose row it was.
 */
function Avatar({ id, initials }: { id: string; initials: string }) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);

  const colors = ["bg-blue", "bg-brass", "bg-green", "bg-purple", "bg-teal", "bg-red", "bg-grass"];
  const text = ["text-white", "text-ink", "text-ink", "text-white", "text-white", "text-white", "text-white"];
  const i = Math.abs(hash) % colors.length;

  return (
    <div
      className={cn(
        "ink flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-pill font-display text-[13px] leading-none",
        colors[i],
        text[i]
      )}
    >
      {initials}
    </div>
  );
}

export function LeaderboardRow({ id, rank, name, initials, digits, isYou, delta }: LeaderboardRowProps) {
  const showMedal = rank <= 3;

  return (
    <motion.div
      layout
      // `layout` makes Framer write an inline transform every frame, so the
      // CSS `hover:scale-[1.01]` this used to carry could never take effect.
      // Same property, same element — the inline style always wins.
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={cn(
        "relative ink rounded-btn p-2.5 flex items-center gap-3 w-full select-none shadow-ink-sm",
        isYou
          ? "bg-brass"
          : rank === 1
          ? "bg-[#FFF0B3]"
          : rank === 2
          ? "bg-[#E6E9F0]"
          : rank === 3
          ? "bg-[#F2DEC9]"
          : "bg-white"
      )}
    >
      {/* Rank sits INSIDE the row. It used to hang at -left-4, which put it
          past the screen padding and clipped the top three medals against the
          viewport edge. */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {showMedal ? (
          // The polished Medal from Props. This file used to define its own
          // second Medal — a 32-unit sketch with a triangle ribbon — and that
          // was the one rendering on the board.
          <Medal rank={rank as 1 | 2 | 3} className="h-9 w-9" />
        ) : (
          <span className="ink flex h-8 w-8 items-center justify-center rounded-pill bg-paper-deep font-readout text-[12px] font-bold text-ink/70">
            {rank}
          </span>
        )}
      </div>

      <Avatar id={id} initials={initials} />

      <span
        className={cn(
          "grow truncate text-base font-bold",
          isYou ? "font-extrabold text-ink" : "text-ink/80"
        )}
      >
        {name}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {delta ? (
          <span className="ink rounded-pill bg-green px-2 py-0.5 text-[10px] font-extrabold text-white">
            +{delta}
          </span>
        ) : null}
        {/* The bar is the fastest read on the row — you can rank the screen
            without parsing nine separate fractions. */}
        <div className="flex flex-col items-end gap-1">
          <span className="font-readout text-[11px] font-bold leading-none text-ink/70">
            {digits}/9
          </span>
          <span className="ink h-2 w-12 overflow-hidden rounded-pill bg-paper-deep p-0">
            <span
              className="block h-full bg-green"
              style={{ width: `${(digits / 9) * 100}%` }}
            />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
