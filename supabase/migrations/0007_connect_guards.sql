-- ============================================================================
-- OPERATION VAULT — connect guards + honest failures
-- ============================================================================
-- Run after 0006_security.sql.
--
-- Two cases had no check at all, so they failed in the ugliest way available:
--
--   "I typed the number of someone I already met."
--       request_connect happily wrote another pending row. The failure only
--       surfaced later, from confirm_connect, as a raw unique-constraint
--       violation — which reached the player as "[object Object]".
--
--   "I typed a number nobody has."
--       Raised, but from inside a nested lookup, so the client saw a
--       PostgREST envelope rather than a sentence.
--
-- Both are now checked up front, in the order a player would discover them,
-- with messages written for a first-year rather than for me.
-- ============================================================================

create or replace function public.request_connect(p_assignment uuid, p_target_no int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player  uuid;
  v_session uuid;
  v_target  uuid;
  v_wanted  uuid;
  v_kind    text;
  v_phase   text;
  v_id      uuid;
begin
  select a.player_id, a.session_id, a.target_id, c.kind
    into v_player, v_session, v_wanted, v_kind
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;

  select phase into v_phase from public.sessions where id = v_session;
  if v_phase <> 'live' then
    raise exception 'session is not live';
  end if;

  -- 1. Does this number belong to anybody?
  select id into v_target
  from public.players
  where session_id = v_session and vault_no = p_target_no;

  if v_target is null then
    raise exception 'no player with that number in this room';
  end if;

  -- 2. Is it their own?
  if v_target = v_player then
    raise exception 'that is you';
  end if;

  -- 3. Have they already teamed up?
  --
  -- This is the one that was missing. The unique index added in 0001 does stop
  -- the pair being scored twice, but only at INSERT time on the *confirmed*
  -- row — which meant the player walked across the room, both tapped, and only
  -- then hit a constraint error with no explanation. Checking here fails in
  -- the right place, before anybody moves.
  if exists (
    select 1 from public.interactions i
    where i.state = 'confirmed'
      and ((i.actor_id = v_player and i.target_id = v_target)
        or (i.actor_id = v_target and i.target_id = v_player))
  ) then
    raise exception 'already met that player';
  end if;

  -- 4. Is it the person they were actually sent to find?
  if v_wanted is not null and v_target <> v_wanted then
    raise exception 'not your target';
  end if;

  -- One live request at a time, so nobody can fan requests at the whole room
  -- and collect whichever confirmation lands first.
  update public.interactions
  set state = 'expired'
  where actor_id = v_player and state = 'pending';

  insert into public.interactions (session_id, assignment_id, actor_id, target_id, kind)
  values (v_session, p_assignment, v_player, v_target,
          case when v_kind = 'exchange' then 'exchange' else 'connect' end)
  returning id into v_id;

  return jsonb_build_object('interaction_id', v_id, 'target_id', v_target);
end;
$$;

revoke execute on function public.request_connect(uuid, int) from public, anon;
grant execute on function public.request_connect(uuid, int) to authenticated;
