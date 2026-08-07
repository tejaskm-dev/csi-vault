# Operation Vault — Complete Visual Design, From Zero

You are designing this app's entire look from scratch. There is **no existing
design to preserve** — every style, token, colour, animation and illustration
was deliberately deleted. What remains is unstyled HTML with working logic.

Your job is to build the whole visual layer. Not polish. Not adjust. Build.

---

## 0. The product

A mobile-first web game for a one-time CSI (Computer Society of India) induction
event at ASIET college. ~60 first-year CS students, most with **zero programming
background**, play at the same time on their own phones for 15–20 minutes after
scanning a QR code.

**Core loop:** a 3×3 grid of 9 challenge tiles. Every player gets a different
randomised set of 9 questions drawn from an 18-question pool, seeded by their
name. Correct answers unlock vault digits. A live leaderboard ranks by digits
unlocked, then completion time.

This is a **party game played standing up, on a phone, in a noisy room**. It is
not a productivity app. Nothing about it should feel corporate, minimal,
enterprise, or "clean SaaS". If a screen would look at home in a dashboard, it
is wrong.

---

## 1. THE AESTHETIC — read this section three times

The direction is **neo-brutalism × Nintendo × light retro-arcade**.

That combination has one tension you must resolve correctly, and it is the
single thing most likely to go wrong:

> **Neo-brutalism is normally square and harsh. Nintendo is round and friendly.
> You take neo-brutalism's INK OUTLINES and HARD SHADOWS, and apply them to
> Nintendo's ROUNDED, CHUNKY, BOUNCY FORMS.**

Nothing in this app is a sharp-cornered rectangle. Ever. If you find yourself
writing a 90° corner, you have misread this document.

Think: a Nintendo Switch menu drawn with a thick black marker. Think: a physical
plastic toy with moulded edges. Think: sticker sheet. Chunky, tactile, saturated,
slightly silly, extremely legible at arm's length.

### The five non-negotiable rules

1. **INK OUTLINE ON EVERYTHING.** Every card, button, tile, chip, input, badge,
   avatar and modal gets `border: 3px solid #14110F`. No exceptions, no
   "subtle" variants, no 1px hairlines. This is the signature of the whole
   design and it must be relentless.

2. **HARD OFFSET SHADOW, ZERO BLUR.** `box-shadow: 5px 5px 0 0 #14110F`.
   Offset down **and right**. Never a blurred shadow. Never an opacity below 1.
   Pressing an element moves it into its own shadow (see §5).

3. **ROUNDED, NEVER SQUARE.** Radii: `28px` cards/tiles, `20px` buttons/inputs,
   `999px` pills/chips/badges. This is what stops neo-brutalism reading as harsh
   and what makes it read as fun.

4. **SATURATED COLOUR ON WARM PAPER.** No pastels, no greys, no muted tones. Full
   chroma fills with ink outlines. The base canvas is warm cream, not white.

5. **RETRO IS AN ACCENT, NOT THE SKIN.** A pixel typeface appears on numerals
   ONLY. Do not build a pixel-art UI — it is illegible on a phone and kills the
   Nintendo softness. Ration it.

---

## 2. TOKENS — put these in `src/index.css` exactly

`src/index.css` currently contains only `@import "tailwindcss";`. Build the
whole system into its `@theme` block. **Every colour in the app must come from
a token.** Raw Tailwind palette classes (`bg-gray-100`, `text-red-500`,
`border-slate-200`) are banned outright.

```css
@import "tailwindcss";

@theme {
  /* ---- Ink & paper ---- */
  --color-ink:        #14110F;   /* every outline, every heading */
  --color-paper:      #FFF4DA;   /* the base canvas — warm, not white */
  --color-paper-deep: #F5E4BE;   /* recessed areas, progress track */
  --color-white:      #FFFFFF;

  /* ---- Brand (locked — this is CSI's red, do not alter) ---- */
  --color-red:        #E8332B;
  --color-red-deep:   #B01F19;

  /* ---- Play palette. Each has a -deep for the 3D underside. ---- */
  --color-blue:       #2B6BE4;   --color-blue-deep:   #1B4BA8;
  --color-yellow:     #FFC93C;   --color-yellow-deep: #D99A0B;
  --color-green:      #35C46A;   --color-green-deep:  #1F8F49;
  --color-purple:     #9B5DE5;   --color-purple-deep: #6E37B5;
  --color-orange:     #FF8A3D;   --color-orange-deep: #D45F13;
  --color-pink:       #FF6FA5;   --color-pink-deep:   #D13C77;
  --color-teal:       #21C7C7;   --color-teal-deep:   #128A8A;

  /* ---- Nine tile fills. Saturated, NOT pastel. One per grid position. ---- */
  --color-tile-1: #FFC93C;  --color-tile-2: #21C7C7;  --color-tile-3: #9B5DE5;
  --color-tile-4: #FF8A3D;  --color-tile-5: #35C46A;  --color-tile-6: #2B6BE4;
  --color-tile-7: #FF6FA5;  --color-tile-8: #FFE066;  --color-tile-9: #6FD8FF;

  /* ---- Radii. Three values. Nothing else exists. ---- */
  --radius-card: 28px;
  --radius-btn:  20px;
  --radius-pill: 999px;

  /* ---- Hard shadows. Zero blur, always. ---- */
  --shadow-ink:      5px 5px 0 0 #14110F;
  --shadow-ink-lg:   8px 8px 0 0 #14110F;
  --shadow-ink-sm:   3px 3px 0 0 #14110F;
  --shadow-ink-none: 0 0 0 0 #14110F;

  /* ---- Type ---- */
  --font-display: 'Baloo 2', ui-rounded, system-ui, sans-serif;
  --font-body:    'Nunito Sans', system-ui, sans-serif;
  --font-pixel:   'Press Start 2P', monospace;
}
```

Add to `index.html` `<head>` (replacing the existing font link):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:wght@400;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
```

Also add these utilities:

```css
@utility ink {
  border: 3px solid var(--color-ink);
}

/* Vault digits, timer, ranks. The ONLY place the pixel font appears. */
@utility pixel {
  font-family: var(--font-pixel);
  letter-spacing: 0;
  line-height: 1.4;
}

/* 56px minimum touch target — phone in hand, standing up. */
@utility tap { min-height: 56px; min-width: 56px; }
```

And a base layer: `body` gets `bg-paper text-ink font-body`,
`-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`;
inputs get `font-size: 16px` (below that, iOS Safari zooms the viewport on
focus); headings get `font-display font-extrabold`.

### Typography scale

- **Screen titles:** `font-display`, weight 800, `text-[40px]`–`text-[56px]`,
  ALL CAPS, `leading-[0.9]`, tight tracking. Huge. These should dominate.
- **Eyebrows:** `text-xs font-bold uppercase tracking-[0.2em]`. Tiny.
  The contrast between eyebrow and title IS the visual effect — aim for a 3×
  size ratio, not 1.1×.
- **Body:** `font-body`, `text-[16px]`–`text-[18px]`, weight 600.
- **Numerals** (vault digit on a tile, countdown, leaderboard rank): `pixel`
  utility. Nothing else uses the pixel font — not labels, not body, not buttons.

---

## 3. ART — custom assets through a swappable pipeline

### NO EMOJI. ANYWHERE. EVER.

Not as challenge glyphs. Not as answer icons. Not as medals, avatars, props or
decoration. Not inside copy strings. Not as a temporary placeholder. Not as a
fallback when an asset is missing.

If you are about to type an emoji character into a `.tsx`, `.ts`, `.css` or
`.html` file in this project, stop — you have misread this section. There is an
automated check for this in §12 and it will fail the build review.

### What the art actually is

All artwork is **custom, AI-generated illustration**, loaded through a manifest
so that any single piece can be replaced by dropping a new file into a folder,
with **zero code changes**. The art is expected to be regenerated and iterated
on repeatedly — build for that.

Raster (PNG/WebP) is the expected format, because that is what image models
produce well. Highly detailed SVG is equally acceptable where you have it. The
loader below handles both, so the choice can differ per asset and can change
later without touching a component.

### The pipeline — build this first

Assets live in `src/art/` so Vite hashes and optimises them:

```
src/art/
  glyphs/     one per GlyphKey — headphones.png, dog.png, rocket.png, …
  props/      gift.png, chest.png, popper.png, lock.png
  index.ts    the loader
```

The loader auto-discovers files, so adding or swapping art never requires
editing a map:

```ts
// src/art/index.ts
const glyphFiles = import.meta.glob('./glyphs/*.{png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** "./glyphs/headphones.png" -> "headphones" */
function keyOf(path: string) {
  return path.split('/').pop()!.replace(/\.(png|webp|svg)$/, '');
}

export const GLYPH_ART: Record<string, string> = Object.fromEntries(
  Object.entries(glyphFiles).map(([path, url]) => [keyOf(path), url])
);
```

Then one component every call site goes through:

```tsx
// src/components/Art.tsx
export function Art({ name, alt, className }: {
  name: string; alt: string; className?: string;
}) {
  const src = GLYPH_ART[name];
  if (!src) return <ArtPlaceholder name={name} className={className} />;
  return <img src={src} alt={alt} className={className} draggable={false} />;
}
```

**Swapping art is then: overwrite `src/art/glyphs/rocket.png`. That is the
entire process.** No manifest edit, no import, no rebuild of any component.

### Placeholder — so the app is usable before the art exists

You will be building the whole UI before a single asset is generated. Do **not**
leave holes and do **not** substitute emoji. Build `ArtPlaceholder`: an
ink-outlined rounded square in a `tile-N` colour derived from a hash of the
name, with the first two letters of the name in the display font, centred.

It must be visibly a placeholder — it is scaffolding, not a design decision —
while still being the right size and shape, so every layout is testable
immediately and swapping in real art changes nothing structural.

### Asset specification — put this in `src/art/README.md`

- **512 × 512**, PNG with a genuine transparent background (not white)
- Subject centred, filling ~85% of the canvas, even optical weight across the set
- Displayed at 44–64px, so detail must survive an 8× downscale — bold shapes,
  thick outlines, no fine linework
- Filename is the `GlyphKey` exactly, lowercase: `headphones.png`
- Keep every source file; these get regenerated often

### The generation prompt

Put this in `src/art/README.md` too, so the set can be regenerated
consistently later. Same prefix every time — consistency across the set matters
far more than any single icon:

> Flat vector-style illustration of **{subject}**, thick uniform black outline,
> bold saturated flat colours, no gradients, rounded friendly chunky shapes,
> Nintendo game-icon style, single centred object, transparent background, no
> text, no drop shadow, no scene, no background elements.

Negative: `gradients, realistic shading, photorealism, text, watermark, drop
shadow, background, thin delicate lines, multiple objects, cropped edges`

**{subject} per key** — read the `GlyphKey` union in `src/data/mockData.ts`;
it is the contract and every value needs a file:

`mountain` snowy mountain peak with a red flag · `search` magnifying glass ·
`headphones` over-ear headphones · `dog` corgi face · `penguin` penguin ·
`camera` retro camera · `bubble` speech bubble · `star` five-point star ·
`rocket` cartoon rocket · `code` laptop showing angle brackets · `key` ornate
key · `shield` heraldic shield · `terminal` computer keyboard · `dice` single
die showing five · `flame` flame · `wave` ocean wave · `lightning` lightning
bolt · `droplet` water droplet · `leaf` leaf · `sun` smiling sun · `box`
cardboard box · `circle` blue circle · `triangle` red triangle · `hexagon`
orange hexagon · `wind` gust-of-wind swirl · `apple` red apple · `banana`
banana · `grapes` bunch of grapes · `orange` orange

Props: `gift` wrapped present with ribbon · `chest` treasure chest ·
`popper` party popper · `lock` closed padlock

### What stays hand-authored SVG

Geometric, non-illustrative forms are better as code — they stay crisp at any
size, recolour from tokens, and animate:

- **The vault door** (§9) — the one significant piece of bespoke art
- **Medals** for ranks 1–3 — a disc plus ribbon, tinted gold/silver/bronze
- **Avatars** — abstract geometric marks, not faces: a coloured disc with an
  ink outline and a simple shape (chevron, dot cluster, bar) picked by id hash
- **Starbursts, sparkles, wavy dividers, the backdrop blobs** (§7)

These are shapes, not illustrations. The rule that hand-authored SVG fails is
about *characterful illustration* — animals, objects, scenes. Do not attempt
those in code; generate them.

---

## 4. THE VAULT TILE — the signature component

`src/components/VaultTile.tsx` is currently an unstyled button with three
states. Everything in the app is judged against it. Spend the most time here.

```
┌─────────────────┐  ← 3px ink border, radius 28px, 5px 5px 0 ink shadow
│ 7          ◯    │  ← digit in `pixel` font, top-left. Status badge top-right.
│                 │
│     [art]       │  ← <Art> glyph, ~48px, centred
│                 │
└─────────────────┘
```

- **`locked`** — fill `paper-deep`. Glyph replaced by the `lock` art asset.
  Digit and lock at 40% opacity. **`shadow-ink-sm`**, not the full shadow: it
  should sit visibly lower than its playable neighbours. Not tappable.
- **`active`** — fill = that grid position's `tile-N` colour. Full-colour
  `<Art>` glyph. `shadow-ink`. Top-right badge is an empty ink ring. It bobs
  gently on a loop (translateY 0 → -3px → 0 over ~2.5s), each tile offset by
  `index * 0.15s` so the board ripples rather than pulsing in unison.
- **`solved`** — fill `green`. White check badge, **overhanging the top-right
  corner** (`-top-3 -right-3`, `ink` border, `shadow-ink-sm`). Glyph stays
  visible. Digit turns white.

### The unlock transition — the most important animation in the app

`active → solved`, ~400ms, and it must be watchable:

1. A `green` fill **wipes up from the bottom edge** (`scaleY` 0→1,
   `transform-origin: bottom`), 400ms, ease `[0.16, 1, 0.3, 1]`.
2. At ~35% through the wipe, the check badge **springs in** from `scale: 0`
   with overshoot (spring, stiffness 520, damping 18).
3. The tile itself does one squash-and-pop: `scale: [1, 0.94, 1.06, 1]` across
   the same 400ms.
4. Fires the `unlock` sound (§6).

**Implementation note that will bite you:** compute the "is this unlocking
right now" flag **during render** against a `useRef`, not inside a `useEffect`.
The badge mounts on the same commit that the state becomes `solved`, so an
effect-set flag arrives one render too late and the badge's entrance silently
never plays — while still looking fine in a screenshot.

```tsx
const prev = useRef(state);
const [justSolved, setJustSolved] = useState(false);
if (prev.current !== state) {
  const unlocking = state === "solved" && prev.current !== "solved";
  prev.current = state;
  if (unlocking) setJustSolved(true);   // setState during render: intentional
}
```

A tile that mounts already-solved (revisiting the board) renders solved and
flat, with no animation.

---

## 5. THE PRESS — how every interactive element behaves

Neo-brutalist press: the element **moves into its own shadow**.

```
default:  translate(0,0)      shadow  5px 5px 0 ink
pressed:  translate(5px,5px)  shadow  0   0   0 ink
```

Do it in CSS, 80ms, on `:active`:

```
class="shadow-ink transition-[transform,box-shadow] duration-75
       active:translate-x-[5px] active:translate-y-[5px] active:shadow-ink-none"
```

**CRITICAL — the mistake that has already broken this app once:** if an element
also has a Framer Motion `animate`, `whileTap` or `layout` prop, Framer writes
an inline `style.transform` that **overrides any Tailwind transform class**, and
the CSS press silently does nothing.

So pick one mechanism per element and never both:

| Element has a Framer transform? | Press mechanism |
|---|---|
| No  | CSS `active:` as above |
| Yes | Framer only: `whileTap={{ x: 5, y: 5, boxShadow: "0 0 0 0 #14110F" }}` |

Same applies to rotation: if an element is Framer-animated, its tilt goes
**inside the animate object**, never as a `rotate-[-2deg]` class.

Minimum 56px tap target on everything. Fire the `tap` sound on every press.

---

## 6. MOTION AND SOUND

Create `src/lib/motion.ts` with these and reuse them — no bespoke animation per
screen:

- **PRESS** — §5.
- **SETTLE** — screen entry: `y: 16 → 0`, `opacity: 0 → 1`, 220ms ease-out.
  Owned by a single `PageWrapper` in `App.tsx`. Screens must not add their own
  entrance on top; two stacked transitions is what made an earlier build feel
  mushy.
- **POP** — `scale: [0.8, 1.12, 1]`, 400ms. Overshoot, always.
- **BOUNCE_IN** — list/grid entrance, spring stiffness 480 damping 18, stagger
  0.05s.
- **UNLOCK** — §4.
- **SHAKE** — wrong answer: `x: [0,-8,8,-8,8,-8,8,0]` over 360ms, applied to
  the wrong option **only** — never the whole screen, never at the same time as
  UNLOCK or CELEBRATE.
- **CELEBRATE** — `canvas-confetti` (already a dependency), 1.2s. Allowed on
  **exactly two screens**: Success and Vault Complete. Not Bonus Found, not
  Winner. The restraint is what makes it feel earned.

Nothing linear. Nothing under 60ms. Everything overshoots.

### Sound — `src/lib/sound.ts`

Chiptune, synthesised with the Web Audio API. **No audio files, no new
dependency.** Square and triangle oscillators through a gain node with an
exponential decay (never stop abruptly — it clicks).

- `tap()` 180Hz square, 40ms, quiet
- `select()` 440Hz square, 60ms
- `correct()` rising arpeggio 523/659/784Hz, 90ms each
- `wrong()` 220→165Hz sawtooth glide, 200ms — soft, not punishing
- `unlock()` 392/523/659/880Hz, 70ms apart
- `complete()` 523/659/784/1046Hz with a detuned second oscillator for a tail

**iOS will silently break this if you miss it:** an `AudioContext` starts in
state `"suspended"` on Safari, and creating it inside a gesture handler is not
enough. Every play function must begin with
`if (ctx.state === "suspended") ctx.resume();`. Most of the 60 devices are
phones. Without this the whole sound system does nothing and passes every test.

Mute toggle persisted to `localStorage`, default unmuted, reachable from the
Home header.

---

## 7. STRUCTURE — the thing that kept making this feel flat

An earlier build failed review as *"too structured, everything on one plane,
no weird shapes, doesn't look fun."* Fix that deliberately:

**Background.** Build `src/components/Backdrop.tsx` — a non-interactive layer
behind all content. Big irregular **blob** shapes (closed bezier paths, never
circles) in play-palette colours at low opacity, bleeding off the screen edges;
a sparse dot grid; two or three thick arc strokes. Give it `variant` props for
default / challenge / dark and select by route in `App.tsx`. Mount it
`absolute inset-0` **inside** the phone-width shell — `fixed` would spill
outside the frame on desktop.

**Break the grid.**
- Tiles alternate tilt by position: `-2deg`, `+1.5deg`, `-1deg`, repeating.
- Badges overhang their parent's corner (requires the parent NOT to have
  `overflow-hidden` — put the overflow on an inner wrapper so the unlock wipe
  still clips).
- Cards sit at `-1deg` / `+1deg`. Nothing is perfectly aligned.
- Let elements overlap: the vault door should cross the header edge; a chip
  should sit half-on-half-off a card.

**Add shape.** Starbursts behind big numbers. Wavy dividers instead of straight
rules. A halftone-dot or scanline texture on one or two hero surfaces only.

---

## 8. SCREENS

Every screen is currently unstyled HTML with correct structure and logic. Style
them all. Route order in `App.tsx`.

- **Splash** `/` — wordmark, vault door, auto-advances after 1.8s. First thing
  60 students see; make it land.
- **NameEntry** `/name` — one input, one button. The input needs the full ink +
  shadow treatment.
- **Home** `/home` — the hub. Title huge. The vault door hero shows **only at
  0/9 and 9/9**; between those, the 3×3 board takes that space and is the focus.
  Two stat chips (digits, bonus), primary CTA, leaderboard link, mute toggle.
- **VaultGrid** `/vault` — the full board plus progress and the mega-reward card.
- **Challenge** `/challenge/:id` — coloured header bar with back, title and
  countdown. Question, then answer options as ink-outlined cards in a 2×2 grid
  with an `<Art>` glyph above each label. Submit disables on tap, shows "CHECKING"
  state for 400ms before resolving — instant resolution feels unjudged. Wrong
  answers are an **inline** state (shake + toast + "Need a hint?"), never a
  separate route. **The bonus round uses the same shell with a yellow header
  instead of red** — that is how it is told apart at a glance.
- **Success** `/success/:id` — "WOOHOO!", the tile playing its unlock, confetti,
  and a line saying how many vaults are left. **There is no XP or points
  system** — it was cut from scope. Do not add one.
- **VaultComplete** `/vault-complete` — the climax, and the one screen allowed
  to break from the paper canvas: go full `ink` background. Vault door swings
  open, confetti, the 9 solved tiles as a compact strip, run time.
- **Leaderboard** `/leaderboard` — ranks 1–3 get the hand-authored SVG medals
  (gold/silver/bronze), everyone else a pixel numeral. Geometric avatar marks.
  The "you" row is visually distinct. Rows animate to
  new positions with Framer `layout` (~300ms) — and **must be keyed by
  `entry.id`, never by rank**, since rank is the thing that changes and keying
  on it destroys the animation.
- **Winner** `/winner` — 2nd/1st/3rd podium. No confetti here.
- **BonusFound** `/bonus-found` — gold treatment, the `gift` art asset as hero.
  No confetti here either.
- **Waiting** `/waiting` — holding screen, `?state=post` for the after variant.

---

## 9. THE VAULT DOOR — the one piece of custom art

A round-cornered vault door, ink-outlined, in CSI red, with a handwheel. Build
it as an SVG component with `state: "closed" | "open"`.

Give it real thickness: a `red-deep` slab offset behind the face so it reads as
a physical slab, not a flat rect. Handwheel: outer ink ring, inner dark disc,
four spokes, pale centre cap. Eight rivets around the rim, not four.

On `open`, swing it on its left hinge and reveal a warm glow and stacked gold
discs inside. **Drive the swing from a wrapping `<motion.div>` with
`perspective` and `transformOrigin`, not from an SVG `<g>`** — Framer routes SVG
transforms through the `transform` attribute, which has no `rotateY`, so a
3D swing written inside the SVG silently does nothing.

Make the door fill its viewBox. An earlier attempt framed it at 23% of the
canvas and it read as unfinished with dead margins on every side.

---

## 10. CONSTRAINTS

1. **No new npm dependencies.** Everything ships already: React, React Router,
   Tailwind v4, Framer Motion, canvas-confetti, lucide-react, clsx,
   tailwind-merge.
2. **lucide-react is for UI chrome only** — back arrows, chevrons, spinner,
   speaker. Never inside an illustration, never as a challenge or answer icon.
   **No emoji anywhere**, in any file, for any reason (§3). All illustration
   goes through `<Art>`; all geometric marks are hand-authored SVG.
3. **Do not change game logic.** The seeded challenge draw, the 18-question
   pool, the rolling 3-tile open window, the leaderboard sort, the 400ms
   checking delay, the timer behaviour. Style them; don't rewrite them.
4. **No raw Tailwind palette classes.** Add a token instead.
5. **Three radii only.** 28 / 20 / pill.
6. **No blurred shadows anywhere.**
7. **No XP, points or score.** Cut from scope.
8. **56px minimum tap targets.**

---

## 11. BUILD ORDER

Do not skip ahead. Each step must build before the next.

1. Tokens + fonts + base layer (`index.css`, `index.html`).
2. The art pipeline: `src/art/index.ts`, `Art.tsx`, `ArtPlaceholder`, and
   `src/art/README.md` with the spec and generation prompts. Assets do not
   exist yet — everything must render on placeholders and stay laid out
   correctly. Verify that before continuing.
3. `motion.ts`, then `sound.ts`.
4. Primitives: `PrimaryButton`, `Pressable`, `AnswerOptionCard`, `Modal`,
   `Toast`, `CountdownPill`, `ProgressDots`, `StatBlock`, `LeaderboardRow`.
5. `VaultTile` + `VaultBoard`. Stop and verify the unlock animation actually
   plays before moving on.
6. `VaultDoor`, `Backdrop`.
7. Screens, in route order.

---

## 12. ACCEPTANCE

```bash
npx tsc --noEmit && npx vite build       # both must pass

# No raw Tailwind palette. Must print nothing.
grep -rnE "(bg|text|border)-(gray|slate|zinc|neutral|stone|red|blue|green|yellow|purple|pink|orange|teal)-[0-9]" src/

# No blurred shadows, no stray radii. Must print nothing.
grep -rnE "shadow-(sm|md|lg|xl|2xl|inner)|rounded-(sm|md|lg|xl|2xl|3xl)" src/

# Confetti on exactly two screens: Success + VaultComplete.
grep -rln "celebrate\|confetti" src/screens/

# No XP anywhere. Must print nothing.
grep -rniE "\bxp\b|points|score" src/

# NO EMOJI in any source file. Must print "clean".
# (Node, not grep -P — BSD grep on macOS has no PCRE and will not match these.)
node -e "
const fs=require('fs'),p=require('path');
const re=/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const bad=[];
(function walk(d){for(const f of fs.readdirSync(d)){const fp=p.join(d,f);
  if(fs.statSync(fp).isDirectory())walk(fp);
  else if(/\.(tsx?|css|html|md)\$/.test(f)&&re.test(fs.readFileSync(fp,'utf8')))bad.push(fp);
}})('src');
console.log(bad.length?'EMOJI FOUND:\n'+bad.join('\n'):'clean');
"

# Every GlyphKey resolves to an asset or an intentional placeholder — no silent
# blanks. Must list any key with no file in src/art/glyphs/.
node -e "
const fs=require('fs');
const src=fs.readFileSync('src/data/mockData.ts','utf8');
const block=src.split('export type GlyphKey')[1].split(';')[0];
const keys=[...block.matchAll(/'([a-z]+)'/g)].map(m=>m[1]);
const have=fs.existsSync('src/art/glyphs')?fs.readdirSync('src/art/glyphs').map(f=>f.replace(/\.\w+\$/,'')):[];
const missing=keys.filter(k=>!have.includes(k));
console.log(missing.length?'MISSING ART ('+missing.length+'/'+keys.length+'): '+missing.join(', '):'all '+keys.length+' present');
"

# Framer/CSS press collision — must print nothing.
for f in $(grep -rl "active:translate" src/); do
  grep -q "whileTap\|animate=\|layout" "$f" && echo "CONFLICT: $f"; done

# Every tile token compiled (a malformed @theme value yields NO utility and is
# invisible to tsc, the build, and every check above).
npx vite build >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8 9; do
  printf "bg-tile-%s: %s\n" "$i" "$(grep -c "bg-tile-$i" dist/assets/*.css)"; done
```

**Then look at it at 390×844.** The automated checks cannot see design. Ask:

- Does every single surface have a visible 3px black outline?
- Do buttons look like physical objects, and do they move into their shadow?
- Is anything rotated? Does anything overlap or break out of its container?
- Is the background doing something, or is it a blank sheet?
- Would a first-year student call this fun, or would they call it an app?
- Are art placeholders obviously placeholders, and is every layout still
  correct with them in place?

If any answer disappoints, that part is not finished. Report honestly what is
still weak rather than declaring done.
