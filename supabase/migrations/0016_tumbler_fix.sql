-- ============================================================================
-- OPERATION VAULT — the tumbler was unsolvable
-- ============================================================================
-- Run after 0015_anagram.sql.
--
-- THE BUG.
--
-- Tumbler derived its combination from a seeded PRNG on BOTH sides: the client
-- ran mulberry32 in JS to decide what "warmer/colder" meant, and the server ran
-- a plpgsql reimplementation of the same function to grade the answer.
--
-- The two do not agree. Tested across seven seeds, they disagreed on all seven:
--
--   seed 1     client [7,0,6]    server [8,5,4]
--   seed 42    client [7,5,10]   server [9,0,1]
--
-- So a player turned all three dials until the app said SET, pressed PULL THE
-- HANDLE, and was marked wrong — every time, for everybody. The plpgsql version
-- cannot faithfully reproduce Math.imul's 32-bit signed overflow, and the
-- comment claiming it was "byte-identical" was wrong.
--
-- THE FIX is to stop computing the same secret twice. The combination is dealt
-- once, stored on the assignment, and compared directly.
--
-- HONEST NOTE ON SECRECY: the client MUST know the combination — that is what
-- warmer/colder is computed from — so it travels in the payload and is visible
-- in devtools. That was equally true of the seed version, which was reversible
-- with four lines of JS. This puzzle is a tutorial-tier warm-up worth half a
-- vault; the trade is deliberate, and it is now at least *correct*.
-- ============================================================================

create or replace function public.deal_tumbler()
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
  select jsonb_build_object('combo', jsonb_build_array(
    floor(random() * 12)::int,
    floor(random() * 12)::int,
    floor(random() * 12)::int));
$$;

revoke execute on function public.deal_tumbler() from public, anon, authenticated;

-- Grade against the dealt combination. No PRNG anywhere.
create or replace function public.check_minigame(p_payload jsonb, p_answer jsonb)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_game  text := p_payload->>'game';
  v_level int := coalesce((p_payload->>'level')::int, 1);
  v_dials int[];
  v_combo int[];
  v_pairs int;
  v_count int;
  k       text;
  i       int;
begin
  if v_game = 'tumbler' then
    v_dials := array(select jsonb_array_elements_text(p_answer->'dials')::int);
    v_combo := array(select jsonb_array_elements_text(p_payload->'combo')::int);
    if array_length(v_dials,1) is distinct from 3 then return false; end if;
    if array_length(v_combo,1) is distinct from 3 then return false; end if;
    for i in 1..3 loop
      if v_dials[i] <> v_combo[i] then return false; end if;
    end loop;
    return true;

  elsif v_game = 'maze' then
    return coalesce((p_answer->>'moves')::int, 0)
             >= 2 * ((array[7,9,11])[least(greatest(v_level,1),3)] - 1);

  elsif v_game = 'survival' then
    return coalesce((p_answer->>'gates')::int, 0) >= 6
       and coalesce((p_answer->>'ms')::int, 0) >= 15000;

  elsif v_game = 'pairs' then
    v_pairs := coalesce((p_answer->>'pairs')::int, 0);
    return v_pairs >= 6 and coalesce((p_answer->>'moves')::int, 0) >= v_pairs;

  elsif v_game = 'wires' then
    v_count := coalesce((p_answer->>'count')::int, 0);
    if v_count < 4 then return false; end if;
    if (select count(*) from jsonb_object_keys(p_answer->'joined') k2) <> v_count then
      return false;
    end if;
    for k in select jsonb_object_keys(p_answer->'joined') loop
      if p_answer->'joined'->>k <> k then return false; end if;
    end loop;
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.check_minigame(jsonb, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- One place that decides what an assignment is dealt
-- ----------------------------------------------------------------------------
-- This logic had been copy-pasted into build_board four times across
-- 0009/0012/0014/0015, once per loop per migration — and the copies drifted.
-- That is how the anagram deal ended up missing from the top-up path. One
-- function, called from every site.
--
-- Takes scalars rather than a row: `r` is a plpgsql `record`, and coercing one
-- to a named composite type is fragile in a way that fails at runtime.

create or replace function public.deal_payload(p_kind text, p_game text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v jsonb := '{}'::jsonb;
begin
  if p_kind = 'exchange' then
    return jsonb_build_object(
      'mine', (10 + floor(random() * 40))::int,
      'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);
  elsif p_kind = 'minigame' then
    v := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
    if p_game = 'anagram' then v := v || public.deal_anagram(); end if;
    if p_game = 'tumbler' then v := v || public.deal_tumbler(); end if;
  end if;
  return v;
end;
$$;

revoke execute on function public.deal_payload(text, text) from public, anon, authenticated;

-- build_board deals the combination alongside the seed.
create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record; r record; s int;
  v_used text[] := '{}';
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;
    for r in
      select * from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
        and c.category = any(v.categories)
        and c.difficulty <= v.max_difficulty
      order by random() limit v.steps
    loop
      s := s + 1; v_used := v_used || r.id;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload->>'game'));
    end loop;

    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
        and c.difficulty <= v.max_difficulty
      order by random() limit 1;
      exit when r.id is null;
      s := s + 1; v_used := v_used || r.id;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload->>'game'));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1, public.deal_payload(c.kind, c.payload->>'game')
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random() limit 1;
end;
$$;

-- One place that decides what an assignment is dealt. Three copies of this
-- logic had already drifted apart across 0009/0012/0014/0015, which is how the
-- anagram deal got missed on the top-up path.
revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- Nothing calls it now, and leaving a broken PRNG lying around is how it gets
-- reused. Dropped.
drop function if exists public.mulberry32(bigint, int);
