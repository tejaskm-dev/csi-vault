-- ============================================================================
-- OPERATION VAULT — a real two-player game, and puzzles you cannot blitz
-- ============================================================================
-- Run after 0026_operator_rescue.sql.
--
-- THREE THINGS.
--
-- 1. NOBODY EVER SAW CHARADES.
--    Vault 6 drew 3 challenges from 40 families and charades was 2 of them —
--    a 14% chance of meeting the best mechanic in the game. Vault 6 now leads
--    on `perform` alone, so it is guaranteed.
--
-- 2. THE SOCIAL HALF HAD ONE VERB: MEET SOMEBODY.
--    Connect, exchange and charades all reduce to "find a person, both tap".
--    A duel is a different thing entirely — you and a stranger actually PLAY
--    against each other, on two phones, at the same time. Rock-paper-scissors
--    because it needs no board, no turns and no explanation, and best-of-three
--    against someone you just met is a real moment rather than a form.
--
--    Note who completes it: BOTH players, win or lose. The challenge is having
--    the encounter. Making it depend on winning would leave half the room
--    holding a challenge they cannot pass by trying harder.
--
-- 3. YOU COULD SPEED-BLITZ EVERYTHING.
--    Every solo question was recognise-and-tap. `compute` puzzles are arithmetic
--    built from facts about THE PLAYER — their vault number, the letters in
--    their name — so the answer differs for everyone, cannot be copied from a
--    neighbour, and cannot be guessed from four options because there are none.
--    They take thirty seconds of actual work.
-- ============================================================================

alter table public.challenges drop constraint if exists challenges_kind_check;
alter table public.challenges add constraint challenges_kind_check
  check (kind in ('mcq','image_grid','text_input','observe',
                  'connect','exchange','recall','photo',
                  'minigame','charades','duel','compute'));

alter table public.interactions drop constraint if exists interactions_kind_check;
alter table public.interactions add constraint interactions_kind_check
  check (kind in ('connect','exchange','recall','charades','duel'));

-- ============================================================================
-- 1. THE DUEL
-- ============================================================================
-- State lives on the interaction, so it inherits everything the handshake
-- already guarantees: both players are real, they are a valid pair, and
-- neither can play without the other having been found.

create table if not exists public.duel_rounds (
  id             uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  round          int not null check (round between 1 and 5),
  actor_throw    text check (actor_throw in ('rock','paper','scissors')),
  target_throw   text check (target_throw in ('rock','paper','scissors')),
  unique (interaction_id, round)
);

alter table public.duel_rounds enable row level security;
-- No policies: throws are written and read only through the RPCs below, which
-- is what stops a player reading the other's choice before making their own.

/**
 * Play one throw.
 *
 * The reason this is an RPC and not a table write: a duel is only fair while
 * neither player can see the other's hand. The row is invisible to both sides,
 * and the result comes back ONLY once both have committed — so there is no
 * moment where reading the database early wins you the round.
 */
create or replace function public.duel_throw(p_interaction uuid, p_choice text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.interactions; v_me uuid; v_is_actor boolean;
  v_round int; v_mine text; v_theirs text;
  v_a int := 0; v_b int := 0; r record; v_result text;
begin
  if p_choice not in ('rock','paper','scissors') then
    raise exception 'pick rock, paper or scissors';
  end if;

  select * into v_row from public.interactions where id = p_interaction;
  if v_row.id is null then raise exception 'no such duel'; end if;

  v_me := public.me(v_row.session_id);
  v_is_actor := v_row.actor_id = v_me;
  if not v_is_actor and v_row.target_id <> v_me then
    raise exception 'not your duel';
  end if;

  -- Current round: the first without both throws, else the next one.
  select coalesce(min(d.round), 1) into v_round
  from public.duel_rounds d
  where d.interaction_id = p_interaction
    and (d.actor_throw is null or d.target_throw is null);

  if v_round is null then v_round := 1; end if;

  insert into public.duel_rounds (interaction_id, round)
  values (p_interaction, v_round)
  on conflict (interaction_id, round) do nothing;

  if v_is_actor then
    update public.duel_rounds set actor_throw = coalesce(actor_throw, p_choice)
    where interaction_id = p_interaction and round = v_round;
  else
    update public.duel_rounds set target_throw = coalesce(target_throw, p_choice)
    where interaction_id = p_interaction and round = v_round;
  end if;

  select actor_throw, target_throw into v_mine, v_theirs
  from public.duel_rounds where interaction_id = p_interaction and round = v_round;

  -- Still waiting on the other phone. Deliberately returns nothing about the
  -- opponent — not even whether they have thrown yet reveals their hand.
  if v_mine is null or v_theirs is null then
    return jsonb_build_object('state', 'waiting', 'round', v_round);
  end if;

  -- Score every completed round.
  for r in
    select actor_throw a, target_throw b from public.duel_rounds
    where interaction_id = p_interaction and actor_throw is not null and target_throw is not null
  loop
    if r.a <> r.b then
      if (r.a, r.b) in (('rock','scissors'), ('paper','rock'), ('scissors','paper'))
        then v_a := v_a + 1; else v_b := v_b + 1; end if;
    end if;
  end loop;

  -- Best of three, and BOTH players pass either way. Making completion depend
  -- on winning would leave half the room holding a challenge that trying
  -- harder cannot solve.
  if greatest(v_a, v_b) >= 2 or v_round >= 5 then
    update public.interactions
    set state = 'confirmed', confirmed_at = coalesce(confirmed_at, now()),
        fact = fact || jsonb_build_object('duel', jsonb_build_object('actor', v_a, 'target', v_b))
    where id = p_interaction;

    update public.assignments set solved_at = now()
    where id = v_row.assignment_id and solved_at is null;

    v_result := case when v_a = v_b then 'draw'
                     when (v_a > v_b) = v_is_actor then 'won' else 'lost' end;

    return jsonb_build_object('state','over','round',v_round,
      'you', case when v_is_actor then v_mine else v_theirs end,
      'them', case when v_is_actor then v_theirs else v_mine end,
      'score', jsonb_build_array(case when v_is_actor then v_a else v_b end,
                                 case when v_is_actor then v_b else v_a end),
      'result', v_result);
  end if;

  return jsonb_build_object('state','round','round',v_round,
    'you',  case when v_is_actor then v_mine else v_theirs end,
    'them', case when v_is_actor then v_theirs else v_mine end,
    'score', jsonb_build_array(case when v_is_actor then v_a else v_b end,
                               case when v_is_actor then v_b else v_a end));
end;
$$;

/** Poll for the opponent, without leaking their hand mid-round. */
create or replace function public.duel_state(p_interaction uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_row public.interactions; v_me uuid; v_is_actor boolean;
  v_a int := 0; v_b int := 0; r record; v_pending boolean := false;
begin
  select * into v_row from public.interactions where id = p_interaction;
  if v_row.id is null then raise exception 'no such duel'; end if;
  v_me := public.me(v_row.session_id);
  v_is_actor := v_row.actor_id = v_me;
  if not v_is_actor and v_row.target_id <> v_me then raise exception 'not your duel'; end if;

  for r in select actor_throw a, target_throw b from public.duel_rounds
           where interaction_id = p_interaction loop
    if r.a is null or r.b is null then v_pending := true; continue; end if;
    if r.a <> r.b then
      if (r.a, r.b) in (('rock','scissors'),('paper','rock'),('scissors','paper'))
        then v_a := v_a + 1; else v_b := v_b + 1; end if;
    end if;
  end loop;

  return jsonb_build_object(
    'score', jsonb_build_array(case when v_is_actor then v_a else v_b end,
                               case when v_is_actor then v_b else v_a end),
    'pending', v_pending,
    'over', v_row.state = 'confirmed');
end;
$$;

grant execute on function public.duel_throw(uuid, text) to authenticated;
grant execute on function public.duel_state(uuid)       to authenticated;
revoke execute on function public.duel_throw(uuid, text) from public, anon;
revoke execute on function public.duel_state(uuid)       from public, anon;

-- ============================================================================
-- 2. COMPUTE PUZZLES
-- ============================================================================
-- Built from the player's own facts, so every answer is different and none can
-- be copied. Dealt at build time; graded against the dealt value.

create or replace function public.deal_compute(p_player uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_no int; v_name text; v_len int; v_kind int; v_ans int; v_text text;
begin
  select vault_no, name into v_no, v_name from public.players where id = p_player;
  v_len := length(regexp_replace(coalesce(v_name,''), '[^a-zA-Z]', '', 'g'));
  v_kind := floor(random() * 5)::int;

  if v_kind = 0 then
    v_ans := v_no * 3 + v_len;
    v_text := 'Multiply your vault number by 3, then add the number of LETTERS in your name.';
  elsif v_kind = 1 then
    v_ans := v_no * v_len;
    v_text := 'Multiply your vault number by the number of LETTERS in your name.';
  elsif v_kind = 2 then
    v_ans := (v_no + v_len) * 2;
    v_text := 'Add your vault number to the number of LETTERS in your name, then double it.';
  elsif v_kind = 3 then
    v_ans := v_no * v_no - v_len;
    v_text := 'Square your vault number, then subtract the number of LETTERS in your name.';
  else
    v_ans := v_no * 10 + v_len;
    v_text := 'Write your vault number, then write the number of LETTERS in your name straight after it, as one number.';
  end if;

  return jsonb_build_object('prompt', v_text, 'answer', v_ans::text);
end;
$$;

revoke execute on function public.deal_compute(uuid) from public, anon, authenticated;

insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('cm_1','compute','think','compute','Your Own Number',
 'This one is about you, so nobody else has your answer.',
 'Count only letters — no spaces, no numbers. Your vault number is on your crew card.',
 'key', 90, 2, '{}'),
('cm_2','compute','think','compute2','Personal Arithmetic',
 'Another one only you can answer. Work it out carefully.',
 'Your crew card has both numbers you need.',
 'terminal', 90, 3, '{}'),
('duel_1','duel','perform','duel','Best of Three',
 'Find your target and play rock, paper, scissors against them — best of three, on your phones.',
 'Throw on the count of three, out loud, like you would anyway.',
 'dice', 180, 2, '{"game":"rps"}')
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, family = excluded.family,
  title = excluded.title, question = excluded.question, hint = excluded.hint,
  glyph = excluded.glyph, time_limit = excluded.time_limit,
  difficulty = excluded.difficulty, payload = excluded.payload;

-- Deal both new kinds.
create or replace function public.deal_payload_for(p_kind text, p_payload jsonb, p_player uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
begin
  if p_kind = 'compute' then return public.deal_compute(p_player); end if;
  return public.deal_payload(p_kind, p_payload);
end;
$$;

revoke execute on function public.deal_payload_for(text, jsonb, uuid) from public, anon, authenticated;

-- Grading: compute against its dealt answer; a duel is completed by playing.
create or replace function public.submit_answer(p_assignment uuid, p_answer jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_kind text; v_answer jsonb;
  v_payload jsonb; v_correct boolean := false; v_solved timestamptz; v_phase text;
  v_counts jsonb;
begin
  select a.player_id, a.session_id, c.kind, ca.answer, c.payload || a.payload, a.solved_at
    into v_player, v_session, v_kind, v_answer, v_payload, v_solved
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  left join public.challenge_answers ca on ca.challenge_id = c.id
  where a.id = p_assignment;

  if v_player is null then raise exception 'no such assignment'; end if;
  if v_player <> public.me(v_session) then raise exception 'not your assignment'; end if;
  select phase into v_phase from public.sessions where id = v_session;
  if v_phase <> 'live' then raise exception 'session is not live'; end if;
  if v_solved is not null then
    return jsonb_build_object('correct', true, 'solved', true, 'replay', true);
  end if;

  v_correct := case v_kind
    when 'mcq'        then p_answer->>'option' = v_answer->>'option'
    when 'image_grid' then p_answer->>'option' = v_answer->>'option'
    when 'text_input' then exists (
      select 1 from jsonb_array_elements_text(v_answer->'text') t
      where lower(trim(t)) = lower(trim(coalesce(p_answer->>'text',''))))
    when 'compute'  then
      regexp_replace(coalesce(p_answer->>'text',''), '[^0-9-]', '', 'g')
        = coalesce(v_payload->>'answer','\x00')
    when 'observe'  then public.check_observe(v_payload, p_answer, v_answer)
    when 'minigame' then
      case when v_payload->>'game' = 'anagram'
           then public.check_anagram(v_payload, p_answer)
           else public.check_minigame(v_payload, p_answer) end
    when 'exchange' then
      exists (select 1 from public.interactions i
              where i.assignment_id = p_assignment and i.state = 'confirmed')
      and coalesce((p_answer->>'value')::int, -1) = (
        select coalesce((i.fact->>'value')::int, -1) + coalesce((v_payload->>'mine')::int, 0)
        from public.interactions i
        where i.assignment_id = p_assignment and i.state = 'confirmed' limit 1)
    when 'recall' then
      exists (select 1 from public.interactions i
              where i.id = (v_payload->>'about')::uuid and i.state = 'confirmed'
                and ((i.actor_id = v_player and i.target_id = (p_answer->>'player_id')::uuid)
                  or (i.target_id = v_player and i.actor_id  = (p_answer->>'player_id')::uuid)))
    else false
  end;

  insert into public.attempts (assignment_id, player_id, submitted, correct)
  values (p_assignment, v_player, p_answer, v_correct);
  if v_correct then
    update public.assignments set solved_at = now() where id = p_assignment;
  end if;

  v_counts := public.vault_counts(v_player);
  return jsonb_build_object('correct', v_correct, 'solved', v_correct,
    'vaults', v_counts->'vaults', 'bonus', v_counts->'bonus');
end;
$$;

grant execute on function public.submit_answer(uuid, jsonb) to authenticated;
revoke execute on function public.submit_answer(uuid, jsonb) from public, anon;

-- request_connect must accept a duel.
create or replace function public.request_connect(p_assignment uuid, p_target_no int)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_target uuid; v_wanted uuid;
  v_kind text; v_phase text; v_id uuid;
begin
  select a.player_id, a.session_id, a.target_id, c.kind
    into v_player, v_session, v_wanted, v_kind
  from public.assignments a join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;
  select phase into v_phase from public.sessions where id = v_session;
  if v_phase <> 'live' then raise exception 'session is not live'; end if;

  select id into v_target from public.players
  where session_id = v_session and vault_no = p_target_no;
  if v_target is null then raise exception 'no player with that number in this room'; end if;
  if v_target = v_player then raise exception 'that is you'; end if;

  if exists (
    select 1 from public.interactions i
    where i.state = 'confirmed'
      and ((i.actor_id = v_player and i.target_id = v_target)
        or (i.actor_id = v_target and i.target_id = v_player))
  ) and not public.pairings_exhausted(v_session, v_player) then
    raise exception 'already met that player';
  end if;

  if v_wanted is not null and v_target <> v_wanted
     and not public.pairings_exhausted(v_session, v_player) then
    raise exception 'not your target';
  end if;

  update public.interactions set state = 'expired'
  where actor_id = v_player and state = 'pending';

  insert into public.interactions (session_id, assignment_id, actor_id, target_id, kind)
  values (v_session, p_assignment, v_player, v_target,
          case v_kind when 'exchange' then 'exchange'
                      when 'duel' then 'duel' else 'connect' end)
  returning id into v_id;

  return jsonb_build_object('interaction_id', v_id, 'target_id', v_target);
end;
$$;

revoke execute on function public.request_connect(uuid, int) from public, anon;
grant execute on function public.request_connect(uuid, int) to authenticated;

-- ============================================================================
-- 3. Make the performance vault actually about performing
-- ============================================================================
-- Charades had a 14% chance of ever appearing, because vault 6 drew 3 from 40
-- families and charades was 2 of them. Not guaranteed now either — a fixed
-- board would be its own kind of dull — but leading the vault on `perform`
-- alone means its two families (charades, duel) are dealt first, and the third
-- step tops up from the wider pool. Likely rather than certain.

update public.vault_plan
set categories = array['perform'], steps = 3
where vault_no = 6;

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v record; r record; s int;
  v_used text[] := '{}'; v_families text[] := '{}';
begin
  if exists (select 1 from public.assignments where player_id = p_player) then return; end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;
    for r in
      select * from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used)) and not (c.family = any(v_families))
        and c.category = any(v.categories)
        and c.difficulty between v.min_difficulty and v.max_difficulty
      order by random() limit v.steps
    loop
      s := s + 1; v_used := v_used || r.id; v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades','duel')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload_for(r.kind, r.payload, p_player));
    end loop;

    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
        and not (c.family = any(v_families))
        and c.difficulty between v.min_difficulty and v.max_difficulty
      order by random() limit 1;
      if r.id is null then
        select * into r from public.challenges c
        where c.active and not c.is_bonus and not (c.id = any(v_used))
          and not (c.family = any(v_families)) and c.difficulty <= v.max_difficulty
        order by random() limit 1;
      end if;
      if r.id is null then
        select * into r from public.challenges c
        where c.active and not c.is_bonus and not (c.id = any(v_used))
          and c.difficulty <= v.max_difficulty
        order by random() limit 1;
      end if;
      exit when r.id is null;

      s := s + 1; v_used := v_used || r.id; v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades','duel')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload_for(r.kind, r.payload, p_player));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1, public.deal_payload_for(c.kind, c.payload, p_player)
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;
