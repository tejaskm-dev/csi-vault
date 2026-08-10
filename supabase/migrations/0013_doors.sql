-- ============================================================================
-- OPERATION VAULT — lock the door once the game is running
-- ============================================================================
-- Run after 0012_stages.sql.
--
-- THE HOLE THIS CLOSES.
--
-- Anonymous auth lives in localStorage. Clearing site data destroys that
-- identity, and join_session() then saw a stranger and dealt them a brand new
-- board with a new vault number. Consequences, worst first:
--
--   · a player stuck on a hard vault could clear storage and reroll their
--     entire board, as many times as they liked
--   · the recovery PIN was pointless — nothing ever forced anyone down that
--     path, because starting over was easier
--   · every abandoned identity stayed on the leaderboard as a ghost
--
-- The fix is not to make anonymous auth durable, which is impossible. It is to
-- make a NEW identity worthless once the game is running: after the host
-- presses Start, the only way in is to reclaim an existing player row with its
-- vault number and PIN.
--
-- `doors_open` is the escape hatch for the student who genuinely arrives late,
-- so the host does not have to choose between locking them out and pausing the
-- whole room.
-- ============================================================================

alter table public.sessions
  add column if not exists doors_open boolean not null default false;

create or replace function public.join_session(p_join_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_phase   text;
  v_doors   boolean;
  v_player  public.players;
  v_no      int;
  v_name    text;
  v_pin     text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select id, phase, doors_open into v_session, v_phase, v_doors
  from public.sessions
  where join_code = upper(trim(p_join_code));

  if v_session is null then
    raise exception 'no such session';
  end if;
  if v_phase = 'ended' then
    raise exception 'this session has ended';
  end if;

  -- Rejoin path FIRST, and that order matters: an existing player must always
  -- get back in, doors or no doors. This is the branch that a refresh, a
  -- backgrounded browser, or a flaky connection lands on, and locking it would
  -- be far worse than the hole it was meant to close.
  select * into v_player from public.players
  where session_id = v_session and auth_id = auth.uid();

  if found then
    select pin into v_pin from public.player_secrets where player_id = v_player.id;
    return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin);
  end if;

  -- A brand new identity, mid-game. This is either a latecomer or somebody who
  -- just cleared their storage, and the server cannot tell the two apart — so
  -- it refuses both and points them at reclaim. The host opens the doors for a
  -- genuine latecomer.
  if v_phase = 'live' and not v_doors then
    raise exception 'doors are closed';
  end if;

  v_name := nullif(trim(left(coalesce(p_name, ''), 20)), '');

  perform 1 from public.sessions where id = v_session for update;

  select coalesce(max(vault_no), 0) + 1 into v_no
  from public.players where session_id = v_session;

  insert into public.players (session_id, auth_id, name, vault_no)
  values (v_session, auth.uid(), coalesce(v_name, 'Player ' || v_no), v_no)
  returning * into v_player;

  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  insert into public.player_secrets (player_id, pin) values (v_player.id, v_pin);

  perform public.build_board(v_session, v_player.id);

  return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin);
end;
$$;

revoke execute on function public.join_session(text, text) from public, anon;
grant execute on function public.join_session(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- host_set_doors
-- ----------------------------------------------------------------------------
-- Let a latecomer in without pausing sixty people. Deliberately NOT sticky:
-- the host opens the doors, the student joins, the host closes them again.

create or replace function public.host_set_doors(p_session uuid, p_code text, p_open boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;

  update public.sessions set doors_open = p_open where id = p_session;

  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'doors', jsonb_build_object('open', p_open));

  return jsonb_build_object('ok', true, 'doors_open', p_open);
end;
$$;

revoke execute on function public.host_set_doors(uuid, text, boolean) from public, anon;
grant execute on function public.host_set_doors(uuid, text, boolean) to authenticated;

-- Surface the door state to the host dashboard.
create or replace function public.host_overview(p_session uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
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
    'stalled',  (select count(*) from public.interactions
                 where session_id = p_session and state = 'pending' and expires_at < now()),
    'phase',    (select phase from public.sessions where id = p_session),
    'doors',    (select doors_open from public.sessions where id = p_session),
    'started',  (select started_at from public.sessions where id = p_session));
end;
$$;

revoke execute on function public.host_overview(uuid, text) from public, anon;
grant execute on function public.host_overview(uuid, text) to authenticated;

-- The players' view gains the door state so the name screen can say why it is
-- refusing before the student types anything.
drop view if exists public.sessions_public;
create view public.sessions_public as
select id, name, phase, started_at, ends_at, join_code, created_at, doors_open
from public.sessions;

grant select on public.sessions_public to anon, authenticated;
