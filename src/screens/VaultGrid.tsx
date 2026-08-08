import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { VaultBoard } from "../components/VaultBoard";
import { Modal } from "../components/Modal";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGame } from "../context/GameContext";
import type { VaultState } from "../components/VaultTile";
import { Art } from "../components/Art";
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

      <div className="flex flex-1 flex-col justify-between p-6 pt-5">
      <div className="flex flex-col gap-6">
        {/* Status Badge Progress Card with Overhanging Digit Badge */}
        <div className="relative ink rounded-card bg-white p-5 shadow-ink-sm flex flex-col gap-3 mt-2">
          <span className="font-bold text-sm text-ink/60 uppercase tracking-wider">CRACKING PROGRESS</span>
          <div className="w-full h-6 rounded-pill ink bg-paper-deep overflow-hidden relative">
            <div
              className="h-full bg-green transition-all duration-500 border-r-3 border-ink"
              style={{ width: `${(progress / 9) * 100}%` }}
            />
          </div>
          <div className="absolute -top-4 -right-3.5 z-10 pixel text-[11px] text-ink font-extrabold bg-yellow px-3.5 py-1.5 rounded-pill ink shadow-ink-sm rotate-[3deg]">
            {complete ? "READY" : `${progress}/9 DIGITS`}
          </div>
        </div>

        {/* Board component */}
        <VaultBoard unlockedVaults={unlockedVaults} onSelect={handleSelect} />
      </div>

      {/* Footer CTA Section */}
      <div className="mt-6 mb-2">
        {complete ? (
          <PrimaryButton variant="reward" onClick={() => navigate("/vault-complete")} className="w-full">
            OPEN THE VAULT
          </PrimaryButton>
        ) : (
          <PrimaryButton
            variant="secondary"
            onClick={() => navigate("/bonus-found")}
            disabled={bonusSolved}
            className="w-full text-center flex items-center justify-center gap-2"
          >
            <GiftBox className="w-5 h-5 shrink-0" />
            <span>{bonusSolved ? "BONUS COMPLETE" : "SPOT THE BONUS ROUND"}</span>
          </PrimaryButton>
        )}
      </div>

      {/* Locked Digit Modal */}
      </div>

      <Modal isOpen={lockedDigit !== null} onClose={() => setLockedDigit(null)}>
        <Padlock className="w-12 h-12 mx-auto mb-2" />
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
