#!/usr/bin/env node
/**
 * Grep-based check for the bug shapes that have actually broken this app.
 *
 * Every rule below exists because that exact mistake shipped and a player hit
 * it. It is not a linter and it does not understand the code — it looks for
 * signatures, and a match means "go and read this", not "this is broken".
 *
 * `npm run audit:code`
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

function walk(dir) {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : p.match(/\.tsx?$/) ? [p] : [];
  });
}

/**
 * Each rule: what to look for, why it matters, and how to satisfy it.
 * `skip` suppresses a line that is the accepted fix rather than the problem.
 */
const RULES = [
  {
    id: "promise-all",
    why: "Promise.all discards good results when one call fails — this is how the leaderboard silently stopped updating.",
    fix: "Use Promise.allSettled and apply each result on its own.",
    test: (l) => l.includes("Promise.all("),
  },
  {
    id: "untimed-await",
    why: "A hung request with no deadline freezes any UI that disabled itself before awaiting. supabase-js has no default timeout.",
    fix: "Route it through rpc() in lib/api.ts, or race it against a timeout.",
    test: (l) => /await (client\(\)\.rpc|supabase\.(from|rpc|storage))/.test(l),
  },
  {
    id: "silent-catch",
    why: "An empty catch turns a failure into a dead button — the player taps and nothing happens, forever.",
    fix: "Show something via humanError(), or comment why silence is correct here.",
    // Precise: flag only a catch whose body is EMPTY and unexplained. Trying
    // to guess "did this handle it properly" by pattern produced mostly false
    // positives — a checker that cries wolf gets ignored, which is worse than
    // no checker. A one-line comment saying why silence is right satisfies it.
    test: (l, next, after) => {
      const oneLine = /catch\s*(\(\w+\))?\s*\{\s*\}/.test(l);
      if (oneLine) return true;
      if (!/\}\s*catch\s*(\(\w+\))?\s*\{\s*$/.test(l)) return false;
      // Body is empty when the very next non-blank line closes the block and
      // nothing explained it.
      const body = after.split("\n");
      const first = body.find((b) => b.trim() !== "");
      return first !== undefined && /^\s*\}/.test(first) && !/\/[/*]/.test(next);
    },
  },
  {
    id: "unkeyed-task",
    why: "Steps in one vault share a path, so React reuses the component and its state carries into the next question.",
    fix: "key={challenge.assignmentId} on anything rendered per-question.",
    test: (l) => /<(ObserveTask|ConnectTask|ExchangeTask|RecallTask|PhotoTask|CharadesTask|Minigame)\b/.test(l)
              && !l.includes("key="),
  },
  {
    id: "answer-in-bundle",
    why: "A correct answer that reaches the client is a correct answer a player can read.",
    fix: "Grade it server-side; the client should only ever send what was chosen.",
    // mockData.ts is the OFFLINE board and is meant to hold answers — the
    // live board never receives them. Excluded by file, not by line.
    test: (l, _n, _a, file) =>
      /correctAnswer(Id|Text)/.test(l) && !/mockData\.ts|api\.ts/.test(file),
  },
  {
    id: "reject-fast-human",
    why: "Timing floors and hand-written dictionaries reject CORRECT answers. Three separate bugs so far: min_ms, the word list, the maze bound.",
    fix: "Do not invent plausibility rules that a real player can trip.",
    test: (l) => /min_ms|MIN_LEN|>= *\d{3} *&&.*ms/.test(l),
  },
  {
    id: "two-impls-one-truth",
    why: "A PRNG reimplemented in SQL will not match the JS one — that is exactly how the tumbler became unsolvable for every player.",
    fix: "Deal the value once server-side and store it; never derive the same secret twice.",
    // Only the SQL side is dangerous. Client-side seeding for LAYOUT (maze
    // walls, tile order) is fine, because the server grades structure rather
    // than regenerating the puzzle.
    sql: true,
    test: (l) => /mulberry32|random\(\).*seed|seeded.*prng/i.test(l),
  },
];

const SKIP = [/audit-code/, /\.test\.tsx?$/];

let findings = 0;
const byRule = {};

for (const file of walk(SRC)) {
  if (SKIP.some((r) => r.test(file))) continue;
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    // An eslint-style opt-out for a reviewed, accepted case.
    if (line.includes("audit-ok")) return;
    for (const rule of RULES) {
      if (rule.sql) continue;
      const after = lines.slice(i + 1, i + 5).join("\n");
      if (rule.test(line, lines[i + 1] ?? "", after, rel)) {
        (byRule[rule.id] ??= []).push(`${rel}:${i + 1}  ${line.trim().slice(0, 88)}`);
        findings++;
      }
    }
  });
}

// SQL rules run over the migrations, where the duplicated-truth risk lives.
for (const rule of RULES.filter((r) => r.sql)) {
  const dir = join(ROOT, "supabase", "migrations");
  const all = readdirSync(dir).filter((f) => f.endsWith(".sql"));

  // Migrations are append-only history: an early file may create something a
  // later one removes. Only flag what still exists after the whole set runs.
  const dropped = new Set();
  for (const f of all) {
    for (const m of readFileSync(join(dir, f), "utf8")
      .matchAll(/drop function if exists public\.(\w+)/g)) dropped.add(m[1]);
  }

  for (const f of all) {
    readFileSync(join(dir, f), "utf8").split("\n").forEach((line, i) => {
      if (line.trim().startsWith("--")) return;
      if ([...dropped].some((d) => line.includes(d))) return;
      if (rule.test(line)) {
        (byRule[rule.id] ??= []).push(`supabase/migrations/${f}:${i + 1}  ${line.trim().slice(0, 88)}`);
        findings++;
      }
    });
  }
}

if (!findings) {
  console.log("code audit: clean\n");
  process.exit(0);
}

for (const rule of RULES) {
  const hits = byRule[rule.id];
  if (!hits) continue;
  console.log(`\n${rule.id}  (${hits.length})`);
  console.log(`  why: ${rule.why}`);
  console.log(`  fix: ${rule.fix}`);
  for (const h of hits) console.log(`    ${h}`);
}
console.log(`\n${findings} to review. Add "audit-ok" on a line you have checked and accepted.\n`);
// Advisory, not a gate — these are prompts to read, not proof of a bug.
process.exit(0);
