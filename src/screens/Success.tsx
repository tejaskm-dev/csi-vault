import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { VaultTile } from "../components/VaultTile";
import { useGame } from "../context/GameContext";
import { celebrate } from "../lib/motion";
import { Art } from "../components/Art";
import { Starburst } from "../components/Starburst";
import { WavyDivider } from "../components/WavyDivider";

export function Success() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unlockVault, unlockedVaults } = useGame();

  const isBonus = id === "bonus";
  const digit = parseInt(id ?? "1", 10);

  const [tileSolved, setTileSolved] = useState(false);
  const committed = useRef(false);

  useEffect(() => {
    if (!committed.current && !isBonus && id) {
      unlockVault(id);
      committed.current = true;
    }
    
    const t = setTimeout(() => {
      setTileSolved(true);
      celebrate(); // Burst confetti exactly when the tile flips to green!
    }, 260);

    return () => clearTimeout(t);
  }, [id, isBonus, unlockVault]);

  const remaining = 9 - unlockedVaults.length;
  const allDone = remaining === 0;

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6">
        {/* Title Group */}
        <div className="flex flex-col items-center relative z-10">
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-deep mb-2 bg-red/10 px-3 py-1 rounded-pill ink">
            ACCESS GRANTED
          </span>
          <h1 className="text-[48px] font-extrabold uppercase leading-[0.9] tracking-tighter text-ink mt-2">
            {isBonus ? "BONUS!" : "WOOHOO!"}
          </h1>
        </div>

        {/* Central visual indicator with Starburst backing and negative margin overlap */}
        <div className="w-52 h-52 flex items-center justify-center relative -mt-6 z-20 overflow-visible">
          {!isBonus && (
            <div className="absolute inset-0 scale-125 z-0 animate-[tumble_12s_linear_infinite]">
              <Starburst fillColor="var(--color-yellow)" />
            </div>
          )}

          <div className="w-36 h-36 z-10 relative">
            {isBonus ? (
              <div className="w-36 h-36 bg-pink/10 ink rounded-card flex items-center justify-center rotate-[3deg] shadow-ink">
                <Art name="popper" alt="Popper" className="w-22 h-22 object-contain" />
              </div>
            ) : (
              <VaultTile digit={digit} state={tileSolved ? "solved" : "active"} />
            )}
          </div>
        </div>

        {/* Informational Progress Text */}
        <div className="flex flex-col gap-2 mt-4 relative z-10">
          <p className="font-display font-extrabold text-[22px] text-ink leading-tight">
            {isBonus ? "Bonus Cleared!" : `Digit ${digit} is yours!`}
          </p>
          <p className="font-body text-base font-bold text-ink/60">
            {allDone
               ? "All 9 digits recovered. The vault is ready!"
               : `${remaining} ${remaining === 1 ? "digit" : "digits"} left to unlock.`}
          </p>
        </div>
      </div>

      {/* Continue CTA */}
      <div className="mb-6 flex flex-col gap-4">
        <WavyDivider className="opacity-75" />
        <PrimaryButton
          onClick={() => navigate(allDone ? "/vault-complete" : "/vault")}
          variant={allDone ? "reward" : "primary"}
          className="w-full"
        >
          {allDone ? "OPEN THE VAULT" : "CONTINUE"}
        </PrimaryButton>
      </div>
    </div>
  );
}
