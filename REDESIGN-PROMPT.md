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

## 3. ICONS AND ART — do not hand-author SVG

**This is the most important instruction in the document.**

Two previous attempts at this app hand-wrote SVG path coordinates for icons, a
mascot and a landscape. Both produced work that looked hand-coded, because it
was. Do not repeat this.

**Use emoji.** Every challenge icon, answer icon, prop, medal and avatar is an
emoji. They are professionally drawn, they ship with the phone, they cost
nothing, and they sit perfectly inside an ink-outlined tile.

Render them inside an `<svg><text>` rather than a `<span>`, so a glyph scales
with its box instead of needing a font-size at every call site:

```tsx
const EMOJI_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Android Emoji",sans-serif';

export function Glyph({ emoji, label, className }: {
  emoji: string; label: string; className?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={label}>
      <text x="16" y="17" fontSize="26" textAnchor="middle"
            dominantBaseline="central" fontFamily={EMOJI_STACK}>
        {emoji}
      </text>
    </svg>
  );
}
```

`src/data/mockData.ts` already types every challenge and every answer option
with a semantic `glyph` name (`'headphones' | 'dog' | 'rocket' | …`). Build one
map from those names to emoji in `src/components/Glyphs.tsx` and export it.
Cover every value in the `GlyphKey` union — read the type, it is the contract.

Suggested mapping: mountain ⛰️ · search 🔍 · headphones 🎧 · dog 🐶 ·
penguin 🐧 · camera 📷 · bubble 💬 · star ⭐ · rocket 🚀 · code 💻 · key 🔑 ·
shield 🛡️ · terminal ⌨️ · dice 🎲 · flame 🔥 · wave 🌊 · lightning ⚡ ·
droplet 💧 · leaf 🍃 · sun 🌞 · box 📦 · circle 🔵 · triangle 🔺 ·
hexagon 🔶 · wind 💨 · apple 🍎 · banana 🍌 · grapes 🍇 · orange 🍊

**Avoid ZWJ sequences** (👩‍💻, 🧑‍🎓) — they split into component emoji on older
Android, which is most of the devices at this event. Single codepoints only.

**Optional upgrade, only if straightforward:** OpenMoji (openmoji.org, CC BY-SA
4.0) is an open emoji set whose signature style is exactly flat colour with a
black outline — it matches this design language better than system emoji and
renders identically on every device. If you can vendor ~30 SVGs into
`src/components/emoji/`, do it and credit it in the README. If that adds
friction, ship native emoji; it is not a blocker.

**The only bespoke artwork in this app is the vault door** (§7). Nothing else.
There is no mascot. Do not invent one.

---

## 4. THE VAULT TILE — the signature component

`src/components/VaultTile.tsx` is currently an unstyled button with three
states. Everything in the app is judged against it. Spend the most time here.

```
┌─────────────────┐  ← 3px ink border, radius 28px, 5px 5px 0 ink shadow
│ 7          ◯    │  ← digit in `pixel` font, top-left. Status badge top-right.
│                 │
│      🎧         │  ← emoji glyph, ~48px, centred
│                 │
└─────────────────┘
```

- **`locked`** — fill `paper-deep`. Glyph replaced by a 🔒. Digit and lock at
  40% opacity. **`shadow-ink-sm`**, not the full shadow: it should sit visibly
  lower than its playable neighbours. Not tappable.
- **`active`** — fill = that grid position's `tile-N` colour. Full-colour emoji
  glyph. `shadow-ink`. Top-right badge is an empty ink ring. The tile bobs
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
  with an emoji above each label. Submit disables on tap and shows a "CHECKING"
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
- **Leaderboard** `/leaderboard` — ranks 1–3 get 🥇🥈🥉, everyone else a pixel
  numeral. Emoji avatars. The "you" row is visually distinct. Rows animate to
  new positions with Framer `layout` (~300ms) — and **must be keyed by
  `entry.id`, never by rank**, since rank is the thing that changes and keying
  on it destroys the animation.
- **Winner** `/winner` — 2nd/1st/3rd podium. No confetti here.
- **BonusFound** `/bonus-found` — gold treatment, 🎁. No confetti here either.
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
2. `Glyphs.tsx` — the emoji map. Render all of them into a scratch 3×3 grid and
   look at it before continuing.
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

If any answer disappoints, that part is not finished. Report honestly what is
still weak rather than declaring done.
