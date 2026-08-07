import { INK } from "./primitives";

/**
 * Props and badges.
 *
 * Same reasoning as Glyphs.tsx: the reference mockup's gift box, popper,
 * chest, medals and avatars are all system emoji, so we use emoji. The two
 * exceptions are VaultDoorLocked and Sparkle — the vault door is this app's
 * own identity and must stay on-brand, and the sparkle is a decorative
 * accent that has to sit in the exact reward-yellow.
 */

interface PropProps {
  className?: string;
}

const EMOJI_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Android Emoji",sans-serif';

/** Shared emoji-in-svg renderer — scales with its box, no font-size needed. */
function EmojiProp({
  emoji,
  label,
  className,
  size = 26,
}: {
  emoji: string;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <text
        x="16"
        y="17"
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={EMOJI_STACK}
      >
        {emoji}
      </text>
    </svg>
  );
}

/**
 * Small red vault door with padlock, for locked tiles. Stays hand-drawn —
 * this is the one mark that belongs to Operation Vault rather than to Unicode.
 */
export function VaultDoorLocked({
  digit,
  className,
}: PropProps & { digit?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="24" height="24" rx="5" fill="#E8332B" stroke={INK} strokeWidth="2.5" />
      <circle cx="7" cy="7" r="1" fill={INK} opacity="0.3" />
      <circle cx="25" cy="7" r="1" fill={INK} opacity="0.3" />
      <circle cx="7" cy="25" r="1" fill={INK} opacity="0.3" />
      <circle cx="25" cy="25" r="1" fill={INK} opacity="0.3" />
      <rect x="10" y="15" width="12" height="9" rx="2" fill="#FBF6EF" stroke={INK} strokeWidth="2" />
      <path
        d="M12 15V12C12 9.8 13.8 8 16 8C18.2 8 20 9.8 20 12V15"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="19.5" r="1.2" fill={INK} />
      {digit !== undefined && (
        <text
          x="16"
          y="27.5"
          textAnchor="middle"
          fill={INK}
          fontSize="7"
          fontWeight="900"
          fontFamily="Nunito, sans-serif"
        >
          {digit}
        </text>
      )}
    </svg>
  );
}

export function GiftBox({ className }: PropProps) {
  return <EmojiProp emoji="🎁" label="gift" className={className} size={28} />;
}

export function TreasureChest({ className }: PropProps) {
  return <EmojiProp emoji="🧰" label="treasure chest" className={className} size={26} />;
}

export function PartyPopper({ className }: PropProps) {
  return <EmojiProp emoji="🎉" label="party popper" className={className} size={26} />;
}

export function Trophy({ className }: PropProps) {
  return <EmojiProp emoji="🏆" label="trophy" className={className} size={26} />;
}

export function Megaphone({ className }: PropProps) {
  return <EmojiProp emoji="📣" label="announcement" className={className} size={26} />;
}

/** 1st/2nd/3rd get real medals; 4th+ never calls this. */
export function Medal({ rank, className }: PropProps & { rank: number }) {
  const emoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <EmojiProp
      emoji={emoji}
      label={`rank ${rank}`}
      className={className}
      size={28}
    />
  );
}

/** Sparkle — decorative headline accent. Hand-drawn to hold reward-yellow. */
export function Sparkle({ className }: PropProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill="#F4B93E"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Leaderboard avatars — an emoji face on a pastel disc, picked by id hash. */
// Single-codepoint faces only. ZWJ sequences (🧑‍🎓, 👩‍💻) split into their
// component emoji on older Android builds, which looks broken in a 44px circle.
const AVATAR_FACES = ["🧑", "👦", "👧", "🧔", "👩", "👨", "👵", "👴"];
const AVATAR_TINTS = [
  "#FDF3E0",
  "#FDE9EA",
  "#EFEAF9",
  "#E6F0FB",
  "#E7F4EC",
  "#FEEDE0",
  "#F3EAF7",
  "#EDF2E6",
];

export function Avatar({ index = 0, className }: PropProps & { index?: number }) {
  const i = Math.abs(index);
  const face = AVATAR_FACES[i % AVATAR_FACES.length];
  const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
  return (
    <svg
      viewBox="0 0 36 36"
      className={className}
      role="img"
      aria-label="player avatar"
      focusable="false"
    >
      <circle cx="18" cy="18" r="17" fill={tint} />
      <text
        x="18"
        y="19.5"
        fontSize="22"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={EMOJI_STACK}
      >
        {face}
      </text>
    </svg>
  );
}
