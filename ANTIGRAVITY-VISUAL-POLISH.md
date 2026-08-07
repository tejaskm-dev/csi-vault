# Operation Vault — Visual Polish Brief

You are polishing an existing, working React + Tailwind v4 + Framer Motion app.
**Do not rebuild it. Do not restructure it. Do not scaffold anything new.**
Every task below is an edit to a file that already exists, or a new file in an
existing folder.

Read this document completely before writing any code. It is long on purpose:
the previous pass on this project came out functionally correct but visually
thin, because the visual direction was left implicit. Nothing here is implicit.

---

## 0. What this is

A mobile-first web game for a one-time CSI (Computer Society of India) induction
event at ASIET college. ~60 first-year CS students, most with **zero programming
background**, play simultaneously on their phones for 15–20 minutes after
scanning a QR code.

Core loop: a 3×3 grid of 9 challenge tiles. Each player gets a different
randomized set of challenges. Correct answers unlock vault digits. A live
leaderboard ranks by digits unlocked, then completion time.

This is a **one-time event experience**, not a SaaS product. It should feel like
a game, not a dashboard. Warm, playful, hand-made, a little bit silly. It should
never feel corporate, minimal, or "clean startup."

---

## 1. Current state — read these files first

```
src/
  index.css                    design tokens (@theme) — ALREADY DONE, extend only
  App.tsx                      router + PageWrapper (owns the SETTLE transition)
  lib/
    motion.ts                  the 5 motion primitives — DO NOT CHANGE TIMINGS
    utils.ts                   cn(), formatClock()
  context/GameContext.tsx      game state, name-seeded challenge draw, leaderboard
  data/mockData.ts             18-challenge pool + bonus + seeded draw
  components/
    VaultTile.tsx              THE signature component — 3-state machine
    VaultBoard.tsx             the 3×3 grid
    Pressable.tsx              base button (carries PRESS + 56px tap target)
    PrimaryButton.tsx          primary / secondary / reward variants
    AnswerOptionCard.tsx       answer option w/ selected + wrong states
    Icons.tsx                  duotone geometric glyphs (Lock, Check, Tile1-9…)
    VaultIllustration.tsx      vault door, closed/open, HTML-layer 3D swing
    LeaderboardRow.tsx         layout-animated row
    ProgressDots.tsx  StatBlock.tsx  Modal.tsx  Toast.tsx  CountdownPill.tsx
  screens/
    Splash  NameEntry  Home  VaultGrid  ChallengeScreen
    Success  VaultComplete  Leaderboard  Winner  BonusFound  Waiting
```

The design-token layer and the motion layer are **already correct and already
consistent**. Your job is the layer above them: illustration, color richness,
and playful detail.

### Verify before you start

```bash
npx tsc --noEmit && npx vite build
```

Both must pass now, and must still pass when you are done.

---

## 2. Hard constraints — violating any of these fails the task

1. **No new npm dependencies.** Everything is hand-authored SVG. No icon packs
   beyond the `lucide-react` already installed, no illustration libraries, no
   Lottie, no image files, no base64 assets.
2. **No raw Tailwind palette classes.** `text-gray-500`, `bg-red-50`,
   `border-gray-200`, `text-teal-600` etc. are all banned. If you need a color
   that does not exist, **add it as an `@theme` token in `src/index.css`** and
   use the generated utility class.
3. **No arbitrary radii.** Only `rounded-card` (24px), `rounded-btn` (16px),
   `rounded-pill`. No `rounded-2xl`, `rounded-3xl`, `rounded-[20px]`.
4. **One shadow family.** Only `shadow-soft` and `shadow-soft-lifted`. No
   `shadow-md/lg/xl/2xl`, no `shadow-inner`, no colored glow shadows.
5. **Do not change `src/lib/motion.ts` timings or primitives.** You may ADD new
   exported constants. You may not alter `PRESS`, `SETTLE`, `SHAKE`,
   `UNLOCK_*`, or `celebrate()`.
6. **Confetti stays on exactly two screens** — `Success.tsx` and
   `VaultComplete.tsx`. Do not add it to `BonusFound`, `Winner`, or anywhere
   else. The restraint is deliberate.
7. **56px minimum tap target** on every interactive element. Use the `tap`
   utility or `Pressable`.
8. **No XP, no points, no score.** This was cut from scope. If you see a mockup
   showing "+120 XP", ignore it. Use contextual copy like "6 vaults left".
9. **Bonus challenge header is gold/yellow**, not red — this is how it is
   distinguished at a glance from a normal challenge.
10. **Keep the file structure.** `components/`, `screens/`, `data/`, `lib/`,
    `context/`. You may add `src/components/art/` (see §4). Nothing else.

---

## 3. The visual target

### 3.1 Style name

**"Flat sticker with ink outline."** Think children's picture book meets mobile
game. Every illustrated element is a flat-colored shape with a heavy dark
outline, drawn as if with a marker. Slightly imperfect, warm, tactile.

### 3.2 Palette (already tokenized in `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| `csi-red` | `#E8332B` | primary actions, headers, headlines, accents |
| `off-white` | `#FBF6EF` | page canvas — every screen except Vault Complete |
| `light-gray` | `#EDEAE3` | inactive / disabled |
| `charcoal` | `#221D1A` | body text **and every illustration outline** |
| `success-green` | `#3AA65A` | solved / correct only |
| `reward-yellow` | `#F4B93E` | bonus / reward only |
| `info-blue` | `#3E7CF4` | live status text only, sparingly |
| `muted` | `#8A827B` | secondary text (the only gray) |
| `red-tint` `green-tint` `yellow-tint` `blue-tint` | | soft fills behind icons |

### 3.3 NEW tokens you must add to `src/index.css`

Nine tile pastels. Warm, low-saturation, all readable against `off-white`.
Add these inside the existing `@theme { }` block:

```css
  --color-tile-1: #FDF3E0;   /* butter    */
  --color-tile-2: #FDE9EA;   /* blush     */
  --color-tile-3: #EFEAF9;   /* lavender  */
  --color-tile-4: #E6F0FB;   /* sky       */
  --color-tile-5: #E7F4EC;   /* mint      */
  --color-tile-6: #FEEDE0;   /* peach     */
  --color-tile-7: #F3EAF7;   /* lilac     */
  --color-tile-8: #EDF2E6;   /* sage      */
  --color-tile-9: #FBEFE2;   /* sand      */
  --color-ink:    #221D1A;   /* alias of charcoal, for illustration strokes */
```

They generate `bg-tile-1` … `bg-tile-9` automatically. Use those classes. Never
inline the hex in a component.

### 3.4 Typography

Already loaded: **Nunito** (display, 700–1000) and **Inter** (body, 400–700).

- Screen headlines: `font-display font-black`, ALL CAPS, tight tracking,
  `text-[28px]` to `text-[44px]` depending on screen. Red or charcoal.
- Numerals (vault digits, ranks, timers, counts): use the existing `numeral`
  utility. It is tabular and weight 900. **Never** render a game numeral in
  Inter.
- Body: Inter, `text-[15px]`–`text-[17px]`, `text-muted` for secondary.
- Section eyebrows: `text-xs font-bold uppercase tracking-widest`.

---

## 4. SVG AUTHORING SPEC — read this section twice

This is the core of the task. All illustration is hand-authored SVG in React
components. **This section tells you exactly how.** Do not deviate; the whole
point is that 30+ separate drawings read as one hand.

### 4.1 Where the art lives

Create `src/components/art/` with these files:

```
src/components/art/
  Mascot.tsx          the character, with pose + accessory props
  VaultScene.tsx      the Home hero: vault door in a landscape
  Glyphs.tsx          14 challenge tile glyphs, exported as a keyed record
  Props.tsx           giftBox, treasureChest, medal, sparkle, confettiPiece
  primitives.tsx      shared helpers (INK, Fluff, outlineProps)
```

`src/components/Icons.tsx` stays as-is — `Lock` and `Check` are still used by
`VaultTile`. Do not delete it, do not restyle it.

### 4.2 The canvas rules

| Art type | viewBox | Stroke width | Min feature |
|---|---|---|---|
| Tile glyph / prop icon | `0 0 32 32` | `2.5` | 3 units |
| Mascot | `0 0 200 200` | `5` | 8 units |
| Scene (Home hero) | `0 0 240 200` | `4` | 6 units |

Rules that apply to **every** drawing:

- **Outline color is always `#221D1A`** (charcoal/ink). Never black, never a
  tinted outline, never a lighter outline for "subtle" elements.
- `stroke-linecap="round"` and `stroke-linejoin="round"` on **everything**.
  No mitre joins anywhere. This is what makes it feel marker-drawn.
- **Flat fills only.** No `<linearGradient>`, no `<radialGradient>`, no
  `<filter>`, no `<mask>`, no `feDropShadow`, no `opacity` on whole groups.
- **Snap coordinates to whole or half units.** `x="6"` or `x="6.5"`, never
  `x="6.2837"`. Crisper, and easier to nudge later.
- **Optical weight must match across the set.** Every 32×32 glyph must occupy
  22–26 units of the 32-unit canvas, centered. A glyph that fills 30 units sits
  next to one that fills 14 and the grid looks broken. Check this by eye across
  all 14 before you finish.
- **Highlights:** one per major mass, a white shape at `opacity="0.35"`, placed
  top-left of the form. Never a gradient, never more than one per mass.
- No `width`/`height` attributes on the `<svg>` — size comes from `className`.
- Every art component: `aria-hidden="true"` and `focusable="false"`.

### 4.3 Color discipline in art

Two categories, and you must decide per element:

- **State-tintable** (the glyph on a VaultTile changes color with tile state):
  use `stroke="currentColor"` / `fill="currentColor"` so the parent's
  `text-*` class drives it.
- **Fixed identity** (the mascot is always white with a red jersey; the gift box
  is always red with a gold ribbon): hardcode the hex from §3.2. These are
  *pictures*, not icons, and must not shift with context.

Tile glyphs are **fixed identity with an ink outline** — the ink outline stays
`#221D1A` in all three tile states, and the fill stays its own color. Only the
tile *background* changes state. This is what keeps the grid readable when 9
tiles are in 3 different states.

### 4.4 THE TWO-PASS SILHOUETTE TECHNIQUE — use this for all fluffy/blobby forms

The mascot and the bushes in the hero scene are made of overlapping circles
("fluff"). If you stroke each circle individually you get ugly internal lines
crossing the form. If you don't stroke them you get no outline at all.

**Solution — draw the group twice:**

```tsx
{/* PASS 1: stroked. Produces the outline, including internal seams. */}
<g stroke="#221D1A" strokeWidth="5" strokeLinejoin="round" fill="#FFFFFF">
  <circle cx="100" cy="78" r="34" />
  <circle cx="76"  cy="60" r="15" />
  <circle cx="124" cy="60" r="15" />
  {/* …all bumps… */}
</g>

{/* PASS 2: identical shapes, fill only, painted on top.
    This covers every internal seam and leaves only the outer silhouette. */}
<g fill="#FFFFFF" stroke="none">
  <circle cx="100" cy="78" r="34" />
  <circle cx="76"  cy="60" r="15" />
  <circle cx="124" cy="60" r="15" />
  {/* …identical list… */}
</g>

{/* PASS 3: features (eyes, nose, mouth) go on top of the clean fill. */}
```

The two circle lists must be **character-for-character identical**. Extract them
to a small array and `.map()` twice so they cannot drift:

```tsx
const HEAD_FLUFF = [
  { cx: 100, cy: 78, r: 34 },
  { cx: 76,  cy: 60, r: 15 },
  // …
];

<g stroke={INK} strokeWidth="5" strokeLinejoin="round" fill="#FFF">
  {HEAD_FLUFF.map((c, i) => <circle key={i} {...c} />)}
</g>
<g fill="#FFF">
  {HEAD_FLUFF.map((c, i) => <circle key={i} {...c} />)}
</g>
```

Put a `Fluff` helper in `primitives.tsx` that takes a circle array and a fill
and renders both passes. Use it for the mascot head, mascot body, ears, feet,
and every bush in the hero scene.

### 4.5 WORKED EXAMPLE — copy this structure exactly

This is a complete, correct tile glyph. Match its structure, ordering, and
comment style for all 14.

```tsx
/** Headphones — sound/listening challenges. 32×32, ink outline, flat fill. */
export function GlyphHeadphones({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* headband — drawn first so the cups overlap its ends */}
      <path
        d="M6 20V16a10 10 0 0 1 20 0v4"
        stroke="#221D1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* left cup */}
      <rect
        x="3" y="18" width="8" height="11" rx="3.5"
        fill="#E8332B" stroke="#221D1A" strokeWidth="2.5" strokeLinejoin="round"
      />
      {/* right cup */}
      <rect
        x="21" y="18" width="8" height="11" rx="3.5"
        fill="#E8332B" stroke="#221D1A" strokeWidth="2.5" strokeLinejoin="round"
      />
      {/* single highlight, top-left of the left mass */}
      <rect x="5" y="20.5" width="2.5" height="4" rx="1.25" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}
```

Note: outline drawn *with* the fill on the same element (not as a separate
path), painting order is back-to-front, exactly one highlight, coordinates on
half-units, no width/height, `aria-hidden`.

### 4.6 The 14 tile glyphs to author

Each previews the *kind* of challenge behind the tile. Export them from
`Glyphs.tsx` as a keyed record so `mockData.ts` can reference them by string:

```tsx
export const GLYPHS = {
  mountain: GlyphMountain,   // start / summit — flag on a peak
  search:   GlyphSearch,     // spot-the-difference — magnifier
  headphones: GlyphHeadphones,
  dog:      GlyphDog,        // odd-one-out (animals) — corgi face
  penguin:  GlyphPenguin,
  camera:   GlyphCamera,     // photo puzzle
  bubble:   GlyphBubble,     // word / speech puzzle
  star:     GlyphStar,       // bonus
  rocket:   GlyphRocket,     // launch / speed round
  code:     GlyphCode,       // `</>` — light CS question
  key:      GlyphKey,        // ciphers / passwords
  shield:   GlyphShield,     // security / firewall question
  terminal: GlyphTerminal,   // command line question
  dice:     GlyphDice,       // random / logic
} as const;

export type GlyphKey = keyof typeof GLYPHS;
```

Then add a `glyph: GlyphKey` field to the `Challenge` interface in
`src/data/mockData.ts` and populate it for all 18 pool challenges plus the
bonus. `VaultBoard` must render the glyph **for the challenge actually behind
that tile**, not one picked by grid position — this is a real behavioural fix,
the current build picks by index.

Character notes so the set feels like one hand:
- Faces (dog, penguin) get the same eye treatment: two ink ellipses `rx 1.6
  ry 2` with a white catchlight circle `r 0.6` at the upper-left of each.
- Every glyph with a "body" gets the two-pass treatment if it has overlapping
  masses, and a plain fill+stroke if it's a single shape.
- No glyph may use more than **three** fill colors plus ink plus highlight.

### 4.7 The Mascot — exact construction

A round, fluffy white character (bichon/sheep energy). Friendly, simple, big
head, small body. It is the emotional core of the app — spend real time here.

```tsx
interface MascotProps {
  className?: string;
  pose?: "idle" | "cheer" | "think";
  accessory?: "none" | "headphones" | "jersey" | "flag";
}
```

Build on `viewBox="0 0 200 200"`, stroke width `5`, ink `#221D1A`.

**Head** — `Fluff` group, white `#FFFFFF`:
- main: `cx 100, cy 78, r 34`
- 8 bumps of `r 13` evenly around a circle of radius `32` centered `(100,78)`,
  i.e. at 45° steps. Compute the coordinates and write them as literals.
- two ears: `r 11` at `(64,52)` and `(136,52)`

**Face** (drawn after the fluff's pass 2):
- eyes: ellipses `rx 4 ry 5.5` fill `#221D1A` at `(87,76)` and `(113,76)`
- catchlights: circles `r 1.6` fill `#FFFFFF` at `(88.5,73.5)` and `(114.5,73.5)`
- muzzle: ellipse `rx 12 ry 9` fill `#FFFFFF` **no stroke** at `(100,94)`
- nose: ellipse `rx 4 ry 3` fill `#221D1A` at `(100,89)`
- mouth: `<path d="M100 92q-4 6-9 3M100 92q4 6 9 3" stroke ink strokeWidth 3 fill none strokeLinecap round />`
- cheeks: circles `r 6.5` fill `#E8332B` `opacity 0.16` at `(76,88)` and `(124,88)`

**Body** — `Fluff` group, white:
- main: `cx 100, cy 142, r 26`
- 6 bumps `r 12` around radius `24`

**Limbs** — capsules drawn as thick round-capped lines, two-pass:
- arms from `(78,134)` and `(122,134)`, endpoints depend on pose
- feet: ellipses `rx 11 ry 6.5` at `(86,174)` and `(114,174)`

**Poses** (change only the arm endpoints and a small rotation on the whole
group — do not redraw the character):
- `idle` — arms down at `(64,150)` / `(136,150)`, group rotation `0`
- `cheer` — arms up at `(62,104)` / `(138,104)`, group rotation `-3°`,
  mouth becomes an open smile: `<ellipse rx 7 ry 5.5 fill ink at (100,98)>`
- `think` — left arm up to the chin `(88,100)`, head tilt `4°`

**Accessories** (rendered conditionally, on top of everything):
- `headphones` — reuse the headphone geometry scaled to the head: band
  `M62 74V64a38 38 0 0 1 76 0v10`, cups as `rx 9 ry 13` rounded rects at
  `(52,72)` and `(130,72)`, fill `csi-red` `#E8332B`
- `jersey` — a red `#E8332B` rounded-rect torso `x 74 y 122 w 52 h 44 rx 14`
  over the body fluff, with the letters `CSI` in Nunito 900 as a `<text>`
  element, `fill #FFFFFF`, `font-size 16`, centered at `(100,150)`
- `flag` — a red pennant on an ink pole in the raised right hand: pole
  `M138 104V70` stroke ink 4, flag `M138 72h26l-8 9 8 9h-26z` fill red

**Where the mascot appears** (and nowhere else — overuse kills it):
1. `ChallengeScreen` — `pose="think"`, plus `accessory` matching the challenge
   glyph where one exists. Sits above the answer options.
2. `Success` — `pose="cheer"` `accessory="jersey"`.
3. `Winner` — `pose="cheer"` `accessory="flag"`, on the first-place podium.

### 4.8 The Home hero scene (`VaultScene.tsx`)

`viewBox="0 0 240 200"`, stroke `4`. Back-to-front painting order:

1. **Sky** — leave transparent (page canvas shows through).
2. **Clouds** — 2 `Fluff` groups, white, `r 14` main + 2 bumps `r 10`, at
   `(44,36)` and `(196,28)`. No outline on clouds — they should recede. This is
   the *one* exception to the always-outline rule; note it in a comment.
3. **Back bushes** — 3 `Fluff` groups in `#F3C9C6` (a desaturated red, add as
   `--color-bush-back`), positioned `(30,132) (206,128) (120,120)`.
4. **Ground** — a rounded hill: `M0 150q120-26 240 0v50H0z` fill
   `--color-ground: #E7EEDD` (add token), ink outline on the top edge only.
5. **Vault arch** — the structure the door sits in. Rounded arch:
   `M76 148V96a44 44 0 0 1 88 0v52z` fill `light-gray` `#EDEAE3`, ink outline,
   plus 3 ink "stone" seam lines inside.
6. **Vault door** — red `#E8332B` rounded rect `x 92 y 104 w 56 h 44 rx 10`,
   ink outline, with a `#221D1A` keyhole (circle `r 5` at `(120,122)` + a
   tapered slot below).
7. **Front bushes** — 2 `Fluff` groups in `csi-red` `#E8332B` at `(52,164)` and
   `(190,160)`, ink outlined, overlapping the arch base so the scene has depth.
8. **CSI flag** — on top of the arch: pole `M120 52V30` ink 4, pennant
   `M120 32h24l-7 8 7 8h-24z` fill red, `CSI` in white Nunito 900 `font-size 8`.

Give it a `state?: "closed" | "open"` prop. When `open`, the door swings — reuse
the existing HTML-layer 3D technique already in `VaultIllustration.tsx` (Framer
routes SVG transforms through the `transform` attribute, which has no
`rotateY`, so the swing must be driven from a wrapping `<motion.div>` with
`perspective` and `transformOrigin`). **Read that file before writing this.**

---

## 5. Screen-by-screen changes

Only the deltas are listed. Anything not mentioned stays as it is.

### 5.1 `VaultTile.tsx` — the signature component

Currently: locked = flat `light-gray`; active = white card; solved = **solid
green fill**. Change to:

- **Locked** — `bg-light-gray`, the red vault-door look: render a small red
  vault door with a padlock and the digit on it (author this as
  `Props.tsx → VaultDoorLocked`, 32×32). Ink outlined. No shadow.
- **Active** — background is the tile's assigned pastel (`bg-tile-N`, from the
  new tokens). The challenge glyph in full color, centered. `shadow-soft-lifted`.
  Keep the existing breathing-ring pulse.
- **Solved** — **keeps its pastel background and its glyph.** Add:
  - a `success-green` overlay at ~18% opacity that **wipes up from the bottom**
    (`scaleY`, `origin-bottom`) over the existing `UNLOCK_MS` (350ms)
  - a `ring-2 ring-success-green` on the card
  - a **status badge, top-right**: a filled `success-green` circle with a white
    check, springing in at 35% of the wipe (use the existing `UNLOCK_ICON_IN`)
  - digit stays charcoal — it must stay readable over the pastel

  Do **not** fill the tile solid green. Nine solid green tiles at 9/9 is flat
  and monotonous; the pastels are the identity of the board.

- Add a **status badge slot top-right in all three states**: locked = nothing,
  active = an empty `2px` charcoal-at-25% ring, solved = the green check badge.
  This is a real gap — the current build has no badge at all.

Keep the existing render-time `justSolved` derivation. It is correct and subtle:
the flag must be computed during render, not in an effect, or the badge mounts
one commit before the flag flips and its entrance animation is skipped. **Do not
"simplify" it into a `useEffect`.**

### 5.2 `Home.tsx`

- Hero: swap `VaultIllustration` for the new `VaultScene`. Per the brief the
  hero shows only at 0/9 and 9/9 and the grid takes over in between — **keep
  that logic**, just upgrade the artwork.
- Headline: add small ink/red sparkle ornaments flanking "OPERATION" (author
  `Props.tsx → Sparkle`). Subtitle becomes "9 Challenges. 1 Mission. Infinite
  Fun."
- Add a white speech-card under the hero: "Hey Recruit! 👋 Tap any vault to
  start **unlocking digits!**" — last two words in `csi-red`.
- Stat chips: split the current single full-width progress row into **two
  side-by-side cards** — a key glyph + "N / 9 Digits Unlocked", and a gift glyph
  + "N Bonus".

### 5.3 `VaultGrid.tsx`

- Add the subtitle "Complete challenges to unlock digits!" under the title.
- The mega-reward card at the bottom: cream card, `rounded-card`, party-popper
  and treasure-chest props either side, "Complete all 9 to unlock **THE MEGA
  REWARD!**" with the emphasis line in `font-display font-black`.

### 5.4 `ChallengeScreen.tsx`

- Add the **Mascot** (`pose="think"`, accessory matched to the challenge glyph)
  between the question and the answer options. This replaces empty space — the
  screen currently has a large dead area there.
- Answer options for `multiple_choice` become a **2×2 grid** of white cards with
  a glyph above the label (currently single-column, text only). `image_grid`
  stays 2 or 3 columns depending on option count.
- **Migrate the option icons off lucide.** Every option in `mockData.ts`
  currently carries `iconName?: string` pointing at a lucide icon (`waves`,
  `flame`, `box`, `circle`…), rendered through the `ICONS` lookup at the top of
  `ChallengeScreen.tsx`. Change the field to `glyph?: GlyphKey`, repoint every
  option in the pool at one of your 14 glyphs, and delete the lucide lookup.
  If you skip this, the challenge screen shows a hand-drawn sticker mascot
  directly above four thin-line lucide icons — the single most obvious style
  collision available, on the screen players look at longest. Author extra
  glyphs if the 14 don't cover the option set; do not fall back to lucide.
- Lucide stays in use ONLY for interface chrome (back arrow, timer, spinner,
  chevrons). No lucide icon may appear inside an illustration or an answer card.
- Keep the red header, the white timer pill, the 400ms `CHECKING` state, the
  per-option shake, and the gold header for bonus. All correct already.

### 5.5 `Success.tsx`

- Headline "WOOHOO!" replacing "SUCCESS!", `csi-red`, `font-black`.
- Mascot `pose="cheer"` `accessory="jersey"`.
- Keep the digit card and the VaultTile unlock replay.
- Keep "N vaults left". **Do not add an XP row.**
- Add static sparkle props flanking the big digit (decoration, not animation).

### 5.6 `BonusFound.tsx`

- Add the illustrated **gift box** (red box, gold ribbon, ink outline) as the
  hero. Author in `Props.tsx`.
- Copy: "You found a bonus challenge!" / "Complete it for a bonus digit."
  (**not** "extra XP").
- Still no confetti here.

### 5.7 `Leaderboard.tsx` / `LeaderboardRow.tsx`

- Ranks 1–3 get **medal badges** — a filled circle with an ink outline and the
  rank numeral inside: gold `#F4B93E`, silver `#D8D4CC`, bronze `#D08B52` (add
  as tokens). Ranks 4+ stay plain numerals.
- Add **avatar circles** — since we have no photos, author a small set of 6
  simple face variants in `Props.tsx` (`Avatar` with an `index` prop) and pick
  deterministically from the player id hash.
- Keep the `layout` animation and the `key={entry.id}` — do **not** key rows by
  rank, that is what breaks the slide.

### 5.8 `Winner.tsx`

- Mascot `pose="cheer"` `accessory="flag"` above the first-place podium.
- Medal badges on the podium blocks.
- Still **no confetti**.

### 5.9 `Splash.tsx` — do not skip this

`VaultIllustration.tsx` has **three** consumers: `Home`, `VaultComplete`, and
`Splash`. Splash is the first screen every student sees after scanning the QR
code. If you upgrade Home and Vault Complete to `VaultScene` and leave Splash
alone, the app opens on the old geometric vault and then switches art style one
screen later.

Either point Splash at `VaultScene` (closed state, no landscape — pass a
`scenery={false}` prop that renders only the arch + door), or keep
`VaultIllustration` and restyle it to match the new ink-outline system. Pick
one and apply it consistently. When no consumers remain, delete
`VaultIllustration.tsx`; do not leave it orphaned in the tree.

### 5.10 `VaultComplete.tsx`

Has no mockup reference — follow the written brief. Full `charcoal` background
(the one screen allowed off the off-white base), the vault door swinging open,
the compact 9-tile summary strip, confetti. Upgrade the door to the new
`VaultScene` art with a dark-tone variant. Keep the run-time stat; **no XP
stat.**

Render it as `<VaultScene tone="dark" state="open" scenery={false} />` — arch and
door only. The landscape layers (clouds, ground hill, both bush groups) are lit
for the off-white canvas; a green hill and pink bushes on a near-black
background reads as a bug, not a climax. `scenery={false}` is the same variant
Splash uses.

---

## 6. Content — `src/data/mockData.ts`

The pool is currently 18 CS-trivia questions. Rebalance to **roughly half
playful visual puzzles, half light CS questions**, keeping 18 total so the
name-seeded draw still yields meaningfully different boards.

- Add ~8 non-verbal puzzles: spot-the-odd-one-out, match-the-pair, count-the-
  shapes, which-is-different, emoji rebus. These use `image_grid` and lean on
  the glyphs/props you author.
- **No audio challenges.** 60 phones playing sound in one room is unworkable.
- Keep the existing seeded-draw functions (`getChallengeSet`, `hashSeed`,
  `mulberry32`) exactly as they are.
- Add the `glyph: GlyphKey` field to every challenge (§4.6).
- **Pastel comes from grid position, not from the challenge.** Tile 1 is always
  `bg-tile-1`, tile 9 always `bg-tile-9`. Do NOT put a `tileColor` field on the
  challenge: there are 18 challenges and only 9 pastels, so a 9-card draw would
  deal duplicate pastels next to each other and leave other pastels unused.
  Position gives the color; the challenge gives the glyph.

---

## 7. Acceptance checklist — run every one of these

```bash
# 1. Compiles and builds
npx tsc --noEmit && npx vite build

# 2. Zero raw Tailwind palette / arbitrary radii / stray shadows.
#    Must print nothing.
grep -rnE "text-gray-|bg-gray-|border-gray-|bg-red-[0-9]|text-red-[0-9]|bg-yellow-[0-9]|bg-green-[0-9]|text-green-[0-9]|rounded-\[|rounded-2xl|rounded-3xl|shadow-(sm|md|lg|xl|2xl|inner)|var\(--color-" src/

# 3. Confetti on exactly two screens. Must list only Success + VaultComplete.
grep -rln "celebrate(" src/screens/

# 4. No XP anywhere. Exactly ONE hit is allowed: the explanatory comment in
#    Success.tsx recording that the slot was intentionally removed.
grep -rniE "\bxp\b|addScore|\+120" src/

# 5. No new dependencies. Must print "deps: 14 | dev: 11".
#    (This project is NOT a git repo — do not try `git diff`.)
node -e "const p=require('./package.json');console.log('deps:',Object.keys(p.dependencies).length,'| dev:',Object.keys(p.devDependencies).length)"

# 6. Every art SVG is aria-hidden. The two numbers must be equal.
grep -ho "<svg" src/components/art/*.tsx | wc -l
grep -ho "aria-hidden" src/components/art/*.tsx | wc -l

# 7. No forbidden SVG features. Must print nothing.
grep -rnE "linearGradient|radialGradient|<filter|feDropShadow|<mask" src/components/art/

# 8. Every new colour token actually COMPILED. Each line must print 1.
#    A malformed @theme value (e.g. `--FEEDE0` instead of `#FEEDE0`) produces no
#    utility at all, so the tile renders with no background. tsc passes, the
#    build passes, and checks 1-7 all pass. This is the only check that sees it.
npx vite build >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8 9; do
  printf "bg-tile-%s: %s\n" "$i" "$(grep -c "bg-tile-$i" dist/assets/*.css)"
done

# 9. No lucide icons leaked into illustrations or answer cards. Must print nothing.
grep -rn "lucide-react" src/components/art/
grep -rnE "iconName" src/
```

Then, by eye, at 390×844 (iPhone 14 viewport):

- [ ] All 14 glyphs sit at comparable optical weight in a 3×3 grid — no glyph
      obviously heavier or lighter than its neighbours
- [ ] The fluff forms have a clean outer silhouette with **no internal seam
      lines** (if you see seams, pass 2 does not match pass 1)
- [ ] The mascot is recognisably the same character in all three poses
- [ ] The solved tile keeps its pastel and reads as solved at a glance
- [ ] The green wipe runs bottom-to-top and the badge lands mid-wipe
- [ ] Nothing on any screen has a tap target under 56px
- [ ] No horizontal scroll on any screen

---

## 8. Order of work

Do it in this sequence — later steps depend on earlier ones.

1. Add the new `@theme` tokens to `src/index.css` (§3.3).
2. `art/primitives.tsx` — `INK`, `Fluff`, shared stroke props.
3. `art/Glyphs.tsx` — all 14. Build a scratch page rendering them in a 3×3 grid
   and check optical weight before moving on.
4. `art/Props.tsx` — vault door, gift box, treasure chest, medal, sparkle,
   avatars.
5. `art/Mascot.tsx` — all three poses, all three accessories.
6. `art/VaultScene.tsx` — including the open/closed swing.
7. `mockData.ts` — glyph keys, tile colors, rebalanced content.
8. `VaultTile.tsx` — pastels, badge slot, green-wash solved state.
9. Screens, in the order listed in §5.
10. Run the full §7 checklist.

Do not move to the next step until the current one builds.

---

## 8b. Non-negotiables that a summary will drop

A plan generated from this document will compress the sections below, because
they are long and repetitive. **They are long on purpose.** If your plan renders
any of these as a single line, go back to the section and work from the
section, not from your plan.

1. **The mascot is not "a fluffy character."** §4.7 gives literal coordinates
   for the head fluff, both eyes, both catchlights, the muzzle, the nose, the
   mouth path `d` string, the cheeks, the body, the limbs, all three poses as
   arm-endpoint deltas, and all three accessories with their own geometry.
   Use those numbers. Do not improvise a character and do not reduce this to
   "fluffy bichon with 3 poses."
2. **The hero scene is not "clouds, bushes, a hill and a door."** §4.8 gives an
   8-layer back-to-front paint order with literal path data. Painting order is
   the whole illusion of depth; getting the list right but the order wrong
   produces a flat sticker collage.
3. **The per-drawing consistency rules in §4.2 are the deliverable**, not
   garnish: stroke `2.5`/`5`/`4` by canvas size, round linecap AND linejoin on
   everything, coordinates snapped to half units, no `width`/`height` on the
   `<svg>`, one highlight per mass at `0.35`, max three fills per glyph, and the
   shared eye treatment on every face. Thirty drawings that each break a
   different one of these will each look fine alone and incoherent together.
4. **§4.3 colour discipline decides whether glyphs work at all.** Tile glyphs
   are fixed-identity with a permanent `#221D1A` outline; only the tile
   *background* changes with state. Get this wrong and glyphs vanish on solved
   tiles.
5. **`VaultTile`'s `justSolved` flag must stay derived during render.** It is
   computed in the render body against a `useRef`, deliberately. Moving it into
   a `useEffect` makes the badge mount one commit before the flag flips, so its
   spring entrance never plays. It will still compile and still look "fine" in
   a static screenshot. Do not refactor it.
6. **Follow the §8 build order and its gate.** After the glyphs, render all 14
   into a scratch 3×3 grid and check optical weight *before* writing anything
   else. Do not advance a step until `npx tsc --noEmit && npx vite build`
   passes.

## 8c. If you are given the mockup image as a reference

A mockup of this app exists and may be supplied alongside this document. Use it
for **art style, warmth, density, and character** — that is what it is for.

It predates several decisions and **contradicts this document in six places.
This document wins on every one of them:**

| Mockup shows | Build instead | Why |
|---|---|---|
| "+1 Digit Added! 120 XP" on success | "N vaults left" | XP/progression cut from scope |
| Red bonus-challenge header | **Gold/yellow** header | It is how bonus is told apart at a glance |
| Locked tile as a large solid red door | `bg-light-gray` card + small red vault-door glyph | Red is never a background |
| Hero scene visible at 3/9 | Hero **only** at 0/9 and 9/9 | The grid is the hero in between |
| "SOUND SNAP" audio challenge | No audio challenges at all | 60 phones playing sound in one room |
| Hamburger menu on Home/Leaderboard | No menu | There is nothing behind it |

The mockup **is** right, and agrees with this document, on: solved tiles keeping
their pastel with a small green corner check badge; the red challenge header;
full-width red CTAs pinned to the bottom; borderless white cards on cream with
almost no shadow; and the medal badges for ranks 1–3.

## 9. If something here conflicts with what you find in the code

The code is the source of truth for *how things currently work*; this document
is the source of truth for *how they should look*. If a change here would break
working behaviour — the seeded challenge draw, the leaderboard sort, the unlock
timing, the router — **keep the behaviour and flag the conflict in your summary
rather than silently changing it.**
