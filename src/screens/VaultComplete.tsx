import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatBlock } from "../components/StatBlock";
import { VaultTile } from "../components/VaultTile";
import { VaultScene } from "../components/art/VaultScene";
import { useGame } from "../context/GameContext";
import { celebrate, EASE_OUT } from "../lib/motion";
import { soundComplete } from "../lib/sound";
import { formatClock } from "../lib/utils";

/**
 * Full charcoal climax screen. Vault scene dark tone with scenery=false.
 */
export function VaultComplete() {
  const navigate = useNavigate();
  const { unlockedVaults, elapsedSeconds, bonusSolved } = useGame();

  useEffect(() => {
    soundComplete();
    const t = setTimeout(() => celebrate(["#F4B93E", "#E8332B", "#FBF6EF"]), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-charcoal p-6 text-white">
      <div className="flex flex-1 flex-col items-center justify-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mb-3 font-display text-xs font-black uppercase tracking-[0.2em] text-reward-yellow"
        >
          Mission accomplished
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.05 }}
          className="mb-6 text-center font-display text-[52px] font-black leading-[0.9] tracking-tight"
        >
          VAULT
          <br />
          UNLOCKED
        </motion.h1>

        {/* VaultScene dark tone with scenery=false (arch + door, tight viewBox 70 46 100 108) */}
        <VaultScene className="mb-8 h-52 w-52" state="open" tone="dark" scenery={false} />

        {/* 9-tile compact summary strip */}
        <div className="mb-8 grid w-full max-w-[300px] grid-cols-9 gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <VaultTile
              key={i}
              digit={i + 1}
              state={unlockedVaults.includes(String(i + 1)) ? "solved" : "locked"}
              size="compact"
            />
          ))}
        </div>

        <div className="flex w-full gap-3">
          <StatBlock
            tone="dark"
            number={`${unlockedVaults.length}/9`}
            label="Digits found"
            className="flex-1"
          />
          <StatBlock
            tone="dark"
            number={formatClock(elapsedSeconds)}
            label="Run time"
            className="flex-1"
          />
          <StatBlock
            tone="dark"
            number={bonusSolved ? "1" : "0"}
            label="Bonus"
            className="flex-1"
          />
        </div>
      </div>

      <PrimaryButton
        variant="reward"
        onClick={() => navigate("/leaderboard")}
        className="mt-8 h-16 text-xl"
      >
        <Trophy className="h-6 w-6" />
        VIEW LEADERBOARD
      </PrimaryButton>
    </div>
  );
}
