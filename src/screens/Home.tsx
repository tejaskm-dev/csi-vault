import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX, Users } from "lucide-react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultBoard } from "../components/VaultBoard";
import { VaultDoor } from "../components/VaultDoor";
import { Starburst } from "../components/Starburst";
import { TumblerRing } from "../components/TumblerRing";
import { CombinationReadout } from "../components/CombinationReadout";
import { CrewFeed } from "../components/CrewFeed";
import { Annotation } from "../components/Annotation";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";
import { getMuted, setMuted } from "../lib/sound";
import { formatClock } from "../lib/utils";

/** A small riveted plate. Three on the readout row. */
function StatPlate({
  value,
  label,
  tone,
  tilt,
}: {
  value: string;
  label: string;
  tone: "brass" | "pink" | "steel";
  tilt: string;
}) {
  const fill =
    tone === "brass" ? "bg-brass text-ink shadow-chip-brass"
    : tone === "pink" ? "bg-pink text-white shadow-chip-pink"
    : "bg-steel text-ink shadow-chip-steel";

  return (
    <div
      className={`ink riveted flex flex-1 flex-col items-center rounded-btn px-2 py-2 ${fill} ${tilt}`}
    >
      <span className="font-readout text-[17px] font-bold leading-none">{value}</span>
      <span className="mt-1 font-body text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">
        {label}
      </span>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { unlockedVaults, bonusSolved, leaderboard, elapsedSeconds } = useGame();
  const [muted, setMutedState] = useState(getMuted());
  const [wheelRotate, setWheelRotate] = useState(0);

  const progress = unlockedVaults.length;
  const showHero = progress === 0 || progress === 9;

  const handleSelect = (digit: number, state: VaultState) => {
    navigate(state === "locked" ? "/vault" : `/challenge/${digit}`);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <div className="flex flex-1 select-none flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="riveted relative z-20 flex h-14 shrink-0 items-center justify-between border-b-3 border-ink bg-red px-4 text-white">
        <span className="font-display text-[15px] tracking-wide">CSI ASIET</span>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-pill border-2 border-white bg-ink px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wider">
            <Users className="h-3 w-3" />
            {leaderboard.length} LIVE
          </span>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-btn border-2 border-white bg-ink transition-colors hover:bg-red-deep"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Crew wire: 60 people are playing; say so ───────────── */}
      <CrewFeed className="relative z-20 shrink-0" />

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-3">
        {/* Hero: door at 0/9 and 9/9, board in between */}
        <div className="relative flex min-h-[196px] items-center justify-center">
          <Annotation
            label="FIG.01 — SEAL"
            className="absolute left-0 top-1 z-30"
          />
          <Annotation
            label="CLASS III"
            direction="left"
            className="absolute bottom-2 right-0 z-30"
          />

          {showHero ? (
            <div
              onPointerEnter={() => setWheelRotate(120)}
              onPointerLeave={() => setWheelRotate(0)}
              className="group relative z-20 -mt-6 flex h-[200px] w-[200px] rotate-[-4deg] cursor-pointer items-center justify-center"
            >
              <TumblerRing />

              <motion.div
                aria-hidden
                className="pointer-events-none absolute -left-10 -top-10 z-0 h-[280px] w-[280px]"
                animate={{ rotate: 360, scale: [0.95, 1.04, 0.95] }}
                transition={{
                  rotate: { repeat: Infinity, duration: 22, ease: "linear" },
                  scale: { repeat: Infinity, duration: 4.5, ease: "easeInOut" },
                }}
              >
                <Starburst fillColor="var(--color-brass)" />
              </motion.div>

              <div className="relative z-10 h-full w-full transition-transform duration-300 group-hover:scale-[1.03]">
                <VaultDoor
                  state={progress === 9 ? "open" : "closed"}
                  wheelRotate={wheelRotate}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : (
            <div className="z-20 w-full">
              <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />
            </div>
          )}
        </div>

        {/* Title — the ratio is the effect */}
        <div className="flex flex-col items-start">
          <span className="ink rounded-pill bg-blue px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-chip-blue">
            Session active
          </span>
          <span className="mt-2 font-display text-[22px] leading-none tracking-[0.26em] text-ink">
            OPERATION
          </span>
          <h1 className="relative z-10 -mt-1 font-display text-[62px] leading-[0.82] tracking-tight text-red">
            VAULT
          </h1>
        </div>

        {/* The combination — the game state, made physical */}
        <CombinationReadout unlocked={unlockedVaults} />

        {/* Three plates, varying tilt */}
        <div className="flex items-stretch gap-2.5">
          <StatPlate value={`${progress}/9`} label="Digits" tone="brass" tilt="rotate-[-2deg]" />
          <StatPlate value={bonusSolved ? "1" : "0"} label="Bonus" tone="pink" tilt="rotate-[1.5deg]" />
          <StatPlate value={formatClock(elapsedSeconds)} label="On the clock" tone="steel" tilt="rotate-[-1deg]" />
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <div className="z-20 flex shrink-0 flex-col gap-2.5 border-t-3 border-ink bg-white p-4">
        <PrimaryButton
          onClick={() => navigate(progress === 9 ? "/vault-complete" : "/vault")}
          variant={progress === 9 ? "reward" : "primary"}
          className="h-16 w-full"
        >
          {progress === 9 ? "OPEN THE VAULT" : progress > 0 ? "BACK TO WORK" : "CRACK THE VAULT"}
        </PrimaryButton>

        <Pressable onClick={() => navigate("/leaderboard")} className="h-14 w-full">
          THE CREW
        </Pressable>
      </div>
    </div>
  );
}
