import { supabase, ensureAuth } from "./supabase";
import { shrinkForUpload } from "./image";
import type { Challenge, ChallengeOption, GlyphKey } from "../data/mockData";

/**
 * Every call the app makes to the server, in one file.
 *
 * Two rules hold this layer together:
 *
 * 1. Nothing here selects from a table that scores anything. Reads go through
 *    RPCs, writes go through RPCs, and the RPCs are SECURITY DEFINER. If a
 *    future change needs a new query, add a function in SQL rather than a
 *    `.from("assignments").update(...)` here — that is the line that keeps
 *    "open devtools and set your score to 9" impossible.
 *
 * 2. The server's shape is translated into the app's shape HERE, once. Screens
 *    already speak `Challenge`, and they should not learn a second vocabulary
 *    just because the data now arrives over a wire.
 */

/* ------------------------------------------------------------------ *
 * Wire types
 * ------------------------------------------------------------------ */

/** A row from my_board(). Mirrors the RETURNS TABLE in 0002_rpc.sql. */
interface BoardRow {
  assignment_id: string;
  slot: number;
  /** Which challenge within the vault. 1-based. Absent on pre-stage boards. */
  step?: number;
  vault_label?: string;
  challenge_id: string;
  kind: string;
  title: string;
  question: string;
  hint: string;
  glyph: string;
  time_limit: number;
  is_bonus: boolean;
  payload: ChallengePayload;
  solved: boolean;
  target_no: number | null;
  target_name: string | null;
}

/** Everything a challenge kind might carry. All optional by design. */
export interface ChallengePayload {
  options?: ChallengeOption[];
  /** observe: which micro-game to render */
  mode?: "colour_trap" | "impostor" | "flash" | "pair";
  /** colour_trap */
  word?: string;
  ink?: string;
  choices?: string[];
  /** impostor */
  fill?: GlyphKey;
  odd?: GlyphKey;
  count?: number;
  odd_index?: number;
  /** impostor: how the odd tile differs, and how subtly (1 easiest). */
  variant?: 'rotate' | 'size' | 'flip' | 'tint';
  strength?: number;
  /** flash: the row shown, which position is asked, and the options. */
  symbols?: string[];
  ask_index?: number;
  /** pair: the grid, with exactly two matching tiles. */
  tiles?: string[];
  /** exchange: this player's half of the combination */
  mine?: number;
  symbol?: string;
  /** recall: the interaction being asked about */
  about?: string;
  /** minigame: which game, and the seed its puzzle is generated from */
  game?: string;
  seed?: number;
  level?: number;
  /** compute: the personalised sum this player must work out. */
  prompt?: string;
  /** anagram: the scrambled letters, dealt server-side. */
  letters?: string;
  /** anagram: what the word means. Without it the tiles are a search, not a
   *  puzzle — see the note in Anagram.tsx. */
  clue?: string;
  /** tumbler: the dealt combination. */
  combo?: number[];
}

export interface PlayerRow {
  id: string;
  session_id: string;
  name: string;
  vault_no: number;
  avatar_url: string | null;
}

export interface SessionRow {
  id: string;
  name: string;
  phase: "lobby" | "live" | "ended";
  started_at: string | null;
  join_code: string;
  /** Operator message shown on every phone. Null when there is nothing to say. */
  notice?: string | null;
  notice_at?: string | null;
  /** Can a brand-new player still join? False once the game is running. */
  doors_open?: boolean;
}

export interface LeaderRow {
  rank: number;
  player_id: string;
  name: string;
  vault_no: number;
  vaults: number;
  bonus: number;
  /**
   * Present from fetchLeaderboard, ABSENT from the snapshot.
   *
   * The snapshot sends a hundred of these to every phone every four seconds,
   * and the game screens render none of these three — `effective` and
   * `elapsed` are the ordering the server has already applied, and avatar_url
   * has always been null. Three unused columns at that rate is most of a
   * megabyte a minute, so the snapshot omits them. The hall display, which is
   * one laptop polling every few seconds, still gets the full row.
   */
  avatar_url?: string | null;
  effective?: number;
  elapsed?: number;
}

export interface InteractionRow {
  id: string;
  actor_id: string;
  target_id: string;
  assignment_id: string | null;
  kind: "connect" | "exchange" | "recall" | "charades";
  state: "pending" | "confirmed" | "expired";
  fact: { value?: number; [k: string]: unknown };
  expires_at: string;
}

export interface PhotoRow {
  id: string;
  player_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface SubmitResult {
  correct: boolean;
  solved: boolean;
  replay?: boolean;
  vaults?: number;
  bonus?: number;
  /**
   * Set by GameContext, not the server: was this the LAST unsolved step of its
   * vault? A vault of three challenges shows the unlock celebration once, on
   * the third, not three times.
   */
  vaultComplete?: boolean;
}

/* ------------------------------------------------------------------ *
 * Translation
 * ------------------------------------------------------------------ */

/**
 * The server calls a multiple-choice question `mcq`; the app has always called
 * it `multiple_choice`. Renaming either side would be churn for its own sake,
 * so the two names meet here and nowhere else.
 */
const KIND_TO_TYPE: Record<string, Challenge["type"]> = {
  mcq: "multiple_choice",
  image_grid: "image_grid",
  text_input: "text_input",
  observe: "observe",
  connect: "connect",
  exchange: "exchange",
  recall: "recall",
  photo: "photo",
  minigame: "minigame",
  charades: "charades",
  duel: "duel",
  compute: "compute",
};

function toChallenge(row: BoardRow): Challenge {
  return {
    id: row.challenge_id,
    assignmentId: row.assignment_id,
    slot: row.slot,
    step: row.step ?? 1,
    vaultLabel: row.vault_label || undefined,
    title: row.title,
    type: KIND_TO_TYPE[row.kind] ?? "multiple_choice",
    question: row.question,
    hint: row.hint,
    glyph: row.glyph as GlyphKey,
    timeLimit: row.time_limit,
    isBonus: row.is_bonus,
    options: row.payload?.options,
    payload: row.payload ?? {},
    solved: row.solved,
    targetNo: row.target_no,
    targetName: row.target_name,
    // Deliberately absent: correctAnswerId / correctAnswerText. The live board
    // does not know the answers, which is the entire point of the rewrite.
  };
}

/* ------------------------------------------------------------------ *
 * Calls
 * ------------------------------------------------------------------ */

function client() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/**
 * Every RPC goes through here, and every RPC gets a deadline.
 *
 * supabase-js has no default timeout, so a request that hangs — routine on
 * congested venue wifi — hangs forever. The challenge screen sets status to
 * "checking" before awaiting, which disables every control, so a single
 * stalled request left the game frozen with no way out but a page reload.
 * That is the "it freezes and won't progress until I reload" bug.
 *
 * Twelve seconds is far longer than any of these should take and short enough
 * that a player retries rather than gives up. The rejection is an ordinary
 * Error, so it lands in the same humanError path as everything else and the
 * player is told what happened instead of watching a dead button.
 */
const RPC_TIMEOUT_MS = 12000;

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const call = client().rpc(name, args);

  const result = await Promise.race([
    call,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timed out talking to the server (${name}).`)),
        RPC_TIMEOUT_MS
      )
    ),
  ]);

  if (result.error) throw result.error;
  return result.data as T;
}

/**
 * Both session reads go through `sessions_public`, never the base table.
 *
 * The base table carries `host_code`, and Postgres RLS filters rows, not
 * columns — so any policy permissive enough to let a player see the phase also
 * lets them read the admin passcode. The view has no such column, and SELECT
 * on the table itself is revoked. Do not "simplify" these back to
 * .from("sessions").
 */

/**
 * The session a join code refers to, or null if there is no such room.
 *
 * CURRENTLY UNUSED. Players never type a code — defaultSession() picks the
 * open room and the client passes that room's own code to the RPCs. This is
 * kept for the day there are two concurrent rooms and students have to say
 * which one they are in; until then, nothing should call it.
 */
export async function findSession(joinCode: string): Promise<SessionRow | null> {
  const { data, error } = await client()
    .from("sessions_public")
    .select("id,name,phase,started_at,join_code,doors_open,notice,notice_at")
    .eq("join_code", joinCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as SessionRow | null;
}

/**
 * The current session, whatever state it is in.
 *
 * This deliberately does NOT filter on phase, and the filter that used to be
 * here caused two bugs that looked unrelated:
 *
 *   · Ending the game hid the session from the admin, so the host could no
 *     longer find the room to reopen it — pressing End locked you out of your
 *     own control room permanently.
 *
 *   · Players never learned the game had ended. The poll skips a null result,
 *     so their session stayed frozen at "live", the route guard never fired,
 *     and nobody was moved to the results.
 *
 * An ended session is still the session. Callers that care about phase check
 * it themselves — join_session refuses an ended room server-side, so nothing
 * depended on hiding it here.
 */
export async function defaultSession(): Promise<SessionRow | null> {
  const { data, error } = await client()
    .from("sessions_public")
    .select("id,name,phase,started_at,join_code,doors_open,notice,notice_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as SessionRow | null;
}

/**
 * Walk through the door. Idempotent — the same phone rejoins its own board.
 *
 * Returns the recovery PIN alongside the player. That PIN is the only way back
 * in if the device's storage is wiped, so it is shown to the player rather
 * than quietly stored.
 */
export async function joinSession(
  joinCode: string,
  name: string
): Promise<{ player: PlayerRow; pin: string }> {
  await ensureAuth();
  const data = await rpc<any>("join_session", {
    p_join_code: joinCode,
    p_name: name,
  });
  return data as { player: PlayerRow; pin: string };
}

/**
 * Take a player row back on a new device.
 *
 * The fix for "I cleared my browsing data". Rebinds the existing row — board,
 * solved vaults, meetings, elapsed time — to this phone. Nothing is re-dealt.
 */
export async function reclaimPlayer(
  joinCode: string,
  vaultNo: number,
  pin: string
): Promise<{ player: PlayerRow; pin: string }> {
  await ensureAuth();
  const data = await rpc<any>("reclaim_player", {
    p_join_code: joinCode,
    p_vault_no: vaultNo,
    p_pin: pin,
  });
  // A wrong PIN comes back as ok:false rather than a Postgres error, because
  // raising would roll back the failed-attempt row that arms the throttle.
  // See the note in 0006_security.sql.
  const r = data as { ok?: boolean; error?: string; player: PlayerRow; pin: string };
  if (r.ok === false) throw new Error(r.error ?? "reclaim failed");
  return r;
}

/** This player's nine plus the bonus, answers stripped by the server. */
export async function fetchBoard(sessionId: string): Promise<Challenge[]> {
  const data = await rpc<any>("my_board", { p_session: sessionId });
  return (data as BoardRow[]).map(toChallenge);
}

/** Everything a phone polls for, from one instant. See fetchSnapshot. */
export interface Snapshot {
  /** The caller's identity, or null if the token did not reach the server. */
  auth: string | null;
  /** The CURRENT room, which is not necessarily the one that was asked about. */
  session: SessionRow | null;
  /**
   * This phone's player row, or null.
   *
   * Authoritative when `auth` is set: the server looked the row up as its own
   * owner, so null means the row is gone rather than hidden.
   */
  player: PlayerRow | null;
  /**
   * UNDEFINED means "unchanged since the version you sent" — which is not the
   * same as an empty board, and the difference is a player staring at nine
   * locked vaults. Only assign when it is present.
   */
  board?: Challenge[];
  boardVer?: string;
  roster?: PlayerRow[];
  rosterVer?: string;
  leaders: LeaderRow[];
  pending: InteractionRow[];
}

/**
 * One round trip, one consistent instant.
 *
 * This replaces five separate polls — board, leaderboard, roster, session
 * phase and pending handshakes — that a phone used to fire independently every
 * three or four seconds. Sixty phones doing that is sixty to a hundred and
 * twenty requests a second, which is where the timeouts came from.
 *
 * Consistency matters as much as the count. Independent calls meant the board
 * could come from one instant and the leaderboard from another, and a board
 * response issued BEFORE a submit could land after it — putting a solved step
 * back to unsolved, which is what the flicker between two questions was.
 */
/**
 * Set once if the server has not had 0032 applied yet.
 *
 * The frontend deploys on push; the migration is run by hand. Between those
 * two moments every refresh would call a function that does not exist, four
 * times a second across the room — so the first miss switches to the old
 * multi-call path permanently rather than retrying forever.
 */
let noSnapshotRpc = false;

export async function fetchSnapshot(
  sessionId: string,
  playerId?: string,
  boardVer?: string | null,
  rosterVer?: string | null
): Promise<Snapshot> {
  if (!noSnapshotRpc) {
    try {
      const data = await rpc<any>("game_snapshot", {
        p_session: sessionId,
        p_board_ver: boardVer ?? null,
        p_roster_ver: rosterVer ?? null,
      });
      const s = (data ?? {}) as Record<string, unknown>;
      return {
        auth: (s.auth as string) ?? null,
        session: (s.session as SessionRow) ?? null,
        player: (s.player as PlayerRow) ?? null,
        // `in` rather than a truthiness test: the server omits the key when
        // nothing changed, and an omitted board must not read as an empty one.
        board: "board" in s ? ((s.board as BoardRow[]) ?? []).map(toChallenge) : undefined,
        boardVer: (s.board_ver as string) ?? undefined,
        roster: "roster" in s ? ((s.roster as PlayerRow[]) ?? []) : undefined,
        rosterVer: (s.roster_ver as string) ?? undefined,
        leaders: (s.leaders as LeaderRow[]) ?? [],
        pending: (s.pending as InteractionRow[]) ?? [],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // PostgREST answers PGRST202 / "Could not find the function" when the
      // migration has not run. Anything else — a timeout, a network drop — is
      // a real failure and must propagate.
      if (!/could not find the function|pgrst202|does not exist/i.test(msg)) throw e;
      console.warn("[vault] game_snapshot missing — run 0032_snapshot.sql. Using the old polls.");
      noSnapshotRpc = true;
    }
  }

  /**
   * Legacy path. Four requests instead of one, which is the load problem 0032
   * exists to solve — but a slow game beats a broken one.
   *
   * `auth` is deliberately null here: eviction keys off it, and the only way
   * to work out presence without the RPC is to look for yourself in an
   * RLS-filtered roster, which is the inference that has now been wrong in
   * both directions. Degrade to never evicting rather than to evicting wrongly.
   */
  const [sess, board, leaders, roster, pending] = await Promise.allSettled([
    defaultSession(),
    playerId ? fetchBoard(sessionId) : Promise.resolve<Challenge[]>([]),
    fetchLeaderboard(sessionId),
    fetchPlayers(sessionId),
    playerId ? pendingForMe(playerId) : Promise.resolve<InteractionRow[]>([]),
  ]);

  // A snapshot is all-or-nothing by construction, and the caller now applies
  // it that way. Salvaging half of one would write an empty leaderboard over a
  // good one, so a failure here fails the whole refresh exactly as the RPC
  // path does — the next tick tries again four seconds later.
  for (const r of [sess, leaders, roster]) {
    if (r.status === "rejected") throw r.reason;
  }

  const roll = roster.status === "fulfilled" ? roster.value : [];
  return {
    auth: null,
    session: sess.status === "fulfilled" ? sess.value : null,
    player: playerId ? roll.find((p) => p.id === playerId) ?? null : null,
    board: board.status === "fulfilled" ? board.value : [],
    leaders: leaders.status === "fulfilled" ? leaders.value : [],
    roster: roll,
    pending: pending.status === "fulfilled" ? pending.value : [],
  };
}

/**
 * Submit an answer. The boolean that comes back is the server's, not ours —
 * the client has no way to compute it and no say in it.
 */
export async function submitAnswer(
  assignmentId: string,
  answer: Record<string, unknown>
): Promise<SubmitResult> {
  const data = await rpc<any>("submit_answer", {
    p_assignment: assignmentId,
    p_answer: answer,
  });
  return data as SubmitResult;
}

/** "I am standing in front of you." Opens a handshake the target must confirm. */
export async function requestConnect(assignmentId: string, targetNo: number) {
  const data = await rpc<any>("request_connect", {
    p_assignment: assignmentId,
    p_target_no: targetNo,
  });
  return data as { interaction_id: string; target_id: string };
}

/** The second phone. Only the person being met can call this. */
export async function confirmConnect(interactionId: string, fact: Record<string, unknown> = {}) {
  const data = await rpc<any>("confirm_connect", {
    p_interaction: interactionId,
    p_fact: fact,
  });
  return data as { ok: boolean; kind: string };
}

/** Handshakes aimed at me and still open. Drives the "someone is here" prompt. */
export async function pendingForMe(playerId: string): Promise<InteractionRow[]> {
  const { data, error } = await client()
    .from("interactions")
    .select("id,actor_id,target_id,assignment_id,kind,state,fact,expires_at")
    .eq("target_id", playerId)
    .eq("state", "pending")
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return (data ?? []) as InteractionRow[];
}

/** My confirmed handshake for an assignment — carries the other half of a clue. */
export async function myInteraction(assignmentId: string): Promise<InteractionRow | null> {
  const { data, error } = await client()
    .from("interactions")
    .select("id,actor_id,target_id,assignment_id,kind,state,fact,expires_at")
    .eq("assignment_id", assignmentId)
    .eq("state", "confirmed")
    .maybeSingle();
  if (error) throw error;
  return data as InteractionRow | null;
}

/**
 * Upload a photo and mark the challenge done.
 *
 * The path is `<auth uid>/<file>` because that is the only shape the storage
 * policy accepts — see 0003_storage.sql. Nothing here decides whether the
 * photo is "right"; there is no such thing for these challenges.
 */
export async function uploadPhoto(
  assignmentId: string,
  file: Blob,
  caption?: string
): Promise<string> {
  const uid = await ensureAuth();
  if (!uid) throw new Error("not signed in");

  /**
   * Compressed HERE, not at the call sites.
   *
   * There were two capture paths and only one of them shrank anything — the
   * viewfinder encoded its own 1280px square and went straight past the
   * downscale helper. Doing it at the single point every photo passes through
   * means a new path cannot forget, and the bytes on the wire are bounded no
   * matter what produced the blob.
   */
  const small = await shrinkForUpload(file, { square: true });

  const path = `${uid}/${assignmentId}-${Date.now()}.jpg`;

  /**
   * The upload needs its own, longer deadline.
   *
   * It is the only call in the app that is not an RPC, so it bypassed the
   * timeout helper entirely — and it is also the single most likely thing to
   * hang, because it is the only one sending a couple of hundred KB over
   * congested venue wifi. 30s rather than 12: a slow upload is normal, a dead
   * one is not, and the difference matters when sixty phones upload at once.
   */
  const attempt = async () => {
    const { error } = await Promise.race([
      client().storage.from("photos")
        .upload(path, small, { contentType: "image/jpeg", upsert: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out. Check your signal.")), 30000)
      ),
    ]);
    if (error) throw error;
  };

  /**
   * One automatic retry.
   *
   * A single dropped request on venue wifi should not cost a player their
   * photo — they are standing somewhere holding a phone, and asking them to
   * frame the shot again is the worst possible response to a transient
   * failure. `upsert: true` makes the retry safe: same path, same result.
   */
  try {
    await attempt();
  } catch (first) {
    console.warn("[vault] photo upload failed, retrying once", first);
    await attempt();
  }

  await rpc<unknown>("record_photo", {
    p_assignment: assignmentId,
    p_path: path,
    p_caption: caption ?? null,
  });
  return path;
}

/**
 * Bind a recall challenge to a meeting that actually happened.
 *
 * Called when the challenge opens, not when the board is dealt — at deal time
 * the player has met nobody, so there is nothing to ask about yet. Returns
 * `ready: false` when that is still the case.
 */
export async function prepareRecall(assignmentId: string) {
  const data = await rpc<any>("prepare_recall", {
    p_assignment: assignmentId,
  });
  return data as { ready: boolean; about?: string; other?: string };
}

/**
 * Charades. Three calls, and which phone may make each one is the mechanic:
 * only the actor can read their word, only the guesser can see the options,
 * and only the server knows whether a guess was right.
 */
export async function charadesBrief(assignmentId: string) {
  const data = await rpc<any>("charades_brief", { p_assignment: assignmentId });
  return data as { word: string };
}

export async function charadesOptions(interactionId: string) {
  const data = await rpc<any>("charades_options", { p_interaction: interactionId });
  return data as { options: string[] };
}

export async function charadesGuess(interactionId: string, guess: string) {
  const data = await rpc<any>("charades_guess", {
    p_interaction: interactionId,
    p_guess: guess,
  });
  return data as { correct: boolean; word: string };
}

/** Stamps when a player first opened a challenge — the "stuck" clock. */
export async function markSeen(assignmentId: string) {
  try { await rpc<unknown>("mark_seen", { p_assignment: assignmentId }); }
  catch { /* purely advisory; never block a challenge on it */ }
}

/** The player's own escape from a challenge that has become impossible. */
export async function releaseStuck(assignmentId: string) {
  return rpc<{ ok: boolean }>("release_stuck", { p_assignment: assignmentId });
}

/**
 * Throw in a duel.
 *
 * Returns `waiting` until BOTH players have committed — the server holds the
 * throws and reveals once, so no amount of watching the network wins a round.
 */
export async function duelThrow(interactionId: string, choice: string) {
  return rpc<{ state: "waiting" | "round" | "over"; round: number;
               you?: string; them?: string; score?: number[]; result?: string }>(
    "duel_throw", { p_interaction: interactionId, p_choice: choice });
}

/** Poll for the opponent, without learning their hand mid-round. */
export async function duelState(interactionId: string) {
  return rpc<{ score: number[]; pending: boolean; over: boolean }>(
    "duel_state", { p_interaction: interactionId });
}

/** Ranked board. Effective vaults, then elapsed — Bible §1's ordering. */
export async function fetchLeaderboard(sessionId: string, limit = 100): Promise<LeaderRow[]> {
  const data = await rpc<any>("leaderboard", {
    p_session: sessionId,
    p_limit: limit,
  });
  return (data ?? []) as LeaderRow[];
}

/** Everyone in the room. Needed so "which vault number told you?" can list them. */
export async function fetchPlayers(sessionId: string): Promise<PlayerRow[]> {
  const { data, error } = await client()
    .from("players")
    .select("id,session_id,name,vault_no,avatar_url")
    .eq("session_id", sessionId)
    .order("vault_no");
  if (error) throw error;
  return (data ?? []) as PlayerRow[];
}

/** The photo wall, newest first. */
export async function fetchPhotos(sessionId: string, limit = 60): Promise<PhotoRow[]> {
  const { data, error } = await client()
    .from("photos")
    .select("id,player_id,storage_path,caption,created_at")
    .eq("session_id", sessionId)
    .eq("visible", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

/** The curated reaction library. Fetched once and cached by useReactions. */
export async function fetchMemes() {
  const { data, error } = await client()
    .from("memes")
    .select("id,label,trigger,storage_path,url,weight")
    .eq("active", true);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    label: string;
    trigger: string;
    storage_path: string;
    /** Absolute URL, when the reaction is hosted rather than uploaded. */
    url: string | null;
    weight: number;
  }[];
}

/* ------------------------------------------------------------------ *
 * Host
 * ------------------------------------------------------------------ */
// The code is checked server-side on every one of these. Holding it in the
// admin tab's state grants nothing on its own.

/**
 * Claim the session for this device.
 *
 * The code is spent here and nowhere else. Afterwards this browser IS the
 * host as far as the server is concerned, and every host_* call below checks
 * that claim rather than re-checking the code — so knowing the six digits is
 * not enough to act while a real host holds the room.
 */
export async function hostClaim(sessionId: string, code: string) {
  await ensureAuth();
  const data = await rpc<any>("host_claim", {
    p_session: sessionId,
    p_code: code,
  });
  // Same reasoning as reclaimPlayer: a rejection is a value, not an exception,
  // so that the attempt log survives to feed the throttle.
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? "claim failed");
}

/** Hand the room back so another laptop can take it. */
export async function hostRelease(sessionId: string) {
  await rpc<unknown>("host_release", { p_session: sessionId });
}

/** Recovery PINs, for a student who lost theirs. Host-only. */
export async function hostPins(sessionId: string, code: string) {
  const data = await rpc<any>("host_pins", {
    p_session: sessionId,
    p_code: code,
  });
  return (data ?? []) as { vault_no: number; name: string; pin: string }[];
}

/** Let a latecomer in without pausing the room. */
export async function hostSetDoors(sessionId: string, code: string, open: boolean) {
  await rpc<unknown>("host_set_doors", {
    p_session: sessionId,
    p_code: code,
    p_open: open,
  });
}

/** Players who have been on one challenge long enough that something is wrong. */
export async function hostStuck(sessionId: string, code: string) {
  return rpc<{ vault_no: number; name: string; vault: number; step: number; kind: string; minutes: number }[]>(
    "host_stuck", { p_session: sessionId, p_code: code });
}

/** Move a named player past whatever they are jammed on. */
export async function hostSkipStep(sessionId: string, code: string, vaultNo: number) {
  return rpc<{ ok: boolean }>("host_skip_step",
    { p_session: sessionId, p_code: code, p_vault_no: vaultNo });
}

/** Say something to every phone at once. Empty string clears it. */
export async function hostBroadcast(sessionId: string, code: string, text: string) {
  return rpc<{ ok: boolean }>("host_broadcast",
    { p_session: sessionId, p_code: code, p_text: text });
}

/** Take a broken challenge out of the game and free everyone stuck on it. */
export async function hostKillChallenge(sessionId: string, code: string, challengeId: string) {
  return rpc<{ ok: boolean; freed: number }>("host_kill_challenge",
    { p_session: sessionId, p_code: code, p_challenge: challengeId });
}

/** Errors the phones have reported, grouped. */
export async function hostErrors(sessionId: string, code: string) {
  return rpc<{ where_at: string; message: string; hits: number; players: number; last_at: string }[]>(
    "host_errors", { p_session: sessionId, p_code: code });
}

/**
 * Tell the operator something went wrong on this phone.
 *
 * Fire-and-forget on purpose: a failure to report a failure must never become
 * a second failure the player can see.
 */
export async function reportError(where: string, message: string) {
  try { await rpc<unknown>("report_error", { p_where: where, p_message: message }); }
  catch { /* nothing sensible to do if even this fails */ }
}

/** Change a player's name — the only route to fixing a rude one on a projector. */
export async function hostRename(sessionId: string, code: string, vaultNo: number, name: string) {
  return rpc<{ ok: boolean; from: string; to: string }>("host_rename",
    { p_session: sessionId, p_code: code, p_vault_no: vaultNo, p_name: name });
}

/** Names shared by more than one player, so collisions are visible early. */
export async function hostDuplicateNames(sessionId: string, code: string) {
  return rpc<{ name: string; numbers: number[] }[]>("host_duplicate_names",
    { p_session: sessionId, p_code: code });
}

export async function hostSetPhase(sessionId: string, code: string, phase: string) {
  const data = await rpc<any>("host_set_phase", {
    p_session: sessionId,
    p_code: code,
    p_phase: phase,
  });
  return data as SessionRow;
}

export async function hostOverview(sessionId: string, code: string) {
  const data = await rpc<any>("host_overview", {
    p_session: sessionId,
    p_code: code,
  });
  return data as {
    players: number;
    vaults: number;
    bonus: number;
    photos: number;
    meetings: number;
    stalled: number;
    phase: string;
    doors: boolean;
    started: string | null;
  };
}

export async function hostHidePhoto(photoId: string, code: string, visible = false) {
  await rpc<unknown>("host_hide_photo", {
    p_photo: photoId,
    p_code: code,
    p_visible: visible,
  });
}

export async function hostReset(sessionId: string, code: string) {
  await rpc<unknown>("host_reset", { p_session: sessionId, p_code: code });
}
