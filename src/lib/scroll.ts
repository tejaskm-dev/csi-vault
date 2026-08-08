/**
 * Scrolling helpers.
 *
 * Now that screens are taller than the viewport, two things have to be
 * handled that never came up while every page fit: the browser keeps the old
 * scroll offset across a route change, and an action can produce a result
 * that is off screen.
 */

/** Motion is decoration here too — honour the OS setting. */
function behavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Bring an element into view if it is not already comfortably visible.
 *
 * The "if" matters: scrolling when the target is already on screen yanks the
 * page under someone's thumb for no reason, which is worse than not scrolling
 * at all. `pad` is how much clearance counts as comfortable — the leaderboard
 * passes its pinned footer height so a row hidden behind the footer still
 * counts as off screen.
 */
export function revealElement(el: HTMLElement | null, pad = 24) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const top = pad;
  const bottom = window.innerHeight - pad;
  if (r.top >= top && r.bottom <= bottom) return;
  el.scrollIntoView({ behavior: behavior(), block: "center" });
}

/** Back to the top. Used on navigation. */
export function scrollToTop(smooth = false) {
  window.scrollTo({ top: 0, behavior: smooth ? behavior() : "auto" });
}
