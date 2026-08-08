import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Starburst } from "../components/Starburst";
import { useGame } from "../context/GameContext";
import type { LeaderboardEntry } from "../data/mockData";
import { celebrate } from "../lib/motion";
import { playComplete } from "../lib/sound";
import { cn } from "../lib/utils";
import { Trophy } from "../components/Props";

/** Left to right on screen. The podium is read by height, not by order. */
const SLOTS = [2, 1, 3] as const;

/**
 * Columns are sized so their CONTENTS fit. The previous heights (176/128/104)
 * held an avatar badge, a name, a score and a rank chip inside p-3, which
 * overflowed the third column and clipped its rank numeral clean off.
 * The avatar now overhangs the top edge, so the interior only carries text.
 */
const COLUMN = {
  1: { h: "h-40", fill: "bg-brass", shadow: "shadow-plate-brass", delay: 0.42 },
  2: { h: "h-32", fill: "bg-white", shadow: "shadow-plate-ink", delay: 0.26 },
  3: { h: "h-26", fill: "bg-paper-deep", shadow: "shadow-plate-ink", delay: 0.1 },
} as const;

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  useEffect(() => {
    const t = setTimeout(() => {
      celebrate();
      playComplete();
    }, 620);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-1 select-none flex-col p-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="ink flex items-center gap-1.5 rounded-pill bg-ink px-3.5 py-1.5 font-display text-[11px] uppercase tracking-[0.16em] text-brass"
        >
          Final standings
        </motion.div>

        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.08 }}
          className="font-display text-[40px] uppercase leading-[0.88] tracking-tight text-ink"
        >
          We have a
          <br />
          <span className="text-red" style={{ textShadow: "0 4px 0 var(--color-ink)" }}>
            Winner!
          </span>
        </motion.h1>

        {/* Trophy on ink. On the old pale bg-yellow/10 plate a gold trophy had
            nothing to sit against and the whole block read as beige on beige. */}
        <motion.div
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 14, delay: 0.16 }}
          className="relative my-1 flex items-center justify-center"
        >
          <div className="spin-layer absolute inset-0 -m-6 animate-[tumble_16s_linear_infinite] opacity-70">
            <Starburst fillColor="var(--color-brass)" />
          </div>
          <div className="ink relative flex h-36 w-36 items-center justify-center rounded-plate bg-ink shadow-plate-brass">
            <Trophy className="h-28 w-28" />
          </div>
        </motion.div>

        {/* ── Podium ─────────────────────────────────────────── */}
        <div className="mt-4 w-full">
          <div className="flex items-end justify-center gap-1.5 px-1">
            {SLOTS.map((rank) => {
              const entry: LeaderboardEntry | undefined = leaderboard[rank - 1];
              const col = COLUMN[rank];

              return (
                <motion.div
                  key={rank}
                  // Rises from behind the ground line. Transform + opacity only,
                  // so this composites without touching layout.
                  initial={{ y: 56, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: col.delay,
                  }}
                  className={cn(
                    "ink relative flex flex-col items-center justify-end rounded-t-[22px] px-2 pb-3",
                    col.h,
                    col.fill,
                    col.shadow,
                    rank === 1 ? "z-20 flex-[1.25]" : "z-10 flex-1"
                  )}
                >
                  {/* Crown star, winner only */}
                  {rank === 1 && (
                    <motion.div
                      initial={{ scale: 0, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.72 }}
                      className="ink absolute -top-[4.25rem] flex h-9 w-9 items-center justify-center rounded-pill bg-red text-white shadow-chip-ink"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Avatar overhangs the top edge — this is what freed up the
                      interior space that used to clip the rank numeral. */}
                  <div
                    className={cn(
                      "ink absolute -top-5 flex h-10 w-10 items-center justify-center rounded-pill font-display text-[13px] text-ink shadow-chip-ink",
                      rank === 1 ? "bg-white" : "bg-paper"
                    )}
                  >
                    {entry?.initials ?? "–"}
                  </div>

                  <span
                    className={cn(
                      "w-full truncate font-display uppercase leading-tight text-ink",
                      rank === 1 ? "text-[13px]" : "text-[11px]"
                    )}
                  >
                    {entry?.name.split(" ")[0] ?? "OPEN"}
                  </span>
                  <span className="mt-0.5 font-readout text-[10px] font-bold text-ink/45">
                    {entry ? `${entry.digits}/9` : "–"}
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 flex h-6 w-6 items-center justify-center rounded-pill font-readout text-[12px] font-bold",
                      rank === 1 ? "bg-ink text-brass" : "bg-ink/10 text-ink/70"
                    )}
                  >
                    {rank}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Ground line. Without it the columns float and their differing
              shadow depths read as three misaligned blocks. */}
          <div className="ink -mt-[3px] h-3 rounded-b-[10px] bg-ink shadow-plate-ink" />
        </div>
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={() => navigate("/leaderboard")} className="h-16 w-full">
          FULL LEADERBOARD
        </PrimaryButton>
      </div>
    </div>
  );
}
