import { motion } from "framer-motion";
import { Timer } from "lucide-react";
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

  const urgent = time <= 10;

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={
        urgent
          ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
      className={cn(
        "flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-2 text-sm text-csi-red shadow-soft",
        className
      )}
    >
      <Timer className="h-4 w-4" />
      <span className="numeral text-[15px]">{formatted}</span>
    </motion.div>
  );
}
