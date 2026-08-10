-- ============================================================================
-- OPERATION VAULT — getting a stuck player moving again
-- ============================================================================
-- Run after 0023_pairing_and_difficulty.sql.
--
-- Vaults became strictly sequential in 0019, which is right for the ramp but
-- removes the only escape a blocked player had: doing a different one. So any
-- challenge that becomes impossible now ends that player's game entirely.
--
-- It does not take a bug for that to happen. Their target goes to the toilet,
-- or leaves. Their phone will not open the camera. They cannot get anyone to
-- confirm a handshake in a loud room. Nobody is coming to help sixty students
-- individually, and "just restart" costs them everything.
--
-- Two releases, deliberately different in who can pull them:
--
--   host_skip_step   the operator, from the dashboard, for a named player
--   auto-release     the player, but only after being demonstrably stuck on
--                    one challenge for several minutes
--
-- Both mark the assignment solved. A skipped step still counts, because the
-- alternative — a player watching everyone else move while they hold a broken
-- challenge — is a much worse outcome at an induction than a slightly generous
-- score.
-- ============================================================================

alter table public.assignments
  add column if not exists first_seen_at timestamptz,
  add column if not exists skipped boolean not null default false;

/**
 * Stamped the first time a player opens a challenge.
 *
 * The clock for "stuck" has to start when they SAW it, not when the board was
 * dealt — otherwise a player who reaches vault 7 late would find every
 * remaining challenge instantly skippable.
 */
create or replace function public.mark_seen(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_player uuid; v_session uuid;
begin
  select player_id, session_id into v_player, v_session
  from public.assignments where id = p_assignment;
  if v_player is null or v_player <> public.me(v_session) then return; end if;

  update public.assignments
  set first_seen_at = coalesce(first_seen_at, now())
  where id = p_assignment;
end;
$$;

revoke execute on function public.mark_seen(uuid) from public, anon;
grant execute on function public.mark_seen(uuid) to authenticated;

/**
 * The player's own escape hatch.
 *
 * Only opens on a challenge they cannot finish alone — the social and camera
 * ones — and only after five minutes of having it open. A solo puzzle is never
 * skippable: being unable to answer a question is the game working.
 */
create or replace function public.release_stuck(p_assignment uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_kind text;
  v_seen timestamptz; v_solved timestamptz;
begin
  select a.player_id, a.session_id, c.kind, a.first_seen_at, a.solved_at
    into v_player, v_session, v_kind, v_seen, v_solved
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;
  if v_solved is not null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- Only the ones that depend on somebody or something else.
  if v_kind not in ('connect','exchange','charades','photo','recall') then
    raise exception 'that one is yours to solve';
  end if;

  if v_seen is null or v_seen > now() - interval '5 minutes' then
    raise exception 'not stuck yet';
  end if;

  update public.assignments
  set solved_at = now(), skipped = true
  where id = p_assignment;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.release_stuck(uuid) from public, anon;
grant execute on function public.release_stuck(uuid) to authenticated;

/**
 * The operator's version. No time limit, no kind restriction — if a student is
 * standing in front of you with a broken phone, the fix should take one tap.
 */
create or replace function public.host_skip_step(p_session uuid, p_code text, p_vault_no int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_assignment uuid; v_player uuid;
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;

  select id into v_player from public.players
  where session_id = p_session and vault_no = p_vault_no;
  if v_player is null then raise exception 'no player with that number'; end if;

  -- Their current step: lowest unsolved, in board order.
  select a.id into v_assignment
  from public.assignments a
  where a.player_id = v_player and a.solved_at is null and a.slot > 0
  order by a.slot, a.step limit 1;

  if v_assignment is null then
    return jsonb_build_object('ok', false, 'error', 'nothing left to skip');
  end if;

  update public.assignments
  set solved_at = now(), skipped = true
  where id = v_assignment;

  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'skip',
          jsonb_build_object('vault_no', p_vault_no, 'assignment', v_assignment));

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.host_skip_step(uuid, text, int) from public, anon;
grant execute on function public.host_skip_step(uuid, text, int) to authenticated;

/**
 * Who is stuck, for the dashboard.
 *
 * The number worth watching mid-event. A player sitting on one challenge for
 * ten minutes is not thinking hard — something is broken for them, and they
 * will not come and tell you.
 */
create or replace function public.host_stuck(p_session uuid, p_code text)
returns table (vault_no int, name text, vault int, step int, kind text, minutes int)
language sql
stable
security definer
set search_path = public
as $$
  select p.vault_no, p.name, a.slot, a.step, c.kind,
         extract(epoch from (now() - a.first_seen_at))::int / 60
  from public.assignments a
  join public.players p on p.id = a.player_id
  join public.challenges c on c.id = a.challenge_id
  where a.session_id = p_session
    and a.solved_at is null
    and a.first_seen_at is not null
    and a.first_seen_at < now() - interval '4 minutes'
    and public.host_ok(p_session, p_code)
  order by a.first_seen_at asc;
$$;

revoke execute on function public.host_stuck(uuid, text) from public, anon;
grant execute on function public.host_stuck(uuid, text) to authenticated;
