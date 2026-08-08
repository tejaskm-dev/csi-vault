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

interface GameState {
  username: string;
  setUsername: (name: string) => void;
  /** This player's nine, drawn from the pool by their name. */
  challenges: Challenge[];
  /** Resolve a route param (a digit 1-9, or "bonus") to a challenge. */
  getChallenge: (routeId?: string) => Challenge | undefined;
  /** Which digit (1-9) a challenge sits behind. */
  digitForChallenge: (challengeId: string) => number;
  unlockedVaults: string[];
  unlockVault: (id: string) => void;
  bonusSolved: boolean;
  solveBonus: () => void;
  leaderboard: LeaderboardEntry[];
  reset: () => void;
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
  const [startedAt] = useState<number>(() => {
    const saved = localStorage.getItem('csi_started');
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem('csi_started', now.toString());
    return now;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bots, setBots] = useState(mockLeaderboard);

  useEffect(() => {
    localStorage.setItem('csi_username', username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem('csi_unlocked', JSON.stringify(unlockedVaults));
  }, [unlockedVaults]);

  useEffect(() => {
    localStorage.setItem('csi_bonus', JSON.stringify(bonusSolved));
  }, [bonusSolved]);

  // Completion time — the leaderboard tie-breaker behind digits unlocked.
  useEffect(() => {
    const tick = () =>
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // MOCK: other players creeping up the board, so rank changes are visible
  // in the prototype. Replace with the live feed when one exists.
  useEffect(() => {
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

  const challenges = useMemo(() => getChallengeSet(username), [username]);

  const digitForChallenge = useCallback(
    (challengeId: string) => challenges.findIndex((c) => c.id === challengeId) + 1,
    [challenges]
  );

  const getChallenge = useCallback(
    (routeId?: string) => {
      if (!routeId) return undefined;
      if (routeId === 'bonus') return mockBonusChallenge;
      const digit = parseInt(routeId, 10);
      if (Number.isNaN(digit) || digit < 1 || digit > 9) return undefined;
      return challenges[digit - 1];
    },
    [challenges]
  );

  const unlockVault = useCallback((id: string) => {
    setUnlockedVaults((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const solveBonus = useCallback(() => setBonusSolved(true), []);

  const reset = useCallback(() => {
    localStorage.clear();
    setUnlockedVaults([]);
    setBonusSolved(false);
    setUsername('');
  }, []);

  // Rank by digits unlocked, then by completion time. Ties broken by name so
  // the order is stable between ticks and rows don't jitter.
  const prevRanks = useRef<Record<string, number>>({});
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const you: LeaderboardEntry = {
      id: 'you',
      rank: 0,
      name: username ? `${username} (You)` : 'You',
      initials: (username.trim().charAt(0) || '?').toUpperCase(),
      digits: unlockedVaults.length,
      isYou: true,
    };

    const ranked = [...bots, you]
      .sort(
        (a, b) =>
          b.digits - a.digits ||
          (a.isYou ? elapsedSeconds : 0) - (b.isYou ? elapsedSeconds : 0) ||
          a.name.localeCompare(b.name)
      )
      .map((entry, index) => {
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
  }, [bots, unlockedVaults.length, username]);

  // Deliberately excludes elapsedSeconds — see the note on ClockContext.
  const value = useMemo(
    () => ({
      username,
      setUsername,
      challenges,
      getChallenge,
      digitForChallenge,
      unlockedVaults,
      unlockVault,
      bonusSolved,
      solveBonus,
      leaderboard,
      reset,
    }),
    [
      username,
      challenges,
      getChallenge,
      digitForChallenge,
      unlockedVaults,
      unlockVault,
      bonusSolved,
      solveBonus,
      leaderboard,
      reset,
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
