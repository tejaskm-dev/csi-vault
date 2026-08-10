# Operation Vault — backend setup

Everything the game needs on the server, in the order you should do it. Budget
about twenty minutes the first time.

The app runs **without any of this**. With no env vars it falls back to mock
questions, localStorage progress and a bot leaderboard — that is the normal way
to work on screens. This document is for making it a real sixty-player game.

---

## 1. Create the project

Supabase dashboard → **New project**. Any region near you; the free tier is
comfortably enough for sixty phones for half an hour.

## 2. Turn on anonymous sign-in

**Authentication → Providers → Anonymous → Enable.**

Do not skip this. Every player is an anonymous auth user, and `auth.uid()` is
what every security policy in the schema keys off. Without it, nobody can join
and the console will say so.

## 3. Run the migrations

**SQL Editor → New query.** Paste and run each file in order, one at a time:

| File | What it does |
|---|---|
| `supabase/migrations/0001_core.sql` | Tables, the scoring view, row-level security, realtime |
| `supabase/migrations/0002_rpc.sql` | Game logic — joining, boards, answers, handshakes |
| `supabase/migrations/0003_storage.sql` | The `photos` and `memes` buckets and their policies |
| `supabase/migrations/0004_seed.sql` | Challenge pool, answer key, reaction library, one session |
| `supabase/migrations/0005_host.sql` | Host controls and the operator overview |
| `supabase/migrations/0006_security.sql` | Host device claim, server-side throttling, player recovery PINs |

All five are re-runnable. Edit a question in `0004_seed.sql` and run it again to
push the change.

## 4. Point the app at it

**Project Settings → API**, then in `.env`:

```
VITE_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

Restart the dev server — Vite reads env at boot. The name screen should now say
**LIVE SESSION** under the button.

## 5. Change the host code

The seed ships `801422`, which is in this repo and therefore public.

```sql
update public.sessions set host_code = '<six digits>' where join_code = 'CSI1';
```

## 6. Upload the reaction GIFs

See `scripts/upload-memes.md`. The game works fine without them — it just does
not react.

---

## Running the event

1. Open `/admin` on the laptop, enter the host code.
2. Open `/admin/display` on the projector. It needs no sign-in, by design.
3. Students scan the QR to the site root and enter a name.
4. When the room is in, press **Start the game**. This stamps the clock
   everyone is timed against.
5. **End the game** freezes it.

Watch the **Stalled** counter on the dashboard. It counts handshakes that were
opened and never confirmed. If it climbs past five or so, players cannot find
each other — call everyone into the middle of the room. That is a room problem,
not an app problem, and no button fixes it.

---

## How cheating is prevented

Worth knowing, because the design is not obvious and the temptation to "just
add a quick query" will undo it.

**Answers are not in the bundle.** They live in `challenge_answers`, which has
RLS enabled and *zero policies*. In Postgres that denies every role, including
a logged-in player. Only `SECURITY DEFINER` functions can read it. Viewing
source gets you the questions and nothing else.

**Scores are derived, never written.** There is no score column. A player's
standing is computed from `solved_at` timestamps that only `submit_answer()`
can set. There is nothing to POST to.

**Time comes from the server.** `sessions.started_at` is stamped once when the
host starts the room. A phone with an edited clock changes nothing.

**Meetings need two phones.** `request_connect()` opens a pending row;
only the *target* can call `confirm_connect()`. One phone tapping a button
proves nothing.

**Pairs cannot be farmed.** A unique index allows exactly one confirmed
interaction per pair per session, so two friends cannot grind each other.

**Targets are load-balanced.** `pick_target()` chooses the least-targeted
player who you have not already met, so nobody becomes the answer to eleven
people's challenge.

The one deliberate exception: **photo challenges are not validated at all.**
There is no machine check for "photograph something red", it needs no
adjudication, and it cannot be faked from a chair. That is the whole mechanic.

---

## The admin lock

The host passcode is **not readable by players**. `sessions` carries
`host_code`, and Postgres RLS filters rows rather than columns — so the
original `using (true)` policy meant one unauthenticated request
(`GET /rest/v1/sessions?select=host_code`) returned the admin code to anybody
in the room. `0006` revokes SELECT on the table outright and exposes
`sessions_public`, a view without that column. If you add a session read
somewhere, use the view.

The host code does **not** authorise anything on its own. It is spent once, by
`host_claim()`, which binds the session to that browser's auth user. Every
`host_*` function afterwards checks `sessions.host_auth_id = auth.uid()`.

So someone who eventually guesses the six digits still cannot touch the room
while you are holding it. They would have to guess it *and* find the room
unclaimed.

Supporting pieces:

- **Server-side throttle.** Five failures per identity buys a 15-minute freeze,
  recorded in `auth_attempts`. The five-try counter on the login screen is
  cosmetic; this is the real one. It is not a lock on the *session* — that
  would let anyone freeze you out of your own event by failing on purpose.
- **`anon` is revoked** from every host function. An attacker has to sign in
  first, which puts them behind Supabase's own signup rate limiting each time
  the throttle rotates them.
- **Audit log.** `host_audit` records every claim, release and phase change
  with the auth id that did it.
- **Release.** "Release this room to another device" on the dashboard. Use it
  if you switch laptops — otherwise the claim holds for 12 hours.

`/admin/display` stays open with no sign-in. It shows only what the room can
already see, and needing to log in on a projector mid-event is a way to lose
two minutes in front of an audience.

---

## If a student loses their progress

Anonymous auth lives in localStorage. Refreshing, closing the tab and
backgrounding the browser are all fine. **Clearing browsing data is not** — it
mints a new identity.

So every player gets a 4-digit recovery PIN at join, shown on their home screen
next to their vault number. To come back: **Already playing? Recover your run**
on the name screen, then vault number + PIN. The original row is rebound to the
new device with board, solved vaults, meetings and elapsed time intact —
nothing is re-dealt.

If they lost the PIN too, the dashboard has **Recovery codes → Look up**. You
read the number out loud. That is a lookup, not a judgement call, so it does
not break the no-manual-verification rule.

PINs live in `player_secrets`, which — like `challenge_answers` — has RLS on
and no policies, so they are not readable through the API by anyone. They are
deliberately *not* on `players`, which is world-readable so that "find Player
31" can work.

---

## Troubleshooting

**"No open session"** — no session row is in `lobby` or `live`. Run
`0004_seed.sql`, or set the phase from the dashboard.

**Everyone joins but boards are empty** — `0004_seed.sql` did not run, so
`build_board()` had no challenges to deal. Run it, then **Reset room** so
players are re-dealt.

**"anonymous sign-in failed" in the console** — step 2.

**Photos fail to upload** — check the `photos` bucket exists and `0003` ran.
The path must be `<auth uid>/<file>`; the policy rejects anything else.

**Reactions never fire** — expected until you upload the GIFs. Confirm with
`select count(*) from memes;` and check the files are in the `memes` bucket at
the paths that table lists.

**A vault opens for the wrong player** — should be impossible;
`submit_answer()` checks ownership. If you see it, the app is calling a table
directly somewhere instead of an RPC. That is the bug.
