import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VaultBoard } from "../components/VaultBoard";
import { Modal } from "../components/Modal";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";
import { GiftBox, Padlock } from "../components/Props";

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
    <div className="flex flex-1 select-none flex-col">
      <ScreenHeader eyebrow="Mission map" title="Your Vault" back="/home" />

      {/* The board is the screen. It sits directly under the progress card
          instead of being pushed apart from the CTA by `justify-between`,
          which left a phone-height gap in the middle of the page. */}
      <div className="flex flex-1 flex-col gap-5 p-6 pt-6">
        {/* Progress card. The badge overhangs the TOP edge only — overhanging
            right as well pushed it into the shell's edge. */}
        <div className="relative ink rounded-card bg-white p-5 pt-6 shadow-ink flex flex-col gap-3 shrink-0">
          <span className="font-bold text-sm text-ink/60 uppercase tracking-wider">CRACKING PROGRESS</span>
          <div className="w-full h-6 rounded-pill ink bg-paper-deep overflow-hidden relative">
            <div
              className="h-full bg-green transition-all duration-500 border-r-3 border-ink"
              style={{ width: `${(progress / 9) * 100}%` }}
            />
          </div>
          <div className="absolute -top-4 right-4 z-10 pixel text-[11px] text-ink font-extrabold bg-yellow px-3.5 py-1.5 rounded-pill ink shadow-ink-sm rotate-[3deg]">
            {complete ? "READY" : `${progress}/9 DIGITS`}
          </div>
        </div>

        {/* Board component */}
        <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />

        {/* Footer CTA. `mt-auto` pins it to the bottom on a tall phone without
            stretching the gap above it on a short one. */}
        <div className="mt-auto pt-1 pb-1 shrink-0">
          {complete ? (
            <PrimaryButton variant="reward" onClick={() => navigate("/vault-complete")} className="h-16 w-full">
              OPEN THE VAULT
            </PrimaryButton>
          ) : (
            <PrimaryButton
              variant="secondary"
              onClick={() => navigate("/bonus-found")}
              disabled={bonusSolved}
              className="h-16 w-full text-center flex items-center justify-center gap-2.5"
            >
              <GiftBox className="h-9 w-9 shrink-0" />
              <span>{bonusSolved ? "BONUS COMPLETE" : "SPOT THE BONUS ROUND"}</span>
            </PrimaryButton>
          )}
        </div>
      </div>

      <Modal isOpen={lockedDigit !== null} onClose={() => setLockedDigit(null)}>
        <Padlock className="w-24 h-24 mx-auto mb-1" />
        <h2 className="text-[28px] font-extrabold uppercase text-ink leading-tight mt-2">NOT YET, RECRUIT</h2>
        <p className="font-body text-base font-bold text-ink/70 leading-relaxed px-2 mt-1">
          Digit {lockedDigit} opens as you clear the tiles ahead of it. A rolling window of three is always open — try another active tile!
        </p>
        <PrimaryButton onClick={() => setLockedDigit(null)} variant="primary" className="w-full mt-4">
          GOT IT
        </PrimaryButton>
      </Modal>
    </div>
  );
}
