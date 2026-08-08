import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGame } from "../context/GameContext";
import { listContainerVariants } from "../lib/motion";

const VISIBLE = 6; // Compact view fits beautifully on phone screens

export function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  const top = leaderboard.slice(0, VISIBLE);
  const you = leaderboard.find((e) => e.isYou);
  const youIsBelow = you && !top.some((e) => e.isYou);

  // If anyone has unlocked all 9 digits, the results are in!
  const resultsAvailable = leaderboard.some((e) => e.digits === 9);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none">
      <div className="flex flex-col gap-5">
        {/* Header Block */}
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

        {/* Live status label */}
        <p className="font-body text-[14px] font-semibold text-ink/50 -mt-2">
          Ranked by digits unlocked, then by completion time.
        </p>

        {/* Scrollable Leaderboard Rows */}
        <motion.div
          variants={listContainerVariants}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-3"
        >
          {top.map((entry) => (
            <LeaderboardRow key={entry.id} {...entry} />
          ))}

          {youIsBelow && you && (
            <>
              <div className="text-center font-bold text-ink/30 py-0.5 pixel text-[10px]">•••</div>
              <LeaderboardRow key={you.id} {...you} />
            </>
          )}
        </motion.div>
      </div>

      {/* Results CTA or bottom label */}
      <div className="mt-4 mb-2 flex flex-col gap-2">
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
  );
}
