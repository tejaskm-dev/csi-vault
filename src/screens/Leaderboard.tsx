import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGame } from "../context/GameContext";
import { listStagger, riseIn } from "../lib/motion";

export function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  const you = leaderboard.find((e) => e.isYou);
  const field = leaderboard.length;
  const leader = leaderboard[0];

  // If anyone has unlocked all 9 digits, the results are in!
  const resultsAvailable = leaderboard.some((e) => e.digits === 9);

  /**
   * The whole board scrolls now, so your own row can be anywhere — including
   * far off screen. Watch the real row and, when it leaves the viewport, pin a
   * condensed copy of it directly above the CTA. This is the one bit of the
   * screen a player checks repeatedly, and it should never require hunting.
   */
  const youRowRef = useRef<HTMLDivElement | null>(null);
  const [youVisible, setYouVisible] = useState(true);

  useEffect(() => {
    const el = youRowRef.current;
    if (!el || !you) return;
    const io = new IntersectionObserver(
      ([entry]) => setYouVisible(entry.isIntersecting),
      // The footer covers the bottom ~140px, so a row hidden behind it counts
      // as off screen rather than visible.
      { rootMargin: "-70px 0px -150px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [you]);

  return (
    <div className="flex flex-1 select-none flex-col">
      <ScreenHeader
        eyebrow="Rankings"
        title="Who's Ahead"
        back="/home"
        right={
          <span className="flex items-center gap-1.5 rounded-pill border-2 border-white bg-red-deep px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 animate-[pulseGlow_1.6s_ease-in-out_infinite] rounded-pill bg-green" />
            Live
          </span>
        }
      />

      {/* pb clears the pinned footer so the last row is never trapped under it */}
      <div className="flex flex-1 flex-col gap-4 p-6 pt-5 pb-44">
        {/* Where you actually stand, before the list. */}
        {you && (
          <motion.div
            variants={riseIn}
            initial="initial"
            animate="animate"
            className="ink flex items-stretch overflow-hidden rounded-plate bg-white shadow-ink"
          >
            <Stat value={`#${you.rank}`} label="Your rank" />
            <Rule />
            <Stat value={`${you.digits}/9`} label="Your digits" />
            <Rule />
            <Stat value={String(field)} label="In play" />
          </motion.div>
        )}

        <p className="font-body text-[13px] font-semibold text-ink/50">
          {leader ? (
            <>
              <span className="font-bold text-ink">{leader.name}</span> leads on{" "}
              <span className="font-readout font-bold text-ink">{leader.digits}/9</span>. Ranked
              by digits, then completion time.
            </>
          ) : (
            "Ranked by digits unlocked, then by completion time."
          )}
        </p>

        <motion.div
          variants={listStagger}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-3"
        >
          {/* The wrapper carries the entrance. LeaderboardRow itself uses
              `layout` for reordering, and Framer writes an inline transform
              for that — an entrance variant on the same element fights it. */}
          {leaderboard.map((entry) => (
            <motion.div
              key={entry.id}
              variants={riseIn}
              ref={entry.isYou ? youRowRef : undefined}
            >
              <LeaderboardRow {...entry} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Pinned footer ───────────────────────────────────────
          Two things force this shape.

          `fixed` rather than `sticky`: the shell sets overflow-x-hidden, which
          makes overflow-y compute to auto and turns the shell into a scroll
          container that never actually scrolls (min-height, not height, so it
          grows). A sticky bottom offset resolves against that and does nothing.

          And a PORTAL rather than rendering in place: PageWrapper is a
          motion.div animating y and scale, and a transformed ancestor becomes
          the containing block for fixed descendants — so in place, "fixed"
          would anchor to the page wrapper instead of the viewport. */}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-6 pb-5">
        <div className="pointer-events-auto flex flex-col gap-2">
          <AnimatePresence>
            {you && !youVisible && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="ink flex items-center gap-2.5 rounded-btn bg-brass px-3 py-2 shadow-ink-sm"
              >
                <span className="ink flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-white font-readout text-[11px] font-bold text-ink">
                  {you.rank}
                </span>
                <span className="grow truncate text-left text-[13px] font-extrabold text-ink">
                  {you.name} <span className="font-bold text-ink/50">(You)</span>
                </span>
                <span className="shrink-0 font-readout text-[12px] font-bold text-ink">
                  {you.digits}/9
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {resultsAvailable ? (
            <PrimaryButton
              variant="reward"
              onClick={() => navigate("/winner")}
              className="h-16 w-full"
            >
              RESULTS ARE IN!
            </PrimaryButton>
          ) : (
            <div className="ink rounded-plate bg-paper py-3.5 text-center font-body text-[11px] font-bold uppercase tracking-wider text-ink/45 shadow-ink-sm">
              Results open once a player cracks all 9
            </div>
          )}
        </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
      <span className="font-readout text-[22px] font-bold leading-none text-ink">{value}</span>
      <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
    </div>
  );
}

function Rule() {
  return <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />;
}
