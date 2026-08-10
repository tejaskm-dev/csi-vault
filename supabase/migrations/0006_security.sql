-- ============================================================================
-- OPERATION VAULT — hardening
-- ============================================================================
-- Run after 0005_host.sql. Fixes two real weaknesses in what came before.
--
-- 1. THE HOST CODE WAS THE WHOLE LOCK.
--    Six digits is a million combinations, every host_* function was granted
--    to `anon`, and the five-try lockout was in React — which means it was in
--    the browser, which means it was not a lockout. A student who opened the
--    bundle, read the RPC names and pointed a script at host_overview() could
--    have walked the keyspace in an afternoon. Now the code only CLAIMS the
--    session to one device; after that, authority is the claim, and guessing
--    the code while the real host holds it gets you nothing.
--
-- 2. CLEARING BROWSER DATA DESTROYED A PLAYER.
--    Anonymous auth lives in localStorage. Refreshing is fine and always was,
--    but "clear browsing data" minted a fresh user, and join_session() saw a
--    stranger and dealt a new board — with the old row left on the leaderboard
--    as a ghost. Now every player gets a recovery PIN that rebinds their real
--    row to a new device.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Attempt log — the lockout that is actually a lockout
-- ----------------------------------------------------------------------------
-- Server-side, so it cannot be stepped over in devtools. Keyed on auth.uid()
-- rather than IP, which Postgres cannot see through PostgREST. Rotating that
-- key means signing up a fresh anonymous user each time, and Supabase rate
-- limits signups on its own — so the two together are what make brute force
-- expensive rather than either alone.

create table if not exists public.auth_attempts (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('host','reclaim')),
  auth_id    uuid,
  session_id uuid,
  ok         boolean not null,
  at         timestamptz not null default now()
);

create index if not exists auth_attempts_lookup
  on public.auth_attempts (kind, auth_id, at desc);

alter table public.auth_attempts enable row level security;
-- No policies. Only the SECURITY DEFINER functions below touch this.

/**
 * Raise if this caller has failed too often lately.
 *
 * Five failures buys a fifteen-minute freeze on that identity. Deliberately
 * NOT a lock on the session row: locking the session would let anybody DoS the
 * host out of their own event by failing on purpose right before the game.
 */
create or replace function public.throttle(p_kind text, p_max int default 5, p_window interval default '15 minutes')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fails int;
begin
  select count(*) into v_fails
  from public.auth_attempts
  where kind = p_kind
    and auth_id = auth.uid()
    and not ok
    and at > now() - p_window;

  if v_fails >= p_max then
    raise exception 'too many attempts — wait a few minutes';
  end if;
end;
$$;

-- ============================================================================
-- PART 1 — HOST DEVICE CLAIM
-- ============================================================================

alter table public.sessions
  add column if not exists host_auth_id   uuid,
  add column if not exists host_claimed_at timestamptz;

-- Audit. Every state change to the room, with who did it. Cheap, and the only
-- way to answer "who ended the game" after the fact.
create table if not exists public.host_audit (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  auth_id    uuid,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);

alter table public.host_audit enable row level security;
-- No policies; read it from the SQL editor when you need it.

/**
 * Claim the session for this device.
 *
 * The code is spent here and only here. Afterwards the host's authority is
 * `sessions.host_auth_id = auth.uid()`, so an attacker who eventually guesses
 * the six digits still cannot act while the real host holds the claim.
 *
 * The claim is takeable again after 12 hours, so a lost laptop does not brick
 * the session forever, and by the current holder at any time — re-running this
 * on the same device is a no-op refresh.
 */
-- NOTE ON WHY THIS RETURNS A STATUS INSTEAD OF RAISING.
--
-- `raise exception` aborts the transaction, which rolls back everything the
-- function did — including the failed-attempt row written moments earlier. A
-- throttle whose evidence is destroyed by the very failure it is counting is
-- not a throttle. So failures return `{ok:false, error:…}` and the log
-- survives; the client turns a false into a thrown error at the edge.

create or replace function public.host_claim(p_session uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  public.sessions;
  v_fail text := null;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not signed in');
  end if;

  -- Raising here is correct and safe: nothing has been written yet, and a
  -- throttled caller must not be able to extend their own window by logging
  -- more attempts.
  perform public.throttle('host');

  select * into v_row from public.sessions where id = p_session;
  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'no such session');
  end if;

  if v_row.host_code <> trim(p_code) then
    v_fail := 'bad host code';
  elsif v_row.host_auth_id is not null
        and v_row.host_auth_id <> auth.uid()
        and v_row.host_claimed_at > now() - interval '12 hours' then
    -- Right code, but somebody else is already holding the room.
    v_fail := 'another device is already hosting this session';
  end if;

  if v_fail is not null then
    insert into public.auth_attempts (kind, auth_id, session_id, ok)
    values ('host', auth.uid(), p_session, false);
    return jsonb_build_object('ok', false, 'error', v_fail);
  end if;

  update public.sessions
  set host_auth_id = auth.uid(), host_claimed_at = now()
  where id = p_session;

  insert into public.auth_attempts (kind, auth_id, session_id, ok)
  values ('host', auth.uid(), p_session, true);
  insert into public.host_audit (session_id, auth_id, action)
  values (p_session, auth.uid(), 'claim');

  return jsonb_build_object('ok', true);
end;
$$;

/** Hand the room back, so another laptop can take it without waiting 12h. */
create or replace function public.host_release(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.sessions
    where id = p_session and host_auth_id = auth.uid()
  ) then
    raise exception 'you are not hosting this session';
  end if;

  update public.sessions
  set host_auth_id = null, host_claimed_at = null
  where id = p_session;

  insert into public.host_audit (session_id, auth_id, action)
  values (p_session, auth.uid(), 'release');

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- host_ok, rewritten
-- ----------------------------------------------------------------------------
-- Was: does this string equal the stored code.
-- Now: is this device the one holding the claim. The `p_code` argument stays
-- so the existing host_* signatures do not change, but it is ignored — an
-- attacker with the code and no claim gets nothing.

create or replace function public.host_ok(p_session uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions
    where id = p_session
      and host_auth_id is not null
      and host_auth_id = auth.uid()
  );
$$;

-- Log what the host actually does. host_set_phase and host_reset are the two
-- that change the room out from under sixty people.
--
-- Returns jsonb, not `public.sessions`. Returning the table type means
-- PostgREST serialises the whole row back to the caller — including
-- `host_code`, which is exactly the leak Part 3 below exists to close. Listing
-- the fields explicitly means a column added to `sessions` later cannot
-- silently start being published.
drop function if exists public.host_set_phase(uuid, text, text);

create or replace function public.host_set_phase(p_session uuid, p_code text, p_phase text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;
  if p_phase not in ('lobby','live','ended') then
    raise exception 'unknown phase';
  end if;

  update public.sessions
  set phase = p_phase,
      started_at = case
        when p_phase = 'live' then coalesce(started_at, now())
        else started_at
      end,
      ends_at = case when p_phase = 'ended' then now() else ends_at end
  where id = p_session
  returning * into v_row;

  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'phase', jsonb_build_object('to', p_phase));

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'phase', v_row.phase,
    'started_at', v_row.started_at,
    'ends_at', v_row.ends_at,
    'join_code', v_row.join_code
  );
end;
$$;

grant execute on function public.host_set_phase(uuid, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Lock the doors
-- ----------------------------------------------------------------------------
-- These were granted to `anon`, meaning an unauthenticated request could
-- attempt them. Authentication is not much of a bar on its own — anyone can
-- sign in anonymously — but it forces an attacker through Supabase's own
-- signup rate limiting to get a new identity after each throttle.

-- REVOKE FROM PUBLIC, NOT FROM anon. This is the trap.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and a
-- grant to PUBLIC is not removed by revoking from a role that merely belongs
-- to it. `revoke ... from anon` against a PUBLIC grant is a silent no-op — it
-- returns success and changes nothing, which is the worst possible failure
-- mode for a security statement. Only `from public` actually closes the door,
-- and the explicit grants afterwards reopen it for exactly who should have it.

revoke execute on function public.host_set_phase(uuid, text, text)     from public, anon;
revoke execute on function public.host_hide_photo(uuid, text, boolean) from public, anon;
revoke execute on function public.host_reset(uuid, text)               from public, anon;
revoke execute on function public.host_overview(uuid, text)            from public, anon;
revoke execute on function public.host_claim(uuid, text)               from public, anon;
revoke execute on function public.host_release(uuid)                   from public, anon;
-- host_pins is not declared until Part 2; it is locked down there, next to its
-- own definition. Revoking it here would abort the migration on a function
-- that does not exist yet.

grant execute on function public.host_set_phase(uuid, text, text)      to authenticated;
grant execute on function public.host_hide_photo(uuid, text, boolean)  to authenticated;
grant execute on function public.host_reset(uuid, text)                to authenticated;
grant execute on function public.host_overview(uuid, text)             to authenticated;
grant execute on function public.host_claim(uuid, text)                to authenticated;
grant execute on function public.host_release(uuid)                    to authenticated;

-- Internal only. These were revoked "from anon, authenticated" in earlier
-- migrations, which left the PUBLIC grant standing — so build_board() was in
-- fact callable by any player, who could have re-dealt their own board until
-- they liked the questions. Closing it properly here.
revoke execute on function public.throttle(text, int, interval) from public, anon, authenticated;
revoke execute on function public.pick_target(uuid, uuid)       from public, anon, authenticated;
revoke execute on function public.build_board(uuid, uuid)       from public, anon, authenticated;
revoke execute on function public.host_ok(uuid, text)           from public, anon, authenticated;

-- The leaderboard stays open to anon: /admin/display is thrown at a wall and
-- must not need a sign-in mid-event, and it shows only what the room can
-- already see.

-- ============================================================================
-- PART 2 — PLAYER RECOVERY
-- ============================================================================

/**
 * PINs live apart from players, for the same reason answers live apart from
 * challenges: `players` is world-readable so that "find Player 31" can work,
 * and a PIN on that table would be a PIN published to the whole room.
 *
 * RLS on, no policies, ever.
 */
create table if not exists public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  pin       text not null
);

alter table public.player_secrets enable row level security;
-- Intentionally no policies. Do not add any.

-- join_session gains a PIN in its return value, and Postgres will not replace
-- a function with a different return type.
drop function if exists public.join_session(text, text);

create or replace function public.join_session(p_join_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_phase   text;
  v_player  public.players;
  v_no      int;
  v_name    text;
  v_pin     text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select id, phase into v_session, v_phase
  from public.sessions
  where join_code = upper(trim(p_join_code));

  if v_session is null then
    raise exception 'no such session';
  end if;
  if v_phase = 'ended' then
    raise exception 'this session has ended';
  end if;

  -- Rejoin path: same phone, same session.
  select * into v_player from public.players
  where session_id = v_session and auth_id = auth.uid();

  if found then
    select pin into v_pin from public.player_secrets where player_id = v_player.id;
    return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin);
  end if;

  v_name := nullif(trim(left(coalesce(p_name, ''), 20)), '');

  -- Lock the session row so two phones joining in the same millisecond cannot
  -- both read the same max(vault_no).
  perform 1 from public.sessions where id = v_session for update;

  select coalesce(max(vault_no), 0) + 1 into v_no
  from public.players where session_id = v_session;

  insert into public.players (session_id, auth_id, name, vault_no)
  values (v_session, auth.uid(), coalesce(v_name, 'Player ' || v_no), v_no)
  returning * into v_player;

  -- Four digits. Small enough to memorise for half an hour, and brute forcing
  -- it needs the right vault number too, through the same throttle as the host
  -- code. This is a recovery convenience at a college induction, not a bank.
  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  insert into public.player_secrets (player_id, pin) values (v_player.id, v_pin);

  perform public.build_board(v_session, v_player.id);

  return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin);
end;
$$;

/**
 * Take your player row back on a new device.
 *
 * This is the answer to "I cleared my browsing data". It rebinds the existing
 * row — board, solved vaults, meetings, elapsed time and all — to whichever
 * anonymous user is asking, provided they can produce the vault number and
 * PIN. Nothing is re-dealt and nothing is lost.
 *
 * Throttled, because vault number plus four digits is guessable given enough
 * tries, and the prize is somebody else's progress.
 */
create or replace function public.reclaim_player(p_join_code text, p_vault_no int, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_player  public.players;
  v_pin     text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  perform public.throttle('reclaim');

  select id into v_session from public.sessions
  where join_code = upper(trim(p_join_code));
  if v_session is null then
    raise exception 'no such session';
  end if;

  select * into v_player from public.players
  where session_id = v_session and vault_no = p_vault_no;

  select pin into v_pin from public.player_secrets where player_id = v_player.id;

  -- Returned rather than raised, for the same reason as host_claim above: an
  -- exception would roll back the attempt row and disarm the throttle.
  if v_player.id is null or v_pin is null or v_pin <> trim(p_pin) then
    insert into public.auth_attempts (kind, auth_id, session_id, ok)
    values ('reclaim', auth.uid(), v_session, false);
    return jsonb_build_object('ok', false, 'error', 'that number and code do not match');
  end if;

  -- Free the row from whatever anonymous user currently holds it. The old
  -- identity keeps existing in auth.users and simply owns nothing — which is
  -- correct, because that browser's storage is already gone.
  update public.players set auth_id = auth.uid() where id = v_player.id;

  insert into public.auth_attempts (kind, auth_id, session_id, ok)
  values ('reclaim', auth.uid(), v_session, true);

  select * into v_player from public.players where id = v_player.id;
  return jsonb_build_object('ok', true, 'player', to_jsonb(v_player), 'pin', v_pin);
end;
$$;

/**
 * The host's lookup for a student who lost their PIN.
 *
 * Not adjudication — the host reads a number off a screen and says it out
 * loud. The alternative is telling a first-year who cleared their cache that
 * their seven vaults are gone, which is the kind of thing people remember
 * about an induction.
 */
create or replace function public.host_pins(p_session uuid, p_code text)
returns table (vault_no int, name text, pin text)
language sql
stable
security definer
set search_path = public
as $$
  select p.vault_no, p.name, s.pin
  from public.players p
  join public.player_secrets s on s.player_id = p.id
  where p.session_id = p_session
    and public.host_ok(p_session, p_code)
  order by p.vault_no;
$$;

-- Same PUBLIC trap as Part 1: revoke from public first, then grant on purpose.
revoke execute on function public.join_session(text, text)        from public, anon;
revoke execute on function public.reclaim_player(text, int, text) from public, anon;
revoke execute on function public.host_pins(uuid, text)           from public, anon;

grant execute on function public.join_session(text, text)              to authenticated;
grant execute on function public.reclaim_player(text, int, text)       to authenticated;
grant execute on function public.host_pins(uuid, text)                 to authenticated;

-- ============================================================================
-- Backfill
-- ============================================================================
-- Anyone who joined before this migration has no PIN. Give them one rather
-- than leaving a subset of the room unrecoverable.

insert into public.player_secrets (player_id, pin)
select p.id, lpad((floor(random() * 10000))::int::text, 4, '0')
from public.players p
where not exists (select 1 from public.player_secrets s where s.player_id = p.id);

-- ============================================================================
-- PART 3 — STOP PUBLISHING THE HOST CODE
-- ============================================================================
-- 0001 shipped `sessions_read ... using (true)`, which grants SELECT on the
-- whole row — and 0005 then added `host_code` to that row. Net effect: any
-- phone in the room could read the admin passcode with one request and no
-- authentication at all:
--
--   GET /rest/v1/sessions?select=host_code
--
-- Postgres RLS has no column-level filtering, so a row policy cannot fix this.
-- The fix is to stop exposing the table and expose a view instead, containing
-- only the columns the client actually needs.

-- The players' view of the room. No host_code, no host_auth_id.
--
-- Deliberately NOT `security_invoker`. An invoker-rights view runs with the
-- CALLER's privileges, so it would need the caller to hold SELECT on
-- `public.sessions` — which is revoked immediately below. The two together are
-- self-defeating: the view returns "permission denied for table sessions" to
-- everybody, including the host, and since defaultSession() is the first call
-- the app makes, nothing works at all.
--
-- Owner-rights (the Postgres default for views) is what is wanted here. The
-- view reads `sessions` as its owner and hands back only the six safe columns,
-- which is precisely the column-level filtering RLS cannot do.
drop view if exists public.sessions_public;
create view public.sessions_public as
select id, name, phase, started_at, ends_at, join_code, created_at
from public.sessions;

grant select on public.sessions_public to anon, authenticated;

-- Revoke the base table. Everything that legitimately needs host_code is a
-- SECURITY DEFINER function, which bypasses RLS and is unaffected.
drop policy if exists sessions_read on public.sessions;
revoke select on public.sessions from anon, authenticated;

-- Nothing is granted back. host_set_phase now returns jsonb with an explicit
-- field list, so no caller ever needs SELECT on the base table.
--
-- One consequence, handled in the client rather than here: realtime
-- `postgres_changes` on `sessions` depends on the subscriber being able to
-- SELECT the row, so those events stop arriving. The app polls the session
-- through `sessions_public` on its existing refresh tick instead — a phase
-- change reaching a phone two seconds later costs nothing, and this removes
-- any question of what realtime does or does not filter from a payload.
do $$
begin
  alter publication supabase_realtime drop table public.sessions;
exception when others then null;
end $$;

-- ============================================================================
-- A LAST WORD ON THE DEFAULT CODE
-- ============================================================================
-- 0005 seeded host_code = '801422', which is committed in this repository and
-- therefore public. Change it before the event:
--
--   update public.sessions set host_code = '<six digits>' where join_code = 'CSI1';
--
-- With the claim above, an unchanged code is much less dangerous than it was —
-- it only works while nobody is hosting. It is still not a secret.
