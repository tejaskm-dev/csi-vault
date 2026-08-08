import { useId } from "react";
import { cn } from "../lib/utils";

/**
 * A word set on an arc, with an ink outline and a solid extrusion.
 *
 * HTML cannot bend a line of text — `-webkit-text-stroke` and `text-shadow`
 * work on a straight baseline and nothing more. SVG can: a `<textPath>` runs
 * the glyphs along an arbitrary path, and because SVG text uses CSS fonts it
 * still renders in Bungee.
 *
 * Two details that matter:
 *
 *   - `paintOrder="stroke"` is required, exactly as it is for the HTML
 *     version. Without it the stroke paints over the glyph and eats the
 *     letterform from the inside out.
 *   - The extrusion is separate copies of the whole `<text>` translated down,
 *     because a textPath cannot be offset from its path. Copies are drawn
 *     back to front so the topmost is the clean one.
 *
 * The viewBox width is derived from the character count so a five-letter word
 * and an eight-letter word both fill their container instead of one of them
 * floating in the middle of an over-wide box.
 */
interface CurvedWordProps {
  children: string;
  /** How far the centre of the baseline lifts, in viewBox units. 0 is flat. */
  bow?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  /** Solid colour stepped downward behind the word. */
  extrude?: string;
  /** Deepest extrusion step — the one that reads as the shadow side. */
  extrudeDeep?: string;
  /** Number of 1-unit extrusion steps. */
  depth?: number;
  className?: string;
}

const FONT_SIZE = 100;
/** Bungee's rough advance width per character, as a fraction of the em. */
const ADVANCE = 0.74;

export function CurvedWord({
  children,
  bow = 16,
  fill,
  stroke = "#1F1F1F",
  strokeWidth = 14,
  extrude,
  extrudeDeep,
  depth = 9,
  className,
}: CurvedWordProps) {
  const id = useId().replace(/:/g, "");

  const inner = children.length * FONT_SIZE * ADVANCE;
  const pad = strokeWidth + 6;
  const w = inner + pad * 2;

  // Baseline sits low enough that ascenders plus the stroke clear the top,
  // and the box is tall enough for the bow and the extrusion.
  const baseY = FONT_SIZE + pad;
  const h = baseY + depth + pad;

  const d = `M ${pad} ${baseY} Q ${w / 2} ${baseY - bow * 2} ${w - pad} ${baseY}`;

  const text = (extra: Record<string, unknown>, key?: string | number) => (
    <text
      key={key}
      fontFamily="Bungee, system-ui, sans-serif"
      fontSize={FONT_SIZE}
      letterSpacing="1"
      {...extra}
    >
      <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
        {children}
      </textPath>
    </text>
  );

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={children}
    >
      <defs>
        <path id={id} d={d} fill="none" />
      </defs>

      {/* Extrusion, deepest first. Each step also carries the outline so the
          side of the letterform stays enclosed. */}
      {extrude &&
        Array.from({ length: depth }, (_, i) => depth - i).map((step) =>
          text(
            {
              transform: `translate(0, ${step})`,
              fill: step > depth - 3 ? (extrudeDeep ?? extrude) : extrude,
              stroke,
              strokeWidth,
              strokeLinejoin: "round",
              paintOrder: "stroke",
            },
            step
          )
        )}

      {/* The face. */}
      {text({
        fill,
        stroke,
        strokeWidth,
        strokeLinejoin: "round",
        paintOrder: "stroke",
      })}
    </svg>
  );
}
