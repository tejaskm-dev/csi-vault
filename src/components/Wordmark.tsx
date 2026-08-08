import { cn } from "../lib/utils";

/**
 * The OPERATION VAULT lockup.
 *
 * A single stacked text-shadow is a 3D-text-generator effect, not a logo. Real
 * game wordmarks are built from nested rings, back to front:
 *
 *   1. ink silhouette   a fat outer stroke, carrying the extrusion
 *   2. light ring       a thinner stroke inside it — this is the separation
 *                       that makes the letterform pop off the ground
 *   3. fill             the colour itself
 *
 * `-webkit-text-stroke` only gives you one stroke per element, so each ring is
 * its own absolutely-positioned copy of the word. `paint-order: stroke fill`
 * is required on every layer — without it the stroke paints over the glyph and
 * eats the letterform from the inside.
 *
 * Bungee is drawn tight. It needs positive tracking, never `tracking-tight`,
 * or the letters collide and the rings merge into a blob.
 */

const INK = "#1F1F1F";

interface LayeredWordProps {
  children: string;
  /** The letterform colour. */
  fill: string;
  /** The ring between fill and ink — the bit that gives separation. */
  ring?: string;
  /** Solid extrusion colour, or none for a flat word. */
  extrude?: string;
  extrudeDeep?: string;
  /** Outer ink stroke width in px. */
  weight?: number;
  className?: string;
}

export function LayeredWord({
  children,
  fill,
  ring = "#FFFFFF",
  extrude,
  extrudeDeep,
  weight = 10,
  className,
}: LayeredWordProps) {
  const depth = extrude
    ? {
        textShadow: [
          `0 3px 0 ${extrude}`,
          `0 6px 0 ${extrude}`,
          `0 9px 0 ${extrudeDeep ?? extrude}`,
          `0 11px 0 ${INK}`,
        ].join(", "),
      }
    : undefined;

  return (
    <span className={cn("relative inline-block whitespace-nowrap", className)}>
      {/* 1 — ink silhouette, carrying the extrusion */}
      <span
        aria-hidden
        className="absolute left-0 top-0 select-none"
        style={{
          WebkitTextStroke: `${weight}px ${INK}`,
          paintOrder: "stroke fill",
          color: INK,
          ...depth,
        }}
      >
        {children}
      </span>

      {/* 2 — light ring, the separation layer */}
      <span
        aria-hidden
        className="absolute left-0 top-0 select-none"
        style={{
          WebkitTextStroke: `${weight * 0.5}px ${ring}`,
          paintOrder: "stroke fill",
          color: ring,
        }}
      >
        {children}
      </span>

      {/* 3 — the fill, and the layer that actually occupies layout */}
      <span className="relative select-none" style={{ color: fill }}>
        {children}
      </span>
    </span>
  );
}

interface WordmarkProps {
  /** "stacked" for Splash/Home heroes, "inline" for compact headers. */
  size?: "hero" | "compact";
  className?: string;
}

export function Wordmark({ size = "hero", className }: WordmarkProps) {
  const hero = size === "hero";

  return (
    <div className={cn("flex flex-col items-start", className)}>
      {/* OPERATION — ink on a white ring. The inverse of VAULT, so the two
          words read as a pair rather than one long red block. */}
      <LayeredWord
        fill={INK}
        ring="#FFFFFF"
        weight={hero ? 7 : 5}
        className={cn(
          "font-display uppercase leading-none",
          hero ? "text-[26px] tracking-[0.18em]" : "text-[15px] tracking-[0.2em]"
        )}
      >
        OPERATION
      </LayeredWord>

      {/* VAULT — red on a white ring, ink silhouette, red extrusion. */}
      <LayeredWord
        fill="#E53935"
        ring="#FFFFFF"
        extrude="#A82A27"
        extrudeDeep="#7C1F1C"
        weight={hero ? 12 : 8}
        className={cn(
          "font-display uppercase leading-[0.85]",
          hero ? "mt-2 text-[68px] tracking-[0.02em]" : "mt-1 text-[34px] tracking-[0.03em]"
        )}
      >
        VAULT
      </LayeredWord>
    </div>
  );
}
