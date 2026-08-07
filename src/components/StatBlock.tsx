import { cn } from "../lib/utils";

interface StatBlockProps {
  number: string | number;
  label: string;
  tone?: "light" | "dark";
  className?: string;
}

export function StatBlock({ number, label, tone = "light", className }: StatBlockProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "ink rounded-card p-4 flex flex-col items-center justify-center text-center select-none shadow-ink transition-transform hover:scale-102",
        isDark ? "bg-ink text-white" : "bg-white text-ink",
        className
      )}
    >
      <span className="pixel text-[16px] md:text-[20px] font-bold tracking-tight mb-2">
        {number}
      </span>
      <span className={cn(
        "font-bold text-[11px] uppercase tracking-[0.15em]",
        isDark ? "text-paper-deep" : "text-ink/60"
      )}>
        {label}
      </span>
    </div>
  );
}
