// src/art/index.ts

// Discover all glyphs
const glyphFiles = import.meta.glob('./glyphs/*.{png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Discover all props
const propFiles = import.meta.glob('./props/*.{png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Get filename without extension and path: "./glyphs/headphones.png" -> "headphones" */
function keyOf(path: string) {
  return path.split('/').pop()!.replace(/\.(png|webp|svg)$/, '');
}

export const GLYPH_ART: Record<string, string> = Object.fromEntries([
  ...Object.entries(glyphFiles).map(([path, url]) => [keyOf(path), url]),
  ...Object.entries(propFiles).map(([path, url]) => [keyOf(path), url]),
]);
