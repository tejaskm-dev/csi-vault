import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

/**
 * The frame every screen shares.
 *
 * A coloured panel with rounded BOTTOM corners, not a flat bar welded to the
 * top edge — that curve is the mockup's signature and it appeared nowhere in
 * the app (`rounded-b-*` had zero occurrences). It also gives every screen a
 * filled colour surface, which the audit showed most screens lacked entirely.
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

/** A hard downward step under the title, in the band's own dark tone, so the
 *  words sit ON the panel instead of being painted onto it. */
const TITLE_DEPTH: Record<HeaderTone, string> = {
  red: "0 3px 0 var(--color-red-deep)",
  brass: "0 3px 0 var(--color-brass-deep)",
  green: "0 3px 0 var(--color-green-deep)",
  ink: "0 3px 0 #000000",
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
        "riveted relative z-20 shrink-0 border-b-3 border-ink",
        // the curve
        "rounded-b-[26px]",
        TONES[tone],
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-3.5 pt-3">
        {/* Deliberately NOT a Pressable. Pressable carries `ink` (a 3px border)
            and `tap` (a 56px minimum) on the button itself, so wrapping a chip
            inside one produced a ring around a ring — two nested buttons.
            Here the <button> is a bare 56px hit area and the chip is the only
            thing with a shape. The press is CSS, not Framer: Framer writes an
            inline transform that would silently beat `active:translate-y`. */}
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
            <span className="ink flex h-12 w-12 items-center justify-center rounded-btn bg-white text-ink shadow-[0_4px_0_0_var(--color-ink)] transition-[transform,box-shadow] duration-75 group-active:translate-y-1 group-active:shadow-none">
              <ArrowLeft className="h-6 w-6" strokeWidth={3.25} />
            </span>
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {eyebrow && (
            <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
              {eyebrow}
            </span>
          )}
          {title && (
            <span
              className="truncate font-display text-[19px] uppercase leading-none tracking-wide"
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
