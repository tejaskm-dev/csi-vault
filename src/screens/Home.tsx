import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX, Users } from "lucide-react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultBoard } from "../components/VaultBoard";
import { VaultDoor } from "../components/VaultDoor";
import { Starburst } from "../components/Starburst";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";
import { getMuted, setMuted } from "../lib/sound";
import { cn } from "../lib/utils";

export function Home() {
  const navigate = useNavigate();
  const { unlockedVaults, bonusSolved, leaderboard } = useGame();
  const [muted, setMutedState] = useState(getMuted());
  const [wheelRotate, setWheelRotate] = useState(0);

  const progress = unlockedVaults.length;
  const showHero = progress === 0 || progress === 9;

  const handleSelect = (digit: number, state: VaultState) => {
    if (state === "locked") {
      navigate("/vault");
      return;
    }
    navigate(`/challenge/${digit}`);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setMutedState(nextMuted);
  };

  return (
    <div className="flex-1 flex flex-col justify-between select-none">
      {/* 56px Coloured Header */}
      <header className="h-[56px] flex justify-between items-center px-4 border-b-3 border-ink bg-red text-white shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 font-display font-extrabold text-[15px] tracking-wide">
          <span>CSI ASIET</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live players badge */}
          <div className="flex items-center gap-1 bg-ink border-2 border-white text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-pill">
            <Users className="w-3.5 h-3.5 text-white/90" />
            <span>{leaderboard.length} PLAYING</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-btn p-1.5 bg-ink text-white border-2 border-white cursor-pointer hover:bg-red transition-colors"
            title={muted ? "Unmute audio" : "Mute audio"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-4 overflow-y-auto">
        {/* Board or Hanger Door Hero (Overlaps header bottom edge) */}
        <div className="flex items-center justify-center relative min-h-[220px]">
          {showHero ? (
            <div
              onMouseEnter={() => setWheelRotate(90)}
              onMouseLeave={() => setWheelRotate(0)}
              className="relative w-[220px] h-[220px] -mt-8 z-20 rotate-[-4deg] flex items-center justify-center cursor-pointer group"
            >
              {/* Starburst rotating slowly and pulsing behind the door */}
              <motion.div
                className="absolute inset-0 w-[308px] h-[308px] -left-11 -top-11 z-0 pointer-events-none"
                animate={{
                  rotate: 360,
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{
                  rotate: { repeat: Infinity, duration: 20, ease: "linear" },
                  scale: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                }}
              >
                <Starburst fillColor="var(--color-yellow)" />
              </motion.div>
              <div className="relative z-10 w-full h-full transition-transform duration-300 group-hover:scale-[1.03]">
                <VaultDoor
                  state={progress === 9 ? "open" : "closed"}
                  wheelRotate={wheelRotate}
                  className="w-full h-full"
                />
              </div>
            </div>
          ) : (
            <div className="scale-[0.9] origin-center -my-3 z-20">
              <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />
            </div>
          )}
        </div>

        {/* Left-Aligned Title Group */}
        <div className="flex flex-col items-start text-left mt-2">
          <span className="text-[28px] font-extrabold uppercase leading-none tracking-[0.25em] text-ink">
            OPERATION
          </span>
          <h1 className="text-[76px] font-extrabold uppercase leading-[0.8] tracking-tighter text-red -mt-2 z-20 relative">
            VAULT
          </h1>
        </div>

        {/* Left-aligned pill tag chip rotated -2deg */}
        <div className="flex justify-start">
          <div className="ink rounded-pill bg-blue text-white px-4 py-1.5 font-display text-[14px] font-extrabold shadow-ink-sm rotate-[-2deg]">
            ╱ 9 PUZZLES · 1 MISSION ╱
          </div>
        </div>

        {/* Left-aligned Stats Bar (Varying tilts, bigger sizes) */}
        <div className="flex justify-start gap-4 mt-2">
          {/* Digits found chip */}
          <div className="ink rounded-pill bg-yellow text-ink px-5 py-2.5 font-display text-[15px] font-extrabold shadow-ink-sm flex items-center gap-1.5 rotate-[-3deg]">
            <span className="pixel text-[11px]">{progress}/9</span>
            <span>DIGITS</span>
          </div>

          {/* Bonus status chip */}
          <div className="ink rounded-pill bg-pink text-white px-5 py-2.5 font-display text-[15px] font-extrabold shadow-ink-sm flex items-center gap-1.5 rotate-[2.5deg]">
            <span className="pixel text-[11px]">{bonusSolved ? "1" : "0"}</span>
            <span>BONUS</span>
          </div>
        </div>
      </div>

      {/* Solid Divider Bottom CTA Block */}
      <div className="p-5 flex flex-col gap-3 bg-white border-t-3 border-ink shrink-0 z-10">
        <PrimaryButton
          onClick={() => navigate(progress === 9 ? "/vault-complete" : "/vault")}
          className="w-full h-16"
          variant={progress === 9 ? "reward" : "primary"}
        >
          {progress === 9
            ? "OPEN THE VAULT"
            : progress > 0
            ? "RESUME MISSION"
            : "ENTER THE VAULT"}
        </PrimaryButton>

        <div className="flex justify-center">
          <Pressable onClick={() => navigate("/leaderboard")} className="w-full h-14">
            VIEW LEADERBOARD
          </Pressable>
        </div>
      </div>
    </div>
  );
}
