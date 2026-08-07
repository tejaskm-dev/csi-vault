import { cn } from "../lib/utils";

/**
 * Geometric props, built in code at the same detail density as the Safe.
 *
 * The construction that makes the Safe read as an object rather than a shape:
 *   - a base fill, then a discrete LIGHT zone and a discrete DARK zone
 *   - a recessed or raised secondary surface (bezel, panel, band)
 *   - small repeated hardware (bolts, ribs, ticks, notches)
 *   - one specular glint, always upper-left
 *   - thick ink outline over all of it
 *
 * Anything with fewer than ~15 elements reads flat. That was the problem with
 * the first pass — 7 elements each against the Safe's 23.
 */

const INK = "#1F1F1F";

const GOLD = "#FFB02E";
const GOLD_LIGHT = "#FFD888";
const GOLD_MID = "#E89A18";
const GOLD_DEEP = "#B8760A";
const WOOD = "#8A5F3C";
const WOOD_DEEP = "#4E3320";
const PURPLE = "#6C5CE7";
const PURPLE_LIGHT = "#9D91F2";
const PURPLE_MID = "#5A4BD1";
const PURPLE_DEEP = "#41368F";
const GREY = "#A8A8A8";
const GREY_LIGHT = "#D2D2D2";
const GREY_DEEP = "#6E6E6E";
const GREY_DARK = "#4A4A4A";
const RED = "#E53935";
const RED_DEEP = "#A82A27";
const CREAM = "#F5F2E8";
const WHITE = "#FFFFFF";
const SILVER = "#C9CBCE";
const BRONZE = "#C87F45";

interface PropProps {
  className?: string;
}

function Frame({
  children,
  className,
  label,
}: PropProps & { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/* ================================================================
   TROPHY
   ================================================================ */
export function Trophy({ className }: PropProps) {
  return (
    <Frame className={className} label="Trophy">
      {/* handles — ink core then gold, with an inner hollow */}
      <path d="M29 27 q-17 2 -17 16 q0 14 17 15" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M71 27 q17 2 17 16 q0 14 -17 15" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M29 27 q-17 2 -17 16 q0 14 17 15" fill="none" stroke={GOLD} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M71 27 q17 2 17 16 q0 14 -17 15" fill="none" stroke={GOLD_DEEP} strokeWidth="5.5" strokeLinecap="round" />

      {/* base — two tiers */}
      <path d="M28 87 h44 a3 3 0 0 1 3 3 v3 a2 2 0 0 1 -2 2 H27 a2 2 0 0 1 -2 -2 v-3 a3 3 0 0 1 3 -3 z"
        fill={WOOD_DEEP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M36 77 h28 l4 10 H32 z" fill={WOOD} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M36 77 h9 l-5 10 H32 z" fill="#A87B52" opacity="0.7" />
      {/* gold band on the plinth */}
      <rect x="38" y="80" width="24" height="3.5" rx="1.75" fill={GOLD} stroke={INK} strokeWidth="1.6" />

      {/* stem + collar */}
      <rect x="45" y="62" width="10" height="16" fill={GOLD_MID} stroke={INK} strokeWidth="3.5" />
      <rect x="41" y="59" width="18" height="6" rx="3" fill={GOLD} stroke={INK} strokeWidth="3.5" />

      {/* cup */}
      <path d="M27 18 h46 v14 q0 21 -23 30 q-23 -9 -23 -30 z"
        fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* engraved band */}
      <path d="M29 34 q21 6 42 0 v5 q-21 6 -42 0 z" fill={GOLD_MID} opacity="0.85" />
      {/* star emblem */}
      <path d="M50 42 l2.6 5.4 5.9 .8 -4.3 4.1 1.1 5.9 -5.3 -2.8 -5.3 2.8 1.1 -5.9 -4.3 -4.1 5.9 -.8 z"
        fill={GOLD_LIGHT} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* rim lip */}
      <rect x="24" y="13" width="52" height="9" rx="4.5" fill={GOLD_LIGHT} stroke={INK} strokeWidth="3.5" />
      <rect x="27" y="15.5" width="20" height="2.6" rx="1.3" fill={WHITE} opacity="0.5" />
      {/* light zone */}
      <path d="M32 24 h8 v10 q0 14 7 23 q-13 -10 -15 -24 z" fill={GOLD_LIGHT} opacity="0.7" />
      {/* dark zone */}
      <path d="M64 24 h6 v9 q0 17 -14 27 q10 -14 8 -25 z" fill={GOLD_DEEP} opacity="0.45" />
    </Frame>
  );
}

/* ================================================================
   GIFT BOX — rebuilt from the reference: 3/4 view, purple ribbon,
   big floppy bow. The first version was flat-on with a gold ribbon.
   ================================================================ */
export function GiftBox({ className }: PropProps) {
  return (
    <Frame className={className} label="Gift box">
      {/* ---- box: three faces ---- */}
      {/* right face */}
      <path d="M66 50 L84 40 L84 78 L66 88 Z" fill={PURPLE_DEEP} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* front face */}
      <path d="M20 50 H66 V88 H20 Z" fill={PURPLE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* top face */}
      <path d="M20 50 L38 40 L84 40 L66 50 Z" fill={PURPLE_LIGHT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />

      {/* surface speckle, so the faces aren't dead flat */}
      <g fill={WHITE} opacity="0.14">
        <circle cx="29" cy="62" r="1.6" /><circle cx="57" cy="70" r="1.3" />
        <circle cx="35" cy="80" r="1.2" /><circle cx="61" cy="57" r="1.1" />
        <circle cx="75" cy="60" r="1.3" /><circle cx="46" cy="46" r="1.2" />
      </g>

      {/* ---- ribbon: front band, top band, side band ---- */}
      <rect x="37" y="50" width="13" height="38" fill={PURPLE_MID} stroke={INK} strokeWidth="3" />
      <path d="M37 50 L55 40 L68 40 L50 50 Z" fill={PURPLE_MID} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M66 62 L84 52 L84 61 L66 71 Z" fill={PURPLE_MID} opacity="0.9" stroke={INK} strokeWidth="2.5" />
      <rect x="20" y="62" width="46" height="9" fill={PURPLE_MID} stroke={INK} strokeWidth="3" />
      {/* ribbon light edge */}
      <rect x="39" y="52" width="3" height="34" fill={WHITE} opacity="0.22" />

      {/* ---- bow: two loops, knot, two tails ---- */}
      {/* tails first, behind */}
      <path d="M56 32 q-6 8 -14 10 q6 3 10 -1 z" fill={PURPLE_MID} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M58 32 q7 7 15 8 q-6 4 -11 0 z" fill={PURPLE_DEEP} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* left loop */}
      <path d="M56 30 q-20 -14 -25 -4 q-4 9 8 10 q9 1 17 -6 z"
        fill={PURPLE_LIGHT} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M44 27 q-8 -3 -11 1 q-2 4 4 5 q-2 -4 7 -6 z" fill={PURPLE_DEEP} opacity="0.35" />
      {/* right loop */}
      <path d="M58 30 q20 -14 25 -4 q4 9 -8 10 q-9 1 -17 -6 z"
        fill={PURPLE} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M70 27 q8 -3 11 1 q2 4 -4 5 q2 -4 -7 -6 z" fill={PURPLE_DEEP} opacity="0.4" />
      {/* knot */}
      <ellipse cx="57" cy="32" rx="7.5" ry="6" fill={PURPLE_MID} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="54.5" cy="30" rx="2.6" ry="2" fill={WHITE} opacity="0.35" />
    </Frame>
  );
}

/* ================================================================
   KEY
   ================================================================ */
export function Key({ className }: PropProps) {
  return (
    <Frame className={className} label="Key">
      {/* bow: outer ring, bevel, hole */}
      <circle cx="50" cy="26" r="19" fill={GOLD} stroke={INK} strokeWidth="4.5" />
      <circle cx="50" cy="26" r="13.5" fill={GOLD_MID} stroke={INK} strokeWidth="2.4" />
      <circle cx="50" cy="26" r="7.5" fill={CREAM} stroke={INK} strokeWidth="3.6" />
      {/* four decorative notches around the bow */}
      <g fill={GOLD_DEEP} stroke={INK} strokeWidth="2">
        <circle cx="50" cy="7.5" r="3.4" /><circle cx="68.5" cy="26" r="3.4" />
        <circle cx="31.5" cy="26" r="3.4" />
      </g>
      {/* ring highlight */}
      <path d="M36 16 a19 19 0 0 1 12 -8 v5.5 a13.5 13.5 0 0 0 -8 5.4 z" fill={GOLD_LIGHT} opacity="0.85" />

      {/* collar */}
      <rect x="40" y="42" width="20" height="7" rx="3.5" fill={GOLD_LIGHT} stroke={INK} strokeWidth="3.4" />

      {/* shaft with centre groove */}
      <rect x="43" y="47" width="14" height="42" rx="4" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="45.5" y="51" width="3" height="34" rx="1.5" fill={GOLD_LIGHT} opacity="0.7" />
      <rect x="53" y="51" width="3" height="34" rx="1.5" fill={GOLD_DEEP} opacity="0.55" />

      {/* teeth — stepped */}
      <path d="M57 60 h15 v7 h-7 v5 h-8 z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M57 77 h10 v6 h-4 v5 h-6 z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="58" y="62" width="9" height="2.4" fill={GOLD_LIGHT} opacity="0.6" />
    </Frame>
  );
}

/* ================================================================
   STOPWATCH
   ================================================================ */
export function Stopwatch({ className }: PropProps) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * (Math.PI / 180);
    const long = i % 3 === 0;
    const r1 = long ? 20 : 22.5;
    const r2 = 25.5;
    return {
      x1: 50 + Math.cos(a) * r1, y1: 58 + Math.sin(a) * r1,
      x2: 50 + Math.cos(a) * r2, y2: 58 + Math.sin(a) * r2,
      w: long ? 3.2 : 1.9,
    };
  });

  return (
    <Frame className={className} label="Stopwatch">
      {/* crown with ribs */}
      <rect x="42" y="4" width="16" height="12" rx="3" fill={GREY_DARK} stroke={INK} strokeWidth="3.5" />
      <g stroke={INK} strokeWidth="1.5" opacity="0.7">
        <line x1="46" y1="6" x2="46" y2="14" /><line x1="50" y1="6" x2="50" y2="14" />
        <line x1="54" y1="6" x2="54" y2="14" />
      </g>
      {/* side button */}
      <rect x="16" y="19" width="11" height="8" rx="3" fill={GREY_DARK} stroke={INK} strokeWidth="3"
        transform="rotate(-40 21.5 23)" />
      {/* lugs */}
      <rect x="44" y="14" width="12" height="8" rx="2" fill={GREY_DEEP} stroke={INK} strokeWidth="3" />

      {/* case */}
      <circle cx="50" cy="58" r="37" fill={GREY} stroke={INK} strokeWidth="4.5" />
      <path d="M21 34 a37 37 0 0 1 23 -12 v7 a30 30 0 0 0 -18 10 z" fill={GREY_LIGHT} opacity="0.9" />
      <path d="M79 82 a37 37 0 0 1 -23 12 v-7 a30 30 0 0 0 18 -10 z" fill={GREY_DEEP} opacity="0.5" />
      {/* bezel */}
      <circle cx="50" cy="58" r="30" fill={GREY_LIGHT} stroke={INK} strokeWidth="3" />
      {/* face */}
      <circle cx="50" cy="58" r="26" fill={CREAM} stroke={INK} strokeWidth="3" />

      {/* elapsed wedge */}
      <path d="M50 58 L50 32 A26 26 0 0 1 72 71 Z" fill={RED} opacity="0.9" />
      <path d="M50 58 L50 32 A26 26 0 0 1 63 36 Z" fill={RED_DEEP} opacity="0.45" />

      {/* ticks */}
      <g stroke={INK} strokeLinecap="round">
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.w} />
        ))}
      </g>

      {/* sub-dial */}
      <circle cx="50" cy="72" r="6" fill={GREY_LIGHT} stroke={INK} strokeWidth="2" />
      <line x1="50" y1="72" x2="53" y2="69" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />

      {/* hands */}
      <line x1="50" y1="58" x2="50" y2="38" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
      <line x1="50" y1="58" x2="65" y2="67" stroke={RED_DEEP} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="50" cy="58" r="4.6" fill={INK} />
      <circle cx="50" cy="58" r="1.8" fill={CREAM} />

      {/* glass glint */}
      <path d="M33 44 a26 26 0 0 1 13 -9 q-11 8 -9 20 z" fill={WHITE} opacity="0.4" />
    </Frame>
  );
}

/* ================================================================
   HINT BULB
   ================================================================ */
export function HintBulb({ className }: PropProps) {
  const rays = [
    [50, 2, 50, 11], [22, 11, 28, 19], [78, 11, 72, 19],
    [8, 38, 17, 38], [92, 38, 83, 38], [12, 62, 20, 58], [88, 62, 80, 58],
  ];
  return (
    <Frame className={className} label="Hint">
      {/* glow */}
      <circle cx="50" cy="42" r="30" fill={GOLD} opacity="0.16" />
      {/* rays */}
      <g stroke={GOLD} strokeWidth="5" strokeLinecap="round">
        {rays.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      {/* glass */}
      <path d="M50 16 a25 25 0 0 1 16 44 v5 H34 v-5 a25 25 0 0 1 16 -44 z"
        fill={GOLD} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {/* dark right side */}
      <path d="M60 22 a25 25 0 0 1 6 38 v5 h-8 v-5 a30 30 0 0 0 2 -38 z" fill={GOLD_DEEP} opacity="0.35" />
      {/* big specular */}
      <path d="M39 30 a16 16 0 0 1 10 -8 v7 a10 10 0 0 0 -5 5 z" fill={WHITE} opacity="0.6" />
      <circle cx="41" cy="44" r="2.6" fill={WHITE} opacity="0.4" />

      {/* filament with support wires */}
      <path d="M42 56 v-7 a8 8 0 0 1 16 0 v7" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M46 49 q2 -4 4 0 q2 4 4 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />

      {/* screw base — three ribs and a tip */}
      <rect x="37" y="65" width="26" height="6.5" rx="2.5" fill={GREY_DEEP} stroke={INK} strokeWidth="3.2" />
      <rect x="37" y="72.5" width="26" height="6.5" rx="2.5" fill={GREY_DARK} stroke={INK} strokeWidth="3.2" />
      <rect x="38.5" y="80" width="23" height="6" rx="2.5" fill={GREY_DEEP} stroke={INK} strokeWidth="3.2" />
      <path d="M42 86 h16 l-3 8 H45 z" fill={GREY_DARK} stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
      <rect x="39" y="66.5" width="4" height="3" fill={WHITE} opacity="0.3" />
    </Frame>
  );
}

/* ================================================================
   PADLOCK
   ================================================================ */
export function Padlock({ className, open = false }: PropProps & { open?: boolean }) {
  return (
    <Frame className={className} label={open ? "Unlocked" : "Locked"}>
      <path
        d={open ? "M31 47 V29 a18 18 0 0 1 33 -7" : "M31 47 V29 a19 19 0 0 1 38 0 v18"}
        fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round"
      />
      <path
        d={open ? "M31 47 V29 a18 18 0 0 1 33 -7" : "M31 47 V29 a19 19 0 0 1 38 0 v18"}
        fill="none" stroke={GREY_LIGHT} strokeWidth="4" strokeLinecap="round"
      />

      <rect x="19" y="45" width="62" height="47" rx="9" fill={GOLD} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M62 45 h10 a9 9 0 0 1 9 9 v29 a9 9 0 0 1 -9 9 h-10 z" fill={GOLD_DEEP} opacity="0.4" />
      <path d="M28 45 h8 v47 h-8 a9 9 0 0 1 -9 -9 v-29 a9 9 0 0 1 9 -9 z" fill={GOLD_LIGHT} opacity="0.5" />
      {/* bolts */}
      <g fill={GOLD_DEEP} stroke={INK} strokeWidth="1.6">
        <circle cx="26" cy="52" r="2.2" /><circle cx="74" cy="52" r="2.2" />
        <circle cx="26" cy="85" r="2.2" /><circle cx="74" cy="85" r="2.2" />
      </g>
      {/* keyhole */}
      <circle cx="50" cy="64" r="7.5" fill={INK} />
      <path d="M46.5 70 h7 l2.5 13 H44 z" fill={INK} />
      <circle cx="47.6" cy="61.6" r="2" fill={CREAM} opacity="0.35" />
    </Frame>
  );
}

/* ================================================================
   MEDALS
   ================================================================ */
export function Medal({ rank, className }: PropProps & { rank: 1 | 2 | 3 }) {
  const face = rank === 1 ? GOLD : rank === 2 ? SILVER : BRONZE;
  const deep = rank === 1 ? GOLD_DEEP : rank === 2 ? "#8E9296" : "#8A5228";
  const light = rank === 1 ? GOLD_LIGHT : rank === 2 ? "#E8EAEC" : "#E0A575";
  return (
    <Frame className={className} label={`Rank ${rank}`}>
      {/* ribbons */}
      <path d="M31 6 h17 l-6 32 -17 -7 z" fill={RED} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M69 6 h-17 l6 32 17 -7 z" fill={RED_DEEP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M33 8 h6 l-4 26 -6 -2 z" fill={WHITE} opacity="0.22" />

      {/* disc */}
      <circle cx="50" cy="64" r="30" fill={face} stroke={INK} strokeWidth="4.5" />
      <path d="M50 34 a30 30 0 0 1 30 30 h-9 a21 21 0 0 0 -21 -21 z" fill={deep} opacity="0.5" />
      <path d="M50 34 a30 30 0 0 0 -30 30 h9 a21 21 0 0 1 21 -21 z" fill={light} opacity="0.55" />
      {/* fluted rim */}
      <circle cx="50" cy="64" r="24" fill="none" stroke={INK} strokeWidth="2.4" opacity="0.5" />
      <circle cx="50" cy="64" r="21" fill={face} stroke={INK} strokeWidth="2" />
      {/* laurel ticks */}
      <g stroke={INK} strokeWidth="1.8" opacity="0.4">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30) * (Math.PI / 180);
          return (
            <line key={i}
              x1={50 + Math.cos(a) * 24} y1={64 + Math.sin(a) * 24}
              x2={50 + Math.cos(a) * 27} y2={64 + Math.sin(a) * 27} />
          );
        })}
      </g>
      <text x="50" y="65.5" textAnchor="middle" dominantBaseline="central"
        fill={INK} fontSize="24" fontWeight="800"
        fontFamily="var(--font-display), system-ui, sans-serif">
        {rank}
      </text>
    </Frame>
  );
}

/* ================================================================
   FLAG
   ================================================================ */
export function Flag({ className }: PropProps) {
  return (
    <Frame className={className} label="Flag">
      <circle cx="28" cy="12" r="5.5" fill={GOLD} stroke={INK} strokeWidth="3.5" />
      <circle cx="26.4" cy="10.4" r="1.8" fill={WHITE} opacity="0.5" />
      <line x1="28" y1="17" x2="28" y2="93" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <line x1="28" y1="19" x2="28" y2="91" stroke={GREY_LIGHT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M32 21 h40 q-9 13 0 26 H32 z" fill={RED} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 21 h11 v26 H32 z" fill="#F27672" opacity="0.55" />
      <path d="M60 21 h12 q-9 13 0 26 H60 q8 -13 0 -26 z" fill={RED_DEEP} opacity="0.4" />
    </Frame>
  );
}

/* ================================================================
   MYSTERY BOX — bonus announcement
   ================================================================ */
export function MysteryBox({ className }: PropProps) {
  return (
    <Frame className={className} label="Bonus">
      <path d="M66 50 L84 40 L84 78 L66 88 Z" fill={PURPLE_DEEP} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 50 H66 V88 H20 Z" fill={PURPLE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 50 L38 40 L84 40 L66 50 Z" fill={PURPLE_LIGHT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <g fill={WHITE} opacity="0.14">
        <circle cx="30" cy="64" r="1.6" /><circle cx="56" cy="76" r="1.3" />
        <circle cx="74" cy="58" r="1.3" />
      </g>
      <text x="43" y="70" textAnchor="middle" dominantBaseline="central"
        fill={CREAM} fontSize="30" fontWeight="800" stroke={INK} strokeWidth="1.4"
        fontFamily="var(--font-display), system-ui, sans-serif">
        ?
      </text>
      {/* sparkles */}
      <g fill={GOLD} stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M84 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
        <path d="M16 26 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" />
      </g>
    </Frame>
  );
}
