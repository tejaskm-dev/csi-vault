import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGame } from "../context/GameContext";
import { listStagger, riseIn } from "../lib/motion";

/**
 * The page scrolls, so there is no reason to truncate at six and leave the
 * bottom third of the screen empty. Ten covers the whole room at this event
 * with the "..." break still doing its job if someone is further down.
 */
const VISIBLE = 10;

export function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  const top = leaderboard.slice(0, VISIBLE);
  const you = leaderboard.find((e) => e.isYou);
  const youIsBelow = you && !top.some((e) => e.isYou);

  const field = leaderboard.length;
  const leader = leaderboard[0];

  // If anyone has unlocked all 9 digits, the results are in!
  const resultsAvailable = leaderboard.some((e) => e.digits === 9);

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

      <div className="flex flex-1 flex-col p-6 pt-5">
        <div className="flex flex-col gap-4">
        {/* Where you actually stand, before the list. Scrolling to find your
            own row was the first thing anyone did on this screen. */}
        {you && (
          <motion.div
            variants={riseIn}
            initial="initial"
            animate="animate"
            className="ink flex items-stretch overflow-hidden rounded-plate bg-white shadow-ink"
          >
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <span className="font-readout text-[22px] font-bold leading-none text-ink">
                #{you.rank}
              </span>
              <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
                Your rank
              </span>
            </div>
            <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <span className="font-readout text-[22px] font-bold leading-none text-ink">
                {you.digits}/9
              </span>
              <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
                Your digits
              </span>
            </div>
            <span className="my-3 w-0 border-l-2 border-dashed border-ink/15" />
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <span className="font-readout text-[22px] font-bold leading-none text-ink">
                {field}
              </span>
              <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
                In play
              </span>
            </div>
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

        {/* Scrollable Leaderboard Rows */}
        <motion.div
          variants={listStagger}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-3"
        >
          {/* The wrapper carries the entrance. LeaderboardRow itself uses
              `layout` for reordering, and Framer writes an inline transform
              for that — an entrance variant on the same element fights it. */}
          {top.map((entry) => (
            <motion.div key={entry.id} variants={riseIn}>
              <LeaderboardRow {...entry} />
            </motion.div>
          ))}

          {youIsBelow && you && (
            <>
              <div className="text-center font-bold text-ink/30 py-0.5 pixel text-[10px]">•••</div>
              <motion.div key={you.id} variants={riseIn}>
                <LeaderboardRow {...you} />
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* Results CTA or bottom label */}
      <div className="mt-6 flex flex-col gap-2">
        {resultsAvailable ? (
          <PrimaryButton variant="reward" onClick={() => navigate("/winner")} className="w-full">
            RESULTS ARE IN!
          </PrimaryButton>
        ) : (
          <div className="text-center font-body text-xs font-bold text-ink/40 uppercase tracking-wider py-3 bg-paper-deep/40 rounded-card ink">
            LOCKED: Results open once a player cracks all 9!
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
