import { supabase, ensureAuth } from "./supabase";
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
  mode?: "colour_trap" | "impostor";
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
  /** exchange: this player's half of the combination */
  mine?: number;
  symbol?: string;
  /** recall: the interaction being asked about */
  about?: string;
  /** minigame: which game, and the seed its puzzle is generated from */
  game?: string;
  seed?: number;
  level?: number;
  /** anagram: the scrambled letters, dealt server-side. */
  letters?: string;
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
  /** Can a brand-new player still join? False once the game is running. */
  doors_open?: boolean;
}

export interface LeaderRow {
  rank: number;
  player_id: string;
  name: string;
  vault_no: number;
  avatar_url: string | null;
  vaults: number;
  bonus: number;
  effective: number;
  elapsed: number;
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
 * Both session reads go through `sessions_public`, never the base table.
 *
 * The base table carries `host_code`, and Postgres RLS filters rows, not
 * columns — so any policy permissive enough to let a player see the phase also
 * lets them read the admin passcode. The view has no such column, and SELECT
 * on the table itself is revoked. Do not "simplify" these back to
 * .from("sessions").
 */

/** The session a join code refers to, or null if there is no such room. */
export async function findSession(joinCode: string): Promise<SessionRow | null> {
  const { data, error } = await client()
    .from("sessions_public")
    .select("id,name,phase,started_at,join_code,doors_open")
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
    .select("id,name,phase,started_at,join_code,doors_open")
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
  const { data, error } = await client().rpc("join_session", {
    p_join_code: joinCode,
    p_name: name,
  });
  if (error) throw error;
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
  const { data, error } = await client().rpc("reclaim_player", {
    p_join_code: joinCode,
    p_vault_no: vaultNo,
    p_pin: pin,
  });
  if (error) throw error;
  // A wrong PIN comes back as ok:false rather than a Postgres error, because
  // raising would roll back the failed-attempt row that arms the throttle.
  // See the note in 0006_security.sql.
  const r = data as { ok?: boolean; error?: string; player: PlayerRow; pin: string };
  if (r.ok === false) throw new Error(r.error ?? "reclaim failed");
  return r;
}

/** This player's nine plus the bonus, answers stripped by the server. */
export async function fetchBoard(sessionId: string): Promise<Challenge[]> {
  const { data, error } = await client().rpc("my_board", { p_session: sessionId });
  if (error) throw error;
  return (data as BoardRow[]).map(toChallenge);
}

/**
 * Submit an answer. The boolean that comes back is the server's, not ours —
 * the client has no way to compute it and no say in it.
 */
export async function submitAnswer(
  assignmentId: string,
  answer: Record<string, unknown>
): Promise<SubmitResult> {
  const { data, error } = await client().rpc("submit_answer", {
    p_assignment: assignmentId,
    p_answer: answer,
  });
  if (error) throw error;
  return data as SubmitResult;
}

/** "I am standing in front of you." Opens a handshake the target must confirm. */
export async function requestConnect(assignmentId: string, targetNo: number) {
  const { data, error } = await client().rpc("request_connect", {
    p_assignment: assignmentId,
    p_target_no: targetNo,
  });
  if (error) throw error;
  return data as { interaction_id: string; target_id: string };
}

/** The second phone. Only the person being met can call this. */
export async function confirmConnect(interactionId: string, fact: Record<string, unknown> = {}) {
  const { data, error } = await client().rpc("confirm_connect", {
    p_interaction: interactionId,
    p_fact: fact,
  });
  if (error) throw error;
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

  const path = `${uid}/${assignmentId}-${Date.now()}.jpg`;
  const { error: upErr } = await client()
    .storage.from("photos")
    .upload(path, file, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;

  const { error } = await client().rpc("record_photo", {
    p_assignment: assignmentId,
    p_path: path,
    p_caption: caption ?? null,
  });
  if (error) throw error;
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
  const { data, error } = await client().rpc("prepare_recall", {
    p_assignment: assignmentId,
  });
  if (error) throw error;
  return data as { ready: boolean; about?: string; other?: string };
}

/**
 * Charades. Three calls, and which phone may make each one is the mechanic:
 * only the actor can read their word, only the guesser can see the options,
 * and only the server knows whether a guess was right.
 */
export async function charadesBrief(assignmentId: string) {
  const { data, error } = await client().rpc("charades_brief", { p_assignment: assignmentId });
  if (error) throw error;
  return data as { word: string };
}

export async function charadesOptions(interactionId: string) {
  const { data, error } = await client().rpc("charades_options", { p_interaction: interactionId });
  if (error) throw error;
  return data as { options: string[] };
}

export async function charadesGuess(interactionId: string, guess: string) {
  const { data, error } = await client().rpc("charades_guess", {
    p_interaction: interactionId,
    p_guess: guess,
  });
  if (error) throw error;
  return data as { correct: boolean; word: string };
}

/** Ranked board. Effective vaults, then elapsed — Bible §1's ordering. */
export async function fetchLeaderboard(sessionId: string, limit = 100): Promise<LeaderRow[]> {
  const { data, error } = await client().rpc("leaderboard", {
    p_session: sessionId,
    p_limit: limit,
  });
  if (error) throw error;
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
  const { data, error } = await client().rpc("host_claim", {
    p_session: sessionId,
    p_code: code,
  });
  if (error) throw error;
  // Same reasoning as reclaimPlayer: a rejection is a value, not an exception,
  // so that the attempt log survives to feed the throttle.
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? "claim failed");
}

/** Hand the room back so another laptop can take it. */
export async function hostRelease(sessionId: string) {
  const { error } = await client().rpc("host_release", { p_session: sessionId });
  if (error) throw error;
}

/** Recovery PINs, for a student who lost theirs. Host-only. */
export async function hostPins(sessionId: string, code: string) {
  const { data, error } = await client().rpc("host_pins", {
    p_session: sessionId,
    p_code: code,
  });
  if (error) throw error;
  return (data ?? []) as { vault_no: number; name: string; pin: string }[];
}

/** Let a latecomer in without pausing the room. */
export async function hostSetDoors(sessionId: string, code: string, open: boolean) {
  const { error } = await client().rpc("host_set_doors", {
    p_session: sessionId,
    p_code: code,
    p_open: open,
  });
  if (error) throw error;
}

export async function hostSetPhase(sessionId: string, code: string, phase: string) {
  const { data, error } = await client().rpc("host_set_phase", {
    p_session: sessionId,
    p_code: code,
    p_phase: phase,
  });
  if (error) throw error;
  return data as SessionRow;
}

export async function hostOverview(sessionId: string, code: string) {
  const { data, error } = await client().rpc("host_overview", {
    p_session: sessionId,
    p_code: code,
  });
  if (error) throw error;
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
  const { error } = await client().rpc("host_hide_photo", {
    p_photo: photoId,
    p_code: code,
    p_visible: visible,
  });
  if (error) throw error;
}

export async function hostReset(sessionId: string, code: string) {
  const { error } = await client().rpc("host_reset", { p_session: sessionId, p_code: code });
  if (error) throw error;
}
