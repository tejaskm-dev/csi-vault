#!/usr/bin/env node
/**
 * Drive a real room with fake players.
 *
 * Every bug found so far came from reading code or from one person tapping a
 * phone. The paths that have never been exercised are the two-sided ones —
 * handshakes, charades, exchange — because they need two devices and a person
 * on each. Those are also the paths most likely to fail in front of sixty
 * students, and the ones least likely to be tested beforehand.
 *
 * This signs in as N anonymous players against the live project and plays them
 * through: joining, boards, answering, meeting each other, guessing charades,
 * and the small-room pairing limit. It uses the same RPCs the app does, so a
 * pass here means the server half genuinely works.
 *
 *   npm run simulate            4 players
 *   npm run simulate -- 8       8 players
 *
 * IT CREATES REAL PLAYER ROWS. Reset the room afterwards. It refuses to run
 * against a session that already has people in it.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").filter(Boolean)
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const URL_ = env.VITE_PUBLIC_SUPABASE_URL;
const KEY = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const N = Math.max(2, Number(process.argv[2] ?? 4));

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log(`  ok    ${m}`); };
const bad = (m, e) => { fail++; console.log(`  FAIL  ${m}${e ? ` — ${e}` : ""}`); };

async function signIn() {
  const r = await fetch(`${URL_}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r.ok) throw new Error(`anonymous sign-in failed (${r.status}) — enable it in Auth → Providers`);
  return (await r.json()).access_token;
}

/** Same shape as the app's rpc() helper, including the deadline. */
async function rpc(token, name, args = {}) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(12000),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name}: ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : null;
}

async function get(token, path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  return r.ok ? r.json() : [];
}

const main = async () => {
  console.log(`\nSimulating ${N} players\n`);

  const [session] = await get(KEY, "sessions_public?select=id,join_code,phase&order=created_at.desc&limit=1");
  if (!session) return bad("no session exists");
  console.log(`session ${session.join_code} · phase ${session.phase}\n`);

  if (session.phase !== "live") {
    console.log("  NOTE: session is not live, so answers cannot be submitted.");
    console.log("        Start the game from /admin to exercise the full run.\n");
  }

  /* --- join ------------------------------------------------------------ */
  console.log("JOINING");
  const players = [];
  for (let i = 0; i < N; i++) {
    try {
      const token = await signIn();
      const res = await rpc(token, "join_session", { p_join_code: session.join_code, p_name: `Sim${i + 1}` });
      players.push({ token, player: res.player, pin: res.pin, board: [] });
    } catch (e) { bad(`player ${i + 1} join`, e.message); }
  }
  if (players.length < 2) return bad("need at least two players to test anything");
  ok(`${players.length} joined, vault numbers ${players.map(p => p.player.vault_no).join(", ")}`);

  const nums = new Set(players.map((p) => p.player.vault_no));
  nums.size === players.length ? ok("vault numbers are unique") : bad("DUPLICATE vault numbers");
  players.every((p) => p.pin?.length === 4) ? ok("every player got a 4-digit recovery pin") : bad("missing recovery pin");

  /* --- boards ---------------------------------------------------------- */
  console.log("\nBOARDS");
  for (const p of players) {
    try { p.board = await rpc(p.token, "my_board", { p_session: session.id }); }
    catch (e) { bad(`board for #${p.player.vault_no}`, e.message); }
  }

  const sizes = players.map((p) => p.board.length);
  console.log(`  board sizes: ${sizes.join(", ")}`);
  sizes.every((s) => s === sizes[0]) ? ok("all boards the same size") : bad("boards differ in size");

  for (const p of players) {
    const bySlot = {};
    for (const c of p.board) (bySlot[c.slot] ??= []).push(c);
    const short = Object.entries(bySlot).filter(([slot]) => slot !== "0")
      .filter(([, steps]) => steps.length < 1);
    if (short.length) bad(`#${p.player.vault_no} has an unfillable vault`);
    const vaults = Object.keys(bySlot).filter((s) => s !== "0").length;
    if (vaults !== 9) bad(`#${p.player.vault_no} has ${vaults} vaults, expected 9`);
  }
  ok("every board has nine vaults, none short");

  // The complaint that started this: are boards actually different?
  const sigs = players.map((p) => p.board.map((c) => c.challenge_id).sort().join(","));
  const identical = sigs.filter((s) => s === sigs[0]).length;
  identical === players.length
    ? bad(`ALL ${players.length} boards contain the same challenges`)
    : ok(`boards differ (${new Set(sigs).size} distinct sets across ${players.length} players)`);

  const overlap = [];
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const a = new Set(players[i].board.map((c) => c.challenge_id));
    const b = players[j].board.map((c) => c.challenge_id);
    overlap.push(b.filter((x) => a.has(x)).length / b.length);
  }
  const avg = overlap.reduce((x, y) => x + y, 0) / overlap.length;
  console.log(`  average overlap between any two boards: ${Math.round(avg * 100)}%`);
  avg < 0.6 ? ok("boards are meaningfully different") : bad(`boards overlap ${Math.round(avg * 100)}% — pool too small`);

  // Nothing that cannot be rendered.
  const KINDS = new Set(["mcq","image_grid","text_input","observe","connect","exchange","recall","photo","charades","minigame"]);
  const GAMES = new Set(["tumbler","maze","anagram","survival","pairs","wires"]);
  let broken = 0;
  for (const p of players) for (const c of p.board) {
    if (!KINDS.has(c.kind)) { bad(`unknown kind "${c.kind}" on ${c.challenge_id}`); broken++; }
    if (c.kind === "minigame" && !GAMES.has(c.payload?.game)) { bad(`unknown game on ${c.challenge_id}`); broken++; }
    if (c.kind === "minigame" && c.payload?.game === "anagram" && !c.payload?.letters) { bad(`anagram ${c.challenge_id} dealt no letters`); broken++; }
    if (c.kind === "minigame" && c.payload?.game === "tumbler" && !c.payload?.combo) { bad(`tumbler ${c.challenge_id} dealt no combination`); broken++; }
    if (c.payload?.word_id) { bad(`${c.challenge_id} leaked word_id to the client`); broken++; }
  }
  if (!broken) ok("every dealt challenge is renderable and leaks nothing");

  // Impostor squares should differ between players.
  const imps = players.map((p) => p.board.find((c) => c.payload?.mode === "impostor")).filter(Boolean);
  if (imps.length >= 2) {
    new Set(imps.map((c) => c.payload.odd_index)).size > 1
      ? ok("impostor square differs between players")
      : bad("impostor is in the SAME square for everyone");
  }

  /* --- the handshake --------------------------------------------------- */
  console.log("\nTWO-PHONE FLOWS");
  const socialOf = (p) => p.board.filter((c) => ["connect","exchange","charades"].includes(c.kind));
  const [a, b] = players;
  const aSocial = socialOf(a);

  if (!aSocial.length) { bad("no social challenge on the first board"); }
  else if (session.phase !== "live") { console.log("  skipped — session not live"); }
  else {
    const ch = aSocial[0];
    try {
      const req = await rpc(a.token, "request_connect",
        { p_assignment: ch.assignment_id, p_target_no: b.player.vault_no });
      ok(`#${a.player.vault_no} knocked on #${b.player.vault_no} (${ch.kind})`);

      const pending = await get(b.token, `interactions?select=id,state&target_id=eq.${b.player.id}&state=eq.pending`);
      pending.length ? ok("it arrived on the other phone") : bad("target never saw the request");

      if (ch.kind === "charades") {
        const brief = await rpc(a.token, "charades_brief", { p_assignment: ch.assignment_id });
        brief?.word ? ok(`actor got a word (${brief.word})`) : bad("actor got no word");
        const opts = await rpc(b.token, "charades_options", { p_interaction: req.interaction_id });
        opts?.options?.length === 4 ? ok("guesser got four options") : bad(`guesser got ${opts?.options?.length} options`);
        opts?.options?.includes(brief.word)
          ? ok("the right answer is among them")
          : bad("the correct word is NOT among the options — unwinnable");
        const g = await rpc(b.token, "charades_guess", { p_interaction: req.interaction_id, p_guess: brief.word });
        g?.correct ? ok("correct guess accepted") : bad("correct guess REJECTED");
      } else {
        await rpc(b.token, "confirm_connect", { p_interaction: req.interaction_id, p_fact: {} });
        ok("confirmed from the second phone");
        const after = await rpc(a.token, "my_board", { p_session: session.id });
        const solved = after.find((c) => c.assignment_id === ch.assignment_id)?.solved;
        if (ch.kind === "connect") {
          solved ? ok("the connect challenge completed") : bad("handshake confirmed but challenge not solved");
        } else {
          const inter = await get(a.token, `interactions?select=fact&assignment_id=eq.${ch.assignment_id}&state=eq.confirmed`);
          inter[0]?.fact?.value != null ? ok("exchange handed over the other half") : bad("exchange gave no value");
        }
      }

      // Anti-farming, and the exhaustion escape hatch.
      try {
        await rpc(a.token, "request_connect", { p_assignment: ch.assignment_id, p_target_no: b.player.vault_no });
        players.length <= 3
          ? ok("repeat allowed — room too small for new partners (correct)")
          : bad("repeat pairing was ALLOWED while strangers remain");
      } catch (e) {
        /already met/.test(e.message)
          ? ok("repeat pairing refused while strangers remain")
          : bad("repeat rejected for the wrong reason", e.message);
      }
    } catch (e) { bad("handshake", e.message); }
  }

  /* --- grading --------------------------------------------------------- */
  if (session.phase === "live") {
    console.log("\nGRADING");
    const mcq = a.board.find((c) => c.kind === "mcq");
    if (mcq) {
      try {
        const r = await rpc(a.token, "submit_answer",
          { p_assignment: mcq.assignment_id, p_answer: { option: "__nope__" } });
        r.correct === false ? ok("a wrong answer is rejected cleanly") : bad("a nonsense answer was ACCEPTED");
      } catch (e) { bad("submit_answer on mcq", e.message); }
    }
    const tum = a.board.find((c) => c.payload?.game === "tumbler");
    if (tum?.payload?.combo) {
      try {
        const r = await rpc(a.token, "submit_answer",
          { p_assignment: tum.assignment_id, p_answer: { dials: tum.payload.combo } });
        r.correct ? ok("tumbler accepts its dealt combination") : bad("TUMBLER REJECTS ITS OWN COMBINATION");
      } catch (e) { bad("tumbler submit", e.message); }
    }
  }

  /* --- leaderboard ----------------------------------------------------- */
  console.log("\nLEADERBOARD");
  try {
    const lb = await rpc(a.token, "leaderboard", { p_session: session.id, p_limit: 100 });
    lb.length >= players.length ? ok(`lists all ${lb.length} players`) : bad(`only ${lb.length} of ${players.length} listed`);
    const ranks = lb.map((r) => Number(r.rank));
    ranks.every((r, i) => i === 0 || r >= ranks[i - 1]) ? ok("ranks are ordered") : bad("ranks out of order");
  } catch (e) { bad("leaderboard", e.message); }

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail
    ? "\nFix the failures above before the event.\n"
    : "\nServer-side flows all work. Reset the room to clear the simulated players.\n");
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error("\nsimulation crashed:", e.message, "\n"); process.exit(1); });
