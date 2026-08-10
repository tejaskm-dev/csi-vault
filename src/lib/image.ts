/**
 * Shrink a photo to a GUARANTEED size before it goes anywhere near the network.
 *
 * A modern phone camera produces 4-12MB per shot. Sixty of those, uploaded over
 * shared college wifi, in the middle of a timed game, is the single most likely
 * way this event falls over — and the photos are destined for a projector and a
 * 100px avatar, so the extra pixels buy nothing at all.
 *
 * The previous version got the idea right and the guarantee wrong, in three
 * ways that all showed up as the same symptom — an upload that times out:
 *
 *   · It targeted a max edge and a fixed quality, not a size. "1280px at 0.72"
 *     is 150KB for a photo of a wall and 700KB for a photo of a crowded room
 *     with a lot of detail, which is exactly what these challenges ask for.
 *
 *   · The viewfinder never called it. It encoded its own 1280px square at 0.78
 *     — larger than the path that was supposed to be the unoptimised fallback.
 *
 *   · Its no-canvas branch returned the ORIGINAL FILE. A browser that could not
 *     give us a 2d context uploaded eight megabytes instead of failing.
 *
 * So this one iterates until the bytes are actually under budget, and
 * uploadPhoto calls it on every path rather than trusting callers.
 */

/** Plenty for a projector wall; a quarter of the pixels of the old target. */
const MAX_EDGE = 800;

/**
 * The number that matters. Roughly two seconds on a bad shared uplink, where
 * the old 400-700KB output was ten or more — past the point where sixty phones
 * finish before the round does.
 */
const BUDGET_BYTES = 140_000;

/** Tried in order until one comes in under budget. */
const QUALITIES = [0.72, 0.6, 0.5, 0.4, 0.32];

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  // OffscreenCanvas where it exists (every browser that matters on a 2024
  // phone), falling back to a detached <canvas> for anything older.
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

function encode(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number
): Promise<Blob | null> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  return new Promise((resolve) =>
    (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", quality)
  );
}

/**
 * Re-encode until it fits, or run out of options.
 *
 * `square` centre-crops rather than letter-boxing — the photo wall is a grid,
 * and a mix of portrait and landscape in a grid looks like a mistake.
 */
export async function shrinkForUpload(
  source: Blob,
  { maxEdge = MAX_EDGE, budget = BUDGET_BYTES, square = false } = {}
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return source;                       // undecodable: better sent than lost
  }

  try {
    let edge = maxEdge;

    // Two passes at most. If the smallest quality at full target size is still
    // too big — a very noisy photo — halve the dimensions and try again.
    for (let pass = 0; pass < 2; pass++) {
      const side = Math.min(bitmap.width, bitmap.height);
      const scale = square
        ? Math.min(1, edge / side)
        : Math.min(1, edge / Math.max(bitmap.width, bitmap.height));

      const w = square ? Math.round(side * scale) : Math.round(bitmap.width * scale);
      const h = square ? w : Math.round(bitmap.height * scale);

      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext("2d") as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;

      // No 2d context and nothing to fall back on. Returning the original here
      // is what used to send eight megabytes over venue wifi; a photo that
      // cannot be shrunk is a photo that must not be sent.
      if (!ctx) throw new Error("no canvas context");

      if (square) {
        ctx.drawImage(
          bitmap,
          (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
          0, 0, w, h
        );
      } else {
        ctx.drawImage(bitmap, 0, 0, w, h);
      }

      let smallest: Blob | null = null;
      for (const q of QUALITIES) {
        const out = await encode(canvas, q);
        if (!out) continue;
        smallest = out;
        if (out.size <= budget) return out;
      }

      // Everything at this size was too big. Halve and go again; on the second
      // pass, take the smallest we managed rather than looping forever.
      if (pass === 1 && smallest) return smallest;
      edge = Math.round(edge / 2);
    }

    return source;
  } finally {
    bitmap.close();
  }
}

/**
 * The old name, kept because it reads better at the picker call site.
 * Same function; the guarantee is the one above.
 */
export function downscale(file: File, maxEdge = MAX_EDGE): Promise<Blob> {
  return shrinkForUpload(file, { maxEdge });
}
