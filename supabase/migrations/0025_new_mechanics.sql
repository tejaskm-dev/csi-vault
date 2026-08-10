-- ============================================================================
-- OPERATION VAULT — new mechanics, not more of the same question
-- ============================================================================
-- Run after 0024_unstick.sql.
--
-- THE DIAGNOSIS. The pool had grown to 80 challenges but only 69 distinct
-- FAMILIES, and the observe category — the one players meet first and most —
-- had exactly TWO:
--
--     observe: 10 challenges, 2 mechanics (colour trap, impostor)
--
-- Adding more rows to those two does nothing for "I keep seeing the same
-- question", because a board only ever deals one of each family. What was
-- missing is a different VERB. So: two new ones.
--
--     flash   see a row of symbols for two seconds, then name one from memory
--     pair    a grid where exactly two tiles match — tap both
--
-- Pair is deliberately the inverse search of impostor: there you hunt the one
-- that differs, here the two that agree. Same grid, different way of looking.
-- It is also the only tap-to-tap challenge outside Wires, an input the Bible
-- lists and the game barely used.
--
-- Observe goes 2 mechanics -> 4, so vaults 1 and 2 stop being the same two
-- puzzles for everybody.
--
-- BOTH ARE DEALT PER PLAYER. The symbols, the position asked and the matching
-- pair are chosen at deal time and graded against what THAT player was shown,
-- so there is no fixed answer to shout across a room.
-- ============================================================================
insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('flash_3','observe','observe','flash','Flash Recall',
 'A row of symbols appears for two seconds. Then it is gone, and you name one of them.',
 'Say them out loud in your head as they appear. Sound sticks better than sight.',
 'search',50,1,'{"mode":"flash","length":3}'),
('flash_4','observe','observe','flash','Flash Recall',
 'A row of symbols appears for two seconds. Then it is gone, and you name one of them.',
 'Say them out loud in your head as they appear. Sound sticks better than sight.',
 'search',60,2,'{"mode":"flash","length":4}'),
('flash_5','observe','observe','flash','Flash Recall',
 'A row of symbols appears for two seconds. Then it is gone, and you name one of them.',
 'Say them out loud in your head as they appear. Sound sticks better than sight.',
 'search',70,3,'{"mode":"flash","length":5}'),
('pair_9','observe','observe','pair','Spot The Pair',
 'Exactly two of these tiles are the same. Tap both of them.',
 'Work along one row at a time. Everything else appears exactly once.',
 'search',45,1,'{"mode":"pair","count":9}'),
('pair_12','observe','observe','pair','Spot The Pair',
 'Exactly two of these tiles are the same. Tap both of them.',
 'Work along one row at a time. Everything else appears exactly once.',
 'search',55,2,'{"mode":"pair","count":12}'),
('pair_16','observe','observe','pair','Spot The Pair',
 'Exactly two of these tiles are the same. Tap both of them.',
 'Work along one row at a time. Everything else appears exactly once.',
 'search',65,3,'{"mode":"pair","count":16}')
on conflict (id) do update set family=excluded.family, title=excluded.title,
  question=excluded.question, hint=excluded.hint, time_limit=excluded.time_limit,
  difficulty=excluded.difficulty, payload=excluded.payload;

insert into public.challenge_answers (challenge_id, answer) values
('flash_3','{"option":"__dealt__"}'),
('flash_4','{"option":"__dealt__"}'),
('flash_5','{"option":"__dealt__"}'),
('pair_9','{"option":"__dealt__"}'),
('pair_12','{"option":"__dealt__"}'),
('pair_16','{"option":"__dealt__"}')
on conflict (challenge_id) do update set answer=excluded.answer;

-- the asset pool the dealer draws from
create or replace function public.glyph_pool() returns text[]
language sql immutable as $$ select array['apple','banana','box','bubble','camera','circle','code','dice','dog','flame','grapes','headphones','key','mountain','orange','penguin','rocket','search','shield','star','terminal','wave']; $$;

revoke execute on function public.glyph_pool() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Dealing them
-- ----------------------------------------------------------------------------

create or replace function public.deal_payload(p_kind text, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;
  pool text[]; picked text[]; tiles text[];
  n int; ask int; twin text;
begin
  if p_kind = 'exchange' then
    return jsonb_build_object(
      'mine', (10 + floor(random() * 40))::int,
      'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);

  elsif p_kind = 'minigame' then
    v := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
    if p_payload->>'game' = 'anagram' then v := v || public.deal_anagram(); end if;
    if p_payload->>'game' = 'tumbler' then v := v || public.deal_tumbler(); end if;

  elsif p_kind = 'observe' and p_payload->>'mode' = 'impostor' then
    v := jsonb_build_object(
      'odd_index', floor(random() * coalesce((p_payload->>'count')::int, 16))::int);

  elsif p_kind = 'observe' and p_payload->>'mode' = 'flash' then
    n := coalesce((p_payload->>'length')::int, 4);
    -- Distinct symbols only: a row containing the same icon twice makes
    -- "which was third" ambiguous, and an ambiguous question is an unfair one.
    select array_agg(g) into picked from (
      select unnest(public.glyph_pool()) g order by random() limit n
    ) x;
    ask := floor(random() * n)::int;
    -- Four options: the right one plus three that were NOT in the row, so a
    -- player who remembers the row can rule them out rather than guess.
    select array_agg(g) into pool from (
      select unnest(public.glyph_pool()) g
      where g <> all(picked) order by random() limit 3
    ) y;
    select array_agg(g) into tiles from (
      select unnest(pool || picked[ask + 1]) g order by random()
    ) z;
    v := jsonb_build_object(
      'symbols', to_jsonb(picked), 'ask_index', ask,
      'choices', to_jsonb(tiles), 'answer', picked[ask + 1]);

  elsif p_kind = 'observe' and p_payload->>'mode' = 'pair' then
    n := coalesce((p_payload->>'count')::int, 12);
    -- n-1 distinct symbols, one of which is duplicated: exactly one pair.
    select array_agg(g) into picked from (
      select unnest(public.glyph_pool()) g order by random() limit n - 1
    ) x;
    twin := picked[1 + floor(random() * (n - 1))::int];
    select array_agg(g) into tiles from (
      select unnest(picked || twin) g order by random()
    ) y;
    v := jsonb_build_object('tiles', to_jsonb(tiles), 'twin', twin);
  end if;

  return v;
end;
$$;

revoke execute on function public.deal_payload(text, jsonb) from public, anon, authenticated;

-- my_board must not ship the flash answer or the pair's twin.
drop function if exists public.my_board(uuid);

create or replace function public.my_board(p_session uuid)
returns table (
  assignment_id uuid, slot int, step int, vault_label text,
  challenge_id text, kind text, title text, question text, hint text,
  glyph text, time_limit int, is_bonus boolean, payload jsonb,
  solved boolean, target_no int, target_name text
)
language sql stable security definer set search_path = public
as $$
  select
    a.id, a.slot, a.step, coalesce(vp.label, ''),
    c.id, c.kind, c.title, c.question, c.hint, c.glyph,
    c.time_limit, c.is_bonus,
    -- Strip every key that IS the answer. `twin` would name the matching tile
    -- outright; `answer` would name the flashed symbol.
    ((c.payload || a.payload) - 'word_id' - 'answer' - 'twin'),
    a.solved_at is not null,
    t.vault_no, t.name
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  left join public.players t on t.id = a.target_id
  left join public.vault_plan vp on vp.vault_no = a.slot
  where a.player_id = public.me(p_session)
  order by a.slot, a.step;
$$;

grant execute on function public.my_board(uuid) to authenticated;
revoke execute on function public.my_board(uuid) from public, anon;

-- ----------------------------------------------------------------------------
-- Grading them
-- ----------------------------------------------------------------------------
-- Both compare against the DEALT payload, never a fixed key — the answer is
-- different on every phone.

create or replace function public.check_observe(p_payload jsonb, p_answer jsonb, p_key jsonb)
returns boolean
language plpgsql stable set search_path = public
as $$
declare
  v_mode text := p_payload->>'mode';
  v_tiles jsonb; v_twin text; idx int[]; a int; b int;
begin
  if v_mode = 'impostor' then
    return p_answer->>'option' = p_payload->>'odd_index';

  elsif v_mode = 'flash' then
    return upper(coalesce(p_answer->>'option','')) = upper(coalesce(p_payload->>'answer',''));

  elsif v_mode = 'pair' then
    -- The two tapped indices must both hold the duplicated symbol, and be
    -- different tiles. Checking the SYMBOL rather than stored indices means a
    -- player who taps the pair in either order is right, and one who taps the
    -- same tile twice is not.
    v_tiles := p_payload->'tiles';
    v_twin  := p_payload->>'twin';
    idx := string_to_array(coalesce(p_answer->>'option',''), ',')::int[];
    if array_length(idx, 1) is distinct from 2 then return false; end if;
    a := idx[1]; b := idx[2];
    if a = b then return false; end if;
    return (v_tiles->>a) = v_twin and (v_tiles->>b) = v_twin;
  end if;

  -- colour_trap and anything else still uses the fixed key.
  return p_answer->>'option' = p_key->>'option';
end;
$$;

revoke execute on function public.check_observe(jsonb, jsonb, jsonb) from public, anon, authenticated;

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
  return jsonb_build_object(
    'correct', v_correct, 'solved', v_correct,
    'vaults', v_counts->'vaults', 'bonus', v_counts->'bonus');
end;
$$;

grant execute on function public.submit_answer(uuid, jsonb) to authenticated;
revoke execute on function public.submit_answer(uuid, jsonb) from public, anon;

-- ----------------------------------------------------------------------------
-- Spread the mechanics across the board
-- ----------------------------------------------------------------------------
-- Vaults 1 and 2 both drew from `observe`, so with two mechanics available a
-- player reliably met the same two. Now that there are four, giving each vault
-- its own lead category spreads them out instead of relying on the draw.

update public.vault_plan set categories = array['observe']            where vault_no = 1;
update public.vault_plan set categories = array['minigame','observe'] where vault_no = 2;

select 'observe mechanics now: ' || count(distinct family)::text
from public.challenges where active and category = 'observe';
