import { cn } from "../lib/utils";

interface ProgressDotsProps {
  total: number;
  current: number;
  solved?: number[];
  className?: string;
}

export function ProgressDots({ total, current, solved = [], className }: ProgressDotsProps) {
  return (
    <div
      className={cn(
        "ink rounded-pill p-2 bg-paper-deep flex items-center justify-center gap-2 select-none shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isSolved = solved.includes(step);
        const isCurrent = step === current;

        return (
          <span
            key={step}
            className={cn(
              // transform + colour only. `transition-all` also watched the
              // box-shadow that the current dot toggles, which repaints.
              "w-4 h-4 rounded-pill ink inline-block transition-[transform,background-color] duration-300",
              isSolved
                ? "bg-green"
                : isCurrent
                ? "bg-yellow scale-125 shadow-ink-sm"
                : "bg-white"
            )}
            title={`Step ${step}: ${isSolved ? "solved" : isCurrent ? "current" : "todo"}`}
          />
        );
      })}
    </div>
  );
}
