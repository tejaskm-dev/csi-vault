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
   * Is the websocket actually delivering?
   *
   * Held in a ref as well as state because the poll closure reads it every
   * three seconds and must not be rebuilt (and the channel torn down) each
   * time it flips.
   */
  const [realtimeOk, setRealtimeOk] = useState(false);
  const realtimeOkRef = useRef(false);
  realtimeOkRef.current = realtimeOk;

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

  const applyBoard = useCallback((rows: Challenge[]) => {
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

  const refresh = useCallback(async () => {
    if (!isLive || !session) return;
    try {
      const [rows, ranked, roster] = await Promise.all([
        player ? api.fetchBoard(session.id) : Promise.resolve([]),
        api.fetchLeaderboard(session.id),
        api.fetchPlayers(session.id),
      ]);

      /**
       * Did the host wipe the room out from under us?
       *
       * host_reset() deletes every player row. The phone holding this context
       * has no idea — it still has a `player` object, so it keeps asking for a
       * board that no longer exists and gets an empty one back forever. The
       * player sees nine locked vaults and no way forward, and nothing tells
       * them why.
       *
       * The roster was already being fetched on every tick; it just was not
       * being read. If our own id is no longer in it, we have been evicted.
       *
       * Note there is no `roster.length > 0` guard, and that is deliberate: a
       * full reset deletes EVERY player, so the empty roster is precisely the
       * case to catch. fetchPlayers throws on a failed request rather than
       * returning [], so an empty array here means genuinely empty.
       */
      if (player && !roster.some((p) => p.id === player.id)) {
        evict();
        return;
      }

      if (player) applyBoard(rows);

      setLiveBoard((prev) =>
        sameSig(
          ranked.map((r) => `${r.player_id}:${r.vaults}:${r.bonus}`).join("|"),
          prev.map((r) => `${r.player_id}:${r.vaults}:${r.bonus}`).join("|")
        ) ? prev : ranked
      );

      // The roster only grows during a session; names and numbers never change.
      setPlayers((prev) =>
        prev.length === roster.length &&
        prev.every((p, i) => p.id === roster[i].id) ? prev : roster
      );
    } catch (e) {
      setError(humanError(e, "Could not reach the game. Check your signal."));
    }
  }, [session, player, applyBoard, evict]);

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

    // A different room, or an identity from before this was tracked. Drop it
    // and send them through the door properly.
    if (storedRoom || username) forgetRoom(false);
    setBooted(true);
  }, [session, username, join, evicted, forgetRoom]);

  /* ------------------------------------------------------------------ *
   * Live: realtime
   * ------------------------------------------------------------------ */

  /**
   * A stable handle on the latest refresh().
   *
   * refresh() closes over `session` and `player`, so its identity changes
   * whenever either does — which, with a session poll running every four
   * seconds, was every four seconds. Any effect depending on it re-ran on that
   * cadence. Reading it through a ref lets the subscription below depend only
   * on the player id, which is what it actually cares about.
   */
  const refreshRef = useRef(refresh);
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

    const channel = supabase
      .channel(`player-${playerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload) => {
          const row = payload.new as InteractionRow;
          if (row.target_id === playerId && row.state === 'pending') {
            setIncoming(row);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assignments' },
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
     * Poll for pending handshakes as well as subscribing to them.
     *
     * The websocket is the fast path, not the reliable one. A phone that
     * locked, changed cell, or sat in a pocket drops frames and gets them back
     * only on reconnect — and the person in front of it is waiting. Three
     * seconds against a 60-second expiry window is a cheap guarantee that the
     * prompt always arrives while it is still valid.
     */
    const poll = async () => {
      try {
        const rows = await api.pendingForMe(playerId);
        // Never clobber a prompt that is already on screen; confirmMeet()
        // clears it, and replacing the row underneath a tap would drop it.
        setIncoming((cur) => cur ?? rows[0] ?? null);
        // The board too, when the socket is not delivering — otherwise a
        // connect or photo completion would never be noticed on a phone whose
        // channel failed to subscribe.
        if (!realtimeOkRef.current) void refreshRef.current();
      } catch { /* next tick */ }
    };
    void poll();
    const t = setInterval(poll, 3000);

    return () => {
      clearInterval(t);
      void supabase.removeChannel(channel);
    };
  }, [player?.id]);

  // The leaderboard, on a timer rather than a subscription. Sixty players
  // solving vaults would push a recompute several times a second; every four
  // seconds is faster than anyone can read a board and costs one query.
  useEffect(() => {
    if (!isLive || !session) return;
    void refresh();
    const t = setInterval(() => { void refresh(); }, 4000);
    return () => clearInterval(t);
  }, [session, refresh]);

  // Session phase changes — the host starting or ending the room.
  //
  // Polled, not subscribed. `sessions` carries the host passcode, so SELECT on
  // it is revoked from players entirely (0006 Part 3) and reads go through the
  // `sessions_public` view — which means realtime postgres_changes on that
  // table can no longer authorise a subscriber and would silently deliver
  // nothing. A phase change landing two seconds late costs nothing; a
  // subscription that quietly stopped working would have cost the whole event.
  useEffect(() => {
    if (!isLive || !session) return;
    const pull = async () => {
      try {
        const s = await api.defaultSession();
        if (!s) return;

        // A DIFFERENT room appeared. The host started a fresh session while
        // this phone was open, so the board it is holding belongs to a game
        // that is no longer running. Drop the identity and send them to the
        // door rather than leaving them tapping at a dead board.
        if (session && s.id !== session.id) {
          forgetRoom(true);
          setSession(s);
          setEvicted(true);
          return;
        }

        // Only swap the object when something actually changed. Setting a
        // fresh object every tick gave `session` a new identity four times a
        // minute, which cascaded into refresh() and from there into every
        // effect that depended on it — including the realtime subscription.
        setSession((cur) =>
          cur &&
          cur.id === s.id &&
          cur.phase === s.phase &&
          cur.started_at === s.started_at
            ? cur
            : s
        );
      } catch { /* the next tick tries again */ }
    };
    const t = setInterval(pull, 4000);
    return () => clearInterval(t);
  }, [session?.id, forgetRoom]);

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
        const correct =
          challenge.type === 'text_input'
            ? String(answer.text ?? '').trim().toLowerCase() ===
              challenge.correctAnswerText?.toLowerCase()
            : String(answer.option ?? '') === challenge.correctAnswerId;
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

    const ranked = rows.map((entry, index) => {
      const rank = index + 1;
      const previous = prevRanks.current[entry.id];
      return {
        ...entry,
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
      evicted, clearEviction, booted,
    }),
    [
      username, challenges, getChallenge, digitForChallenge, unlockedVaults,
      unlockVault, bonusSolved, solveBonus, leaderboard, reset, status, error,
      session, player, players, join, pin, reclaim, submit, streak, incoming,
      confirmMeet, refresh, evicted, clearEviction, booted,
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
