/**
 * Challenge glyphs.
 *
 * These are emoji, not hand-drawn SVG. The reference mockup this app is built
 * against uses system emoji for every tile icon, answer icon and prop — the
 * corgi, the penguin, the headphones, the fruit grid are all the stock glyphs.
 * Hand-authored paths were never going to match a professionally drawn colour
 * font, so we use the font.
 *
 * They render inside an <svg><text> rather than a plain <span> so the component
 * API stays identical to the old hand-drawn set: `className="h-9 w-9"` and
 * ancestor selectors like `[&_svg]:h-9` keep working with no call-site changes,
 * and the glyph scales with its box instead of needing a font-size.
 */

interface GlyphProps {
  className?: string;
}

/** Emoji fonts first — falls back to whatever the platform ships. */
const EMOJI_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Android Emoji",sans-serif';

function makeGlyph(emoji: string, label: string) {
  const Component = ({ className }: GlyphProps) => (
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
        fontSize="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={EMOJI_STACK}
      >
        {emoji}
      </text>
    </svg>
  );
  Component.displayName = `Glyph_${label.replace(/\s/g, "")}`;
  return Component;
}

/* ---- Challenge-family glyphs (shown on vault tiles) ---- */
export const GlyphMountain = makeGlyph("⛰️", "mountain");
export const GlyphSearch = makeGlyph("🔍", "magnifying glass");
export const GlyphHeadphones = makeGlyph("🎧", "headphones");
export const GlyphDog = makeGlyph("🐶", "dog");
export const GlyphPenguin = makeGlyph("🐧", "penguin");
export const GlyphCamera = makeGlyph("📷", "camera");
export const GlyphBubble = makeGlyph("💬", "speech bubble");
export const GlyphStar = makeGlyph("⭐", "star");
export const GlyphRocket = makeGlyph("🚀", "rocket");
export const GlyphCode = makeGlyph("💻", "laptop");
export const GlyphKey = makeGlyph("🔑", "key");
export const GlyphShield = makeGlyph("🛡️", "shield");
export const GlyphTerminal = makeGlyph("⌨️", "keyboard");
export const GlyphDice = makeGlyph("🎲", "dice");

/* ---- Answer-option glyphs ---- */
export const GlyphFlame = makeGlyph("🔥", "flame");
export const GlyphWave = makeGlyph("🌊", "wave");
export const GlyphLightning = makeGlyph("⚡", "lightning");
export const GlyphDroplet = makeGlyph("💧", "droplet");
export const GlyphLeaf = makeGlyph("🍃", "leaf");
// 🌞 and 💨 over ☀️ / 🌬️ — the latter carry a VS16 selector that some older
// Android builds fall back to monochrome for. These render in colour everywhere.
export const GlyphSun = makeGlyph("🌞", "sun");
export const GlyphBox = makeGlyph("📦", "box");
export const GlyphWind = makeGlyph("💨", "wind");

/* ---- Plain shapes, for shape-matching puzzles ---- */
export const GlyphCircle = makeGlyph("🔵", "blue circle");
export const GlyphTriangle = makeGlyph("🔺", "red triangle");
export const GlyphHexagon = makeGlyph("🔶", "orange diamond");

/* ---- Fruit, for spot-the-match puzzles ---- */
export const GlyphApple = makeGlyph("🍎", "apple");
export const GlyphBanana = makeGlyph("🍌", "banana");
export const GlyphGrapes = makeGlyph("🍇", "grapes");
export const GlyphOrange = makeGlyph("🍊", "orange");

export const GLYPHS = {
  mountain: GlyphMountain,
  search: GlyphSearch,
  headphones: GlyphHeadphones,
  dog: GlyphDog,
  penguin: GlyphPenguin,
  camera: GlyphCamera,
  bubble: GlyphBubble,
  star: GlyphStar,
  rocket: GlyphRocket,
  code: GlyphCode,
  key: GlyphKey,
  shield: GlyphShield,
  terminal: GlyphTerminal,
  dice: GlyphDice,
  flame: GlyphFlame,
  wave: GlyphWave,
  lightning: GlyphLightning,
  droplet: GlyphDroplet,
  leaf: GlyphLeaf,
  sun: GlyphSun,
  box: GlyphBox,
  circle: GlyphCircle,
  triangle: GlyphTriangle,
  hexagon: GlyphHexagon,
  wind: GlyphWind,
  apple: GlyphApple,
  banana: GlyphBanana,
  grapes: GlyphGrapes,
  orange: GlyphOrange,
} as const;

export type GlyphKey = keyof typeof GLYPHS;
