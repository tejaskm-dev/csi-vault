# Operation Vault — Visual Identity & Build Brief

You are building this app's entire visual layer. The previous design was
deliberately deleted; what remains is unstyled HTML with working logic. This
document defines an identity, not a set of preferences. Follow it exactly.

**Two reference codebases are in this repo. Read them.** They are shipped
projects by the same author, both rated as excellent UI. You are not copying
either one — you are learning specific techniques from each and applying them
to a different identity defined in §1.

| Read this file | For |
|---|---|
| `skloop-main/components/marketing/HomeHero.tsx` | stacked shadows, text-stroke, ghost layer, 3-state button |
| `skloop-main/app/globals.css` | `@theme` keyframes, `@utility` composition, fluid root font-size |
| `skloop-main/app/page.tsx` | the perspective-grid background technique |
| `NAME-sandbox-main/packages/client/src/components/WobbleFilter.tsx` | the hand-drawn SVG filter |
| `NAME-sandbox-main/packages/client/src/components/WobblyButton.tsx` | applying a filter to an HTML element |
| `NAME-sandbox-main/packages/client/src/components/cartoonAvatars.tsx` | why deliberately asymmetric SVG reads as handmade |

---

## 0. The product

A mobile-first web game for a one-time CSI (Computer Society of India) induction
event at ASIET college. ~60 first-year CS students, most with **zero programming
background**, play simultaneously on their own phones for 15–20 minutes after
scanning a QR code.

Nine challenge tiles. Every player gets a different randomised set seeded by
their name. Correct answers unlock vault digits. Live leaderboard ranks by
digits, then completion time.

**It is a heist.** Played standing up, on a phone, in a loud room. If a screen
would look at home in a dashboard, it is wrong.

**Mobile is the only target that matters.** The reference screenshots you may
have seen of Skloop are desktop. Do not copy desktop layouts. Every decision is
made at 390×844 first.

---

## 1. THE IDENTITY — "BLUEPRINT & STEEL"

Read this section three times. Everything else serves it.

> The world is a **heist blueprint** — warm manila paper, a blue drafting grid,
> dashed guide lines, circled annotations, measurement ticks. Everything drawn
> on it is hand-plotted and slightly imperfect.
>
> Everything you can **touch** is a **steel plate** — a chunky, rounded,
> saturated slab with a heavy ink outline, four corner rivets, and a hard
> offset shadow. Crisp, machined, physical.
>
> Paper is soft and wobbly. Steel is hard and exact. That contrast is the
> entire identity.

Neo-brutalist ink outlines and hard shadows, on Nintendo-round chunky forms,
with a retro-arcade signage typeface. Never a sharp 90° corner anywhere.

### The three signature devices

These are what make the app recognisably *itself*. Apply them relentlessly —
the reference projects each commit to one device on 100% of surfaces, and that
consistency is why they read as designed.

**1. RIVETS.** Every steel plate — every card, tile, button, chip, modal — has
four small ink circles inset from its corners. This is the thumbprint of the
whole app. One CSS utility, applied everywhere.

```css
@utility riveted {
  position: relative;
  &::before, &::after {
    content: ""; position: absolute; width: 5px; height: 5px;
    border-radius: 999px; background: var(--color-ink); opacity: 0.35;
    top: 10px;
  }
  &::before { left: 10px; }
  &::after  { right: 10px; }
}
```
(Two pseudo-elements give the top pair; add a nested `<span className="rivets-bottom">`
for the bottom pair on larger plates. Small chips get the top pair only.)

**2. THE TUMBLER RING.** A dashed circle that rotates slowly around whatever is
currently *live* — the active vault tile, the primary CTA, the hero door. It is
a combination dial hunting for its number. This is the app's memorable effect,
the equivalent of Skloop's dripping slime.

```tsx
<svg className="absolute inset-[-12px] -z-10 animate-[spin_14s_linear_infinite]"
     viewBox="0 0 100 100" aria-hidden>
  <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-ink)"
          strokeWidth="2" strokeDasharray="6 9" opacity="0.5" />
  <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-brass)"
          strokeWidth="2" strokeDasharray="2 22" opacity="0.9" />
</svg>
```
Two rings at different dash rhythms, counter-rotating, is even better. Never
more than **one** tumbler ring visible per screen — it marks the single most
important thing.

**3. THE BLUEPRINT LAYER.** The page background is drafting paper: a blue grid,
dashed guides, circled annotations, corner ticks. It is drawn with the wobble
filter so it reads as hand-plotted.

Steal the filter from `NAME-sandbox-main/.../WobbleFilter.tsx`, but at **low
strength** — this is a technical drawing, not a doodle:

```tsx
<filter id="plot">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="n" />
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2"
                     xChannelSelector="R" yChannelSelector="G" />
</filter>
```

`scale="2"` (Name Sandbox uses 4 and 8). **Apply it ONLY to the blueprint
layer** — grid, guides, annotations, and the dashed tumbler rings. Steel plates
stay perfectly crisp. That's the paper-vs-steel contrast, and it's what stops
this looking like a copy of Name Sandbox.

---

## 2. TOKENS — `src/index.css`

The file currently holds only `@import "tailwindcss";`. Build the system.
**Every colour must come from a token.** Raw Tailwind palette classes
(`bg-gray-100`, `text-red-500`) are banned.

```css
@import "tailwindcss";

@theme {
  /* ---- Ink & paper ---- */
  --color-ink:          #14110F;  /* every outline, every heading */
  --color-paper:        #FDF3DC;  /* warm manila — the canvas */
  --color-paper-deep:   #F0E2C0;  /* recessed, locked, disabled */
  --color-plot:         #7FA8C9;  /* blueprint grid & guide lines */
  --color-white:        #FFFFFF;

  /* ---- Brand. Locked — this is CSI's red. ---- */
  --color-red:          #E8332B;  --color-red-deep:    #A8201A;

  /* ---- Steel & brass: the vault's own materials ---- */
  --color-steel:        #DCDAD2;  --color-steel-deep:  #A9A69B;
  --color-brass:        #F2B233;  --color-brass-deep:  #B87F0C;

  /* ---- Signal colours ---- */
  --color-green:        #2FBF5B;  --color-green-deep:  #17803A;
  --color-blue:         #2F6BE8;  --color-blue-deep:   #1A44A0;
  --color-violet:       #8B5BE0;  --color-violet-deep: #5C33A8;
  --color-orange:       #FF8A3D;  --color-orange-deep: #C4570E;
  --color-pink:         #FF5F9E;  --color-pink-deep:   #C42868;
  --color-teal:         #17C4C4;  --color-teal-deep:   #0A8686;

  /* ---- Nine tile fills, by grid position. Saturated, never pastel. ---- */
  --color-tile-1: #F2B233;  --color-tile-2: #17C4C4;  --color-tile-3: #8B5BE0;
  --color-tile-4: #FF8A3D;  --color-tile-5: #2FBF5B;  --color-tile-6: #2F6BE8;
  --color-tile-7: #FF5F9E;  --color-tile-8: #FFD84D;  --color-tile-9: #5AC8FA;

  /* ---- Radii. Three values. Nothing else exists. ---- */
  --radius-plate: 26px;   /* cards, tiles, modals */
  --radius-btn:   18px;   /* buttons, inputs */
  --radius-pill:  999px;  /* chips, badges, tags */

  /* ---- Type ---- */
  --font-display: 'Bungee', system-ui, sans-serif;      /* signage. ALL CAPS only. */
  --font-body:    'Archivo', system-ui, sans-serif;     /* UI text */
  --font-readout: 'Space Mono', ui-monospace, monospace;/* numerals, timers, ranks */

  /* ---- Motion ---- */
  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot. use constantly. */

  @keyframes tumble   { to   { transform: rotate(360deg); } }
  @keyframes bob      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes sheen    { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
  @keyframes pulseGlow{ 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
}
```

`index.html` `<head>` — replace the existing font link, and add `viewport-fit=cover`
so `env(safe-area-inset-*)` resolves:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Archivo:wght@400;600;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Type scale — the ratio is the effect

Skloop's headline-to-eyebrow ratio is roughly **6:1**. Anything under 4:1 reads
as a form, not a game.

| Role | Spec |
|---|---|
| Screen title | `font-display`, `text-[52px]`–`text-[64px]`, `leading-[0.85]`, ALL CAPS |
| Eyebrow chip | `font-body`, `text-[11px]`, `font-bold`, `uppercase`, `tracking-[0.2em]` |
| Body | `font-body`, `text-[16px]`, `font-semibold` |
| Readouts (digit, timer, rank, count) | `font-readout`, `font-bold`, tabular |

Bungee is caps-only by design. Never set it lowercase, never below 20px.

---

## 3. DEPTH — stack all three cues

The single biggest lesson from the reference projects: **depth is three effects
at once**, not one. Skloop's cards carry a black border *and* a hard offset
shadow in the card's own hue *and* a soft coloured glow.

```
1. border      3px solid var(--color-ink)          — always
2. hard shadow 0 6px 0 0 <colour>-deep, zero blur  — always on steel
3. glow        0 12px 28px -6px <colour>/45%       — on the ONE hero element per screen
```

```css
--shadow-plate-red:    0 6px 0 0 var(--color-red-deep);
--shadow-plate-brass:  0 6px 0 0 var(--color-brass-deep);
--shadow-plate-green:  0 6px 0 0 var(--color-green-deep);
--shadow-plate-steel:  0 6px 0 0 var(--color-steel-deep);
--shadow-plate-ink:    0 6px 0 0 var(--color-ink);
--shadow-plate-none:   0 0 0 0 transparent;

/* stacked: hard slab + coloured glow, for the hero element only */
--shadow-hero-red:   0 6px 0 0 var(--color-red-deep),   0 16px 34px -8px rgb(232 51 43 / 0.5);
--shadow-hero-brass: 0 6px 0 0 var(--color-brass-deep), 0 16px 34px -8px rgb(242 178 51 / 0.55);
```

The shadow colour always matches the element's fill. A red button gets a
red-deep slab. A brass button gets brass-deep. Never a black slab under a
coloured plate.

### The press — a three-state ladder

Two states is not enough. From `HomeHero.tsx`:

```
rest    translate-y-0    shadow-plate-*      (+ glow if hero)
hover   -translate-y-1   deeper slab + stronger glow
press   translate-y-1.5  shadow-plate-none
```

Press travel (6px) equals slab depth (6px), so the plate lands flush.

**The collision that has already broken this app twice:** if an element has a
Framer `animate`, `whileTap` or `layout` prop, Framer writes an inline
`style.transform` that **overrides every Tailwind transform class**, and the
CSS press silently does nothing.

| Element has a Framer transform? | Press mechanism |
|---|---|
| No | CSS `active:translate-y-1.5 active:shadow-plate-none` |
| Yes | Framer only: `whileTap={{ y: 6, boxShadow: "0 0 0 0 transparent" }}` |

Rotation follows the same rule: on a Framer-animated element, tilt goes **inside
the animate object**, never as a `rotate-[-2deg]` class.

---

## 4. ART — custom assets, swappable, no emoji

### NO EMOJI. ANYWHERE. EVER.

Not as glyphs, props, medals, avatars or decoration. Not in copy strings. Not as
a placeholder or a fallback. There is an automated check in §10.

### The pipeline

Build this before any screen. Assets live in `src/art/` so Vite hashes them:

```
src/art/
  glyphs/    one per GlyphKey — headphones.png, dog.png, rocket.png, …
  props/     door-closed.png, door-open.png, lock.png, chest.png, gift.png,
             popper.png, trophy.png, coin.png
  index.ts   auto-discovery loader
```

```ts
const files = import.meta.glob('./glyphs/*.{png,webp,svg}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

export const GLYPH_ART = Object.fromEntries(
  Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace(/\.\w+$/, ''), url])
);
```

Swapping art = overwrite the file. No code change, no manifest edit.

`src/data/mockData.ts` already types every challenge and answer option with a
semantic `glyph` name. Read the `GlyphKey` union — it is the contract, and every
value needs a file.

### Placeholder

You will build every screen before a single asset exists. Do **not** leave holes
and do **not** substitute emoji or lucide icons. Build `ArtPlaceholder`: a
riveted steel plate in a `tile-N` colour hashed from the name, with the first
two letters in `font-display`. Obviously a placeholder, correctly sized, so
layouts are testable immediately.

### Generation prompt — put in `src/art/README.md`

> Flat vector game-item illustration of **{subject}**, thick uniform black
> outline, bold saturated flat colours, one subtle lighter highlight on the
> upper-left of each mass, rounded chunky friendly shapes, arcade game-icon
> style, single centred object, transparent background, no text, no drop
> shadow, no scene, no background elements.

Negative: `gradients, realistic shading, photorealism, text, watermark, drop
shadow, background, thin delicate lines, multiple objects, dashed lines,
crosshair, cropped edges`

512×512 PNG, transparent, subject at ~85% of canvas, filename = the GlyphKey.
The vault door is 1024×1024 (it renders at ~240px).

**The vault door is the hero asset — generate it, do not hand-author it.** A
previous attempt hand-coded it in SVG and it rendered as a dashed square with a
crosshair that read as a camera shutter.

> Flat vector game illustration of a round-cornered bank vault door, thick
> uniform black outline, bright red door face, a darker red edge showing its
> thickness, a large brass circular handwheel with four spokes at the centre,
> eight round rivets evenly spaced around the rim, bold saturated flat colours,
> arcade game-icon style, single centred object, transparent background.

`door-open`: same, "swung open on its left hinge revealing a warm golden glowing
interior with stacked gold coins."

### What stays hand-authored SVG

Geometric, non-illustrative marks only — they recolour from tokens and animate:
the tumbler rings, the blueprint layer, rivets, medals (disc + ribbon),
avatars (abstract geometric marks, **not faces**), starbursts, wavy dividers.

`cartoonAvatars.tsx` in the reference shows why hand-authored SVG can work:
**deliberate asymmetry**. Its eyes are different radii (4 vs 5.5), pupils offset
differently, bodies are lumpy irregular beziers, not circles. If you hand-author
anything, make it deliberately imperfect. Uniform, snapped, symmetric SVG is
exactly what reads as machine-made.

---

## 5. THE APP SHELL — mobile, not a phone mockup

A previous build wrapped everything in a simulated device frame with
`max-w-[412px] border-3 md:h-[844px] overflow-hidden`. On a real phone that
border ate edge pixels, `100vh` hid content behind the URL bar, and the fixed
height clipped everything past 844px.

```tsx
function GameShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh w-full bg-paper md:bg-paper-deep md:py-8">
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col
                   overflow-x-hidden bg-paper
                   md:min-h-0 md:rounded-[32px] md:border-3 md:border-ink"
        style={{ paddingTop: "env(safe-area-inset-top)",
                 paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Blueprint variant={variantFor(pathname)} />
        <main className="relative z-10 flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
```

Rules that follow:
- `dvh`, never `vh` or `min-h-screen`.
- The decorative frame appears from `md:` up only. On mobile the phone is the frame.
- **One scroll container** — the document. No `overflow-y-auto` anywhere except
  the VaultTile's inner wipe-clipping wrapper.
- No fixed pixel heights on any screen container.
- Every screen root is `flex flex-1 flex-col`.
- **`PageWrapper` must carry `flex flex-1 flex-col`.** It is currently a bare
  `motion.div` with height:auto, which breaks the flex chain and leaves a dead
  void at the bottom of every screen.

---

## 6. THE VAULT TILE — the signature component

Everything is judged against it. Spend the most time here.

```
 ╭───────────────────╮   3px ink border · radius 26 · shadow-plate-<tile>-deep
 │ ·             ·   │   rivets, four corners
 │  7           ◯    │   digit in font-readout · status badge overhanging corner
 │                   │
 │      [art]        │   <Art> glyph ~52px
 │ ·             ·   │
 ╰───────────────────╯
```

- **locked** — `bg-paper-deep`, the `lock` art at 40% opacity, digit at 40%,
  `shadow-plate-steel` at 3px depth (visibly lower than its neighbours), no
  rivets (it isn't a finished plate yet). Not tappable.
- **active** — `bg-tile-N` by grid position, full-colour glyph, rivets,
  `shadow-plate-<hue>-deep`, empty ink ring badge. Bobs on a loop
  (`animate-[bob_2.6s_ease-in-out_infinite]`) with `animationDelay: index*0.12s`
  so the board ripples rather than pulsing in unison.
- **solved** — `bg-green`, white check badge **overhanging** `-top-3 -right-3`
  with its own ink border and slab shadow, glyph still visible, digit white.

**The next playable tile carries the tumbler ring.** Only one, only that tile.

### The unlock transition — the most important animation in the app

`active → solved`, ~420ms:

1. Green fill **wipes up from the bottom** (`scaleY` 0→1, `transform-origin: bottom`).
2. At ~35% through, the check badge springs in from `scale: 0` with overshoot.
3. The plate does one squash-and-pop: `scale: [1, 0.94, 1.06, 1]`.
4. A **sheen** sweeps diagonally across the plate (the `sheen` keyframe) — the
   light catching polished steel.
5. `unlock` sound fires.

**Implementation note that has already bitten this project:** derive the
"unlocking right now" flag **during render** against a `useRef`, not in a
`useEffect`. The badge mounts on the same commit the state becomes `solved`, so
an effect-set flag arrives one render late and the entrance silently never
plays — while still looking correct in a screenshot.

```tsx
const prev = useRef(state);
const [justSolved, setJustSolved] = useState(false);
if (prev.current !== state) {
  const unlocking = state === "solved" && prev.current !== "solved";
  prev.current = state;
  if (unlocking) setJustSolved(true);   // setState during render: intentional
}
```

A tile mounting already-solved renders solved and flat, no animation.

---

## 7. COMPOSITION — the rule that has failed five times

Every previous attempt produced a centred single column of evenly-spaced rows.
That is a form. Per screen, all five of these must be true:

1. **Something breaks its container.** A badge overhangs, the door crosses the
   header edge, a chip sits half-on/half-off a plate.
2. **Something is rotated.** Nothing sits at exactly 0°. Cards −2° to +2°, chips
   up to ±4°.
3. **At least three filled colour surfaces larger than a chip.** Paper is the
   canvas, not the design. A screen that is 85% cream has failed.
4. **A decorative element that is not content** — a floating riveted plate, a
   drifting brass washer, a circled blueprint annotation. Skloop's hero has two
   floating squares that mean nothing; they do a lot of work.
5. **One hero element** with the stacked glow shadow and the tumbler ring.
   Exactly one.

### The Home composition — build this, do not improvise

```
┌────────────────────────────────────────────┐
│ ▓▓ HEADER — bg-red, riveted, ink base      │  56px. Coloured, never white.
│ CSI ASIET        ⟨8 PLAYING⟩  ⟨mute⟩       │  mute = lucide speaker, w-5
├────────────────────────────────────────────┤
│        ◜ tumbler ring, rotating ◝          │
│         [ VAULT DOOR — 220px ]             │  rotate −4°, -mt-8, overlaps header
│                                            │
│  ⟨ SESSION ACTIVE ⟩                        │  11px eyebrow chip, blue, LEFT
│  OPERATION                                 │  26px, tracked, LEFT
│  VAULT                                     │  64px Bungee, red, LEFT,
│                                            │  overlapping the door above
│  ⟨ 9 PUZZLES · 1 MISSION · CRACK IT ⟩      │  pill, bg-blue, white, rotate −2°
│                                            │
│  ⟦ 0/9 DIGITS ⟧   ⟦ 0 BONUS ⟧              │  riveted plates, rotate −3° / +2°
├────────────────────────────────────────────┤
│  ⟦    ENTER THE VAULT    ⟧                 │  h-16, red, hero glow
│  ⟦   VIEW LEADERBOARD    ⟧                 │  h-14, steel
└────────────────────────────────────────────┘
```

Apply the same thinking to every other screen.

---

## 8. MOTION, SOUND, AND VOICE

### Motion — `src/lib/motion.ts`, reused everywhere

`SETTLE` (screen entry, y 16→0, 220ms, owned by `PageWrapper` alone) ·
`POP` (`scale: [0.8, 1.12, 1]`) · `BOUNCE_IN` (spring 480/18, stagger 0.05) ·
`UNLOCK` (§6) · `SHAKE` (`x: [0,-8,8,-8,8,-8,8,0]`, 360ms, on the wrong option
only) · `CELEBRATE` (canvas-confetti, 1.2s).

Confetti fires on **exactly two screens**: Success and Vault Complete. Not
Bonus Found, not Winner. The restraint is what makes it land.

Nothing linear. Everything overshoots via `--ease-pop`. **Never** use
`animate-bounce`, `animate-pulse` or `animate-spin` as a designed animation —
they are debug utilities. Note that `duration-*` sets *transition*-duration and
has no effect on a CSS animation; use `[animation-duration:3s]`.

### Sound — `src/lib/sound.ts`

Chiptune, synthesised with Web Audio. No files, no dependency. Square and
triangle oscillators through a gain node with exponential decay.

`tap` 180Hz 40ms · `select` 440Hz 60ms · `correct` 523/659/784 arpeggio ·
`wrong` 220→165Hz glide · `unlock` 392/523/659/880 rising ·
`complete` 523/659/784/1046 with a detuned tail.

**iOS silently kills this if you miss it:** an `AudioContext` starts
`suspended` on Safari and creating it in a gesture handler is not enough. Every
play function must begin `if (ctx.state === "suspended") ctx.resume();`. Mute
toggle persisted to localStorage, default unmuted.

### Voice — copy is design

Both reference projects treat copy as part of the visual system. Skloop labels
login "Load Save" and its CTA "PRESS START". Name Sandbox's loading state reads
"Scribbling public servers…".

Operation Vault talks like a heist briefing. Terse, capitalised, a little
dramatic. Never neutral UI English.

| Instead of | Write |
|---|---|
| Status | INTEL |
| Loading… | CRACKING THE SEAL… |
| Submit answer | CRACK IT |
| Correct! | TUMBLER DROPPED |
| Wrong, try again | SEAL HELD — GO AGAIN |
| View leaderboard | THE CREW |
| Locked | SEALED |
| 3 of 9 found | 3 DIGITS RECOVERED |

Every loading, empty and error state gets a line in this voice.

---

## 9. SCREENS

All are unstyled HTML with correct logic. Style them; do not rewrite the logic.

- **Splash** `/` — a real ~2.4s sequence, not a static frame: door drops in and
  overshoots (0ms), wordmark scales up per letter-group (350ms), eyebrow chip
  fades (700ms), handwheel spins 180° and the door shakes once (1100ms) with the
  `unlock` sound, starburst flash (1600ms), navigate (2400ms).
- **NameEntry** `/name` — one riveted input, one button. The input gets the full
  ink + slab treatment and `focus:rotate-[0.5deg]`.
- **Home** `/home` — §7. Door hero only at 0/9 and 9/9; between, the board.
- **VaultGrid** `/vault` — the board, a riveted progress plate with a filled
  green track, the mega-reward plate.
- **Challenge** `/challenge/:id` — coloured header (red; **brass for the bonus
  round**, which is how it is told apart at a glance) with back, title,
  countdown in `font-readout`. Answer options are riveted plates in a 2×2 grid
  with an `<Art>` glyph above each label. Submit disables on tap and shows
  "CHECKING" for 400ms before resolving. Wrong answers are **inline** — shake +
  toast + hint link — never a separate route.
- **Success** `/success/:id` — "TUMBLER DROPPED", the tile replaying its unlock,
  confetti, digits remaining. **No XP or points** — cut from scope.
- **VaultComplete** `/vault-complete` — the climax and the one screen that
  breaks the paper canvas: full `ink` background, and switch depth physics from
  hard shadows to **glow**, exactly as Skloop's dark screens do. Door swings
  open, confetti, the nine solved tiles as a strip, run time.
- **Leaderboard** `/leaderboard` — medals for 1–3, geometric avatars, the "you"
  row visually distinct. Rows animate to new positions with Framer `layout`
  (~300ms) and **must be keyed by `entry.id`, never by rank** — rank is the
  thing that changes, and keying on it destroys the animation.
- **Winner** `/winner` — 2nd/1st/3rd podium as extruded riveted plates of
  different heights, 1st overlapping its neighbours. No confetti.
- **BonusFound** `/bonus-found` — brass treatment, the `gift` asset. No confetti.
- **Waiting** `/waiting` — holding screen, `?state=post` variant.

---

## 10. CONSTRAINTS

1. **No new npm dependencies.** React, React Router, Tailwind v4, Framer Motion,
   canvas-confetti, lucide-react, clsx, tailwind-merge all ship already.
2. **lucide-react is UI chrome only** — back arrow, chevron, spinner, speaker.
   Never as artwork, never sized above `w-6`. A previous build used a 64px
   `<Lock>` as a hero and it looked generic instantly.
3. **No emoji, in any file, for any reason.**
4. **Do not change game logic** — seeded draw, 18-question pool, rolling 3-tile
   window, leaderboard sort, 400ms checking delay, timer behaviour.
5. **No raw Tailwind palette classes.** Add a token.
6. **Three radii only.** 26 / 18 / pill.
7. **No sub-opacity borders.** `border-ink/10` is exactly the hedging this
   design language forbids. Solid ink, or nothing.
8. **No XP, points or score.**
9. **56px minimum tap targets.**

---

## 11. BUILD ORDER

Each step must build before the next.

1. Tokens, fonts, base layer, `viewport-fit=cover`.
2. `Blueprint.tsx` + the `#plot` filter + `riveted` utility + `TumblerRing.tsx`.
   Verify the blueprint is *visible* behind content before continuing.
3. Art pipeline + `ArtPlaceholder`. Every screen must lay out correctly on
   placeholders.
4. `motion.ts`, then `sound.ts`.
5. Primitives: PrimaryButton, Pressable, AnswerOptionCard, Modal, Toast,
   CountdownPill, ProgressDots, StatBlock, LeaderboardRow.
6. `VaultTile` + `VaultBoard`. **Stop and verify the unlock animation plays**
   before going further.
7. Generate all art assets; run the coverage check to "all present".
8. Screens in route order.

---

## 12. ACCEPTANCE

```bash
npx tsc --noEmit && npx vite build

# No raw Tailwind palette. Must print nothing.
grep -rnE "(bg|text|border)-(gray|slate|zinc|neutral|stone|red|blue|green|yellow|purple|pink|orange|teal)-[0-9]" src/

# No stray radii, no blurred utility shadows, no hedged borders. Must print nothing.
grep -rnE "rounded-(sm|md|lg|xl|2xl|3xl)|shadow-(sm|md|lg|xl|2xl|inner)|border-ink/[0-9]" src/

# Debug animations used as design. Must print nothing.
grep -rnE "animate-(bounce|pulse|spin)\b|animate-spin duration-" src/

# Shell correctness. Must print nothing.
grep -rnE "min-h-screen|h-screen|md:h-\[|overflow-hidden" src/App.tsx
grep -rn "overflow-y-auto" src/ | grep -v VaultTile

# PageWrapper carries the flex chain. Must match.
grep -n "flex-1" src/components/PageWrapper.tsx

# Framer/CSS press collision. Must print nothing.
for f in $(grep -rl "active:translate" src/); do
  grep -q "whileTap\|animate=\|layout" "$f" && echo "CONFLICT: $f"; done

# lucide not used as art. Must print nothing.
grep -rnE "<(Lock|Hourglass|Trophy|Award|Gift|PartyPopper|Users)[^>]*w-(8|10|12|16|20|24|32)" src/

# NO EMOJI. Must print "clean".
node -e "
const fs=require('fs'),p=require('path');
const re=/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const bad=[];(function w(d){for(const f of fs.readdirSync(d)){const fp=p.join(d,f);
 if(fs.statSync(fp).isDirectory())w(fp);
 else if(/\.(tsx?|css|html)$/.test(f)&&re.test(fs.readFileSync(fp,'utf8')))bad.push(fp);}})('src');
console.log(bad.length?'EMOJI FOUND:\n'+bad.join('\n'):'clean');"

# Identity devices are actually applied.
grep -rc "riveted"    src/ | awk -F: '{s+=$2} END {print "rivets:",  s}'   # expect 15+
grep -rc "TumblerRing" src/ | awk -F: '{s+=$2} END {print "tumblers:", s}'  # expect 4+
grep -rc "rotate-\["  src/ | awk -F: '{s+=$2} END {print "rotations:",s}'   # expect 12+

# All art present.
node -e "
const fs=require('fs');
const src=fs.readFileSync('src/data/mockData.ts','utf8');
const keys=[...src.split('export type GlyphKey')[1].split(';')[0].matchAll(/'([a-z]+)'/g)].map(m=>m[1]);
const have=fs.existsSync('src/art/glyphs')?fs.readdirSync('src/art/glyphs').map(f=>f.replace(/\.\w+$/,'')):[];
const miss=keys.filter(k=>!have.includes(k));
console.log(miss.length?'MISSING ('+miss.length+'/'+keys.length+'): '+miss.join(', '):'all '+keys.length+' present');"
```

### Then look at it, at 390×844 and 1440×900

The greps cannot see design. For **every** screen:

- Does every touchable surface have a 3px ink border, rivets, and a coloured
  slab shadow — with **no exceptions**?
- Is the blueprint layer visible behind the content?
- Does exactly one element carry the tumbler ring?
- Does something break its container? Is something rotated?
- Count filled colour surfaces bigger than a chip — is it three or more?
- Is the title roughly 5–6× the eyebrow, or does it read as a caption?
- Is there dead space at the bottom? There must not be.
- Does the copy sound like a heist, or like a form?

If any answer disappoints, that screen is not finished. Report what is still
weak rather than declaring done.
