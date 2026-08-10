import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  mockLeaderboard,
  getChallengeSet,
  mockBonusChallenge,
  type Challenge,
  type LeaderboardEntry,
} from '../data/mockData';
import { isLive, supabase } from '../lib/supabase';
import * as api from '../lib/api';
import type { PlayerRow, SessionRow, InteractionRow, SubmitResult } from '../lib/api';
import { humanError } from "../lib/errors";

/**
 * The game's state, in either of the two worlds it has to live in.
 *
 * OFFLINE (no Supabase env vars): the original prototype, unchanged. Mock
 * questions, localStorage progress, bot leaderboard, answers checked on the
 * device. This is what you get when you clone the repo and run `npm run dev`,
 * and it is the right default — building a screen should not require a
 * database or a second phone.
 *
 * LIVE (env vars present): the same shape, served by Postgres. Answers are
 * checked server-side, progress is derived from verified rows, and the
 * leaderboard is sixty real people.
 *
 * The contract below is identical in both. Every screen written against the
 * prototype still compiles and still works, which was the condition on this
 * whole rewrite — the UI improves by gaining states, never by breaking.
 */

interface GameState {
  /* --- the original contract, unchanged --------------------------------- */
  username: string;
  setUsername: (name: string) => void;
  challenges: Challenge[];
  getChallenge: (routeId?: string) => Challenge | undefined;
  digitForChallenge: (challengeId: string) => number;
  unlockedVaults: string[];
  unlockVault: (id: string) => void;
  bonusSolved: boolean;
  solveBonus: () => void;
  leaderboard: LeaderboardEntry[];
  reset: () => void;

  /* --- added by the backend --------------------------------------------- */
  /** True when this build is talking to Supabase. */
  live: boolean;
  /** Connection state, so screens can show a real status instead of guessing. */
  status: 'offline' | 'connecting' | 'ready' | 'error';
  error: string | null;
  session: SessionRow | null;
  player: PlayerRow | null;
  /** Everyone in the room — needed to render "which vault number told you?". */
  players: PlayerRow[];
  /** Walk through the door. No-op offline. */
  join: (name: string) => Promise<void>;
  /**
   * This player's recovery PIN.
   *
   * Anonymous auth lives in localStorage, so clearing browser data would
   * otherwise destroy a run. This four-digit code plus the vault number takes
   * the row back on any device — see reclaim().
   */
  pin: string | null;
  /** Reclaim an existing player row after a wipe. Board and progress intact. */
  reclaim: (vaultNo: number, pin: string) => Promise<void>;
  /**
   * Submit an answer. Offline this compares against the bundled key; live it
   * asks the server and believes what comes back. Screens call this and render
   * the result — they never decide correctness themselves.
   */
  submit: (challenge: Challenge, answer: Record<string, unknown>) => Promise<SubmitResult>;
  /**
   * Consecutive correct answers. Resets on any miss.
   *
   * Lives here rather than on a screen because it has to survive navigating
   * between challenges — a streak that reset every time you went back to the
   * board would never reach three.
   */
  streak: number;
  /**
   * The host reset the room and deleted every player. This phone's board is
   * gone and it has to go back through the door.
   */
  evicted: boolean;
  /** False during the initial session lookup and rejoin attempt. */
  booted: boolean;
  /**
   * This phone can still become a player without asking anything: it has a
   * name and its stored room matches the one that is open. Routing uses it to
   * wait rather than bounce someone to the door mid-rejoin.
   */
  rejoinable: boolean;
  /** Dismiss the eviction notice, ready to rejoin. */
  clearEviction: () => void;
  /** A handshake aimed at me, waiting for my tap. Null when nobody is here. */
  incoming: InteractionRow | null;
  /** Confirm the person standing in front of me. */
  confirmMeet: (interactionId: string) => Promise<void>;
  /** Re-pull the board and leaderboard from the server. */
  refresh: () => Promise<void>;
}

const GameContext = createContext<GameState | undefined>(undefined);

/**
 * The run clock lives in its own context, and that is a performance decision.
 *
 * It ticks every second. While it sat on the main game value, the value object
 * changed identity every second, so all ten components calling useGame()
 * re-rendered once per second — including the board, which is nine Safes of 27
 * SVG nodes each. Only three screens display a timer at all.
 *
 * Split out, the tick reaches those three and nothing else.
 */
const ClockContext = createContext<number>(0);

/**
 * Cheap "did this actually change?" for the polled lists.
 *
 * The refresh runs every four seconds and replaced `board`, `players`,
 * `liveBoard` and `unlockedVaults` with brand new arrays whether or not
 * anything had moved. New array identity means a new context value, and a new
 * context value re-renders EVERY consumer — including the vault board, which
 * is nine safes of twenty-seven SVG nodes each.
 *
 * So four times a minute the entire tree rebuilt itself for nothing, and on a
 * mid-range phone that lands as a visible stall: taps queued behind the
 * re-render feel like the screen ignored them. Comparing a short signature
 * first makes the common case (nothing changed) free.
 */
function sameSig(a: string, b: string) { return a === b; }

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState(
    () => localStorage.getItem('csi_username') || ''
  );
  const [unlockedVaults, setUnlockedVaults] = useState<string[]>(() =>
    readJSON<string[]>('csi_unlocked', [])
  );
  const [bonusSolved, setBonusSolved] = useState(() =>
    readJSON<boolean>('csi_bonus', false)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bots, setBots] = useState(mockLeaderboard);

  /* --- live state ------------------------------------------------------- */
  const [status, setStatus] = useState<GameState['status']>(
    isLive ? 'connecting' : 'offline'
  );
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [board, setBoard] = useState<Challenge[]>([]);
  const [liveBoard, setLiveBoard] = useState<api.LeaderRow[]>([]);
  const [incoming, setIncoming] = useState<InteractionRow | null>(null);
  const [streak, setStreak] = useState(0);
  const [pin, setPin] = useState<string | null>(
    () => localStorage.getItem('csi_pin') || null
  );
  /** True when the host wiped the room and this phone must rejoin. */
  const [evicted, setEvicted] = useState(false);

  /**
   * Assignments this phone knows are solved.
   *
   * `solved` only ever goes false -> true inside a session, but the network
   * does not respect that. A board response issued BEFORE a submit can land
   * AFTER it — routine when requests are queueing — and it carries the old
   * `solved: false`. getChallenge() then hands back the step the player has
   * just finished, the screen re-keys, and the previous question flashes up
   * before the next response corrects it. That is the blink.
   *
   * Remembering what is solved makes the flag monotonic on the client, so a
   * late answer can no longer un-solve anything.
   */
  /**
   * WHEN each was solved, not just that it was.
   *
   * This started as a plain Set and forced `solved` to be permanently
   * monotonic, which was right for the race it fixes — a response issued
   * before a submit landing after it — and wrong the moment anything could
   * legitimately un-solve a step. Evidence review can: a rejected photo clears
   * solved_at, and a permanent Set would have quietly overwritten that on
   * every snapshot, so the vault would reopen on its own a tick later and
   * nothing the reviewer did would stick.
   *
   * A timestamp fixes both. The race resolves inside a second or two, so a
   * short window covers it completely; past that the server is simply right.
   */
  const solvedIds = useRef<Map<string, number>>(new Map());

  /** How long a local solve outranks the server. See above. */
  const OPTIMISTIC_MS = 20000;

  /**
   * Which refresh is the newest.
   *
   * Two snapshots in flight can complete in either order, and the loser must
   * not overwrite the winner. Every response checks that it is still the most
   * recent request before touching state.
   */
  const refreshSeq = useRef(0);

  /**
   * Collapse overlapping refreshes into one.
   *
   * The timer, the realtime channel, waking the tab and every action that ends
   * in `void refresh()` all pull on the same rope, and they bunch. Without
   * this a single solve opened three requests inside a second, on every phone.
   */
  const inFlight = useRef(false);
  const pendingRefresh = useRef(false);

  /**
   * What the server told us the board and roster looked like last time.
   *
   * Sent back on the next call so it can skip whichever has not changed. Both
   * are cleared by forgetRoom, because a version from a room this phone has
   * left would suppress the first board of the room it joins next.
   */
  const boardVer = useRef<string | null>(null);
  const rosterVer = useRef<string | null>(null);

  /**
   * A stable handle on the latest refresh(), declared here because refresh
   * itself uses it to run a coalesced follow-up.
   *
   * refresh() closes over `session` and `player`, so its identity changes
   * whenever either does. Reading it through a ref lets the subscription below
   * depend only on the player id, which is what it actually cares about.
   */
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  /**
   * Is the websocket actually delivering?
   *
   * Held in a ref as well as state because the poll closure reads it every
   * three seconds and must not be rebuilt (and the channel torn down) each
   * time it flips.
   */
  const [, setRealtimeOk] = useState(false);

  /**
   * Has this phone finished working out who it is?
   *
   * On a cold load there is a window — find the session, then try to rejoin as
   * the stored name — where `player` is legitimately null but the player is not
   * actually logged out. Anything routing on "no player" during that window
   * would bounce a returning student out of their own game and back to the
   * door. Guards wait for this.
   */
  const [booted, setBooted] = useState(!isLive);

  /**
   * Guards the automatic rejoin-on-refresh. Declared up here rather than next
   * to that effect because evict() has to be able to re-arm it.
   */
  const rejoined = useRef(false);

  /**
   * The start of the run.
   *
   * Offline this is the first time the tab was opened. Live it is the session's
   * `started_at`, set once by the host — because Bible §16 is explicit that
   * time must not come from a device, and a phone's clock is both wrong and
   * editable. Everybody in the room is measured against the same instant.
   */
  const [localStart] = useState<number>(() => {
    const saved = localStorage.getItem('csi_started');
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem('csi_started', now.toString());
    return now;
  });
  const startedAt = useMemo(() => {
    if (isLive && session?.started_at) return new Date(session.started_at).getTime();
    return localStart;
  }, [session?.started_at, localStart]);

  useEffect(() => {
    localStorage.setItem('csi_username', username);
  }, [username]);

  useEffect(() => {
    if (isLive) return; // live progress is derived from the server, not stored
    localStorage.setItem('csi_unlocked', JSON.stringify(unlockedVaults));
  }, [unlockedVaults]);

  useEffect(() => {
    if (isLive) return;
    localStorage.setItem('csi_bonus', JSON.stringify(bonusSolved));
  }, [bonusSolved]);

  // Completion time — the leaderboard tie-breaker behind vaults unlocked.
  useEffect(() => {
    const tick = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // MOCK: other players creeping up the board, so rank changes are visible
  // offline. Never runs live — there are real people to watch instead.
  useEffect(() => {
    if (isLive) return;
    const interval = setInterval(() => {
      setBots((prev) => {
        const movable = prev.filter((b) => b.digits < 9);
        if (movable.length === 0) return prev;
        const target = movable[Math.floor(Math.random() * movable.length)];
        return prev.map((b) =>
          b.id === target.id ? { ...b, digits: b.digits + 1 } : b
        );
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ------------------------------------------------------------------ *
   * Live: connect
   * ------------------------------------------------------------------ */

  const applyBoard = useCallback((incoming: Challenge[]) => {
    // Fold in everything already known to be solved before anything else looks
    // at this board. A response that predates a submit still says the step is
    // unsolved, and taking it at face value walks the player backwards.
    const now = Date.now();
    const rows = incoming.map((c) => {
      if (c.solved || !c.assignmentId) return c;
      const at = solvedIds.current.get(c.assignmentId);
      // Recent enough to be a race; older than that and the server means it.
      if (at !== undefined && now - at < OPTIMISTIC_MS) return { ...c, solved: true };
      if (at !== undefined) solvedIds.current.delete(c.assignmentId);
      return c;
    });
    for (const c of rows) {
      if (c.solved && c.assignmentId && !solvedIds.current.has(c.assignmentId)) {
        solvedIds.current.set(c.assignmentId, now);
      }
    }

    // Identity, solved-state and dealt payload are the only things a re-render
    // could depend on; anything else on a row is immutable for the session.
    const sig = rows.map((c) => `${c.assignmentId}:${c.solved ? 1 : 0}`).join("|");
    setBoard((prev) =>
      sameSig(sig, prev.map((c) => `${c.assignmentId}:${c.solved ? 1 : 0}`).join("|"))
        ? prev
        : rows
    );

    // Progress is DERIVED from server rows, never accumulated locally. A player
    // who reinstalls the browser, switches from data to wifi, or hands the
    // phone to a friend gets the same answer, because the truth is a solved_at
    // timestamp in Postgres and not a localStorage key.
    //
    // A vault counts as open only when EVERY step in it is solved. Counting
    // solved challenges instead would light up vault 7 the moment one of its
    // three puzzles fell — and the leaderboard, which computes this properly
    // server-side, would then disagree with the board in front of the player.
    const bySlot = new Map<number, { total: number; done: number }>();
    for (const c of rows) {
      const slot = c.slot ?? 0;
      const agg = bySlot.get(slot) ?? { total: 0, done: 0 };
      agg.total += 1;
      if (c.solved) agg.done += 1;
      bySlot.set(slot, agg);
    }

    const open: string[] = [];
    for (const [slot, agg] of bySlot) {
      if (slot > 0 && agg.done === agg.total) open.push(String(slot));
    }
    setUnlockedVaults((prev) =>
      prev.length === open.length && prev.every((v, i) => v === open[i]) ? prev : open
    );

    const bonus = bySlot.get(0);
    setBonusSolved(Boolean(bonus && bonus.done === bonus.total));
  }, []);

  /**
   * Everything this phone remembers about ONE room.
   *
   * `csi_session` is the important one and it is new: without it the stored
   * identity had no idea which game it belonged to, so a player who came back
   * for a second session was silently auto-rejoined into a board dealt for the
   * previous one.
   */
  const forgetRoom = useCallback((keepName: boolean) => {
    setPlayer(null);
    setBoard([]);
    setPin(null);
    setUnlockedVaults([]);
    setBonusSolved(false);
    setStreak(0);
    setIncoming(null);
    solvedIds.current.clear();
    boardVer.current = null;
    rosterVer.current = null;
    if (!keepName) setUsername('');
    localStorage.removeItem('csi_pin');
    localStorage.removeItem('csi_unlocked');
    localStorage.removeItem('csi_bonus');
    localStorage.removeItem('csi_started');
    localStorage.removeItem('csi_session');
    if (!keepName) localStorage.removeItem('csi_username');
    rejoined.current = false;
  }, []);

  /**
   * Put this phone back at the door.
   *
   * Everything derived from the deleted player row goes: board, pin, progress.
   * The NAME is deliberately kept — the student is standing in a room being
   * told to rejoin, and making them retype it is a small cruelty.
   *
   * The Supabase anon session is left alone too. It is still a valid identity;
   * it simply owns nothing now, and join_session() will mint a fresh player row
   * for it with a new vault number, which is exactly right after a reset.
   */
  const evict = useCallback(() => {
    // Name kept: the student is standing in the room being told to rejoin, and
    // making them retype it is a small cruelty.
    forgetRoom(true);
    setEvicted(true);
  }, [forgetRoom]);

  /**
   * The whole game state, in ONE request.
   *
   * This used to be three parallel calls, next to a fourth poll for the phase
   * and a fifth for pending handshakes — five requests every three or four
   * seconds, per phone. Sixty phones is a hundred requests a second sustained,
   * which is exactly as much as it sounds like: the pooler queues, queued
   * requests blow the client's twelve-second deadline, and the player sees a
   * connection error while the dashboard fills with them. The server was never
   * broken. It was being asked far more often than it could answer.
   *
   * Independence was the second problem. Five calls are five different instants
   * — the board could disagree with the leaderboard, and a board response
   * issued before a submit could land after it. One snapshot cannot disagree
   * with itself.
   */
  const refresh = useCallback(async () => {
    if (!isLive || !session) return;

    /**
     * One in flight at a time, always.
     *
     * refresh() is called from the timer, from realtime, on waking the tab and
     * by hand after every action. Those bunch — a solve fires a submit, a
     * refresh, and a realtime echo within the same second — and each one used
     * to open its own request. Collapsing them costs a few hundred
     * milliseconds of staleness and removes an entire class of self-inflicted
     * load, which at sixty phones is the difference that matters.
     */
    if (inFlight.current) { pendingRefresh.current = true; return; }
    inFlight.current = true;

    // Claim this request. Anything older than the newest must not write.
    const seq = ++refreshSeq.current;

    try {
      const snap = await api.fetchSnapshot(
        session.id, player?.id, boardVer.current, rosterVer.current
      );
      if (seq !== refreshSeq.current) return;    // a newer answer already landed

      /**
       * A DIFFERENT room appeared. The host started a fresh session while this
       * phone was open, so the board it is holding belongs to a game that is
       * no longer running. Drop the identity and send them to the door rather
       * than leaving them tapping at a dead board.
       */
      if (snap.session && snap.session.id !== session.id) {
        forgetRoom(true);
        setSession(snap.session);
        setEvicted(true);
        return;
      }

      // Only swap the object when something actually changed. A fresh object
      // every tick gave `session` a new identity four times a minute, which
      // cascaded into every effect depending on it — including the realtime
      // subscription, which was then torn down and resubscribed on that same
      // cadence, dropping any handshake that arrived in the gap.
      if (snap.session) {
        const next = snap.session;
        setSession((cur) =>
          cur && cur.id === next.id && cur.phase === next.phase &&
          cur.started_at === next.started_at && cur.notice_at === next.notice_at &&
          cur.doors_open === next.doors_open
            ? cur
            : next
        );
      }

      /**
       * Did the host wipe the room out from under us?
       *
       * This has been wrong in both directions before, and both times because
       * it was INFERRED from a list. fetchPlayers is an ordinary RLS-filtered
       * select, so a request whose token has not attached yet returns [] with
       * no error — identical, from here, to a room the host just reset.
       * Trusting that evicted everybody at once; guarding against it with
       * `roster.length > 0` then meant a real reset reached nobody, because a
       * reset empties the roster completely.
       *
       * There is nothing to infer now. `player` comes back from a SECURITY
       * DEFINER lookup against auth.uid(), so it is not subject to RLS: if the
       * token arrived (`auth` is set) and the row is absent, the row is gone.
       */
      if (snap.auth && player && !snap.player) { evict(); return; }

      /**
       * Keep the player row current, not just present.
       *
       * refresh() used to read `snap.player` only to decide whether this phone
       * had been wiped, and never wrote it back — which was harmless while a
       * player row never changed after the join that created it. It changes
       * now: evidence review writes a notice onto it, and a host rename writes
       * a name. Without this the banner telling somebody their vault has been
       * reopened would sit on the server forever.
       *
       * Compared field by field so the object only changes identity when
       * something real did — a new object every four seconds would cascade
       * through every effect that depends on `player`, including the realtime
       * subscription.
       */
      if (snap.player) {
        const next = snap.player;
        setPlayer((cur) =>
          cur && cur.id === next.id && cur.name === next.name &&
          cur.vault_no === next.vault_no &&
          (cur.notice_at ?? null) === (next.notice_at ?? null)
            ? cur
            : next
        );
      }

      /**
       * `board` and `roster` arrive only when they have CHANGED.
       *
       * Both are large and both are nearly always identical to the last tick —
       * a board changes about twenty times in half an hour, a roster stops
       * changing once everyone is through the door. The server compares the
       * version this phone sent and omits the section if it matches, so the
       * steady-state response is the standings and little else. `undefined`
       * here means "unchanged", which is not the same as an empty list.
       */
      if (snap.boardVer !== undefined) boardVer.current = snap.boardVer;
      if (snap.rosterVer !== undefined) rosterVer.current = snap.rosterVer;

      if (player && snap.player && snap.board) applyBoard(snap.board);

      setLiveBoard((prev) =>
        sameSig(
          snap.leaders.map((r) => `${r.player_id}:${r.vaults}:${r.bonus}`).join("|"),
          prev.map((r) => `${r.player_id}:${r.vaults}:${r.bonus}`).join("|")
        ) ? prev : snap.leaders
      );

      // The roster only grows during a session; names and numbers never change.
      if (snap.roster) {
        const roster = snap.roster;
        setPlayers((prev) =>
          prev.length === roster.length &&
          prev.every((p, i) => p.id === roster[i].id) ? prev : roster
        );
      }

      // Never clobber a prompt that is already on screen; confirmMeet() clears
      // it, and replacing the row underneath a tap would drop it.
      setIncoming((cur) => cur ?? snap.pending[0] ?? null);

      // One good answer means the connection is back. Leaving a stale error
      // banner up made a recovered phone look permanently broken.
      setError(null);
    } catch (e) {
      if (seq !== refreshSeq.current) return;
      setError(humanError(e, "Could not reach the game. Check your signal."));
    } finally {
      inFlight.current = false;
      // Something asked while this was running. Serve it now, once, however
      // many times it was asked.
      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        setTimeout(() => { void refreshRef.current(); }, 0);
      }
    }
  }, [session, player, applyBoard, evict, forgetRoom]);

  // Find the room on boot. One session runs at a time for this event, so the
  // app picks the open one rather than making a first-year type a join code
  // while standing at a door with sixty other people.
  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api.defaultSession();
        if (cancelled) return;
        if (!s) {
          setStatus('error');
          setError('No open session. Ask the host to start one.');
          setBooted(true);
          return;
        }
        setSession(s);
        setStatus('ready');
        // Deliberately does NOT set booted. The rejoin effect below decides,
        // because only it knows whether the stored identity belongs to THIS
        // room — and marking booted early would let the route guard act on a
        // half-known state.
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(humanError(e, "Could not reach the game. Check your signal."));
        setBooted(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const join = useCallback(
    async (name: string) => {
      setUsername(name);
      setEvicted(false);
      if (!isLive) return;
      try {
        setError(null);
        const s = session ?? (await api.defaultSession());
        if (!s) throw new Error('No open session');
        setSession(s);
        const { player: p, pin: recovery } = await api.joinSession(s.join_code, name);
        setPlayer(p);
        setPin(recovery);
        // Kept so the recovery chip survives a reload without a round trip.
        // Losing THIS is harmless — the PIN is also recoverable from the host.
        localStorage.setItem('csi_pin', recovery ?? '');
        // Stamps WHICH room this identity is for. Everything below keys off it.
        localStorage.setItem('csi_session', s.id);
        applyBoard(await api.fetchBoard(s.id));
        setPlayers(await api.fetchPlayers(s.id));
      } catch (e) {
        setError(humanError(e, "Could not reach the game. Check your signal."));
        throw e;
      }
    },
    [session, applyBoard]
  );

  /**
   * Take an existing player row back on this device.
   *
   * The path out of a cleared cache. Everything the row already owns — solved
   * vaults, meetings, elapsed time — comes with it, because none of that was
   * ever stored on the device in the first place.
   */
  const reclaim = useCallback(
    async (vaultNo: number, code: string) => {
      if (!isLive) return;
      const s = session ?? (await api.defaultSession());
      if (!s) throw new Error('No open session');
      const { player: p, pin: recovery } = await api.reclaimPlayer(s.join_code, vaultNo, code);
      setSession(s);
      setPlayer(p);
      setPin(recovery);
      setUsername(p.name);
      localStorage.setItem('csi_pin', recovery ?? '');
      localStorage.setItem('csi_session', s.id);
      applyBoard(await api.fetchBoard(s.id));
      setPlayers(await api.fetchPlayers(s.id));
    },
    [session, applyBoard]
  );

  // Rejoin on refresh. The anonymous auth session survives in localStorage, so
  // join_session() recognises the phone and hands back the board it already
  // has — a student who backgrounds the browser mid-vault loses nothing.
  useEffect(() => {
    // `evicted` gates this: without it the reset notice would be torn down
    // by an automatic rejoin a fraction of a second after it appeared.
    if (!isLive || !session || rejoined.current || evicted) return;

    /**
     * Auto-rejoin ONLY into the room this identity was created in.
     *
     * Silently rejoining is right within a session — it is what makes a
     * refresh, a locked screen or a pocketed phone cost nothing, and it is the
     * single most common path in the app.
     *
     * It is wrong ACROSS sessions. Every stored key was global, so a phone that
     * had played before walked back in and was auto-joined without ever seeing
     * the name screen, carrying a leftover name into a brand new game. The
     * anonymous auth user is fine to keep — join_session scopes players by
     * (session, auth_id), so a new room mints a new player row and a new vault
     * number regardless — but the CLIENT has to stop assuming the old identity
     * still means something.
     */
    const storedRoom = localStorage.getItem('csi_session');

    if (username && storedRoom === session.id) {
      rejoined.current = true;
      join(username)
        .catch(() => { rejoined.current = false; })
        .finally(() => setBooted(true));
      return;
    }

    // A different room, or an identity whose room stamp is gone — which is
    // what evict() leaves behind, since it clears the room but keeps the name.
    //
    // Do NOT auto-join, but KEEP the name. Wiping it meant a player who
    // reloaded after a reset had to retype a name the app already knew, and
    // the name screen now pre-fills from it so getting back in is one tap.
    if (storedRoom) forgetRoom(true);
    setBooted(true);
  }, [session, username, join, evicted, forgetRoom]);

  /* ------------------------------------------------------------------ *
   * Live: realtime
   * ------------------------------------------------------------------ */

  refreshRef.current = refresh;

  // Someone walked up and tapped CONNECT.
  //
  // DEPS ARE [player?.id] AND MUST STAY THAT WAY. This effect opens a
  // websocket. It previously depended on `refresh`, whose identity changed on
  // every session poll, so the channel was torn down and resubscribed every
  // four seconds — and a handshake INSERT arriving during one of those gaps
  // was simply never delivered. That is the whole of "sometimes CONFIRM does
  // not work": two people standing in front of each other while the socket
  // that was supposed to tell them reconnects.
  useEffect(() => {
    if (!isLive || !supabase || !player?.id) return;
    const playerId = player.id;

    /**
     * BOTH SUBSCRIPTIONS ARE FILTERED SERVER-SIDE, AND THAT IS NOT AN
     * OPTIMISATION.
     *
     * Without `filter`, every client receives every row change on these tables
     * — so one player solving one challenge woke all sixty phones, and the
     * assignments handler below turned each of those into a refresh. Sixty
     * players solving roughly one challenge a second is sixty broadcasts a
     * second, each fanning out to sixty listeners, each firing a request. The
     * poll was never the problem next to that.
     *
     * The filter is applied by the realtime server before it sends anything,
     * so the phone is woken only by rows that are genuinely its own.
     */
    const channel = supabase
      .channel(`player-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', schema: 'public', table: 'interactions',
          filter: `target_id=eq.${playerId}`,
        },
        (payload) => {
          const row = payload.new as InteractionRow;
          if (row.state === 'pending') setIncoming(row);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', schema: 'public', table: 'assignments',
          filter: `player_id=eq.${playerId}`,
        },
        () => { void refreshRef.current(); }
      )
      /**
       * The status callback is the point.
       *
       * `.subscribe()` with no callback swallows everything — a channel that
       * never connects behaves exactly like one where nothing has happened
       * yet, which is why "realtime does not work" was impossible to tell
       * apart from "nobody has tapped anything". CHANNEL_ERROR and TIMED_OUT
       * now say so, and the poll below tightens to cover it.
       */
      .subscribe((status) => {
        const ok = status === 'SUBSCRIBED';
        setRealtimeOk(ok);
        if (!ok) {
          console.warn('[vault] realtime channel:', status, '— falling back to polling');
        }
      });

    /**
     * There is no separate handshake poll any more.
     *
     * There used to be one every three seconds, and on top of it a full board
     * + leaderboard + roster refresh on that same tick whenever the socket was
     * not subscribed — which was three more requests, duplicating the refresh
     * already running on its own four-second timer next door. Four redundant
     * requests per phone per three seconds, times sixty phones, for a fallback
     * that the snapshot below already covers: it carries `pending`, so a
     * dropped socket frame costs at most four seconds either way.
     */
    return () => { void supabase.removeChannel(channel); };
  }, [player?.id]);

  /**
   * The one poll. Board, leaderboard, roster, phase and handshakes, together.
   *
   * Skipped while the tab is hidden. A phone in a pocket does not need the
   * board, and sixty phones polling from pockets is a real slice of a request
   * budget that has already proved to be the binding constraint. Coming back
   * to the foreground refreshes immediately, so nothing is stale on screen.
   */
  useEffect(() => {
    if (!isLive || !session) return;

    /**
     * Jittered, because the herd is real.
     *
     * The host presses Start and sixty phones see the phase change within the
     * same tick, re-run this effect, and fire immediately — sixty requests in
     * one instant, then sixty more exactly four seconds later, aligned for the
     * rest of the game. Spreading the first call over a second and a half
     * turns a spike into a flat 15/s, which is the same total work arriving in
     * an order the server can actually keep up with.
     */
    const spread = Math.random() * 1500;
    const kick = window.setTimeout(() => { void refresh(); }, spread);

    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refresh();
    }, 4000 + spread);

    const wake = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.clearTimeout(kick);
      clearInterval(t);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [session, refresh]);

  // Session phase changes — the host starting or ending the room — used to be
  // their own four-second poll of sessions_public, running alongside the board
  // poll and asking a second time for something the same tick could have
  // fetched once. The snapshot carries the session, so refresh() above handles
  // the phase change, the notice, the doors, and a brand new room appearing.
  //
  // (It is still polled rather than subscribed, and that part was right:
  // `sessions` carries the host passcode, SELECT on it is revoked from players
  // entirely, and realtime postgres_changes cannot authorise a subscriber to a
  // table they cannot read — it would silently deliver nothing forever.)

  /* ------------------------------------------------------------------ *
   * The shared contract
   * ------------------------------------------------------------------ */

  const challenges = useMemo(() => {
    if (isLive) return board.filter((c) => (c.slot ?? 0) > 0);
    return getChallengeSet(username);
  }, [board, username]);

  const bonusChallenge = useMemo(() => {
    if (isLive) return board.find((c) => c.slot === 0);
    return mockBonusChallenge;
  }, [board]);

  const digitForChallenge = useCallback(
    (challengeId: string) => {
      const found = challenges.find((c) => c.id === challengeId);
      return found ? (found.slot ?? challenges.indexOf(found) + 1) : 0;
    },
    [challenges]
  );

  const getChallenge = useCallback(
    (routeId?: string) => {
      if (!routeId) return undefined;
      if (routeId === 'bonus') return bonusChallenge;
      const digit = parseInt(routeId, 10);
      if (Number.isNaN(digit) || digit < 1 || digit > 9) return undefined;

      if (!isLive) return challenges[digit - 1];

      // A vault holds several steps. Tapping it should open the next UNSOLVED
      // one, in order — so a player who does step 1, leaves, and comes back
      // lands on step 2 rather than being shown the puzzle they already beat.
      // Falling back to the last step means a fully-solved vault still renders
      // something instead of a "not in your set" error.
      const steps = challenges
        .filter((c) => c.slot === digit)
        .sort((a, b) => (a.step ?? 1) - (b.step ?? 1));

      return steps.find((c) => !c.solved) ?? steps[steps.length - 1];
    },
    [challenges, bonusChallenge]
  );

  const unlockVault = useCallback((id: string) => {
    // Optimistic. Live, the server has already said yes by the time this runs
    // (submit() awaited it), and the next refresh confirms it independently.
    setUnlockedVaults((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const solveBonus = useCallback(() => setBonusSolved(true), []);

  /**
   * The one place an answer is judged.
   *
   * Offline it compares against the bundled key, exactly as the prototype did.
   * Live it hands the answer to the server and returns whatever comes back —
   * there is no client-side comparison at all, because there is nothing to
   * compare against: the live board never received a correct answer.
   */
  const submit = useCallback(
    async (challenge: Challenge, answer: Record<string, unknown>): Promise<SubmitResult> => {
      let result: SubmitResult;

      if (isLive) {
        if (!challenge.assignmentId) {
          throw new Error('This challenge is not part of a live board');
        }
        result = await api.submitAnswer(challenge.assignmentId, answer);

        if (result.correct) {
          // Remember it, not just render it. Without this the next snapshot —
          // which may have been issued before this submit — hands back
          // `solved: false` and walks the player back to the question they
          // just answered.
          if (challenge.assignmentId) {
            solvedIds.current.set(challenge.assignmentId, Date.now());
          }

          // Mark this step solved locally so getChallenge() advances to the
          // next one immediately, rather than after the next refresh tick.
          setBoard((prev) =>
            prev.map((c) =>
              c.assignmentId === challenge.assignmentId ? { ...c, solved: true } : c
            )
          );

          // A vault opens only when its LAST step falls. Optimistically
          // unlocking on any correct answer would light the tile after step 1
          // of 3, and the server-computed leaderboard would then contradict it.
          const siblings = board.filter(
            (c) => c.slot === challenge.slot && c.assignmentId !== challenge.assignmentId
          );
          result.vaultComplete = siblings.every((c) => c.solved);

          if (result.vaultComplete) {
            if (challenge.slot === 0) setBonusSolved(true);
            else if (challenge.slot) unlockVault(String(challenge.slot));
          }
        }
      } else {
        // audit-ok: the OFFLINE branch. It only runs when there is no server
        // to ask, and the live board never carries an answer to compare with.
        const correct =
          challenge.type === 'text_input'
            ? String(answer.text ?? '').trim().toLowerCase() ===
              challenge.correctAnswerText?.toLowerCase()  // audit-ok
            : String(answer.option ?? '') === challenge.correctAnswerId; // audit-ok
        // Offline boards are one challenge per vault, so a correct answer
        // always completes it.
        result = { correct, solved: correct, vaultComplete: correct };
      }

      // A replayed submission on an already-open vault is not a fresh win, and
      // counting it would let a player pad a streak by re-answering.
      if (!result.replay) {
        setStreak((s) => (result.correct ? s + 1 : 0));
      }
      return result;
    },
    [unlockVault, board]
  );

  const clearEviction = useCallback(() => setEvicted(false), []);

  /**
   * Recomputed rather than stored, so it cannot go stale. Deliberately does NOT
   * consider `evicted`: a player the host wiped should see the notice and go
   * through the door, not be silently rejoined.
   */
  const rejoinable = Boolean(
    isLive && session && username && !player && !evicted &&
    localStorage.getItem('csi_session') === session.id
  );

  const confirmMeet = useCallback(async (interactionId: string) => {
    await api.confirmConnect(interactionId);
    setIncoming(null);
    await refresh();
  }, [refresh]);

  const reset = useCallback(() => {
    localStorage.clear();
    setUnlockedVaults([]);
    setBonusSolved(false);
    setUsername('');
    setPlayer(null);
    setBoard([]);
    rejoined.current = false;
  }, []);

  /* --- leaderboard ------------------------------------------------------ */
  // Rank by vaults unlocked, then completion time. Ties broken by name so the
  // order is stable between ticks and rows don't jitter.
  const prevRanks = useRef<Record<string, number>>({});
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const rows: LeaderboardEntry[] = isLive
      ? liveBoard.map((r) => ({
          id: r.player_id,
          rank: r.rank,
          name: r.player_id === player?.id ? `${r.name} (You)` : r.name,
          initials: (r.name.trim().charAt(0) || '?').toUpperCase(),
          // The tile art counts digits, and effective score is the real
          // ordering — so show vaults here and let rank carry the bonus.
          digits: r.vaults,
          evidence: Number(r.evidence ?? 0),
          vaultNo: r.vault_no,
          isYou: r.player_id === player?.id,
        }))
      : (() => {
          const you: LeaderboardEntry = {
            id: 'you',
            rank: 0,
            name: username ? `${username} (You)` : 'You',
            initials: (username.trim().charAt(0) || '?').toUpperCase(),
            digits: unlockedVaults.length,
            isYou: true,
          };
          return [...bots, you].sort(
            (a, b) =>
              b.digits - a.digits ||
              (a.isYou ? elapsedSeconds : 0) - (b.isYou ? elapsedSeconds : 0) ||
              a.name.localeCompare(b.name)
          );
        })();

    /**
     * Disambiguate shared names, once, here.
     *
     * Duplicates are allowed deliberately — sixty first-years collide on common
     * names, and turning people away at the door to enforce uniqueness is worse
     * than the confusion it avoids. But two identical rows on a projector are
     * genuinely unreadable, so a name that appears more than once gets its
     * vault number appended.
     *
     * Done at this single point rather than in each screen, so the leaderboard,
     * the podium, the crew feed and the hall display all agree.
     */
    const seen = new Map<string, number>();
    for (const r of rows) {
      const key = r.name.replace(/ \(You\)$/, "").toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }

    const ranked = rows.map((entry, index) => {
      const rank = index + 1;
      const previous = prevRanks.current[entry.id];
      const base = entry.name.replace(/ \(You\)$/, "");
      const shared = (seen.get(base.toLowerCase()) ?? 0) > 1 && entry.vaultNo != null;

      return {
        ...entry,
        name: shared ? entry.name.replace(base, `${base} #${entry.vaultNo}`) : entry.name,
        rank,
        delta: previous && previous > rank ? previous - rank : 0,
      };
    });

    prevRanks.current = Object.fromEntries(ranked.map((e) => [e.id, e.rank]));
    return ranked;
    // elapsedSeconds intentionally excluded: it ticks every second and would
    // re-sort (and re-flag deltas) constantly. Rank only needs to settle when
    // digits change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bots, liveBoard, unlockedVaults.length, username, player?.id]);

  // Deliberately excludes elapsedSeconds — see the note on ClockContext.
  const value = useMemo(
    () => ({
      username, setUsername, challenges, getChallenge, digitForChallenge,
      unlockedVaults, unlockVault, bonusSolved, solveBonus, leaderboard, reset,
      live: isLive, status, error, session, player, players,
      join, pin, reclaim, submit, streak, incoming, confirmMeet, refresh,
      evicted, clearEviction, booted, rejoinable,
    }),
    [
      username, challenges, getChallenge, digitForChallenge, unlockedVaults,
      unlockVault, bonusSolved, solveBonus, leaderboard, reset, status, error,
      session, player, players, join, pin, reclaim, submit, streak, incoming,
      confirmMeet, refresh, evicted, clearEviction, booted, rejoinable,
    ]
  );

  return (
    <GameContext.Provider value={value}>
      <ClockContext.Provider value={elapsedSeconds}>{children}</ClockContext.Provider>
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

/** Seconds since this player started. Re-renders the caller every second. */
export function useElapsed() {
  return useContext(ClockContext);
}
