import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isLive, publicUrl } from "./supabase";
import * as api from "./api";

/**
 * The reaction layer — the bit that makes the game feel like it is watching.
 *
 * A GIF fires when something in the room actually happens: you solve a vault
 * in six seconds, you miss three in a row, you take the lead. The joke only
 * lands because it is specific, which is also why the library is sixteen and
 * not eighty. A reaction that appears every thirty seconds is wallpaper by
 * vault three; one that shows up twice in a run is a thing people turn their
 * phone around to show the person next to them.
 *
 * The whole layer is optional. Offline, or with an empty bucket, `fire()` is a
 * no-op — nothing renders, nothing errors, no screen changes shape.
 */

/** Every moment worth reacting to. Matched against `memes.trigger` in SQL. */
export type Trigger =
  | "fast_solve"      // cracked it in under ~8s
  | "slow_solve"      // over a minute on one vault
  | "timeout"         // clock ran out
  | "wrong"           // a single miss
  | "miss_3"          // three in a row — the "are you okay" moment
  | "streak_3"
  | "streak_5"
  | "bonus_win"
  | "rank_up"         // overtook someone
  | "rank_down"
  | "vault_complete"  // all nine
  | "first_connect"   // met your first stranger
  | "photo_done";

interface Meme {
  id: string;
  label: string;
  trigger: string;
  storage_path: string;
  /** Absolute URL. Set when the reaction is hosted elsewhere. */
  url: string | null;
  weight: number;
}

interface ReactionState {
  fire: (trigger: Trigger) => void;
  current: { url: string | null; label: string; shout: string } | null;
  dismiss: () => void;
}

/**
 * The reaction that always works.
 *
 * The GIF library needs sixteen files uploaded to a storage bucket, and until
 * they are there `memes` has rows pointing at nothing — so the whole layer did
 * precisely nothing, silently. That is a bad default: the reactions are the
 * part that makes the game feel like it is watching you, and they should not
 * be gated on an errand.
 *
 * So every trigger has a shout. With no uploads you get a hand-lettered
 * sticker in the app's own voice; with uploads the GIF plays instead and the
 * shout becomes its caption. Same timing, same rules, no configuration.
 */
const SHOUTS: Record<Trigger, string[]> = {
  fast_solve:     ["TOO FAST", "SIUUU", "INSTANT"],
  slow_solve:     ["FINALLY", "TOOK A WHILE"],
  timeout:        ["CLOCK'S OUT"],
  wrong:          ["NOPE"],
  miss_3:         ["ROUGH ONE", "BREATHE"],
  streak_3:       ["THREE UP", "ON A ROLL"],
  streak_5:       ["FIVE STRAIGHT", "UNREAL"],
  bonus_win:      ["BONUS BAGGED", "BIG BRAIN"],
  rank_up:        ["CLIMBING", "OVERTAKEN"],
  rank_down:      ["SLIPPING"],
  vault_complete: ["ALL NINE", "VAULT OPEN"],
  first_connect:  ["NEW CREW", "FIRST CONTACT"],
  photo_done:     ["EVIDENCE LOGGED", "ABSOLUTE CINEMA"],
};

function pickShout(t: Trigger) {
  const list = SHOUTS[t] ?? ["NICE"];
  return list[Math.floor(Math.random() * list.length)];
}

const ReactionContext = createContext<ReactionState>({
  fire: () => {},
  current: null,
  dismiss: () => {},
});

/** How long a reaction sits on screen before it clears itself. */
const HOLD_MS = 2200;

/**
 * The floor between two reactions, whatever fires in between.
 *
 * Without this, finishing three quick vaults in a row stacks fast_solve on
 * streak_3 on rank_up and the player spends the next ten seconds watching GIFs
 * instead of playing. The game is the point; this is seasoning.
 */
const COOLDOWN_MS = 12000;

export function ReactionProvider({ children }: { children: React.ReactNode }) {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [current, setCurrent] = useState<
    { url: string | null; label: string; shout: string } | null
  >(null);
  const lastFired = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);

  // Fetched once. Sixteen rows, and they never change during a session.
  useEffect(() => {
    if (!isLive) return;
    api.fetchMemes()
      .then(setMemes)
      // A missing meme table is not worth breaking a game over. The room will
      // simply not see any GIFs, which nobody but you will notice.
      .catch(() => setMemes([]));
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent(null);
  }, []);

  const fire = useCallback(
    (trigger: Trigger) => {
      const now = Date.now();
      if (now - lastFired.current < COOLDOWN_MS) return;

      const pool = memes.filter((m) => m.trigger === trigger);

      // No GIF for this trigger — or none uploaded at all. Still react.
      if (!pool.length) {
        lastFired.current = now;
        setCurrent({ url: null, label: trigger, shout: pickShout(trigger) });
        if (timer.current) clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCurrent(null), HOLD_MS);
        return;
      }

      // Prefer one this player has not seen. When several share a trigger the
      // point is variety, and repeating the same GIF for every fast answer
      // undoes the whole effect.
      const fresh = pool.filter((m) => !seen.current.has(m.id));
      const candidates = fresh.length ? fresh : pool;

      // Weighted pick — `weight` lets a stronger GIF carry a trigger without
      // crowding the others out entirely.
      const total = candidates.reduce((sum, m) => sum + Math.max(1, m.weight), 0);
      let roll = Math.random() * total;
      const chosen =
        candidates.find((m) => (roll -= Math.max(1, m.weight)) <= 0) ?? candidates[0];

      seen.current.add(chosen.id);
      lastFired.current = now;
      setCurrent({
        // A pasted link wins over a bucket file, so the two can coexist while
        // the library is being filled in. Neither is required — a row with
        // both empty still fires, as the shout.
        url: chosen.url?.trim()
          ? chosen.url.trim()
          : chosen.storage_path
          ? publicUrl("memes", chosen.storage_path)
          : null,
        label: chosen.label,
        shout: pickShout(trigger),
      });

      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCurrent(null), HOLD_MS);
    },
    [memes]
  );

  const value = useMemo(() => ({ fire, current, dismiss }), [fire, current, dismiss]);

  return <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>;
}

export function useReactions() {
  return useContext(ReactionContext);
}

/**
 * Classify a solve into the trigger it deserves, if any.
 *
 * Kept next to the trigger list rather than in a screen so the thresholds are
 * in one readable place — these are the numbers you will actually want to tune
 * after the dry run.
 */
export function triggerForSolve(opts: {
  seconds: number;
  streak: number;
  isBonus?: boolean;
  allDone?: boolean;
}): Trigger | null {
  if (opts.allDone) return "vault_complete";
  if (opts.isBonus) return "bonus_win";
  if (opts.streak >= 5) return "streak_5";
  if (opts.streak >= 3) return "streak_3";
  if (opts.seconds <= 8) return "fast_solve";
  if (opts.seconds >= 60) return "slow_solve";
  return null;
}
