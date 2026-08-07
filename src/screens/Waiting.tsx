import { useNavigate, useSearchParams } from "react-router-dom";
import { PrimaryButton } from "../components/PrimaryButton";
import { Art } from "../components/Art";
import { Padlock, Stopwatch } from "../components/Props";

export function Waiting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isPost = params.get("state") === "post";

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-8">
        {/* Title Group */}
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-deep mb-2 bg-red/10 px-3 py-1 rounded-pill ink rotate-[2deg]">
            {isPost ? "MISSION COMPLETED" : "EVENT QUEUE"}
          </span>
          <h1 className="text-[36px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink mt-2">
            {isPost ? "YOU CRACKED IT!" : "VAULT OPENS SOON"}
          </h1>
        </div>

        {/* Hourglass or Padlock Hero */}
        <div className="my-2">
          <div className="bg-paper-deep/60 rounded-pill p-4 ink shadow-ink flex items-center justify-center w-36 h-36 relative overflow-visible">
            {isPost ? (
              <div className="scale-115">
                <Padlock className="w-20 h-20" />
              </div>
            ) : (
              <div className="animate-[tumble_3s_linear_infinite] spin-layer scale-115">
                <Stopwatch className="w-20 h-20" />
              </div>
            )}
          </div>
        </div>

        {/* Holding details card */}
        <div className="font-body text-base font-bold text-ink/75 leading-relaxed bg-white ink rounded-card p-4 shadow-ink-sm max-w-[90%] rotate-[-1.5deg]">
          {isPost
            ? "RESULTS: Results drop when everyone's done. Check the leaderboard in the meantime to see how you rank!"
            : "WAITING: Hang tight — the event is about to begin. Keep this screen open, the operator will unlock the vault shortly."}
        </div>
      </div>

      {/* Leaderboard CTA if completed */}
      <div className="mb-6 w-full">
        {isPost ? (
          <PrimaryButton onClick={() => navigate("/leaderboard")} className="w-full">
            VIEW LEADERBOARD
          </PrimaryButton>
        ) : (
          <div className="text-center font-display font-bold text-ink/40 uppercase tracking-widest py-3 bg-paper-deep/40 rounded-card ink">
            Awaiting dispatch...
          </div>
        )}
      </div>
    </div>
  );
}
