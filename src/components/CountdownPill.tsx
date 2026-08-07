import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface CountdownPillProps {
  time: number; // seconds
  className?: string;
}

export function CountdownPill({ time, className }: CountdownPillProps) {
  const mins = Math.floor(Math.max(time, 0) / 60);
  const secs = Math.max(time, 0) % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;

  const isUrgent = time <= 10;

  return (
    <motion.div
      animate={isUrgent ? { opacity: [0.65, 1, 0.65] } : { opacity: 1 }}
      transition={isUrgent ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      className={cn(
        "ink rounded-pill px-4 py-2 font-display text-[14px] font-bold flex items-center justify-center gap-2 select-none shadow-ink-sm",
        isUrgent ? "bg-red text-white" : "bg-yellow text-ink",
        className
      )}
    >
      <span className="pixel text-[11px] mt-0.5 tracking-tight">{formatted}</span>
    </motion.div>
  );
}
