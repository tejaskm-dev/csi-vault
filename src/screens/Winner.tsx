import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { CurvedWord } from "../components/CurvedWord";
import { Sprinkles } from "../components/Sprinkles";
import { Trophy, Medal } from "../components/Props";
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
/**
 * Each place is a CARD sitting on a STEP, and the three steps butt together
 * into one block. That is what was missing: three cards floating at different
 * offsets above a thin bar read as three separate things, and the rank only
 * appeared as a small medal. The step carries a large numeral and gives the
 * podium its actual shape.
 *
 * Tints follow the medals rather than repeating one grey twice — silver and
 * bronze are the fastest read on a podium and they were being thrown away.
 */
const PLACE = {
  1: {
    card: "bg-brass",
    band: "bg-brass-deep",
    step: "bg-brass h-24",
    stepFace: "bg-brass-deep",
    grow: "flex-[1.22]",
    lift: "",
    avatar: "h-14 w-14 text-[17px]",
    name: "text-[14px]",
    medal: "h-11 w-11",
    numeral: "text-[30px]",
    delay: 0.42,
  },
  2: {
    card: "bg-[#E6E9F0]",
    band: "bg-[#B9BEC7]",
    step: "bg-[#D5D9E0] h-16",
    stepFace: "bg-[#B9BEC7]",
    grow: "flex-1",
    lift: "mt-9",
    avatar: "h-11 w-11 text-[13px]",
    name: "text-[12px]",
    medal: "h-9 w-9",
    numeral: "text-[24px]",
    delay: 0.26,
  },
  3: {
    card: "bg-[#F2DEC9]",
    band: "bg-[#D6B189]",
    step: "bg-[#E8CFB2] h-11",
    stepFace: "bg-[#D6B189]",
    grow: "flex-1",
    lift: "mt-14",
    avatar: "h-11 w-11 text-[13px]",
    name: "text-[12px]",
    medal: "h-9 w-9",
    numeral: "text-[24px]",
    delay: 0.1,
  },
} as const;

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  /**
   * Two. Three on the podium plus two listed is the whole top five, and it is
   * what lets the page fit a phone without scrolling — a results screen you
   * have to scroll through stops being a result and becomes a table.
   */
  const rest = leaderboard.slice(3, 5);

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
          bow={2.2}
          className="mt-1 w-full"
        >
          WINNER!
        </CurvedWord>
      </motion.div>

      {/* ── Podium ─────────────────────────────────────────────── */}
      <div className="relative mt-9">
        {/* Crown over first place. Sits above the cards, not inside one.
            Positioning is on the outer plain div and the animation on the
            inner motion.div: popIn animates y, and a Framer transform on the
            same element would discard the -translate-* that places it. */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[72%]">
          <motion.div variants={popIn}>
            <svg viewBox="0 0 64 44" className="h-12 w-[70px]">
              <path
                d="M6 36 L4 12 l14 9 L32 4 l14 17 14-9 -2 24 z"
                fill="var(--color-brass)"
                stroke="#1F1F1F"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path d="M6 36 h52 v4 H6 z" fill="var(--color-brass-deep)" stroke="#1F1F1F" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="32" cy="16" r="3.4" fill="#E53935" stroke="#1F1F1F" strokeWidth="2.4" />
              <circle cx="16" cy="21" r="2.4" fill="#FFFFFF" opacity="0.55" />
            </svg>
          </motion.div>
        </div>

        <div className="flex items-end justify-center">
          {SLOTS.map((rank) => {
            const entry: LeaderboardEntry | undefined = leaderboard[rank - 1];
            const p = PLACE[rank];

            return (
              <motion.div
                key={rank}
                initial={{ y: 46, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 20, delay: p.delay }}
                className={cn(
                  "relative flex flex-col self-end",
                  p.grow,
                  rank === 1 ? "z-20" : "z-10",
                  // The winner overlaps its neighbours by a hair so the block
                  // reads as one object rather than three columns in a row.
                  rank === 1 ? "-mx-1" : ""
                )}
              >
                {/* ---- card ---- */}
                <div
                  className={cn(
                    "ink relative flex flex-col items-center gap-1 overflow-hidden rounded-t-plate px-2 pb-2.5 pt-3",
                    p.card,
                    p.lift
                  )}
                >
                  {/* A light zone across the top and a dark band at the foot.
                      Same construction as the Safe: a flat fill reads as a
                      rectangle, discrete light and dark zones read as an
                      object. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-white/25"
                  />

                  <div
                    className={cn(
                      "ink relative flex items-center justify-center rounded-pill bg-white font-display text-ink",
                      p.avatar
                    )}
                  >
                    {entry?.initials ?? "–"}
                  </div>

                  <span
                    className={cn(
                      "relative w-full truncate font-display uppercase leading-tight text-ink",
                      p.name
                    )}
                  >
                    {entry?.name.split(" ")[0] ?? "OPEN"}
                  </span>

                  <span className="relative font-readout text-[11px] font-bold text-ink/45">
                    <span className="text-ink/75">{entry?.digits ?? 0}</span>
                    {" / 9"}
                  </span>

                  <span className={cn("relative mt-0.5", p.medal)}>
                    <Medal rank={rank} />
                  </span>
                </div>

                {/* ---- step ---- */}
                <div className={cn("ink relative flex items-center justify-center border-t-0", p.step)}>
                  <span
                    aria-hidden
                    className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-1/3", p.stepFace)}
                  />
                  <span
                    className={cn(
                      "relative font-display leading-none text-ink/70",
                      p.numeral
                    )}
                    style={{ textShadow: "0 2px 0 rgba(255,255,255,0.45)" }}
                  >
                    {rank}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Floor slab the three steps stand on. */}
        <motion.div variants={riseIn} className="relative -mt-[3px]">
          <div className="ink h-3.5 rounded-b-[12px] bg-ink" />
        </motion.div>
      </div>

      {/* ── The rest of the field ──────────────────────────────
          The page scrolls, so the answer to a half-empty screen is more of
          the actual result, not more spacing. Everyone who is not on the
          podium still wants to find their own line. */}
      {rest.length > 0 && (
        <motion.div variants={riseIn} className="relative mt-7">
          <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40">
            The rest of the field
          </span>
          <div className="mt-2.5 flex flex-col gap-2">
            {rest.map((e) => (
              <div
                key={e.id}
                className={cn(
                  "ink flex items-center gap-3 rounded-btn px-3 py-2 shadow-chip-ink",
                  e.isYou ? "bg-brass" : "bg-white"
                )}
              >
                <span className="ink flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-paper-deep font-readout text-[11px] font-bold text-ink/70">
                  {e.rank}
                </span>
                <span
                  className={cn(
                    "grow truncate text-left text-[14px] font-bold",
                    e.isYou ? "text-ink" : "text-ink/75"
                  )}
                >
                  {e.name}
                  {e.isYou && <span className="ml-1.5 text-ink/50">(You)</span>}
                </span>
                <span className="shrink-0 font-readout text-[12px] font-bold text-ink/55">
                  {e.digits}/9
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={riseIn} className="relative mt-8">
        <PrimaryButton onClick={() => navigate("/leaderboard")} className="h-16 w-full gap-3">
          <Trophy className="h-7 w-7 shrink-0" />
          FULL LEADERBOARD
        </PrimaryButton>
      </motion.div>
    </motion.div>
  );
}
