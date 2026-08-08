import { memo } from "react";
import { cn } from "../lib/utils";

/**
 * Faint marks scattered behind a screen's content.
 *
 * These do most of the work of making a celebration page feel occupied. A
 * short column of content centred in a phone-height cream rectangle reads as
 * empty no matter how it is spaced — the fix is something in the space, not
 * more space management.
 *
 * Deliberately cheap: static inline SVG paths at ~7% opacity, no animation,
 * no filter, nothing that costs a frame. Purely decorative, so aria-hidden.
 */

const BOLT = "M12 4 L6 15 h5 l-3 10 8-13 h-5 z";
const STAR = "M12 2 l2.6 7.4 7.4 .4 -5.8 4.8 2 7.4 -6.2-4.2 -6.2 4.2 2-7.4 -5.8-4.8 7.4-.4 z";
const PLUS = "M10 2 h4 v6 h6 v4 h-6 v6 h-4 v-6 h-6 v-4 h6 z";
const RING = "M12 3 a9 9 0 1 1 0 18 a9 9 0 1 1 0-18 z M12 8 a4 4 0 1 0 0 8 a4 4 0 1 0 0-8 z";

const MARKS = [
  { d: BOLT, x: "6%", y: "7%", s: 32, r: -14 },
  { d: BOLT, x: "85%", y: "34%", s: 26, r: 18 },
  { d: STAR, x: "88%", y: "10%", s: 24, r: 10 },
  { d: STAR, x: "4%", y: "40%", s: 19, r: -8 },
  { d: STAR, x: "70%", y: "72%", s: 16, r: 22 },
  { d: PLUS, x: "17%", y: "24%", s: 17, r: 12 },
  { d: PLUS, x: "79%", y: "19%", s: 13, r: -20 },
  { d: PLUS, x: "12%", y: "78%", s: 15, r: 6 },
  { d: RING, x: "89%", y: "58%", s: 26, r: 0 },
  { d: RING, x: "7%", y: "58%", s: 20, r: 0 },
];

function SprinklesBase({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {MARKS.map((m, i) => (
        <svg
          key={i}
          viewBox="0 0 24 26"
          width={m.s}
          height={m.s}
          className="absolute text-ink/[0.07]"
          style={{ left: m.x, top: m.y, transform: `rotate(${m.r}deg)` }}
        >
          <path d={m.d} fill="currentColor" fillRule="evenodd" />
        </svg>
      ))}
    </div>
  );
}

/** Memoised — Ten static SVGs, purely decorative. */
export const Sprinkles = memo(SprinklesBase);
