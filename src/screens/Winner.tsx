import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { PrimaryButton } from "../components/PrimaryButton";
import { useGame } from "../context/GameContext";
import type { LeaderboardEntry } from "../data/mockData";
import { Art } from "../components/Art";
import { cn } from "../lib/utils";
import { Trophy } from "../components/Props";

const SLOTS = [2, 1, 3];

export function Winner() {
  const navigate = useNavigate();
  const { leaderboard } = useGame();

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none text-center">
      <div className="flex-1 flex flex-col justify-center gap-5 mt-4">
        {/* Header Block */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 bg-yellow/10 text-yellow font-display font-extrabold text-[11px] px-3 py-1 rounded-pill ink border-yellow">
            <Users className="w-3.5 h-3.5 text-yellow" />
            <span>FINAL STANDINGS</span>
          </div>
          <h1 className="text-[36px] font-extrabold uppercase leading-[0.95] tracking-tighter text-ink text-sticker-thin text-extrude-ink mt-3">
            WE HAVE A<br />
            <span className="text-red">WINNER!</span>
          </h1>
        </div>

        {/* Hero Illustration (Trophy) */}
        <div className="my-1 flex justify-center">
          <div className="bg-yellow/10 rounded-card p-3 ink shadow-ink-sm flex items-center justify-center w-28 h-28 rotate-[-2deg]">
            <Trophy className="w-20 h-20" />
          </div>
        </div>

        {/* Podium Layout */}
        <div className="flex items-end justify-center h-[240px] mt-6 px-1 overflow-visible relative">
          {SLOTS.map((rank) => {
            const entry: LeaderboardEntry | undefined = leaderboard[rank - 1];

            // Render columns based on rank height and width
            const columnStyles = {
              1: "h-44 flex-[1.3] bg-yellow shadow-ink z-20 -mx-2 rounded-t-[32px] border-b-0",
              2: "h-32 flex-1 bg-white shadow-ink-sm z-10 rounded-t-[24px] border-b-0",
              3: "h-26 flex-1 bg-paper-deep shadow-ink-sm z-10 rounded-t-[24px] border-b-0",
            }[rank as 1 | 2 | 3];

            return (
              <div
                key={rank}
                className={cn(
                  "relative flex flex-col justify-between items-center p-3 ink transition-transform hover:scale-102",
                  columnStyles
                )}
              >
                {/* 1st place overhanging star badge */}
                {rank === 1 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-pill bg-red text-white ink shadow-ink-sm flex items-center justify-center">
                    <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                )}

                {/* Player Initials Badge at Top */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-pill ink flex items-center justify-center font-display font-extrabold text-[13px] text-ink",
                    rank === 1 ? "bg-white" : "bg-paper"
                  )}
                >
                  {entry?.initials ?? "–"}
                </div>

                {/* Name Label */}
                <div className="flex flex-col items-center w-full min-h-[36px] justify-center mt-1">
                  <span className="font-display font-extrabold text-[12px] text-ink leading-tight truncate w-full px-0.5">
                    {entry?.name.split(" ")[0] ?? "OPEN"}
                  </span>
                  <span className="text-[9px] font-bold text-ink/40 uppercase tracking-widest mt-0.5">
                    {entry ? `${entry.digits}/9` : "–"}
                  </span>
                </div>

                {/* Rank indicator at very bottom */}
                <div className="pixel text-[11px] font-extrabold text-ink bg-ink/5 rounded-pill px-2 py-0.5 mt-2">
                  {rank}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard CTA */}
      <div className="mb-6 mt-4">
        <PrimaryButton onClick={() => navigate("/leaderboard")} className="w-full">
          FULL LEADERBOARD
        </PrimaryButton>
      </div>
    </div>
  );
}
