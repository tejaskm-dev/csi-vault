import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

/**
 * The frame every screen shares.
 *
 * A coloured plate with rounded BOTTOM corners, not a flat bar welded to the
 * top edge — that curve is the mockup's signature.
 *
 * Three things make it read as an object rather than a coloured rectangle:
 *
 *   1. The outline runs all the way around. `border-b-3` alone mitres to
 *      nothing at a rounded corner, so the stroke tapered into a wedge and the
 *      curve never resolved. The sides are stroked too; only the top is bare,
 *      because it is off-screen.
 *   2. The depth step under the title is INK, not the band's own -deep. A dark
 *      red step on red is too low-contrast to read as depth — it just looks
 *      like the text is blurred.
 *   3. Diagonal hatching fills the right side. A title sitting alone in the
 *      left third of a tall coloured slab is the thing that reads as unfinished;
 *      the hatch is the cheapest way to make the plate feel occupied without
 *      inventing content for it.
 *
 * `tone` is the only thing that varies: red is the default, brass marks the
 * bonus round, and that difference is how the two are told apart at a glance.
 */
export type HeaderTone = "red" | "brass" | "green" | "ink";

const TONES: Record<HeaderTone, string> = {
  red: "bg-red text-white",
  brass: "bg-brass text-ink",
  green: "bg-green text-ink",
  ink: "bg-ink text-white",
};

/** A hard step under the title. Ink on every tone — see note 2 above. */
const TITLE_DEPTH: Record<HeaderTone, string> = {
  red: "0 3px 0 var(--color-ink)",
  brass: "0 3px 0 var(--color-ink)",
  green: "0 3px 0 var(--color-ink)",
  ink: "0 3px 0 #000000",
};

/** Hatching reads as light on dark tones and as shadow on light ones. */
const HATCH: Record<HeaderTone, string> = {
  red: "rgba(255,255,255,0.16)",
  brass: "rgba(31,31,31,0.13)",
  green: "rgba(31,31,31,0.13)",
  ink: "rgba(255,255,255,0.10)",
};

const EYEBROW: Record<HeaderTone, string> = {
  red: "bg-red-deep text-white/90 border-white/35",
  brass: "bg-brass-deep text-white border-ink/30",
  green: "bg-green-deep text-white border-ink/30",
  ink: "bg-white/15 text-white/90 border-white/30",
};

interface ScreenHeaderProps {
  title?: React.ReactNode;
  /** Small line above the title. */
  eyebrow?: string;
  tone?: HeaderTone;
  /** Shows a back button. `true` goes back one, a string navigates there. */
  back?: boolean | string;
  /** Right-hand slot — counts, timers, toggles. */
  right?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({
  title,
  eyebrow,
  tone = "red",
  back,
  right,
  className,
}: ScreenHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "relative z-20 shrink-0 overflow-hidden",
        // the outline, on every edge that is actually visible
        "border-x-3 border-b-3 border-ink",
        "rounded-b-[28px]",
        TONES[tone],
        className
      )}
    >
      {/* Hatching, fading in from the right so it never crowds the title. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${HATCH[tone]} 0 7px, transparent 7px 18px)`,
          maskImage: "linear-gradient(to right, transparent, black 85%)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 85%)",
        }}
      />

      {/* Rivets at the BOTTOM corners, inside the curve, where they read as
          fixings holding the plate down. At the top they collided with the
          back button and looked like dirt on the screen. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 left-3.5 h-1.5 w-1.5 rounded-pill bg-ink opacity-30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 right-3.5 h-1.5 w-1.5 rounded-pill bg-ink opacity-30"
      />

      <div className="relative flex items-center gap-3 px-4 pb-5 pt-3">
        {/* Deliberately NOT a Pressable. Pressable carries `ink` (a 3px border)
            and `tap` (a 56px minimum) on the button element itself, so putting
            a chip inside one produced a ring around a ring — two nested
            buttons. Here the <button> is a bare 56px hit area and the chip is
            the only thing with a shape. The press is CSS, not Framer: Framer
            writes an inline transform that silently beats active:translate-y. */}
        {back && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              playTap();
              typeof back === "string" ? navigate(back) : navigate(-1);
            }}
            className="group -ml-1.5 flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center bg-transparent"
          >
            <span className="ink flex h-11 w-11 items-center justify-center rounded-btn bg-white text-ink shadow-[0_3px_0_0_var(--color-ink)] transition-[transform,box-shadow] duration-75 group-active:translate-y-[3px] group-active:shadow-none">
              <ArrowLeft className="h-5 w-5" strokeWidth={3.25} />
            </span>
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          {eyebrow && (
            <span
              className={cn(
                "rounded-pill border px-2 py-[3px] font-body text-[9px] font-bold uppercase leading-none tracking-[0.18em]",
                EYEBROW[tone]
              )}
            >
              {eyebrow}
            </span>
          )}
          {title && (
            <span
              className="max-w-full truncate font-display text-[26px] uppercase leading-none tracking-[0.01em]"
              style={{ textShadow: TITLE_DEPTH[tone] }}
            >
              {title}
            </span>
          )}
        </div>

        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
