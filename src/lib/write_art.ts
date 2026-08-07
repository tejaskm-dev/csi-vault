import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GLYPHS_DIR = path.join(__dirname, '..', 'art', 'glyphs');
const PROPS_DIR = path.join(__dirname, '..', 'art', 'props');

if (!fs.existsSync(GLYPHS_DIR)) fs.mkdirSync(GLYPHS_DIR, { recursive: true });
if (!fs.existsSync(PROPS_DIR)) fs.mkdirSync(PROPS_DIR, { recursive: true });

// A library of custom, Nintendo-retro, thick-outlined SVGs (viewBox 0 0 100 100)
const svgLibrary: Record<string, string> = {
  // GLYPHS
  mountain: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 50 15 L 85 85 L 15 85 Z" fill="#2B6BE4" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 50 15 L 62 39 L 38 39 Z" fill="#FFFFFF" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 50 15 L 50 50 M 50 25 L 65 20 L 50 15" fill="none" stroke="#E8332B" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  search: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="45" cy="45" r="22" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" />
      <line x1="60" y1="60" x2="85" y2="85" stroke="#14110F" stroke-width="7.5" stroke-linecap="round" />
      <circle cx="40" cy="40" r="10" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    </svg>
  `,
  headphones: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 20 50 A 30 30 0 0 1 80 50" fill="none" stroke="#14110F" stroke-width="6.5" stroke-linecap="round" />
      <rect x="15" y="45" width="12" height="24" rx="6" fill="#9B5DE5" stroke="#14110F" stroke-width="5" />
      <rect x="73" y="45" width="12" height="24" rx="6" fill="#9B5DE5" stroke="#14110F" stroke-width="5" />
      <path d="M 20 40 L 20 60 M 80 40 L 80 60" stroke="#14110F" stroke-width="4.5" />
    </svg>
  `,
  dog: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="50" cy="55" rx="28" ry="22" fill="#FF8A3D" stroke="#14110F" stroke-width="5.5" />
      <path d="M 25 35 Q 15 45 23 55 Z" fill="#D45F13" stroke="#14110F" stroke-width="5" />
      <path d="M 75 35 Q 85 45 77 55 Z" fill="#D45F13" stroke="#14110F" stroke-width="5" />
      <circle cx="40" cy="50" r="4.5" fill="#14110F" />
      <circle cx="60" cy="50" r="4.5" fill="#14110F" />
      <ellipse cx="50" cy="62" rx="6" ry="4" fill="#14110F" />
    </svg>
  `,
  penguin: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="50" cy="52" rx="26" ry="32" fill="#14110F" />
      <ellipse cx="50" cy="55" rx="18" ry="22" fill="#FFFFFF" stroke="#14110F" stroke-width="4" />
      <polygon points="45,45 55,45 50,55" fill="#FFC93C" stroke="#14110F" stroke-width="3" />
      <circle cx="42" cy="38" r="3.5" fill="#14110F" />
      <circle cx="58" cy="38" r="3.5" fill="#14110F" />
      <path d="M 25 72 Q 22 80 32 80" stroke="#FFC93C" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M 75 72 Q 78 80 68 80" stroke="#FFC93C" stroke-width="5" stroke-linecap="round" fill="none" />
    </svg>
  `,
  camera: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="18" y="32" width="64" height="42" rx="10" fill="#21C7C7" stroke="#14110F" stroke-width="5.5" />
      <rect x="35" y="24" width="30" height="9" rx="3" fill="#14110F" />
      <circle cx="50" cy="53" r="16" fill="#FFF4DA" stroke="#14110F" stroke-width="5" />
      <circle cx="50" cy="53" r="8" fill="#14110F" />
      <circle cx="72" cy="40" r="3.5" fill="#FF6FA5" stroke="#14110F" stroke-width="2" />
    </svg>
  `,
  bubble: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 15 45 C 15 28 30 18 50 18 C 70 18 85 28 85 45 C 85 62 70 72 50 72 C 43 72 38 70 33 68 L 18 76 L 24 62 C 18 57 15 51 15 45 Z" fill="#35C46A" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <circle cx="38" cy="45" r="3" fill="#FFFFFF" />
      <circle cx="50" cy="45" r="3" fill="#FFFFFF" />
      <circle cx="62" cy="45" r="3" fill="#FFFFFF" />
    </svg>
  `,
  star: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 50 10 L 62 38 L 92 38 L 68 56 L 78 86 L 50 68 L 22 86 L 32 56 L 8 38 L 38 38 Z" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
    </svg>
  `,
  rocket: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 30 70 L 20 82 Q 18 85 25 82 L 34 74" fill="#FF8A3D" stroke="#14110F" stroke-width="5" />
      <path d="M 70 70 L 80 82 Q 82 85 75 82 L 66 74" fill="#FF8A3D" stroke="#14110F" stroke-width="5" />
      <path d="M 32 40 L 50 12 L 68 40 L 62 78 L 38 78 Z" fill="#FF6FA5" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <circle cx="50" cy="42" r="7" fill="#FFFFFF" stroke="#14110F" stroke-width="4.5" />
      <path d="M 42 78 L 36 90 L 50 84 L 64 90 L 58 78 Z" fill="#E8332B" stroke="#14110F" stroke-width="4" />
    </svg>
  `,
  code: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="18" y="22" width="64" height="42" rx="8" fill="#FFF4DA" stroke="#14110F" stroke-width="5.5" />
      <rect x="12" y="64" width="76" height="12" rx="4" fill="#14110F" />
      <line x1="22" y1="64" x2="78" y2="64" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 35 36 L 27 43 L 35 50" fill="none" stroke="#2B6BE4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 65 36 L 73 43 L 65 50" fill="none" stroke="#2B6BE4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="53" y1="34" x2="47" y2="52" stroke="#14110F" stroke-width="4.5" />
    </svg>
  `,
  key: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="34" cy="50" r="18" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" />
      <circle cx="34" cy="50" r="6" fill="#FFF4DA" stroke="#14110F" stroke-width="4.5" />
      <rect x="52" y="44" width="34" height="12" rx="4" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" />
      <rect x="68" y="56" width="8" height="12" rx="2" fill="#14110F" />
      <rect x="78" y="56" width="8" height="12" rx="2" fill="#14110F" />
    </svg>
  `,
  shield: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 22 20 L 78 20 Q 78 54 50 82 Q 22 54 22 20 Z" fill="#2B6BE4" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 50 20 L 78 20 Q 78 54 50 82 Z" fill="#1B4BA8" opacity="0.15" />
      <polygon points="50,30 55,42 67,42 57,50 61,62 50,54 39,62 43,50 33,42 45,42" fill="#FFC93C" stroke="#14110F" stroke-width="3" />
    </svg>
  `,
  terminal: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="15" y="20" width="70" height="60" rx="10" fill="#14110F" stroke="#14110F" stroke-width="5" />
      <path d="M 25 35 L 37 45 L 25 55" fill="none" stroke="#35C46A" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="42" y1="55" x2="62" y2="55" stroke="#35C46A" stroke-width="6.5" stroke-linecap="round" />
    </svg>
  `,
  dice: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="18" y="18" width="64" height="64" rx="16" fill="#FFFFFF" stroke="#14110F" stroke-width="5.5" />
      <circle cx="34" cy="34" r="6" fill="#14110F" />
      <circle cx="66" cy="34" r="6" fill="#14110F" />
      <circle cx="50" cy="50" r="6" fill="#E8332B" />
      <circle cx="34" cy="66" r="6" fill="#14110F" />
      <circle cx="66" cy="66" r="6" fill="#14110F" />
    </svg>
  `,
  flame: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 50 12 C 75 35 82 60 70 78 C 58 96 42 96 30 78 C 18 60 25 35 50 12 Z" fill="#FF8A3D" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 50 35 C 65 50 70 65 62 76 C 54 87 46 87 38 76 C 30 65 35 50 50 35 Z" fill="#FFC93C" stroke="#14110F" stroke-width="4.5" stroke-linejoin="round" />
    </svg>
  `,
  wave: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 12 62 Q 24 50 36 62 Q 48 74 60 62 Q 72 50 84 62 L 84 82 L 12 82 Z" fill="#2B6BE4" stroke="#14110F" stroke-width="5" stroke-linejoin="round" />
      <path d="M 12 42 Q 24 30 36 42 Q 48 54 60 42 Q 72 30 84 42" fill="none" stroke="#21C7C7" stroke-width="6.5" stroke-linecap="round" />
    </svg>
  `,
  lightning: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="58,10 22,54 48,54 36,90 78,42 50,42" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
    </svg>
  `,
  droplet: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 50 15 C 50 15 80 48 80 66 C 80 82 66 90 50 90 C 34 90 20 82 20 66 C 20 48 50 15 50 15 Z" fill="#21C7C7" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 38 60 A 10 10 0 0 1 48 50" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
    </svg>
  `,
  leaf: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 15 85 Q 35 75 45 45 Q 65 5 85 15 Q 95 35 55 55 Q 25 65 15 85 Z" fill="#35C46A" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 15 85 Q 45 55 85 15" fill="none" stroke="#14110F" stroke-width="4.5" stroke-linecap="round" />
    </svg>
  `,
  sun: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="22" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" />
      <path d="M 50 12 L 50 20 M 50 80 L 50 88 M 12 50 L 20 50 M 80 50 L 88 50 M 24 24 L 30 30 M 70 70 L 76 76 M 24 70 L 30 66 M 70 24 L 76 30" stroke="#14110F" stroke-width="5.5" stroke-linecap="round" />
    </svg>
  `,
  box: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,15 85,32 50,50 15,32" fill="#FF8A3D" stroke="#14110F" stroke-width="5" stroke-linejoin="round" />
      <polygon points="15,32 50,50 50,85 15,67" fill="#D45F13" stroke="#14110F" stroke-width="5" stroke-linejoin="round" />
      <polygon points="50,50 85,32 85,67 50,85" fill="#FF8A3D" stroke="#14110F" stroke-width="5" stroke-linejoin="round" />
    </svg>
  `,
  circle: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="32" fill="#2B6BE4" stroke="#14110F" stroke-width="5.5" />
    </svg>
  `,
  triangle: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,16 85,80 15,80" fill="#E8332B" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
    </svg>
  `,
  hexagon: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,15 82,33 82,67 50,85 18,67 18,33" fill="#FF8A3D" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
    </svg>
  `,
  wind: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 15 35 L 60 35 Q 70 35 65 45 Q 60 50 50 45" fill="none" stroke="#21C7C7" stroke-width="6.5" stroke-linecap="round" />
      <path d="M 25 55 L 75 55 Q 85 55 80 65 Q 75 70 65 65" fill="none" stroke="#21C7C7" stroke-width="6.5" stroke-linecap="round" />
      <path d="M 20 75 L 45 75" fill="none" stroke="#21C7C7" stroke-width="6.5" stroke-linecap="round" />
    </svg>
  `,
  apple: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 50 82 C 22 82 20 40 40 32 C 45 30 50 34 50 34 C 50 34 55 30 60 32 C 80 40 78 82 50 82 Z" fill="#E8332B" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 50 34 Q 52 18 64 16" fill="none" stroke="#14110F" stroke-width="5" stroke-linecap="round" />
      <path d="M 55 24 Q 68 28 65 38 Q 58 35 55 24 Z" fill="#35C46A" stroke="#14110F" stroke-width="3" />
    </svg>
  `,
  banana: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 80 20 C 72 26 22 46 22 76 C 22 80 26 84 30 84 C 60 84 80 34 86 26 Z" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 80 20 Q 82 14 78 14" stroke="#14110F" stroke-width="4.5" fill="none" />
    </svg>
  `,
  grapes: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="36" cy="38" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <circle cx="58" cy="38" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <circle cx="47" cy="56" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <circle cx="34" cy="70" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <circle cx="56" cy="70" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <circle cx="47" cy="82" r="11" fill="#9B5DE5" stroke="#14110F" stroke-width="4.5" />
      <path d="M 47 27 Q 45 15 54 13" fill="none" stroke="#14110F" stroke-width="4.5" stroke-linecap="round" />
    </svg>
  `,
  orange: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="32" fill="#FF8A3D" stroke="#14110F" stroke-width="5.5" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#D45F13" stroke-width="2.5" stroke-dasharray="4,6" opacity="0.6" />
      <circle cx="58" cy="28" r="2.5" fill="#14110F" />
      <path d="M 50 18 Q 52 10 46 8" fill="none" stroke="#14110F" stroke-width="4" stroke-linecap="round" />
    </svg>
  `,

  // PROPS
  lock: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="22" y="44" width="56" height="42" rx="10" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" />
      <path d="M 32 44 L 32 30 A 18 18 0 0 1 68 30 L 68 44" fill="none" stroke="#14110F" stroke-width="7" stroke-linecap="round" />
      <circle cx="50" cy="62" r="6" fill="#14110F" />
      <line x1="50" y1="68" x2="50" y2="76" stroke="#14110F" stroke-width="5" stroke-linecap="round" />
    </svg>
  `,
  hourglass: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="22" y="14" width="56" height="10" rx="3" fill="#E8332B" stroke="#14110F" stroke-width="5" />
      <rect x="22" y="76" width="56" height="10" rx="3" fill="#E8332B" stroke="#14110F" stroke-width="5" />
      <path d="M 30 24 L 30 36 C 30 45 42 50 50 50 C 58 50 70 45 70 36 L 70 24 Z" fill="#FFF4DA" stroke="#14110F" stroke-width="5" />
      <path d="M 30 76 L 30 64 C 30 55 42 50 50 50 C 58 50 70 55 70 64 L 70 76 Z" fill="#FFF4DA" stroke="#14110F" stroke-width="5" />
      <polygon points="40,28 60,28 50,44" fill="#FFC93C" />
      <polygon points="34,72 66,72 50,56" fill="#FFC93C" />
    </svg>
  `,
  trophy: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 18 36 C 18 18 82 18 82 36 C 82 54 62 62 58 66 L 58 78 L 72 78 L 72 86 L 28 86 L 28 78 L 42 78 L 42 66 C 38 62 18 54 18 36 Z" fill="#FFC93C" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 18 30 Q 8 30 8 40 Q 8 50 18 50" fill="none" stroke="#14110F" stroke-width="5.5" stroke-linecap="round" />
      <path d="M 82 30 Q 92 30 92 40 Q 92 50 82 50" fill="none" stroke="#14110F" stroke-width="5.5" stroke-linecap="round" />
    </svg>
  `,
  popper: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="35,80 80,35 60,15" fill="#FF6FA5" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <circle cx="30" cy="30" r="5" fill="#FFC93C" stroke="#14110F" stroke-width="2" />
      <circle cx="50" cy="18" r="4.5" fill="#2B6BE4" stroke="#14110F" stroke-width="2" />
      <circle cx="78" cy="12" r="5" fill="#35C46A" stroke="#14110F" stroke-width="2" />
      <circle cx="12" cy="50" r="4.5" fill="#FF8A3D" stroke="#14110F" stroke-width="2" />
      <path d="M 30 30 Q 15 15 8 25 M 50 18 Q 45 -2 55 -5" fill="none" stroke="#14110F" stroke-width="3" stroke-linecap="round" />
    </svg>
  `,
  gift: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="18" y="34" width="64" height="52" rx="6" fill="#FF6FA5" stroke="#14110F" stroke-width="5.5" />
      <rect x="14" y="24" width="72" height="12" rx="4" fill="#E8332B" stroke="#14110F" stroke-width="5.5" />
      <rect x="44" y="24" width="12" height="62" fill="#FFFFFF" stroke="#14110F" stroke-width="5" />
      <path d="M 44 24 Q 28 8 44 14 Z" fill="#E8332B" stroke="#14110F" stroke-width="4.5" />
      <path d="M 56 24 Q 72 8 56 14 Z" fill="#E8332B" stroke="#14110F" stroke-width="4.5" />
    </svg>
  `,
  chest: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="14" y="44" width="72" height="42" rx="4" fill="#FF8A3D" stroke="#14110F" stroke-width="5.5" />
      <path d="M 14 44 L 14 30 Q 14 16 50 16 Q 86 16 86 30 L 86 44 Z" fill="#D45F13" stroke="#14110F" stroke-width="5.5" stroke-linejoin="round" />
      <rect x="42" y="38" width="16" height="18" rx="4" fill="#FFC93C" stroke="#14110F" stroke-width="4" />
      <circle cx="50" cy="47" r="3" fill="#14110F" />
    </svg>
  `,
};

// Write SVGs to their respective locations
Object.entries(svgLibrary).forEach(([key, svg]) => {
  const isProp = ['lock', 'hourglass', 'trophy', 'popper', 'gift', 'chest'].includes(key);
  const targetDir = isProp ? PROPS_DIR : GLYPHS_DIR;
  const targetPath = path.join(targetDir, `${key}.svg`);
  fs.writeFileSync(targetPath, svg.trim());
  console.log(`Wrote ${targetPath}`);
});

console.log('All custom vector SVGs generated successfully!');
