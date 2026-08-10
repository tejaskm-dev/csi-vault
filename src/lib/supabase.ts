import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase connection, and the decision of whether there is one.
 *
 * The app has to run in two worlds. On the day, sixty phones talk to a real
 * database. Every other day — building a screen, tweaking the vault door
 * animation, showing someone the design — there is no reason to need a network
 * or a live session, and the previous prototype's mock data is genuinely the
 * better development experience.
 *
 * So `isLive` gates everything. When the env vars are absent the app runs
 * exactly as it did before this backend existed, on mockData and localStorage,
 * with no errors and no dead screens. That is not a fallback bolted on for
 * safety; it is how you will spend most of your time in this codebase.
 */

const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** True when this build has somewhere to connect to. */
export const isLive = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isLive
  ? createClient(url!, anonKey!, {
      auth: {
        // Anonymous sign-in gives each phone a real auth.uid(), which is what
        // every RLS policy in the schema keys off. Persisting it means a
        // student who backgrounds the browser and comes back — which happens
        // constantly, because they are walking around a room — returns as the
        // same player rather than a new one.
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        // The hall display and the handshake prompt are the only live things.
        // Ten events a second is plenty for both and keeps the socket quiet on
        // venue wifi.
        params: { eventsPerSecond: 10 },
      },
    })
  : null;

/**
 * Sign in anonymously, once, and hand back the session.
 *
 * Called before any RPC. Supabase caches the session in localStorage, so on a
 * refresh this resolves without a round trip and the player lands straight
 * back on their board.
 */
let signInPromise: Promise<string | null> | null = null;

export function ensureAuth(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);

  // Deduped: several components mount at once on first paint and would
  // otherwise each fire their own sign-in, minting several anonymous users for
  // one phone — and the extras would be indistinguishable from real players in
  // the join count.
  if (signInPromise) return signInPromise;

  signInPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;

    const { data: created, error } = await supabase.auth.signInAnonymously();
    if (error) {
      // A failed sign-in is not recoverable by retrying in a loop — it means
      // anonymous auth is switched off in the project settings. Say so
      // plainly; the alternative is a phone that silently never joins.
      console.error(
        "[vault] anonymous sign-in failed. Enable it under " +
          "Authentication → Providers → Anonymous in the Supabase dashboard.",
        error.message
      );
      signInPromise = null;
      return null;
    }
    return created.user?.id ?? null;
  })();

  return signInPromise;
}

/** Public URL for a file in a storage bucket. */
export function publicUrl(bucket: string, path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
