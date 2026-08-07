import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
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
        <header className="flex items-center gap-4">
          <Pressable onClick={() => navigate("/home")} aria-label="Back" icon>
            <ArrowLeft className="w-5 h-5" />
          </Pressable>
          <div className="flex flex-col grow">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-deep">
              RANKINGS
            </span>
            <h1 className="text-[32px] font-extrabold uppercase leading-[0.9] tracking-tighter text-ink mt-0.5">
              LEADERBOARD
            </h1>
          </div>
          
          {/* Pulse Live indicator */}
          <div className="flex items-center gap-1.5 bg-green/10 text-green font-display font-extrabold text-[11px] px-2.5 py-1 rounded-pill ink border-green rotate-[3deg]">
            <RefreshCw className="w-3 h-3 animate-[tumble_3s_linear_infinite] spin-layer" />
            <span>LIVE</span>
          </div>
        </header>

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
