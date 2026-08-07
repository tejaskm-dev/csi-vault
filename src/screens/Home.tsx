import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX, Users } from "lucide-react";
import { motion } from "motion/react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultBoard } from "../components/VaultBoard";
import { VaultDoor } from "../components/VaultDoor";
import { TumblerRing } from "../components/TumblerRing";
import { CombinationReadout } from "../components/CombinationReadout";
import { CrewFeed } from "../components/CrewFeed";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";
import { getMuted, setMuted, playTap } from "../lib/sound";
import { formatClock } from "../lib/utils";

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
            {leaderboard.length}
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

      {/* Collapses to zero height when nobody has done anything. */}
      <CrewFeed className="relative z-20 shrink-0" />

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-5 pb-3 pt-2">
        {/* Hero. Takes the space it deserves — flex-1, not a fixed min-height. */}
        <div className="relative flex flex-1 items-center justify-center">
          {/* Tap, not hover. On a phone onPointerEnter fires oddly or never, so
              the most tactile thing on screen was invisible to the actual
              audience. Each poke advances the dial a quarter turn. */}
          {showHero ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Spin the handwheel"
              onClick={() => {
                setWheelRotate((r) => r + 90);
                playTap();
              }}
              className="group relative z-20 flex aspect-square w-full max-w-[268px] rotate-[-3deg] cursor-pointer items-center justify-center"
            >
              <TumblerRing />
              <motion.div
                className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <VaultDoor
                  state={progress === 9 ? "open" : "closed"}
                  wheelRotate={wheelRotate}
                  className="h-full w-full"
                />
              </motion.div>
            </div>
          ) : (
            <div className="z-20 w-full">
              <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />
            </div>
          )}
        </div>

        {/* ── Title + the one line that says what this actually is ── */}
        <div className="mt-3 flex flex-col items-start">
          <span className="font-display text-[21px] leading-none tracking-[0.26em] text-ink">
            OPERATION
          </span>
          <h1 className="relative z-10 -mt-1 font-display text-[62px] leading-[0.82] tracking-tight text-red">
            VAULT
          </h1>
          <p className="mt-2.5 max-w-[19rem] font-body text-[13px] font-semibold leading-snug text-ink/65">
            Nine locks, twenty minutes, and a room full of first-years.{" "}
            <span className="text-ink">Your nine questions are yours alone</span> —
            no two phones in here match.
          </p>
        </div>

        {/* ── The only readout. Carries the count; no duplicate chip. ── */}
        <div className="mt-4">
          <CombinationReadout unlocked={unlockedVaults} />
        </div>

        {/* Two differentiated readings, not three identical plates. */}
        <div className="mt-2.5 flex items-center justify-between gap-3 px-0.5">
          <span className="font-body text-[11px] font-semibold text-ink/55">
            {bonusSolved ? (
              <>
                <span className="font-readout text-brass-deep">+1</span> bonus banked
              </>
            ) : (
              "Bonus round still hidden"
            )}
          </span>
          <span className="font-readout text-[13px] font-bold text-ink/70">
            {formatClock(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <div className="z-20 flex shrink-0 flex-col gap-2.5 border-t-3 border-ink bg-white p-4">
        <PrimaryButton
          onClick={() => navigate(progress === 9 ? "/vault-complete" : "/vault")}
          variant={progress === 9 ? "reward" : "primary"}
          className="h-16 w-full"
        >
          {progress === 9 ? "OPEN THE VAULT" : progress > 0 ? "BACK TO WORK" : "START CRACKING"}
        </PrimaryButton>

        <Pressable onClick={() => navigate("/leaderboard")} className="h-14 w-full">
          WHO'S AHEAD
        </Pressable>
      </div>
    </div>
  );
}
