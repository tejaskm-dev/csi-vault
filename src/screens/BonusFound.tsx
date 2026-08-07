import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pressable } from "../components/Pressable";
import { Art } from "../components/Art";
import { MysteryBox } from "../components/Props";

export function BonusFound() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-8">
        {/* Title Group */}
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-pink mb-2 bg-pink/10 px-3 py-1 rounded-pill ink">
            EASTER EGG
          </span>
          <h1 className="text-[34px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink mt-2">
            YOU SPOTTED<br />
            <span className="text-pink">THE EXTRA!</span>
          </h1>
        </div>

        {/* Hero Art Asset (gift) */}
        <div className="my-2">
          <div className="bg-pink/5 rounded-card p-4 ink shadow-ink-lg flex items-center justify-center w-40 h-40 rotate-[2.2deg]">
            <MysteryBox className="w-28 h-28" />
          </div>
        </div>

        {/* Description card */}
        <div className="font-body text-base font-bold text-ink/75 leading-relaxed bg-white ink rounded-card p-4 shadow-ink-sm max-w-[90%] rotate-[-1.5deg]">
          BONUS: One more question, off the board. It doesn't cost you a digit and it doesn't cost you time. Solve it to boost your rank!
        </div>
      </div>

      {/* Action CTA Block */}
      <div className="mb-6 flex flex-col gap-4">
        <PrimaryButton variant="reward" onClick={() => navigate("/challenge/bonus")} className="w-full">
          PLAY BONUS ROUND
        </PrimaryButton>
        <div className="flex justify-center">
          <Pressable onClick={() => navigate("/vault")} className="w-full">
            Maybe later
          </Pressable>
        </div>
      </div>
    </div>
  );
}
