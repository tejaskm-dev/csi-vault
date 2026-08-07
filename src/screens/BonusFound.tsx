import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { GiftBox } from "../components/art/Props";

/**
 * Deliberately no confetti. Celebrate belongs to Success and Vault Complete
 * only — spending it here is what would make it stop meaning anything.
 */
export function BonusFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <GiftBox className="mb-6 h-40 w-40" />

        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-reward-yellow">
          Bonus found
        </p>

        <h1 className="mb-3 font-display text-3xl font-black tracking-tight">
          You found a bonus challenge!
        </h1>

        <p className="max-w-xs text-[17px] text-muted">
          Complete it for a bonus digit. It doesn't cost you time or replace a vault tile.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <PrimaryButton
          variant="reward"
          onClick={() => navigate("/challenge/bonus")}
          className="h-16 text-xl"
        >
          PLAY BONUS
        </PrimaryButton>
        <Pressable
          onClick={() => navigate("/vault")}
          className="w-full text-[15px] font-bold text-muted"
        >
          Maybe later
        </Pressable>
      </div>
    </div>
  );
}
