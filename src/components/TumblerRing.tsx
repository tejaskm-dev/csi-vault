import { memo } from "react";
import { cn } from "../lib/utils";

/**
 * The app's signature device: a combination dial hunting for its number.
 *
 * Two counter-rotating dashed rings at different rhythms — the outer one a
 * steady tick track, the inner one a few long marks that read as the dial
 * still searching. Marks whatever is currently LIVE.
 *
 * Never render more than one per screen. It points at the single most
 * important thing; two of them points at nothing.
 */
function TumblerRingBase({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-[-14px] -z-10", className)}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* outer tick track — slow, clockwise */}
        <g
          style={{
            transformOrigin: "50% 50%",
            animation: "tumble 18s linear infinite",
          }}
        >
          <circle
            cx="50" cy="50" r="47"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="1.6"
            strokeDasharray="1.5 5"
            opacity="0.4"
          />
        </g>

        {/* inner seeking marks — faster, counter-clockwise, brass */}
        <g
          style={{
            transformOrigin: "50% 50%",
            animation: "tumble 9s linear infinite reverse",
          }}
        >
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="var(--color-brass)"
            strokeWidth="2.5"
            strokeDasharray="7 26"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
      </svg>
    </div>
  );
}

/** Memoised — Decorative, never changes. */
export const TumblerRing = memo(TumblerRingBase);
