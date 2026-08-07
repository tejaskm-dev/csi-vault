import { cn } from "../lib/utils";

interface StatBlockProps {
  number: string | number;
  label: string;
  /** "dark" for the charcoal Vault Complete screen. */
  tone?: "light" | "dark";
  className?: string;
}

export function StatBlock({ number, label, tone = "light", className }: StatBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card px-4 py-6",
        tone === "dark" ? "bg-white/8" : "bg-white shadow-soft",
        className
      )}
    >
      <span
        className={cn(
          "numeral mb-1 text-4xl leading-none",
          tone === "dark" ? "text-reward-yellow" : "text-csi-red"
        )}
      >
        {number}
      </span>
      <span
        className={cn(
          "text-center text-xs font-semibold uppercase tracking-wider",
          tone === "dark" ? "text-white/55" : "text-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
}
