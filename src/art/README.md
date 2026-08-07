# Art Asset Specification & Pipeline

This folder houses the custom illustrations and scene props for the game. All assets are loaded dynamically via `src/art/index.ts`. Overwriting or adding a file in these folders will update the UI immediately without any code edits.

## Folders
- `/glyphs` — Challenge icons named after `GlyphKey` values (e.g. `headphones.png`, `dog.png`)
- `/props` — Special game elements (`gift.png`, `chest.png`, `popper.png`, `lock.png`)

## Asset Specification
- **Size & Format**: 512 × 512 pixels, PNG format with transparent backgrounds (genuine transparency, no white background).
- **Styling**: Center the subject, covering approximately 85% of the canvas. Ensure optical weights are uniform across the set.
- **Outlines**: Bold, thick black outlines. The icons will render at 44px–64px, so details must survive an 8× downscale. Avoid fine linework or small details.
- **Naming**: Filename must match the `GlyphKey` or prop key exactly in lowercase (e.g. `headphones.png`, `lock.png`).

---

## Generation Prompt

Use this generation setup for consistent illustrations:

> Flat vector-style illustration of **{subject}**, thick uniform black outline, bold saturated flat colours, no gradients, rounded friendly chunky shapes, Nintendo game-icon style, single centred object, transparent background, no text, no drop shadow, no scene, no background elements.

### Negative Prompts
> gradients, realistic shading, photorealism, text, watermark, drop shadow, background, thin delicate lines, multiple objects, cropped edges

### Subjects by GlyphKey
- `mountain`: snowy mountain peak with a red flag
- `search`: magnifying glass
- `headphones`: over-ear headphones
- `dog`: corgi face
- `penguin`: penguin
- `camera`: retro camera
- `bubble`: speech bubble
- `star`: five-point star
- `rocket`: cartoon rocket
- `code`: laptop showing angle brackets
- `key`: ornate key
- `shield`: heraldic shield
- `terminal`: computer keyboard
- `dice`: single die showing five
- `flame`: flame
- `wave`: ocean wave
- `lightning`: lightning bolt
- `droplet`: water droplet
- `leaf`: leaf
- `sun`: smiling sun
- `box`: cardboard box
- `circle`: blue circle
- `triangle`: red triangle
- `hexagon`: orange hexagon
- `wind`: gust-of-wind swirl
- `apple`: red apple
- `banana`: banana
- `grapes`: bunch of grapes
- `orange`: orange

### Props
- `gift`: wrapped present with ribbon
- `chest`: treasure chest
- `popper`: party popper
- `lock`: closed padlock
