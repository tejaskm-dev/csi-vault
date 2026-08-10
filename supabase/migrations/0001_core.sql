-- ============================================================================
-- OPERATION VAULT — core schema
-- ============================================================================
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to re-run while you are still setting the event up.
--
-- The shape of this file follows one rule, and it is worth stating up front
-- because every policy below is downstream of it:
--
--     THE CLIENT IS NOT TRUSTED WITH ANYTHING THAT DECIDES SCORE.
--
-- Sixty CS students on their own phones will open devtools. So answers live in
-- a table with row-level security ON and ZERO policies — which denies every
-- role, including the logged-in player — and are read only by SECURITY DEFINER
-- functions that run as the table owner. Scores are never written by the
-- client at all; they are derived from server-verified attempt rows.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. SESSIONS — one row per event run
-- ----------------------------------------------------------------------------
-- The host drives the whole room through this row. Phase gates what players can
-- do, and `started_at` is the single clock everyone is timed against, so a phone
-- with a wrong system time (or a helpful student who changed it) cannot alter a
-- placing. Design Bible §16: "time should use server/session state".

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'CSI Induction',
  phase       text not null default 'lobby'
                check (phase in ('lobby', 'live', 'ended')),
  started_at  timestamptz,
  ends_at     timestamptz,
  -- Players type this at the door. Short, because it goes on a projector.
  join_code   text not null unique default upper(substr(md5(random()::text), 1, 4)),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. PLAYERS
-- ----------------------------------------------------------------------------
-- auth_id ties a row to an anonymous Supabase auth user — one per phone. That
-- is what makes `auth.uid()` usable in policies, and it means a player who
-- refreshes mid-game lands back on their own board rather than a fresh one.
--
-- vault_no is the human handle. The Bible's challenges say "find Player 31",
-- not "find 8f2c-…", so every player needs a short number that is unique
-- within the session and readable across a loud room.

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  auth_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  vault_no    int  not null,
  avatar_url  text,
  joined_at   timestamptz not null default now(),
  finished_at timestamptz,
  unique (session_id, auth_id),
  unique (session_id, vault_no)
);

create index if not exists players_session_idx on public.players(session_id);
create index if not exists players_auth_idx    on public.players(auth_id);

-- ----------------------------------------------------------------------------
-- 3. CHALLENGES — the content pool (public, answer-free)
-- ----------------------------------------------------------------------------
-- `kind` is the mechanic. The event is a deliberate mix: some challenges are
-- solo digital puzzles, some force you across the room to talk to a stranger.
--
--   mcq        pick one of N              (solo, server-checked)
--   image_grid pick one of N, art-led     (solo, server-checked)
--   text_input type the answer            (solo, server-checked)
--   observe    spot / count / react       (solo, server-checked with bounds)
--   connect    find a specific player     (social, two-phone handshake)
--   exchange   you hold half a clue       (social, handshake then answer)
--   recall     who told you what          (social, memory of an earlier meet)
--   photo      go photograph something    (social, no validation by design)
--
-- `payload` holds whatever the kind needs — options, grid data, timing windows.
-- Keeping it jsonb means adding a mechanic later is an INSERT, not a migration.

create table if not exists public.challenges (
  id          text primary key,
  kind        text not null
                check (kind in ('mcq','image_grid','text_input','observe',
                                'connect','exchange','recall','photo')),
  title       text not null,
  question    text not null,
  hint        text not null default '',
  glyph       text not null default 'star',
  time_limit  int  not null default 45,
  is_bonus    boolean not null default false,
  payload     jsonb not null default '{}'::jsonb,
  active      boolean not null default true
);

-- ----------------------------------------------------------------------------
-- 4. CHALLENGE ANSWERS — the secret half
-- ----------------------------------------------------------------------------
-- RLS is enabled and NO POLICY IS EVER CREATED for this table. In Postgres that
-- means every request through PostgREST — anon, authenticated, any player —
-- reads zero rows. The only things that can see it are the SECURITY DEFINER
-- functions further down, which run as the owner and bypass RLS.
--
-- This is the fix for the prototype shipping `correctAnswerId` inside the JS
-- bundle. Now "view source" gets you the questions and nothing else.

create table if not exists public.challenge_answers (
  challenge_id text primary key references public.challenges(id) on delete cascade,
  -- {"option":"b"} | {"text":["ram","random access memory"]} | {"min_ms":150,"count":3}
  answer       jsonb not null
);

alter table public.challenge_answers enable row level security;
-- Intentionally no policies. Do not add any.

-- ----------------------------------------------------------------------------
-- 5. ASSIGNMENTS — this player's nine, plus the bonus
-- ----------------------------------------------------------------------------
-- Every player gets their own draw so nobody can shout an answer across the
-- room, and social challenges get a *per-player* target resolved at assignment
-- time. `payload` is where the generated variety lives: your half of the clue,
-- your symbol, your target's number.

create table if not exists public.assignments (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  challenge_id  text not null references public.challenges(id),
  slot          int  not null,            -- 1..9, or 0 for the bonus vault
  target_id     uuid references public.players(id) on delete set null,
  payload       jsonb not null default '{}'::jsonb,
  solved_at     timestamptz,
  unique (player_id, slot)
);

create index if not exists assignments_player_idx on public.assignments(player_id);
create index if not exists assignments_target_idx on public.assignments(target_id);

-- ----------------------------------------------------------------------------
-- 6. ATTEMPTS — the audit trail
-- ----------------------------------------------------------------------------
-- Every submission, right or wrong. Wrong answers cost nothing in scoring, but
-- keeping them means the host can see which challenge is quietly killing the
-- room, and it makes "was this cheated?" answerable after the fact.

create table if not exists public.attempts (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  submitted     jsonb not null,
  correct       boolean not null,
  created_at    timestamptz not null default now()
);

create index if not exists attempts_player_idx on public.attempts(player_id);

-- ----------------------------------------------------------------------------
-- 7. INTERACTIONS — the two-phone handshake
-- ----------------------------------------------------------------------------
-- The mechanic the whole social half rests on. A walks up to B, A taps CONNECT,
-- B's phone lights up, B taps CONFIRM. Two devices, neither touching the other,
-- which is Bible §16's hard rule.
--
-- `fact` carries whatever B hands over — their half of a clue, or the answer to
-- the social prompt — so a later `recall` challenge can ask about it and grade
-- the answer against something that actually happened.

create table if not exists public.interactions (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  actor_id      uuid not null references public.players(id) on delete cascade,
  target_id     uuid not null references public.players(id) on delete cascade,
  kind          text not null check (kind in ('connect','exchange','recall')),
  state         text not null default 'pending'
                  check (state in ('pending','confirmed','expired')),
  fact          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  -- A pending request is only live for a minute. Otherwise a player could fire
  -- requests at the whole room and collect confirmations passively later.
  expires_at    timestamptz not null default now() + interval '60 seconds'
);

create index if not exists interactions_target_idx
  on public.interactions(target_id, state);
create index if not exists interactions_actor_idx
  on public.interactions(actor_id);

-- Anti-cheese, Bible §16: no repeated pair farming. A given pair can only ever
-- produce one confirmed interaction, so two friends cannot sit together and
-- grind each other's challenges.
create unique index if not exists interactions_no_pair_farming
  on public.interactions (
    session_id,
    least(actor_id::text, target_id::text),
    greatest(actor_id::text, target_id::text)
  )
  where state = 'confirmed';

-- ----------------------------------------------------------------------------
-- 8. PHOTOS
-- ----------------------------------------------------------------------------
-- Photo challenges are graded by the fact that you did them. There is no
-- automated check and there is not meant to be — "photograph something with
-- four legs" is impossible to fake from a chair and costs nobody any
-- adjudication. The reward for the host is a wall of real photos from the room.

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  storage_path  text not null,
  caption       text,
  -- The host can hide anything unwanted from the projector without deleting it.
  visible       boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists photos_session_idx on public.photos(session_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 9. MEMES — the reaction library
-- ----------------------------------------------------------------------------
-- A curated set, not all eighty. Each row points at a file in the `memes`
-- storage bucket and declares when it fires. Keeping the trigger in the table
-- rather than in the client means the host can retune the room's sense of
-- humour between sessions without a redeploy.

create table if not exists public.memes (
  id          text primary key,
  label       text not null,
  trigger     text not null,   -- see src/lib/reactions.ts for the vocabulary
  storage_path text not null,
  weight      int not null default 1,
  active      boolean not null default true
);

-- ============================================================================
-- SCORING
-- ============================================================================
-- Bible §1: vaults completed first, bonus vaults at two-for-one, time as the
-- final tiebreaker. Derived, never stored — there is no score column for a
-- client to write to, because a score column is the thing you would attack.

create or replace view public.player_scores as
select
  p.id,
  p.session_id,
  p.name,
  p.vault_no,
  p.avatar_url,
  count(*) filter (where a.solved_at is not null and a.slot > 0) as vaults,
  count(*) filter (where a.solved_at is not null and a.slot = 0) as bonus,
  count(*) filter (where a.solved_at is not null and a.slot > 0)
    + count(*) filter (where a.solved_at is not null and a.slot = 0) * 0.5
    as effective,
  -- Seconds from the session start to this player's last unlock. A player who
  -- has solved nothing is parked at the end of the ordering rather than at the
  -- front, which a plain max() of nulls would do.
  coalesce(
    extract(epoch from (max(a.solved_at) - s.started_at))::int,
    999999
  ) as elapsed
from public.players p
join public.sessions s on s.id = p.session_id
left join public.assignments a on a.player_id = p.id
group by p.id, p.session_id, p.name, p.vault_no, p.avatar_url, s.started_at;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.sessions     enable row level security;
alter table public.players      enable row level security;
alter table public.challenges   enable row level security;
alter table public.assignments  enable row level security;
alter table public.attempts     enable row level security;
alter table public.interactions enable row level security;
alter table public.photos       enable row level security;
alter table public.memes        enable row level security;

-- Helper: the calling phone's player row in a session. Used by half the
-- policies below, so it is worth having in one place.
create or replace function public.me(p_session uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.players
  where session_id = p_session and auth_id = auth.uid()
  limit 1;
$$;

-- --- sessions: everyone reads the room they are in; only the host writes -----
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions
  for select to anon, authenticated using (true);

-- --- challenges: content is public, answers are not (separate table) ---------
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges
  for select to anon, authenticated using (active);

-- --- memes: public read ------------------------------------------------------
drop policy if exists memes_read on public.memes;
create policy memes_read on public.memes
  for select to anon, authenticated using (active);

-- --- players -----------------------------------------------------------------
-- Everyone can see everyone: you cannot "find Player 31" if the app will not
-- tell you Player 31 exists. Names, numbers and avatars are all that is here,
-- which is the whole reason the Bible bans collecting anything sensitive.
drop policy if exists players_read on public.players;
create policy players_read on public.players
  for select to authenticated using (true);

-- A player may edit their own row, and only the two cosmetic fields. Note this
-- is UPDATE-only — inserts go through join_session(), so nobody can mint
-- themselves a second identity or pick their own vault number.
drop policy if exists players_update_self on public.players;
create policy players_update_self on public.players
  for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- --- assignments -------------------------------------------------------------
-- You can read your own board, and you can read an assignment that targets you
-- (your phone needs to know why a stranger is walking towards it).
-- There is no INSERT or UPDATE policy at all: solving is a server decision.
drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments
  for select to authenticated using (
    player_id in (select id from public.players where auth_id = auth.uid())
    or target_id in (select id from public.players where auth_id = auth.uid())
  );

-- --- attempts ----------------------------------------------------------------
-- Read your own history. Writes happen inside submit_answer().
drop policy if exists attempts_read on public.attempts;
create policy attempts_read on public.attempts
  for select to authenticated using (
    player_id in (select id from public.players where auth_id = auth.uid())
  );

-- --- interactions ------------------------------------------------------------
-- Both sides of a handshake can see it; that is what drives the realtime
-- "someone is here to meet you" prompt. Neither side can write directly.
drop policy if exists interactions_read on public.interactions;
create policy interactions_read on public.interactions
  for select to authenticated using (
    actor_id  in (select id from public.players where auth_id = auth.uid())
    or target_id in (select id from public.players where auth_id = auth.uid())
  );

-- --- photos ------------------------------------------------------------------
-- The wall is public within the session — it is going on a projector.
drop policy if exists photos_read on public.photos;
create policy photos_read on public.photos
  for select to authenticated using (visible);

-- ============================================================================
-- REALTIME
-- ============================================================================
-- Three tables drive live UI: the hall display, the handshake prompt, and the
-- photo wall. Realtime still honours RLS, so a player only receives the
-- interaction rows they are a party to.

do $$
begin
  alter publication supabase_realtime add table public.assignments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.interactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.photos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception when duplicate_object then null;
end $$;
