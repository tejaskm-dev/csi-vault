-- ============================================================================
-- OPERATION VAULT — host controls
-- ============================================================================
-- Run after 0004_seed.sql.
--
-- The host laptop is one browser tab with an anon key, exactly like the sixty
-- phones. It gets its extra powers from a secret it holds, checked server-side
-- on every call — never from a client-side `isAdmin` flag, which is a login
-- screen that anyone can walk past with devtools.
--
-- The existing six-digit code on src/admin/Login.tsx stays as the UI, but it is
-- now a key to this, not a decoration.
-- ============================================================================

alter table public.sessions
  add column if not exists host_code text not null default '801422';

-- Verify a host secret against a session. Constant-ish comparison is overkill
-- for a six-digit code in a college hall, but the important part is that the
-- comparison happens HERE, where the client cannot see the expected value.
create or replace function public.host_ok(p_session uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions
    where id = p_session and host_code = trim(p_code)
  );
$$;

-- ----------------------------------------------------------------------------
-- host_set_phase — start and stop the room
-- ----------------------------------------------------------------------------
-- Moving to 'live' stamps started_at, and that stamp is the clock every
-- player's elapsed time is measured against. It is set once: re-running
-- 'live' after a pause does not restart everybody's timer.

create or replace function public.host_set_phase(p_session uuid, p_code text, p_phase text)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sessions;
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'bad host code';
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

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- host_hide_photo — the projector kill switch
-- ----------------------------------------------------------------------------
-- Sixty phones with cameras pointed at a room, output going on a wall. You
-- want one tap that takes something down without a database console. Hiding
-- keeps the row, so nothing is silently lost.

create or replace function public.host_hide_photo(p_photo uuid, p_code text, p_visible boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
begin
  select session_id into v_session from public.photos where id = p_photo;
  if v_session is null then
    raise exception 'no such photo';
  end if;
  if not public.host_ok(v_session, p_code) then
    raise exception 'bad host code';
  end if;

  update public.photos set visible = p_visible where id = p_photo;
  return jsonb_build_object('ok', true, 'visible', p_visible);
end;
$$;

-- ----------------------------------------------------------------------------
-- host_reset — wipe the players, keep the content
-- ----------------------------------------------------------------------------
-- For the dry run. You will test this with a handful of friends before the
-- real thing, and you want the room empty afterwards without dropping the
-- challenge pool you just spent an evening tuning.

create or replace function public.host_reset(p_session uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'bad host code';
  end if;

  -- Cascades take assignments, attempts, interactions and photo rows with them.
  -- Files already in the storage bucket are left alone deliberately: deleting
  -- objects from here cannot be undone, and an orphaned photo costs nothing.
  delete from public.players where session_id = p_session;

  update public.sessions
  set phase = 'lobby', started_at = null, ends_at = null
  where id = p_session;

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- host_overview — one call for the dashboard
-- ----------------------------------------------------------------------------
-- The numbers that tell you whether the room is working: who has joined, how
-- far they have got, and — the one that actually matters mid-event — whether
-- the social challenges are completing or quietly stalling because nobody can
-- find their target.

create or replace function public.host_overview(p_session uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'bad host code';
  end if;

  return jsonb_build_object(
    'players',  (select count(*) from public.players where session_id = p_session),
    'vaults',   (select count(*) from public.assignments
                 where session_id = p_session and solved_at is not null and slot > 0),
    'bonus',    (select count(*) from public.assignments
                 where session_id = p_session and solved_at is not null and slot = 0),
    'photos',   (select count(*) from public.photos where session_id = p_session),
    'meetings', (select count(*) from public.interactions
                 where session_id = p_session and state = 'confirmed'),
    -- Pending handshakes that timed out. A climbing number here means players
    -- are tapping CONNECT and not getting confirmed — usually the room is too
    -- loud or too spread out, and it is your cue to call everyone in.
    'stalled',  (select count(*) from public.interactions
                 where session_id = p_session and state = 'pending' and expires_at < now()),
    'phase',    (select phase from public.sessions where id = p_session),
    'started',  (select started_at from public.sessions where id = p_session)
  );
end;
$$;

grant execute on function public.host_set_phase(uuid, text, text)        to authenticated, anon;
grant execute on function public.host_hide_photo(uuid, text, boolean)    to authenticated, anon;
grant execute on function public.host_reset(uuid, text)                  to authenticated, anon;
grant execute on function public.host_overview(uuid, text)               to authenticated, anon;
revoke execute on function public.host_ok(uuid, text) from anon, authenticated;
