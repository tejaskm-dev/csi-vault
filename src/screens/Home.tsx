import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { VaultScene } from "../components/art/VaultScene";
import { VaultBoard } from "../components/VaultBoard";
import { Sparkle } from "../components/art/Props";
import { GlyphKey, GlyphStar } from "../components/art/Glyphs";
import { useGame } from "../context/GameContext";
import { isMuted, toggleMute } from "../lib/sound";
import type { VaultState } from "../components/VaultTile";

export function Home() {
  const navigate = useNavigate();
  const { username, unlockedVaults, bonusSolved, leaderboard } = useGame();
  const [muted, setMuted] = useState(() => isMuted());

  const progress = unlockedVaults.length;
  // Hero illustration earns its space only at 0/9 and 9/9
  const showHero = progress === 0 || progress === 9;

  const handleMuteToggle = () => {
    const next = toggleMute();
    setMuted(next);
  };

  const handleSelect = (digit: number, state: VaultState) => {
    if (state === "locked") {
      navigate("/vault");
      return;
    }
    navigate(`/challenge/${digit}`);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      {/* Header with Users counter and Speaker Mute toggle */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="font-display text-xl font-black tracking-tight text-csi-red">
          CSI ASIET
        </div>
        <div className="flex items-center gap-2">
          <Pressable icon onClick={handleMuteToggle} aria-label={muted ? "Unmute sound" : "Mute sound"}>
            {muted ? <VolumeX className="h-5 w-5 text-muted" /> : <Volume2 className="h-5 w-5 text-charcoal" />}
          </Pressable>
          <div className="flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-2.5 text-sm font-semibold shadow-chunk-white">
            <Users className="h-4 w-4 text-muted" />
            <span className="numeral text-[15px]">{leaderboard.length}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5">
        {/* Scale contrast is the whole effect here: a small tracked-out
            eyebrow against a headline three times its size. */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <Sparkle className="h-4 w-4" />
            <h1 className="font-display text-[20px] font-black uppercase tracking-[0.22em] text-charcoal">
              Operation
            </h1>
            <Sparkle className="h-4 w-4" />
          </div>
          <h1 className="-mt-1 font-display text-[64px] font-black uppercase leading-[0.85] tracking-tight text-csi-red">
            Vault
          </h1>
        </div>

        <p className="mt-1.5 text-[15px] font-semibold text-muted">
          9 Challenges. 1 Mission. Infinite Fun.
        </p>

        {showHero ? (
          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <VaultScene
              className="h-56 w-56"
              state={progress === 9 ? "open" : "closed"}
            />
            {/* White speech card */}
            <div className="mt-3 rounded-card bg-white px-4 py-3 text-center shadow-chunk-white rotate-[-1deg]">
              <p className="text-[15px] font-semibold text-charcoal">
                Hey Recruit! 👋 Tap any vault to start{" "}
                <span className="text-csi-red font-bold">unlocking digits!</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <VaultBoard
              unlockedVaults={unlockedVaults}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3 px-5 pt-4">
        {/* Two side-by-side chunky stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-card bg-white px-4 py-3 shadow-chunk-white">
            <div className="flex items-center gap-2">
              <GlyphKey className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Digits
                </span>
                <span className="numeral text-lg leading-tight text-csi-red">
                  {progress}/9
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-card bg-white px-4 py-3 shadow-chunk-white">
            <div className="flex items-center gap-2">
              <GlyphStar className="h-6 w-6" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Bonus
                </span>
                <span className="numeral text-lg leading-tight text-reward-yellow">
                  {bonusSolved ? "1 Done" : "0 Found"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <PrimaryButton
          onClick={() => navigate(progress === 9 ? "/vault-complete" : "/vault")}
          className="h-16 text-xl"
        >
          {progress === 9
            ? "OPEN THE VAULT"
            : progress > 0
              ? "RESUME MISSION"
              : "ENTER THE VAULT"}
          <ArrowRight className="h-6 w-6" />
        </PrimaryButton>

        <Pressable
          onClick={() => navigate("/leaderboard")}
          className="w-full text-[15px] font-bold text-muted"
        >
          View leaderboard
        </Pressable>
      </div>
    </div>
  );
}
