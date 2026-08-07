/**
 * Semantic icon names. Content-level, not design-level: each names WHAT the
 * icon depicts, leaving the redesign free to render it as emoji, an icon set,
 * a sprite sheet or hand-drawn art without touching this file.
 */
export type GlyphKey =
  | 'mountain' | 'search' | 'headphones' | 'dog' | 'penguin' | 'camera'
  | 'bubble' | 'star' | 'rocket' | 'code' | 'key' | 'shield' | 'terminal'
  | 'dice' | 'flame' | 'wave' | 'lightning' | 'droplet' | 'leaf' | 'sun'
  | 'box' | 'circle' | 'triangle' | 'hexagon' | 'wind'
  | 'apple' | 'banana' | 'grapes' | 'orange';

export type ChallengeType = 'multiple_choice' | 'image_grid' | 'text_input';

export interface ChallengeOption {
  id: string;
  label: string;
  glyph?: GlyphKey;
}

export interface Challenge {
  id: string;
  title: string;
  type: ChallengeType;
  question: string;
  options?: ChallengeOption[];
  correctAnswerId?: string;
  correctAnswerText?: string;
  hint: string;
  timeLimit: number;
  isBonus?: boolean;
  glyph: GlyphKey;
}

/**
 * The pool every participant draws from. Each player gets a deterministic
 * 9-question slice keyed to their name, so no two phones show the same
 * "Question 1" — see getChallengeSet().
 *
 * Rebalanced for first-year CS students: ~8 playful visual puzzles (odd-one-out,
 * shape counts, pattern matching, emoji rebus) and ~10 light CS literacy questions.
 */
export const challengePool: Challenge[] = [
  {
    id: 'mountain_climb',
    title: 'Peak Finder',
    type: 'image_grid',
    question: 'Which path leads straight to the highest summit flag?',
    glyph: 'mountain',
    options: [
      { id: '1', label: 'North Ridge', glyph: 'mountain' },
      { id: '2', label: 'Skyline Pass', glyph: 'rocket' },
      { id: '3', label: 'Valley Loop', glyph: 'wave' },
      { id: '4', label: 'Shadow Gulch', glyph: 'shield' },
    ],
    correctAnswerId: '1',
    hint: 'Look for the flag standing on the highest peak.',
    timeLimit: 35,
  },
  {
    id: 'firewall',
    title: 'The Firewall',
    type: 'multiple_choice',
    question: 'Which of these guards a network against unauthorized access?',
    glyph: 'shield',
    options: [
      { id: 'a', label: 'Router', glyph: 'wave' },
      { id: 'b', label: 'Firewall', glyph: 'flame' },
      { id: 'c', label: 'Switch', glyph: 'box' },
      { id: 'd', label: 'Modem', glyph: 'circle' },
    ],
    correctAnswerId: 'b',
    hint: 'It shares a name with a barrier that stops a blaze.',
    timeLimit: 45,
  },
  {
    id: 'odd_animal',
    title: 'Odd One Out',
    type: 'image_grid',
    question: 'Which animal does not fit with the aquatic group?',
    glyph: 'dog',
    options: [
      { id: '1', label: 'Penguin', glyph: 'penguin' },
      { id: '2', label: 'Corgi', glyph: 'dog' },
      { id: '3', label: 'Wave Rider', glyph: 'wave' },
      { id: '4', label: 'Drop Splash', glyph: 'droplet' },
    ],
    correctAnswerId: '2',
    hint: 'Three of them love deep water. One prefers running in grass.',
    timeLimit: 30,
  },
  {
    id: 'listdir',
    title: 'Command Line',
    type: 'text_input',
    question: 'Which Linux command lists the contents of a folder?',
    glyph: 'terminal',
    correctAnswerText: 'ls',
    hint: 'Two letters. Short for "list".',
    timeLimit: 30,
  },
  {
    id: 'spot_diff',
    title: 'Spot the Match',
    type: 'image_grid',
    question: 'Which shape is identical in angle and proportion to the key?',
    glyph: 'search',
    options: [
      { id: '1', label: 'Triangle A', glyph: 'triangle' },
      { id: '2', label: 'Hexagon B', glyph: 'hexagon' },
      { id: '3', label: 'Box C', glyph: 'box' },
      { id: '4', label: 'Circle D', glyph: 'circle' },
    ],
    correctAnswerId: '1',
    hint: 'Match the three-sided geometry.',
    timeLimit: 30,
  },
  {
    id: 'snake',
    title: 'Name the Language',
    type: 'image_grid',
    question: 'Which programming language is named after a snake?',
    glyph: 'code',
    options: [
      { id: '1', label: 'JavaScript', glyph: 'lightning' },
      { id: '2', label: 'Python', glyph: 'leaf' },
      { id: '3', label: 'Ruby', glyph: 'star' },
      { id: '4', label: 'Java', glyph: 'droplet' },
    ],
    correctAnswerId: '2',
    hint: 'A very large constrictor.',
    timeLimit: 30,
  },
  {
    id: 'binary1010',
    title: 'Binary Code',
    type: 'text_input',
    question: 'What is the binary number 1010 in decimal?',
    glyph: 'key',
    correctAnswerText: '10',
    hint: '8 + 0 + 2 + 0',
    timeLimit: 60,
  },
  {
    id: 'html',
    title: 'Web Foundations',
    type: 'multiple_choice',
    question: 'What does HTML stand for?',
    glyph: 'code',
    options: [
      { id: 'a', label: 'Hyper Text Markup Language', glyph: 'code' },
      { id: 'b', label: 'High Tech Modern Language', glyph: 'hexagon' },
      { id: 'c', label: 'Hyperlink Text Module Logic', glyph: 'triangle' },
      { id: 'd', label: 'Home Tool Markup Language', glyph: 'circle' },
    ],
    correctAnswerId: 'a',
    hint: 'It marks up text, and it links.',
    timeLimit: 45,
  },
  {
    id: 'camera_snap',
    title: 'Photo Puzzle',
    type: 'image_grid',
    question: 'Which lens aperture allows the most light in low light?',
    glyph: 'camera',
    options: [
      { id: '1', label: 'Wide Aperture', glyph: 'sun' },
      { id: '2', label: 'Narrow Pin', glyph: 'circle' },
      { id: '3', label: 'Filter Shield', glyph: 'shield' },
      { id: '4', label: 'Dark Shutter', glyph: 'box' },
    ],
    correctAnswerId: '1',
    hint: 'Think of opening a window as wide as possible.',
    timeLimit: 30,
  },
  {
    id: 'andgate',
    title: 'Logic Gate',
    type: 'multiple_choice',
    question: 'Which gate outputs TRUE only when BOTH inputs are TRUE?',
    glyph: 'dice',
    options: [
      { id: 'a', label: 'OR', glyph: 'circle' },
      { id: 'b', label: 'XOR', glyph: 'triangle' },
      { id: 'c', label: 'NOT', glyph: 'hexagon' },
      { id: 'd', label: 'AND', glyph: 'box' },
    ],
    correctAnswerId: 'd',
    hint: 'You need this AND that.',
    timeLimit: 30,
  },
  {
    id: 'dice_roll',
    title: 'Dice Probability',
    type: 'image_grid',
    question: 'What is the most likely sum when rolling two standard 6-sided dice?',
    glyph: 'dice',
    options: [
      { id: '1', label: 'Seven (7)', glyph: 'star' },
      { id: '2', label: 'Two (2)', glyph: 'circle' },
      { id: '3', label: 'Twelve (12)', glyph: 'hexagon' },
      { id: '4', label: 'Five (5)', glyph: 'triangle' },
    ],
    correctAnswerId: '1',
    hint: 'There are six different ways to make this total.',
    timeLimit: 35,
  },
  {
    id: 'gitcommit',
    title: 'Version Control',
    type: 'multiple_choice',
    question: 'In Git, which command saves changes to your local repository?',
    glyph: 'terminal',
    options: [
      { id: 'a', label: 'git push', glyph: 'rocket' },
      { id: 'b', label: 'git pull', glyph: 'wind' },
      { id: 'c', label: 'git commit', glyph: 'key' },
      { id: 'd', label: 'git status', glyph: 'search' },
    ],
    correctAnswerId: 'c',
    hint: 'You are making a firm pledge.',
    timeLimit: 45,
  },
  {
    id: 'ram',
    title: 'Short Term Memory',
    type: 'multiple_choice',
    question: 'Which component loses everything when you power off?',
    glyph: 'lightning',
    options: [
      { id: 'a', label: 'Hard Disk', glyph: 'box' },
      { id: 'b', label: 'RAM', glyph: 'lightning' },
      { id: 'c', label: 'SSD', glyph: 'hexagon' },
      { id: 'd', label: 'USB Drive', glyph: 'circle' },
    ],
    correctAnswerId: 'b',
    hint: 'Random Access, and very forgetful.',
    timeLimit: 30,
  },
  {
    id: 'bits',
    title: 'Count the Bits',
    type: 'text_input',
    question: 'How many bits are there in one byte?',
    glyph: 'code',
    correctAnswerText: '8',
    hint: 'Same as the number of legs on a spider.',
    timeLimit: 30,
  },
  {
    id: 'bug',
    title: 'The First Bug',
    type: 'multiple_choice',
    question: 'The very first computer "bug" was literally what?',
    glyph: 'bubble',
    options: [
      { id: 'a', label: 'A moth', glyph: 'wind' },
      { id: 'b', label: 'A typo', glyph: 'bubble' },
      { id: 'c', label: 'A power cut', glyph: 'lightning' },
      { id: 'd', label: 'A cracked screen', glyph: 'triangle' },
    ],
    correctAnswerId: 'a',
    hint: 'It had wings, and it was found taped into a logbook.',
    timeLimit: 30,
  },
  {
    id: 'cpu',
    title: 'The Brain',
    type: 'text_input',
    question: 'Which three-letter chip is called the "brain" of a computer?',
    glyph: 'terminal',
    correctAnswerText: 'cpu',
    hint: 'Central Processing ____.',
    timeLimit: 30,
  },
  {
    id: 'rocket_launch',
    title: 'Speed Protocol',
    type: 'image_grid',
    question: 'Which protocol delivers streaming video with minimum latency?',
    glyph: 'rocket',
    options: [
      { id: '1', label: 'UDP Stream', glyph: 'rocket' },
      { id: '2', label: 'TCP Handshake', glyph: 'key' },
      { id: '3', label: 'FTP Archive', glyph: 'box' },
      { id: '4', label: 'SMTP Mail', glyph: 'bubble' },
    ],
    correctAnswerId: '1',
    hint: 'Fast and direct, without waiting for delivery confirmation.',
    timeLimit: 30,
  },
  {
    id: 'opensource',
    title: 'Free as in Freedom',
    type: 'multiple_choice',
    question: 'What does "open source" software mean?',
    glyph: 'shield',
    options: [
      { id: 'a', label: 'It costs nothing to buy', glyph: 'circle' },
      { id: 'b', label: 'Anyone can read and change the code', glyph: 'code' },
      { id: 'c', label: 'It only runs online', glyph: 'wave' },
      { id: 'd', label: 'It has no bugs', glyph: 'hexagon' },
    ],
    correctAnswerId: 'b',
    hint: 'The clue is the word "source".',
    timeLimit: 45,
  },
];

export const mockBonusChallenge: Challenge = {
  id: 'bonus',
  title: 'Spot the Match',
  type: 'image_grid',
  question: '🍎 🍌 🍇 🍊 🍇 🍌 🍇 🍎 🍇 — which fruit shows up the most?',
  glyph: 'star',
  options: [
    { id: 'a', label: 'Apple', glyph: 'apple' },
    { id: 'b', label: 'Banana', glyph: 'banana' },
    { id: 'c', label: 'Grapes', glyph: 'grapes' },
    { id: 'd', label: 'Orange', glyph: 'orange' },
  ],
  correctAnswerId: 'c',
  hint: 'Count them twice. Two of them tie on two each.',
  timeLimit: 30,
  isBonus: true,
};

/* ------------------------------------------------------------------ *
 * Per-player challenge assignment
 * ------------------------------------------------------------------ */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG — same seed always yields the same draw. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nine challenges drawn from the pool, ordered by the player's seed.
 * Deterministic so a refresh mid-event doesn't reshuffle someone's board,
 * but different per player so nobody can shout an answer across the room.
 */
export function getChallengeSet(seed: string): Challenge[] {
  const rand = mulberry32(hashSeed(seed || 'operation-vault'));
  const pool = [...challengePool];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 9);
}

export interface LeaderboardEntry {
  /** Stable identity. Never key a row by rank — rank is what moves. */
  id: string;
  rank: number;
  name: string;
  initials: string;
  digits: number;
  isYou?: boolean;
  delta?: number;
}

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: 'p1', rank: 1, name: 'CipherKing', initials: 'CK', digits: 7 },
  { id: 'p2', rank: 2, name: 'ByteWitch', initials: 'BW', digits: 6 },
  { id: 'p3', rank: 3, name: 'NetSurge', initials: 'NS', digits: 5 },
  { id: 'p4', rank: 4, name: 'ProtoHax', initials: 'PH', digits: 4 },
  { id: 'p5', rank: 5, name: 'RootZero', initials: 'RZ', digits: 4 },
  { id: 'p6', rank: 6, name: 'NullPointer', initials: 'NP', digits: 3 },
  { id: 'p7', rank: 7, name: 'StackTrace', initials: 'ST', digits: 2 },
];
