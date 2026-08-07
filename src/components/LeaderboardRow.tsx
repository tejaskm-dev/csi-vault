import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface LeaderboardRowProps {
  id: string;
  rank: number;
  name: string;
  initials: string;
  digits: number;
  isYou?: boolean;
  delta?: number;
}

function GeometricAvatar({ id, initials }: { id: string; initials: string }) {
  // Deterministic color index based on id
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = (Math.abs(hash) % 7) + 1; // 7 play colors
  const shapeType = Math.abs(hash) % 3; // 0 = chevron, 1 = dot cluster, 2 = bar

  const colors = [
    "bg-blue",
    "bg-yellow",
    "bg-green",
    "bg-purple",
    "bg-orange",
    "bg-pink",
    "bg-teal"
  ];
  const colorClass = colors[colorIndex - 1];

  return (
    <div className={cn("w-10 h-10 rounded-pill ink flex items-center justify-center select-none shrink-0", colorClass)}>
      {shapeType === 0 && (
        <svg className="w-5 h-5 text-ink stroke-[3px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
      {shapeType === 1 && (
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-pill bg-ink" />
          <div className="w-1.5 h-1.5 rounded-pill bg-ink" />
          <div className="w-1.5 h-1.5 rounded-pill bg-ink" />
        </div>
      )}
      {shapeType === 2 && (
        <div className="w-4 h-1.5 bg-ink rounded-pill" />
      )}
    </div>
  );
}

function Medal({ rank }: { rank: number }) {
  const colors = {
    1: { medal: "#FFD700", ribbon: "#E8332B" }, // Gold
    2: { medal: "#C0C0C0", ribbon: "#2B6BE4" }, // Silver
    3: { medal: "#CD7F32", ribbon: "#35C46A" }, // Bronze
  } as Record<number, { medal: string; ribbon: string }>;

  const config = colors[rank] || colors[1];

  return (
    <svg className="w-8 h-8 select-none shrink-0" viewBox="0 0 32 32">
      {/* Ribbon */}
      <path d="M10 2 L16 16 L22 2 Z" fill={config.ribbon} stroke="#14110F" strokeWidth="2.5" strokeLinejoin="round" />
      
      {/* Disc */}
      <circle cx="16" cy="20" r="9" fill={config.medal} stroke="#14110F" strokeWidth="2.5" />
      <circle cx="16" cy="20" r="5" fill="none" stroke="#14110F" strokeWidth="1.5" strokeDasharray="1.5,1.5" />
      
      {/* Rank number */}
      <text x="16" y="23.5" fontFamily="var(--font-pixel)" fontSize="8.5" fontWeight="bold" fill="#14110F" textAnchor="middle">
        {rank}
      </text>
    </svg>
  );
}

export function LeaderboardRow({ id, rank, name, initials, digits, isYou, delta }: LeaderboardRowProps) {
  const showMedal = rank <= 3;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={cn(
        "relative overflow-visible ink rounded-btn p-3 flex items-center justify-between gap-4 w-full select-none transition-transform hover:scale-[1.01] shadow-ink-sm pl-10",
        isYou
          ? "bg-yellow"
          : rank === 1
          ? "bg-[#FFF0B3]"
          : rank === 2
          ? "bg-[#E6E9F0]"
          : rank === 3
          ? "bg-[#F2DEC9]"
          : "bg-white"
      )}
    >
      {/* Rank Indicator hanging off the left edge */}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-25 flex items-center justify-center">
        {showMedal ? (
          <div className="scale-110">
            <Medal rank={rank} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-pill bg-paper-deep ink flex items-center justify-center pixel text-[11px] font-bold text-ink/75 shadow-ink-sm">
            {rank}
          </div>
        )}
      </div>

      {/* Avatar & Player Info */}
      <div className="flex items-center gap-3 grow overflow-hidden">
        <GeometricAvatar id={id} initials={initials} />
        <span className={cn(
          "font-bold text-base truncate",
          isYou ? "text-ink font-extrabold" : "text-ink/80"
        )}>
          {name}
        </span>
      </div>

      {/* Stats (Delta and Unlocks) */}
      <div className="flex items-center gap-3 shrink-0">
        {delta ? (
          <span className="ink rounded-pill bg-green text-white text-[10px] font-extrabold px-2 py-0.5">
            +{delta}
          </span>
        ) : null}
        <span className="pixel text-[11px] text-ink font-bold bg-paper-deep px-3 py-1.5 rounded-pill ink">
          {digits}/9
        </span>
      </div>
    </motion.div>
  );
}
