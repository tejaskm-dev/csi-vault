# Event runbook

Everything to do before sixty people arrive, in order, with the things most
likely to break called out. Read this once end to end before you start.

---

## 1. Migrations

SQL Editor, in order. Each is re-runnable.

| File | What it adds |
|---|---|
| `0001` – `0006` | Already run |
| `0007_connect_guards.sql` | "Already met" / "no such number" errors |
| `0008_minigames_charades.sql` | Minigame grading, charades, dictionary |
| `0009_deal_and_content.sql` | Seeds on deal, first minigames, kills near-dupes |
| `0010_content.sql` | ~45 challenges, categories, more charade words |
| `0011_more_games.sql` | Pairs + Wires |
| `0012_stages.sql` | **Optional.** Vaults become 2–3 challenge stages |
| `0013_doors.sql` | Locks new joins once the game starts |
| `0014_ramp.sql` | Difficulty ramp, tutorial vaults, retires 7 bad questions |
| `0015_anagram.sql` | Replaces Codeword with an anagram; drops the dictionary |
| `0016_tumbler_fix.sql` | **Tumbler was unsolvable.** Deals the combination server-side |

**On `0012`:** everything works without it. Skip it if you run short on testing
time and the game stays nine vaults / one challenge each. Run it and a full
game goes from ~9 challenges to ~19.

Then **Reset room** on the dashboard. Boards are dealt at join time, so anyone
who joined before a content migration keeps their old board.

## 2. Run the audit

**`supabase/audit.sql`** in the SQL editor, after every content migration.
It checks all ~50 challenges for the things playing will not reliably find:
answer keys pointing at options that do not exist, impostor grids whose odd
tile is out of range, anagram alternates that are not anagrams, vaults that
cannot be filled, charade decoys identical to the answer.

An empty result means the content is consistent. Anything marked **BLOCKER** is
a challenge that can never be solved — fix before the event.

## 3. Enable the camera

Photo challenges use `getUserMedia`, which browsers only allow on **HTTPS or
localhost**. On a plain `http://` LAN address the viewfinder is refused and
players silently get the old file picker instead — it still works, it's just
worse. If you're deploying to Vercel/Netlify you already have HTTPS.

## 4. Upload the GIFs (optional)

`scripts/upload-memes.md`. Sixteen files. **The bucket is currently empty.**

Without them the reaction layer still works — it shows a hand-lettered shout
("TOO FAST", "THREE UP", "ALL NINE") in the app's own style. Upload the files
and GIFs replace the shouts automatically, with the shout as a caption. A file
that 404s falls back per-reaction, so a half-uploaded bucket is fine.

## 5. Change the host code

```sql
update public.sessions set host_code = '<six digits>' where join_code = 'CSI1';
```

`801422` is in this repo.

---

## Test plan — do these in this order

Half of these need two devices. A normal window plus an incognito window works;
each gets its own anonymous identity.

### Doors (do this first — 2 min)

The one that closes a real exploit. Clearing localStorage kills the anonymous
identity, and before `0013` that got you a **brand new board** — a free reroll,
as many times as you liked.

- Join, start the game, then **clear site data on that phone and reload.**
  You should get *"The game has already started"* with the recovery form open.
  You should **not** get a fresh board.
- Recover with vault number + PIN → your old board comes back.
- **Let a latecomer in** on the dashboard → that phone can now join fresh.
  Close the doors again afterwards; the dashboard warns you while they're open.

### The ramp (2 min)

- Vault 1 is **one** tap-to-answer challenge. Vault 2 is two easy ones. Neither
  should involve talking to anyone.
- Vaults 2–9 show **STEP 1 OF 2** (or 3) in the header.
- **Only vault 1 is tappable** at the start. The rest are locked until the one
  before it is done — type `/challenge/5` and you get bounced to the board.
- Social work does not appear until vault 3.

After running `0014`, check the SQL editor output for any
`Vault N wants X step(s) but only Y qualify` warnings. That means a vault
cannot be filled and would strand players.

### Fresh session (2 min)

An identity is scoped to the room it was made in. Within a session, refreshing
or locking the phone rejoins silently — that path must keep working. Across
sessions it must not.

- Join, play a bit, then **Reset room**. The phone shows VAULTS RESEALED and
  goes back to the door — it must not silently rejoin with the old name.
- Refresh mid-game in the *same* session → straight back to your board, no
  name screen. (If this breaks, it is worse than the bug it replaced.)
- Create a second session in SQL while a phone is open:
  `insert into sessions (name, join_code, phase) values ('Round 2','CSI2','lobby');`
  That phone should drop its old board and return to the door.

### Routing (3 min)

The URL is now driven by state, not just by buttons. Check all four:

- Join while the game is in **lobby** → you land on the **waiting room**, showing
  your vault number and a live count. Not the board.
- Host presses **Start** → every waiting phone moves to the board **by itself**.
- Host presses **End** → every phone lands on the results.
- Type `/home` in the address bar before joining → bounced to the name screen.

### Solo, one device (10 min)

1. Join with a name. You should land on the board with a vault number and a
   4-digit code visible on Home.
2. Open each vault until you've seen: an MCQ, an observe task, and a minigame.
3. **Tumbler** — turn dials, confirm the hot/cold labels change, solve it.
4. **Maze** — swipe. Check it doesn't move through walls.
5. **Scrambled** — all tiles must be used and there is one right answer.
   Solve it, and confirm a wrong arrangement says so and lets you retry.
   (This replaced Codeword, which rejected valid words like POSE.)
6. **Vault Runner** — tap to fly, clear six gates.
7. **Pairs** and **Wires** — clear both.
8. Refresh mid-vault. Progress must survive.

### Two devices (15 min) — the risky half

9. **Connect.** A taps I FOUND THEM with B's number. B's phone should raise the
   full-screen prompt **within ~3 seconds**. B confirms; A's vault advances.
10. **Type a number nobody has** → *"Nobody in this room has that number."*
11. **Re-enter someone already met** → *"You have already teamed up with them."*
12. **Charades.** A gets a word behind tap-to-peek, finds B, B confirms, four
    options appear on B's phone, B guesses. **A's** vault completes.
13. **Exchange.** A and B each hold half; after meeting, A can do the sum.
14. **Photo.** Viewfinder opens, shutter works, photo appears on
    `/admin/display` within ~15s.

### Host (5 min)

15. `/admin`, enter the code. Start the game.
16. Confirm the **Stalled** counter exists and reads 0.
17. **Recovery codes → Look up** lists players and PINs.
18. **Reset room** (two taps) while a player device is open. Within ~4 seconds
    that phone should show **VAULTS RESEALED** and offer to go back in. It must
    not sit on a board of locked vaults.
19. On a third device, clear site data, then **Recover your run** with a vault
    number + PIN. The board should come back intact.

---

## Known weak points

**Vault Runner is the softest target.** It reports its own score; the server
only rejects the physically impossible (6 gates under 15 seconds). Everything
else is either seeded and regenerated server-side, or verified outright. It's
worth half a vault, so the effort to cheat exceeds just playing — but it isn't
as solid as the rest, and you should know which one it is.

**Charades depends on both phones staying awake.** If B's screen locks, the
prompt still arrives on unlock via the 3-second poll, but the 60-second window
may have expired. Tell people to keep screens on.

**Photo uploads on bad wifi.** Images are downscaled to ~200KB before sending,
but sixty simultaneous uploads on a congested network will queue. Photo
challenges are spread across vault 3 only, which staggers them naturally.

---

## Mid-event levers

| Problem | Fix |
|---|---|
| Room can't find each other; **Stalled** climbing | Call everyone into the centre. It's a room problem, not an app one |
| Game running long | `update vault_plan set steps = 1 where vault_no > 5;` then it applies to new joiners only — better: End the game and rank on what's done |
| A photo you don't want on the wall | Dashboard hides it; the row is kept |
| Someone lost everything | Recovery codes → Look up → read out their PIN |
| Laptop died holding the host claim | Any device: enter the code again after 12h, or use Release on the original |
| Someone genuinely arrived late | **Let a latecomer in**, they join, then close the doors |
| Player cleared their browser | Recovery codes → Look up → they use Recover your run |
