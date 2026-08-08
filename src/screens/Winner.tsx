import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { CurvedWord } from "../components/CurvedWord";
import { Sprinkles } from "../components/Sprinkles";
import { Trophy } from "../components/Props";
import { useGame } from "../context/GameContext";
import type { LeaderboardEntry } from "../data/mockData";
import { celebrate, screenChoreo, dropIn, popIn, riseIn } from "../lib/motion";
import { playComplete } from "../lib/sound";
import { cn } from "../lib/utils";

/** Left to right on screen. Read by size, not by order. */
const SLOTS = [2, 1, 3] as const;

/**
 * Podium as three CARDS rather than three bar-chart columns.
 *
 * The column version could not hold its own contents — an avatar, a name, a
 * score and a rank chip inside p-3 did not fit 104px, so third place had its
 * numeral clipped. Cards size to their content and win height by padding
 * instead of by a hardcoded bar, which is also just what the reference does.
 */
const CARD = {
  1: {
    wrap: "flex-[1.18] pt-7 pb-4 bg-brass shadow-plate-brass z-20",
    name: "text-[15px]",
    delay: 0.4,
  },
  2: { wrap: "flex-1 mt-7 pt-6 pb-3 bg-paper-deep shadow-plate-ink z-10", name: "text-[12px]", delay: 0.24 },
  3: { wrap: "flex-1 mt-11 pt-6 pb-3 bg-paper-deep shadow-plate-ink z-10", name: "text-[12px]", delay: 0.1 },
} as const;

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  useEffect(() => {
    const t = setTimeout(() => {
      celebrate();
      playComplete();
    }, 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      variants={screenChoreo}
      initial="initial"
      animate="animate"
      className="relative flex flex-1 select-none flex-col px-5 pb-5 pt-8 text-center"
    >
      {/* Background marks do most of the work of making the page feel
          occupied — the previous version was three small blocks in a lot of
          cream, and no amount of spacing fixes that on its own. */}
      <Sprinkles />

      <motion.div variants={dropIn} className="relative flex flex-col items-center">
        <span className="ink rounded-pill bg-ink px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.18em] text-brass">
          Final standings
        </span>

        <h1 className="mt-3 w-full font-display text-[30px] uppercase leading-none tracking-tight text-ink">
          We have a
        </h1>
        <CurvedWord
          fill="var(--color-red)"
          extrude="var(--color-red-deep)"
          extrudeDeep="#7C1F1C"
          depth={10}
          bow={9}
          className="mt-1 w-full"
        >
          WINNER!
        </CurvedWord>
      </motion.div>

      {/* ── Podium ─────────────────────────────────────────────── */}
      <div className="relative mt-9 flex items-start justify-center gap-2">
        {/* Crown over first place. Sits above the cards, not inside one.
            Positioning is on the outer plain div and the animation on the
            inner motion.div: popIn animates y, and a Framer transform on the
            same element would discard the -translate-* that places it. */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[78%]">
        <motion.div variants={popIn}>
          <svg viewBox="0 0 64 44" className="h-11 w-16">
            <path
              d="M6 36 L4 12 l14 9 L32 4 l14 17 14-9 -2 24 z"
              fill="var(--color-brass)"
              stroke="#1F1F1F"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path d="M6 36 h52 v4 H6 z" fill="var(--color-brass-deep)" stroke="#1F1F1F" strokeWidth="3.5" strokeLinejoin="round" />
            <circle cx="32" cy="16" r="3.4" fill="#E53935" stroke="#1F1F1F" strokeWidth="2.4" />
          </svg>
        </motion.div>
        </div>

        {SLOTS.map((rank) => {
          const entry: LeaderboardEntry | undefined = leaderboard[rank - 1];
          const c = CARD[rank];

          return (
            <motion.div
              key={rank}
              initial={{ y: 46, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 20, delay: c.delay }}
              className={cn(
                "ink relative flex flex-col items-center gap-1.5 rounded-plate px-2",
                c.wrap
              )}
            >
              <div
                className={cn(
                  "ink flex items-center justify-center rounded-pill bg-white font-display text-ink",
                  rank === 1 ? "h-14 w-14 text-[17px]" : "h-11 w-11 text-[13px]"
                )}
              >
                {entry?.initials ?? "–"}
              </div>

              <span className={cn("w-full truncate font-display uppercase leading-tight text-ink", c.name)}>
                {entry?.name.split(" ")[0] ?? "OPEN"}
              </span>

              <span className="font-readout text-[12px] font-bold text-ink/45">
                <span className={rank === 1 ? "text-red" : "text-ink/70"}>{entry?.digits ?? 0}</span>
                {" / 9"}
              </span>

              {/* Winner's rank sits in a burst; the others in a tinted footer.
                  Same information, but the shape difference is what makes the
                  first card read as first before you read a number. */}
              {rank === 1 ? (
                <span className="relative mt-1 flex h-12 w-12 items-center justify-center">
                  <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
                    <path
                      d="M24 1 l4.6 5.9 7-3 .6 7.4 7.2 1.9 -3.7 6.5 5.3 5.3 -5.3 5.3 3.7 6.5 -7.2 1.9 -.6 7.4 -7-3 L24 47 l-4.6-5.9 -7 3 -.6-7.4 -7.2-1.9 3.7-6.5L3 24l5.3-5.3 -3.7-6.5 7.2-1.9 .6-7.4 7 3 z"
                      fill="#1F1F1F"
                    />
                  </svg>
                  <span className="relative font-display text-[17px] text-brass">1</span>
                </span>
              ) : (
                <span className="-mx-2 -mb-3 mt-1 w-[calc(100%+1rem)] rounded-b-[22px] border-t-3 border-ink bg-ink/10 py-1.5 font-display text-[17px] text-ink/60">
                  {rank}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={riseIn} className="relative mt-auto pt-8">
        <PrimaryButton onClick={() => navigate("/leaderboard")} className="h-16 w-full gap-3">
          <Trophy className="h-7 w-7 shrink-0" />
          FULL LEADERBOARD
        </PrimaryButton>
      </motion.div>
    </motion.div>
  );
}
