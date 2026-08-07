import { cn } from "../lib/utils";

interface ProgressDotsProps {
  total: number;
  current: number;
  /** Which steps are already solved (1-indexed). */
  solved?: number[];
}

export function ProgressDots({ total, current, solved = [] }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isSolved = solved.includes(step);
        const isCurrent = step === current;

        return (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "rounded-pill transition-all duration-200",
                isCurrent
                  ? "h-2.5 w-2.5 bg-csi-red"
                  : isSolved
                    ? "h-2 w-2 bg-success-green"
                    : "h-2 w-2 bg-light-gray"
              )}
            />
            {i < total - 1 && (
              <div
                className={cn(
                  "h-px w-3",
                  isSolved ? "bg-success-green/40" : "bg-light-gray"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
