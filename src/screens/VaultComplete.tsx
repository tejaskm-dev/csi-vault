import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatBlock } from "../components/StatBlock";
import { VaultTile } from "../components/VaultTile";
import { VaultDoor } from "../components/VaultDoor";
import { useGame } from "../context/GameContext";
import { formatClock } from "../lib/utils";
import { playComplete } from "../lib/sound";
import { celebrate } from "../lib/motion";
import { Starburst } from "../components/Starburst";
import { WavyDivider } from "../components/WavyDivider";

export function VaultComplete() {
  const navigate = useNavigate();
  const { unlockedVaults, elapsedSeconds, bonusSolved } = useGame();

  useEffect(() => {
    // Play full completion chiptune arpeggio and burst confetti on entrance!
    playComplete();
    celebrate();
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 text-center text-white select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6">
        {/* Header Title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 bg-yellow/10 text-yellow text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-pill ink border-yellow rotate-[2deg]">
            <span>MISSION ACCOMPLISHED</span>
          </div>
          <h1 className="text-[44px] font-extrabold uppercase leading-[0.9] tracking-tighter text-white mt-3">
            VAULT<br />
            <span className="text-yellow">UNLOCKED</span>
          </h1>
        </div>

        {/* Vault Door (Opening / Open) */}
        <div className="my-2">
          <VaultDoor state="open" />
        </div>

        {/* Compact Solved Digits Strip */}
        <div className="flex justify-center items-center gap-1.5 bg-ink border-2 border-white p-2.5 rounded-card w-full rotate-[-1deg]">
          {Array.from({ length: 9 }, (_, i) => (
            <VaultTile
              key={i}
              digit={i + 1}
              state={unlockedVaults.includes(String(i + 1)) ? "solved" : "locked"}
              size="compact"
            />
          ))}
        </div>

        {/* Stats Row with Starburst on the Time block and Pill styling */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <StatBlock
            tone="dark"
            number={`${unlockedVaults.length}/9`}
            label="DIGITS"
            className="border-white rounded-pill py-3"
          />
          
          <div className="relative flex justify-center items-center h-full">
            <div className="absolute w-24 h-24 z-0 animate-[spin_16s_linear_infinite] scale-120 opacity-30">
              <Starburst fillColor="var(--color-yellow)" />
            </div>
            <StatBlock
              tone="dark"
              number={formatClock(elapsedSeconds)}
              label="TIME"
              className="border-0 bg-transparent shadow-none py-3 relative z-10"
            />
          </div>

          <StatBlock
            tone="dark"
            number={bonusSolved ? "1" : "0"}
            label="BONUS"
            className="border-white rounded-pill py-3"
          />
        </div>
      </div>

      {/* Leaderboard CTA */}
      <div className="mb-6 mt-4 flex flex-col gap-4">
        <WavyDivider className="opacity-40" />
        <PrimaryButton variant="reward" onClick={() => navigate("/leaderboard")} className="w-full">
          VIEW LEADERBOARD
        </PrimaryButton>
      </div>
    </div>
  );
}
