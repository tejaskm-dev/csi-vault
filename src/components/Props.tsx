import { cn } from "../lib/utils";

/**
 * Geometric props, built in code.
 *
 * Everything here is a shape with a thick ink outline, one lighter zone up-left
 * and one darker zone down-right — the same construction as the asset sheet, so
 * these sit beside the hand-illustrated mascot and door without reading as a
 * different toolkit.
 *
 * Characterful subjects (mascot, door scene, logo) stay as exported art.
 */

const INK = "#1F1F1F";

/* Sheet palette */
const GOLD = "#FFB02E";
const GOLD_LIGHT = "#FFD37A";
const GOLD_DEEP = "#C4820C";
const WOOD = "#8A5F3C";
const WOOD_DEEP = "#5C3D24";
const PURPLE = "#6C5CE7";
const PURPLE_LIGHT = "#9B8FF0";
const PURPLE_DEEP = "#4A3FA8";
const GREY = "#9E9E9E";
const GREY_LIGHT = "#C9C9C9";
const GREY_DEEP = "#6E6E6E";
const RED = "#E53935";
const CREAM = "#F5F2E8";
const SILVER = "#C9CBCE";
const BRONZE = "#C87F45";

interface PropProps {
  className?: string;
}

function Frame({ children, className, label }: PropProps & { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export function Trophy({ className }: PropProps) {
  return (
    <Frame className={className} label="Trophy">
      {/* handles, behind the cup */}
      <path d="M30 28 q-16 1 -16 15 q0 13 16 14" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M70 28 q16 1 16 15 q0 13 -16 14" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M30 28 q-16 1 -16 15 q0 13 16 14" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <path d="M70 28 q16 1 16 15 q0 13 -16 14" fill="none" stroke={GOLD_DEEP} strokeWidth="5" strokeLinecap="round" />

      {/* base */}
      <path d="M31 86 h38 a3 3 0 0 1 3 3 v3 a2 2 0 0 1 -2 2 H30 a2 2 0 0 1 -2 -2 v-3 a3 3 0 0 1 3 -3 z"
        fill={WOOD_DEEP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M37 76 h26 l3 10 H34 z" fill={WOOD} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />

      {/* stem */}
      <rect x="45" y="63" width="10" height="14" fill={GOLD_DEEP} stroke={INK} strokeWidth="3.5" />

      {/* cup */}
      <path d="M27 17 h46 v15 q0 22 -23 32 q-23 -10 -23 -32 z"
        fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* rim */}
      <rect x="25" y="13" width="50" height="8" rx="4" fill={GOLD_LIGHT} stroke={INK} strokeWidth="3.5" />
      {/* light zone */}
      <path d="M33 23 h9 v12 q0 13 7 22 q-14 -10 -16 -24 z" fill={GOLD_LIGHT} opacity="0.75" />
      {/* shade zone */}
      <path d="M63 23 h6 v10 q0 17 -14 27 q10 -14 8 -26 z" fill={GOLD_DEEP} opacity="0.5" />
    </Frame>
  );
}

export function GiftBox({ className }: PropProps) {
  return (
    <Frame className={className} label="Gift box">
      {/* body */}
      <rect x="20" y="42" width="60" height="44" rx="5" fill={PURPLE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M56 42 h20 a4 4 0 0 1 4 4 v36 a4 4 0 0 1 -4 4 H56 z" fill={PURPLE_DEEP} opacity="0.45" />
      {/* lid */}
      <rect x="15" y="31" width="70" height="15" rx="5" fill={PURPLE_LIGHT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 31 h22 a5 5 0 0 1 5 5 v5 a5 5 0 0 1 -5 5 H58 z" fill={PURPLE_DEEP} opacity="0.3" />

      {/* ribbon */}
      <rect x="44" y="31" width="12" height="55" fill={GOLD} stroke={INK} strokeWidth="3" />
      {/* bow */}
      <path d="M50 31 q-16 -4 -18 -14 q-1 -8 8 -6 q9 3 10 20 z" fill={GOLD} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M50 31 q16 -4 18 -14 q1 -8 -8 -6 q-9 3 -10 20 z" fill={GOLD_DEEP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="50" cy="30" r="5.5" fill={GOLD_LIGHT} stroke={INK} strokeWidth="3.5" />
    </Frame>
  );
}

export function Key({ className }: PropProps) {
  return (
    <Frame className={className} label="Key">
      {/* bow */}
      <circle cx="50" cy="27" r="18" fill={GOLD} stroke={INK} strokeWidth="4.5" />
      <circle cx="50" cy="27" r="7.5" fill={CREAM} stroke={INK} strokeWidth="4" />
      <path d="M38 15 a17 17 0 0 1 12 -5 v6 a11 11 0 0 0 -8 3 z" fill={GOLD_LIGHT} opacity="0.85" />

      {/* shaft */}
      <rect x="43" y="43" width="14" height="43" rx="4" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="52" y="46" width="4" height="37" rx="2" fill={GOLD_DEEP} opacity="0.5" />

      {/* teeth */}
      <path d="M57 62 h14 v11 H57 z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M57 78 h9 v9 H57 z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </Frame>
  );
}

export function Stopwatch({ className }: PropProps) {
  return (
    <Frame className={className} label="Stopwatch">
      {/* crown + side buttons */}
      <rect x="42" y="6" width="16" height="11" rx="3" fill={GREY_DEEP} stroke={INK} strokeWidth="3.5" />
      <rect x="17" y="20" width="10" height="8" rx="3" fill={GREY_DEEP} stroke={INK} strokeWidth="3" transform="rotate(-38 22 24)" />

      {/* case */}
      <circle cx="50" cy="57" r="37" fill={GREY} stroke={INK} strokeWidth="4.5" />
      <path d="M22 33 a37 37 0 0 1 22 -12 v7 a30 30 0 0 0 -17 10 z" fill={GREY_LIGHT} opacity="0.9" />

      {/* face */}
      <circle cx="50" cy="57" r="27" fill={CREAM} stroke={INK} strokeWidth="3.5" />

      {/* elapsed wedge */}
      <path d="M50 57 L50 30 A27 27 0 0 1 73 70 Z" fill={RED} opacity="0.9" />

      {/* ticks */}
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        <line x1="50" y1="33" x2="50" y2="39" />
        <line x1="74" y1="57" x2="68" y2="57" />
        <line x1="50" y1="81" x2="50" y2="75" />
        <line x1="26" y1="57" x2="32" y2="57" />
      </g>

      {/* hands */}
      <line x1="50" y1="57" x2="50" y2="38" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="57" x2="64" y2="66" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="57" r="4.5" fill={INK} />
    </Frame>
  );
}

export function HintBulb({ className }: PropProps) {
  return (
    <Frame className={className} label="Hint">
      {/* rays */}
      <g stroke={GOLD} strokeWidth="5" strokeLinecap="round">
        <line x1="50" y1="4" x2="50" y2="13" />
        <line x1="20" y1="16" x2="26" y2="23" />
        <line x1="80" y1="16" x2="74" y2="23" />
        <line x1="10" y1="45" x2="19" y2="45" />
        <line x1="90" y1="45" x2="81" y2="45" />
      </g>

      {/* glass */}
      <path d="M50 18 a24 24 0 0 1 15 42 v6 H35 v-6 a24 24 0 0 1 15 -42 z"
        fill={GOLD} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M41 30 a15 15 0 0 1 8 -7 v7 a9 9 0 0 0 -4 4 z" fill="#FFFFFF" opacity="0.55" />

      {/* filament */}
      <path d="M43 52 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />

      {/* screw base */}
      <rect x="38" y="66" width="24" height="7" rx="2.5" fill={GREY_DEEP} stroke={INK} strokeWidth="3.5" />
      <rect x="38" y="74" width="24" height="7" rx="2.5" fill={GREY_DEEP} stroke={INK} strokeWidth="3.5" />
      <path d="M42 82 h16 l-3 8 H45 z" fill={GREY_DEEP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </Frame>
  );
}

export function Padlock({ className, open = false }: PropProps & { open?: boolean }) {
  return (
    <Frame className={className} label={open ? "Unlocked" : "Locked"}>
      <path
        d={open ? "M32 46 V30 a18 18 0 0 1 34 -6" : "M32 46 V30 a18 18 0 0 1 36 0 v16"}
        fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round"
      />
      <rect x="20" y="44" width="60" height="46" rx="9" fill={GOLD} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M62 44 h9 a9 9 0 0 1 9 9 v28 a9 9 0 0 1 -9 9 h-9 z" fill={GOLD_DEEP} opacity="0.4" />
      <circle cx="50" cy="62" r="7" fill={INK} />
      <path d="M47 68 h6 l2 12 H45 z" fill={INK} />
    </Frame>
  );
}

/** Ranks 1–3. Disc plus ribbon, tinted. */
export function Medal({ rank, className }: PropProps & { rank: 1 | 2 | 3 }) {
  const face = rank === 1 ? GOLD : rank === 2 ? SILVER : BRONZE;
  const deep = rank === 1 ? GOLD_DEEP : rank === 2 ? "#8E9296" : "#8A5228";
  return (
    <Frame className={className} label={`Rank ${rank}`}>
      {/* ribbons */}
      <path d="M32 8 h16 l-6 30 -16 -6 z" fill={RED} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M68 8 h-16 l6 30 16 -6 z" fill="#A82A27" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {/* disc */}
      <circle cx="50" cy="63" r="29" fill={face} stroke={INK} strokeWidth="4.5" />
      <path d="M50 34 a29 29 0 0 1 29 29 h-8 a21 21 0 0 0 -21 -21 z" fill={deep} opacity="0.45" />
      <circle cx="50" cy="63" r="20" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.45" />
      <text x="50" y="64.5" textAnchor="middle" dominantBaseline="central"
        fill={INK} fontSize="24" fontWeight="800"
        fontFamily="var(--font-display), system-ui, sans-serif">
        {rank}
      </text>
    </Frame>
  );
}

/** The little red pennant from the sheet's misc row. */
export function Flag({ className }: PropProps) {
  return (
    <Frame className={className} label="Flag">
      <circle cx="30" cy="14" r="5" fill={GOLD} stroke={INK} strokeWidth="3.5" />
      <line x1="30" y1="18" x2="30" y2="92" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M34 22 h38 q-8 12 0 24 H34 z" fill={RED} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M34 22 h10 v24 H34 z" fill="#F27672" opacity="0.6" />
    </Frame>
  );
}

/** Purple "?" box for the bonus announcement. */
export function MysteryBox({ className }: PropProps) {
  return (
    <Frame className={className} label="Bonus">
      <rect x="18" y="30" width="64" height="58" rx="8" fill={PURPLE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M58 30 h16 a8 8 0 0 1 8 8 v42 a8 8 0 0 1 -8 8 H58 z" fill={PURPLE_DEEP} opacity="0.45" />
      <rect x="13" y="20" width="74" height="16" rx="6" fill={PURPLE_LIGHT} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <text x="50" y="62" textAnchor="middle" dominantBaseline="central"
        fill={CREAM} fontSize="34" fontWeight="800"
        fontFamily="var(--font-display), system-ui, sans-serif">
        ?
      </text>
    </Frame>
  );
}
