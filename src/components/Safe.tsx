import { cn } from "../lib/utils";

/**
 * The safe. This is the game board, so it's built in code rather than shipped
 * as 19 exported PNGs — one component covers nine colours × three states, and
 * the colour/state matrix stays free forever.
 *
 * Shading is deliberate: a lighter top edge and a darker lower band, so it
 * reads as a moulded object next to hand-illustrated assets rather than a flat
 * vector sticker sitting beside them.
 */

export type SafeState = "available" | "solved" | "locked";

interface Shades {
  base: string;
  deep: string;
  light: string;
}

/** Nine positions, nine colours — drawn from the asset-sheet palette. */
export const SAFE_SHADES: Shades[] = [
  { base: "#2ECC71", deep: "#1E8E4E", light: "#63E39D" }, // 1 green
  { base: "#4CAF50", deep: "#357A38", light: "#7FC982" }, // 2 olive
  { base: "#6C5CE7", deep: "#4A3FA8", light: "#9B8FF0" }, // 3 purple
  { base: "#FFB02E", deep: "#C47D0C", light: "#FFCA69" }, // 4 orange
  { base: "#3498DB", deep: "#21688F", light: "#6DB9E8" }, // 5 blue
  { base: "#D9CBB0", deep: "#A89676", light: "#EFE5D2" }, // 6 sand
  { base: "#5A5A5A", deep: "#333333", light: "#8C8C8C" }, // 7 slate
  { base: "#E53935", deep: "#9E2420", light: "#F27672" }, // 8 red
  { base: "#00B894", deep: "#008066", light: "#52D7BE" }, // 9 teal
];

const LOCKED: Shades = { base: "#C9C4B8", deep: "#9E9A90", light: "#E4E0D6" };

const INK = "#1F1F1F";
const CREAM = "#F5F2E8";

interface SafeProps {
  digit: number;
  state?: SafeState;
  className?: string;
}

/** The dial: outer ring, dark face, four spokes, pale centre cap. */
function Dial({ x, y, r, muted }: { x: number; y: number; r: number; muted?: boolean }) {
  const face = muted ? "#6E6A62" : "#2B2B2B";
  const rim = muted ? "#8A857C" : "#4A4A4A";
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={rim} stroke={INK} strokeWidth="3" />
      <circle cx={x} cy={y} r={r * 0.74} fill={face} stroke={INK} strokeWidth="2" />
      {/* spokes */}
      <g stroke={CREAM} strokeWidth="3.2" strokeLinecap="round" opacity={muted ? 0.45 : 0.9}>
        <line x1={x} y1={y - r * 0.62} x2={x} y2={y + r * 0.62} />
        <line x1={x - r * 0.62} y1={y} x2={x + r * 0.62} y2={y} />
      </g>
      <circle cx={x} cy={y} r={r * 0.2} fill={CREAM} stroke={INK} strokeWidth="1.6" />
      {/* one highlight glint, upper-left */}
      <circle cx={x - r * 0.42} cy={y - r * 0.42} r={r * 0.13} fill="#FFFFFF" opacity="0.35" />
    </g>
  );
}

function Bolts({ inset, muted }: { inset: number; muted?: boolean }) {
  const pts = [
    [inset, inset],
    [100 - inset, inset],
    [inset, 100 - inset],
    [100 - inset, 100 - inset],
  ];
  return (
    <g>
      {pts.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.6"
          fill={muted ? "#B0ABA0" : "#00000033"}
          stroke={INK}
          strokeWidth="1.4"
        />
      ))}
    </g>
  );
}

export function Safe({ digit, state = "available", className }: SafeProps) {
  const solved = state === "solved";
  const locked = state === "locked";
  const s = locked ? LOCKED : SAFE_SHADES[(digit - 1) % 9];

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Safe ${digit}, ${state}`}
    >
      {/* hinges on the right edge, behind the body */}
      <g>
        <rect x="88" y="24" width="8" height="12" rx="3" fill={s.deep} stroke={INK} strokeWidth="2.5" />
        <rect x="88" y="64" width="8" height="12" rx="3" fill={s.deep} stroke={INK} strokeWidth="2.5" />
      </g>

      {/* ---- body ---- */}
      <rect x="6" y="6" width="86" height="88" rx="13" fill={s.base} stroke={INK} strokeWidth="4" />
      {/* lower band — the moulded shadow that stops it reading flat */}
      <path
        d="M6 64 h86 v17 a13 13 0 0 1 -13 13 H19 A13 13 0 0 1 6 81 Z"
        fill={s.deep}
        opacity="0.55"
      />
      {/* top light catch */}
      <path
        d="M19 6 h60 a13 13 0 0 1 13 13 v4 H6 v-4 A13 13 0 0 1 19 6 Z"
        fill={s.light}
        opacity="0.55"
      />
      <rect x="6" y="6" width="86" height="88" rx="13" fill="none" stroke={INK} strokeWidth="4" />

      {solved ? (
        /* ---- solved: door swung open, dark cavity revealed ---- */
        <>
          <rect x="18" y="18" width="64" height="64" rx="8" fill="#241F1B" stroke={INK} strokeWidth="3" />
          {/* interior back wall catches a little light */}
          <rect x="24" y="24" width="52" height="52" rx="5" fill="#332C26" />
          {/* the door itself, foreshortened against the left jamb */}
          <g>
            <path
              d="M18 18 h16 a4 4 0 0 1 4 4 v56 a4 4 0 0 1 -4 4 H18 Z"
              fill={s.base}
              stroke={INK}
              strokeWidth="3.5"
            />
            <path d="M18 60 h20 v18 a4 4 0 0 1 -4 4 H18 Z" fill={s.deep} opacity="0.5" />
            <Dial x={29} y={50} r={9} />
          </g>
        </>
      ) : (
        /* ---- available / locked: closed door ---- */
        <>
          <rect
            x="17"
            y="17"
            width="66"
            height="66"
            rx="9"
            fill={s.deep}
            opacity="0.32"
            stroke={INK}
            strokeWidth="3"
          />
          <Bolts inset={26} muted={locked} />
          <Dial x={50} y={52} r={17} muted={locked} />
        </>
      )}

      {/* ---- number badge, top-left, overhanging the panel ---- */}
      <g>
        <rect x="13" y="9" width="21" height="16" rx="5" fill={CREAM} stroke={INK} strokeWidth="3" />
        <text
          x="23.5"
          y="17.6"
          textAnchor="middle"
          dominantBaseline="central"
          fill={INK}
          fontSize="11"
          fontWeight="800"
          fontFamily="var(--font-display), system-ui, sans-serif"
        >
          {digit}
        </text>
      </g>
    </svg>
  );
}
