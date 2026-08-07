import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { VaultBoard } from "../components/VaultBoard";
import { VaultTile, type VaultState } from "../components/VaultTile";
import { Modal } from "../components/Modal";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { TreasureChest, PartyPopper } from "../components/art/Props";
import { GlyphStar } from "../components/art/Glyphs";
import { useGame } from "../context/GameContext";
import { EASE_OUT } from "../lib/motion";

export function VaultGrid() {
  const navigate = useNavigate();
  const { unlockedVaults, bonusSolved } = useGame();
  const [lockedDigit, setLockedDigit] = useState<number | null>(null);

  const progress = unlockedVaults.length;
  const complete = progress === 9;

  const handleSelect = (digit: number, state: VaultState) => {
    if (state === "locked") {
      setLockedDigit(digit);
      return;
    }
    navigate(`/challenge/${digit}`);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      <header className="flex flex-col px-5 py-3">
        <div className="flex items-center justify-between">
          <Pressable icon onClick={() => navigate("/home")} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Pressable>
          <h1 className="font-display text-xl font-black tracking-tight">
            YOUR VAULT
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
        <p className="mt-1 text-center text-xs font-bold uppercase tracking-wider text-muted">
          Complete challenges to unlock digits!
        </p>
      </header>

      <div className="px-5">
        {/* Progress bar */}
        <div className="relative mb-5 overflow-hidden rounded-card bg-white px-5 py-4 shadow-chunk-white">
          <motion.div
            className="absolute inset-y-0 left-0 bg-green-tint"
            initial={{ width: 0 }}
            animate={{ width: `${(progress / 9) * 100}%` }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                Status
              </div>
              <div className="font-display text-lg font-black">
                {complete ? "Vault ready to open" : `${progress} of 9 found`}
              </div>
            </div>
            <span className="numeral text-3xl text-success-green">
              {progress}
            </span>
          </div>
        </div>

        <VaultBoard
          unlockedVaults={unlockedVaults}
          onSelect={handleSelect}
          className="mb-5"
        />

        {complete ? (
          <PrimaryButton
            variant="reward"
            onClick={() => navigate("/vault-complete")}
            className="h-16"
          >
            <GlyphStar className="h-6 w-6 text-charcoal" />
            OPEN THE VAULT
          </PrimaryButton>
        ) : (
          /* The Mega Reward Card with overflowing party popper and treasure chest */
          <div className="relative flex items-center justify-between rounded-card bg-white p-4 shadow-chunk-white rotate-[-1deg]">
            <PartyPopper className="h-12 w-12 shrink-0 -mt-3 -mb-3 scale-125" />
            <div className="flex flex-col text-center px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Complete all 9 to unlock
              </span>
              <span className="font-display text-base font-black text-csi-red">
                THE MEGA REWARD!
              </span>
            </div>
            <TreasureChest className="h-12 w-12 shrink-0 -mt-3 -mb-3 scale-125" />
          </div>
        )}
      </div>

      <Modal isOpen={lockedDigit !== null} onClose={() => setLockedDigit(null)}>
        <div className="flex flex-col items-center p-2 text-center">
          <div className="mb-5 w-20">
            <VaultTile digit={lockedDigit ?? 0} state="locked" />
          </div>
          <h2 className="mb-2 font-display text-2xl font-black">Not yet</h2>
          <p className="mb-6 text-[15px] text-muted">
            Digit {lockedDigit} opens as you clear the tiles ahead of it. Three
            are always available — pick whichever looks easiest.
          </p>
          <PrimaryButton onClick={() => setLockedDigit(null)}>
            GOT IT
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
