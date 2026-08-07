import { cn } from "../lib/utils";

/**
 * A draughtsman's callout on the blueprint layer — a leader line ending in a
 * small circled note. Pure decoration, and that is the point: both reference
 * projects carry non-content marks, and they are a large part of why those
 * screens read as designed rather than assembled.
 *
 * Lives on the paper layer, so it wears the #plot wobble filter.
 */
interface AnnotationProps {
  label: string;
  /** Which way the leader line runs from the label. */
  direction?: "left" | "right";
  className?: string;
}

export function Annotation({ label, direction = "right", className }: AnnotationProps) {
  const flip = direction === "left";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex select-none items-center gap-1.5",
        flip && "flex-row-reverse",
        className
      )}
      style={{ filter: "url(#plot)" }}
    >
      <span className="font-readout text-[9px] uppercase tracking-[0.14em] text-plot">
        {label}
      </span>

      <svg width="46" height="10" viewBox="0 0 46 10" className="shrink-0 overflow-visible">
        <path
          d={flip ? "M46 5 H10" : "M0 5 H36"}
          stroke="var(--color-plot)"
          strokeWidth="1.4"
          strokeDasharray="3 3"
          fill="none"
        />
        <circle
          cx={flip ? 6 : 40}
          cy="5"
          r="3.4"
          fill="none"
          stroke="var(--color-plot)"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}
