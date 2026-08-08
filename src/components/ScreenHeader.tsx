import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Pressable } from "./Pressable";
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

const CHIP: Record<HeaderTone, string> = {
  red: "bg-red-deep text-white border-white",
  brass: "bg-paper-deep text-ink border-ink",
  green: "bg-green-deep text-white border-white",
  ink: "bg-white/15 text-white border-white",
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
        {back && (
          <Pressable
            icon
            aria-label="Back"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className={cn("h-11 w-11 shrink-0 rounded-btn border-2", CHIP[tone])}
          >
            <ArrowLeft className="h-5 w-5" />
          </Pressable>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {eyebrow && (
            <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
              {eyebrow}
            </span>
          )}
          {title && (
            <span className="truncate font-display text-[19px] uppercase leading-none tracking-wide">
              {title}
            </span>
          )}
        </div>

        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
