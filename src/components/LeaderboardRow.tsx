import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { ChevronUp } from "lucide-react";
import { Medal, Avatar } from "./art/Props";
import { EASE_OUT } from "../lib/motion";

interface LeaderboardRowProps {
  id: string;
  rank: number;
  name: string;
  initials: string;
  digits: number;
  isYou?: boolean;
  delta?: number;
}

export function LeaderboardRow({
  id,
  rank,
  name,
  digits,
  isYou,
  delta = 0,
}: LeaderboardRowProps) {
  // Deterministic avatar index based on entry ID
  const avatarIndex = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.3, ease: EASE_OUT } }}
      className={cn(
        "mb-2.5 flex min-h-[68px] items-center gap-3 rounded-card px-3.5 py-3",
        isYou ? "bg-white ring-2 ring-csi-red shadow-chunk-red" : "bg-white shadow-chunk-white"
      )}
    >
      {/* Rank column: Medal badge for 1-3, plain numeral for 4+ */}
      <div className="flex w-9 shrink-0 items-center justify-center">
        {rank <= 3 ? (
          <Medal rank={rank} className="h-8 w-8" />
        ) : (
          <span className="numeral text-lg text-muted">{rank}</span>
        )}
      </div>

      {/* Avatar circle */}
      <Avatar index={avatarIndex} className="h-11 w-11 shrink-0" />

      {/* Player Name & Delta */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            "truncate font-semibold text-[16px]",
            isYou ? "text-csi-red font-bold" : "text-charcoal"
          )}
        >
          {name}
        </span>
        {delta > 0 && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex shrink-0 items-center text-info-blue"
          >
            <ChevronUp className="h-4 w-4" strokeWidth={3} />
            <span className="numeral text-xs font-bold">{delta}</span>
          </motion.span>
        )}
      </div>

      {/* Digits unlocked */}
      <span
        className={cn(
          "numeral shrink-0 text-lg",
          digits === 9
            ? "text-success-green font-black"
            : isYou
              ? "text-csi-red font-bold"
              : "text-muted"
        )}
      >
        {digits}
        <span className="text-sm text-muted">/9</span>
      </span>
    </motion.div>
  );
}
