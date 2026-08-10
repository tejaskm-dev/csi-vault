-- ============================================================================
-- OPERATION VAULT — real assets, moving answers, more of everything
-- ============================================================================
-- Run after 0021_meme_video.sql.
--
-- FOUR PROBLEMS.
--
-- 1. HALF THE ICONS DO NOT EXIST.
--    GlyphKey declares 29 names; src/art/glyphs holds 22 files. The seven with
--    no file — droplet, hexagon, leaf, lightning, sun, triangle, wind — fall
--    back to a placeholder that prints the first two letters. That is the "DR"
--    on screen: it is `droplet`. Content used them 51 times, including one
--    impostor grid built entirely from `droplet`, i.e. 36 tiles reading "DR".
--
-- 2. THE ODD ONE OUT WAS ALWAYS IN THE SAME PLACE.
--    odd_index was fixed on the challenge, so every player on every phone had
--    the impostor in the same square. One person says "third row, second in"
--    and the puzzle is over for the room. It is now dealt per player.
--
-- 3. NOT ENOUGH QUESTIONS.
--    26 slots drawn from ~50 challenges means most boards are the same content
--    in a different order. This adds 24 more, all using assets that exist.
--
-- 4. SOME ANSWERS WERE WRONG. Corrected below, with reasoning.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Only ever reference art that exists
-- ----------------------------------------------------------------------------
-- Mapped to the nearest real asset rather than deleted, so no question loses
-- its illustration:
--     droplet/wind -> wave     hexagon -> box       leaf -> apple
--     lightning    -> flame    sun     -> star      triangle -> shield

update public.challenges set glyph = case glyph
  when 'droplet'   then 'wave'   when 'wind'     then 'wave'
  when 'hexagon'   then 'box'    when 'leaf'     then 'apple'
  when 'lightning' then 'flame'  when 'sun'      then 'star'
  when 'triangle'  then 'shield' else glyph end
where glyph in ('droplet','wind','hexagon','leaf','lightning','sun','triangle');

-- The same names appear inside option lists and impostor fills.
update public.challenges
set payload = replace(replace(replace(replace(replace(replace(replace(
      payload::text,
      '"droplet"','"wave"'), '"wind"','"wave"'), '"hexagon"','"box"'),
      '"leaf"','"apple"'), '"lightning"','"flame"'), '"sun"','"star"'),
      '"triangle"','"shield"')::jsonb
where payload::text ~ '"(droplet|wind|hexagon|leaf|lightning|sun|triangle)"';

-- ----------------------------------------------------------------------------
-- 2. Deal the impostor's position per player
-- ----------------------------------------------------------------------------
-- deal_payload gains the whole challenge payload so it can act on `mode` as
-- well as `game`. Same single-source principle as before: one function decides
-- what an assignment is dealt.

drop function if exists public.deal_payload(text, text);

create or replace function public.deal_payload(p_kind text, p_payload jsonb)
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
    if p_payload->>'game' = 'anagram' then v := v || public.deal_anagram(); end if;
    if p_payload->>'game' = 'tumbler' then v := v || public.deal_tumbler(); end if;

  elsif p_kind = 'observe' and p_payload->>'mode' = 'impostor' then
    -- A different square for every player. The answer is checked against THIS
    -- value, not the one on the challenge, so shouting a position across the
    -- room helps nobody.
    v := jsonb_build_object(
      'odd_index', floor(random() * coalesce((p_payload->>'count')::int, 16))::int);
  end if;

  return v;
end;
$$;

revoke execute on function public.deal_payload(text, jsonb) from public, anon, authenticated;

-- build_board passes the payload through.
create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record; r record; s int;
  v_used text[] := '{}'; v_families text[] := '{}';
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;
    for r in
      select * from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used)) and not (c.family = any(v_families))
        and c.category = any(v.categories) and c.difficulty <= v.max_difficulty
      order by random() limit v.steps
    loop
      s := s + 1; v_used := v_used || r.id; v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload));
    end loop;

    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used)) and not (c.family = any(v_families))
        and c.difficulty <= v.max_difficulty
      order by random() limit 1;
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
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1, public.deal_payload(c.kind, c.payload)
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- Grading: an impostor is checked against the DEALT index, everything else
-- against the answer key as before.
create or replace function public.submit_answer(p_assignment uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
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

    when 'observe' then
      case when v_payload->>'mode' = 'impostor'
           -- The merged payload puts the assignment's dealt index on top of
           -- the challenge's, so this is the square THIS player was shown.
           then p_answer->>'option' = v_payload->>'odd_index'
           else p_answer->>'option' = v_answer->>'option' end

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
-- 4. Answer corrections
-- ----------------------------------------------------------------------------
-- t_hallway asked how many squares of ANY size are in a 3x3 grid and accepted
-- only "14". A 3x3 GRID OF SQUARES contains 9 + 4 + 1 = 14, which is right —
-- but the wording let players read it as a 3x3 arrangement of lines. Reworded
-- so the question means what the answer assumes.
update public.challenges
set question = 'A 3 by 3 grid of small squares is drawn on the blueprint — nine little squares in total. Counting every square of every size, including the big one around them all, how many squares are there?'
where id = 't_hallway';

-- t_shape_count said "a triangle, a hexagon and a box" and expected 13.
-- Correct arithmetic, but two of those shapes no longer have art. Restated
-- with shapes that do.
update public.challenges
set question = 'A shield has 5 sides, a box has 4 and a triangle has 3. Drawn together on the blueprint, how many sides is that in total?',
    glyph = 'shield'
where id = 'shape_count';
update public.challenge_answers set answer = '{"text":["12","twelve"]}'
where challenge_id = 'shape_count';

-- ============================================================================
-- 3. MORE QUESTIONS
-- ============================================================================
-- 26 slots drawn from ~50 challenges meant most boards were the same content
-- reshuffled. These 24 raise the pool by half, weighted toward the categories
-- that were thinnest — think and observe — and every glyph below is one of the
-- 22 that actually has a file.

insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values

-- --- observe: two NEW mechanics, so vaults 1-2 stop repeating themselves ----
('o_count_1', 'observe', 'observe', 'counter', 'Quick Count',
 'How many of the tiles below are apples?',
 'Count in pairs. It is faster and you miscount less.', 'apple', 30, 1,
 '{"mode":"impostor","fill":"apple","count":16,"variant":"rotate","strength":1}'),

('o_trap_4', 'observe', 'observe', 'colour_trap', 'Colour Trap III',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Cover the letters with your thumb if you have to.', 'flame', 25, 1,
 '{"mode":"colour_trap","word":"YELLOW","ink":"green","choices":["red","blue","green","yellow"]}'),

('o_trap_5', 'observe', 'observe', 'colour_trap', 'Colour Trap IV',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your first instinct is the word. Ignore it.', 'wave', 25, 2,
 '{"mode":"colour_trap","word":"GREEN","ink":"blue","choices":["red","blue","green","yellow"]}'),

('o_imp_6', 'observe', 'observe', 'impostor', 'Impostor: Wide',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Look at which way it faces.', 'search', 40, 2,
 '{"mode":"impostor","fill":"rocket","count":25,"variant":"flip","strength":2}'),

('o_imp_7', 'observe', 'observe', 'impostor', 'Impostor: Shade',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'Same shape, same angle. One is a slightly different colour.', 'search', 40, 3,
 '{"mode":"impostor","fill":"shield","count":36,"variant":"tint","strength":2}'),

-- --- think: lateral, no prior knowledge -------------------------------------
('t_bus',    'mcq', 'think', 't_bus', 'The Bus Driver',
 'You are driving a bus. Six people get on, two get off, then four get on. What colour are the driver''s eyes?',
 'Read the very first word again.', 'box', 60, 2,
 '{"options":[{"id":"a","label":"Whatever colour YOUR eyes are","glyph":"star"},{"id":"b","label":"Brown","glyph":"circle"},{"id":"c","label":"Impossible to say","glyph":"box"},{"id":"d","label":"Blue","glyph":"wave"}]}'),

('t_stairs', 'text_input', 'think', 't_stairs', 'The Staircase',
 'A staircase has 10 steps. You start at the bottom, on the ground. How many steps must you climb to stand on the top step?',
 'The ground is not a step.', 'mountain', 45, 1, '{}'),

('t_candles','mcq', 'think', 't_candles', 'Burning Down',
 'You light 8 candles. The wind blows out 3. How many candles are left in the morning?',
 'The ones still burning are gone by morning.', 'flame', 60, 2,
 '{"options":[{"id":"a","label":"Three","glyph":"flame"},{"id":"b","label":"Five","glyph":"circle"},{"id":"c","label":"Eight","glyph":"star"},{"id":"d","label":"None","glyph":"box"}]}'),

('t_apples', 'text_input', 'think', 't_apples', 'Taking Apples',
 'There are 6 apples in a basket. You take 4 away. How many do you have?',
 'It asks what YOU have, not what is left.', 'apple', 45, 1, '{}'),

('t_rope',   'mcq', 'think', 't_rope', 'The Ladder',
 'A rope ladder hangs off a boat, with rungs 30cm apart and 4 rungs above the water. The tide rises 60cm an hour. After an hour, how many rungs are above the water?',
 'The boat floats. So does the ladder.', 'wave', 75, 3,
 '{"options":[{"id":"a","label":"Four — the boat rises too","glyph":"wave"},{"id":"b","label":"Two","glyph":"circle"},{"id":"c","label":"None","glyph":"box"},{"id":"d","label":"Six","glyph":"star"}]}'),

('t_word_1', 'mcq', 'think', 't_word_1', 'One Word',
 'Which of these words has all its letters in alphabetical order?',
 'Go letter by letter and stop at the first one that goes backwards.', 'code', 60, 2,
 '{"options":[{"id":"a","label":"ALMOST","glyph":"code"},{"id":"b","label":"ORANGE","glyph":"orange"},{"id":"c","label":"BANANA","glyph":"banana"},{"id":"d","label":"ROCKET","glyph":"rocket"}]}'),

('t_days',   'mcq', 'think', 't_days', 'Two Days',
 'Two days ago I was 15. Next year I will be 18. On what day is my birthday?',
 'It only works if today is very close to New Year.', 'star', 90, 3,
 '{"options":[{"id":"a","label":"31 December","glyph":"star"},{"id":"b","label":"1 January","glyph":"circle"},{"id":"c","label":"29 February","glyph":"box"},{"id":"d","label":"It cannot happen","glyph":"shield"}]}'),

('t_pairs',  'text_input', 'think', 't_pairs', 'Shaking Again',
 'Six people are in a room. Everyone high-fives everyone else exactly once. How many high-fives?',
 'Five, then four new ones, then three, and so on.', 'bubble', 75, 2, '{}'),

('t_boxes',  'mcq', 'think', 't_boxes', 'Mislabelled',
 'Three boxes: APPLES, ORANGES, MIXED. Every label is wrong. You may take ONE fruit from ONE box without looking in. Which box do you pick to work out all three?',
 'Pick the one whose label cannot possibly be half right.', 'box', 90, 3,
 '{"options":[{"id":"a","label":"The one labelled MIXED","glyph":"box"},{"id":"b","label":"The one labelled APPLES","glyph":"apple"},{"id":"c","label":"The one labelled ORANGES","glyph":"orange"},{"id":"d","label":"Any of them","glyph":"dice"}]}'),

('t_clock',  'mcq', 'think', 't_clock', 'Half Past',
 'At 6 o''clock a clock chimes 6 times in 5 seconds. How long does it take to chime 12 times?',
 'Count the GAPS between chimes, not the chimes.', 'search', 75, 3,
 '{"options":[{"id":"a","label":"11 seconds","glyph":"search"},{"id":"b","label":"10 seconds","glyph":"circle"},{"id":"c","label":"12 seconds","glyph":"box"},{"id":"d","label":"5 seconds","glyph":"star"}]}'),

('t_odd_2',  'image_grid', 'think', 't_odd_2', 'Odd One Out II',
 'Three of these belong together. Which one does not?',
 'Three grow on a tree or a vine. One does not grow at all.', 'apple', 35, 1,
 '{"options":[{"id":"a","label":"Apple","glyph":"apple"},{"id":"b","label":"Banana","glyph":"banana"},{"id":"c","label":"Grapes","glyph":"grapes"},{"id":"d","label":"Rocket","glyph":"rocket"}]}'),

('t_odd_3',  'image_grid', 'think', 't_odd_3', 'Odd One Out III',
 'Which of these is not like the other three?',
 'Three are things you look THROUGH or AT. One you listen to.', 'headphones', 35, 1,
 '{"options":[{"id":"a","label":"Camera","glyph":"camera"},{"id":"b","label":"Headphones","glyph":"headphones"},{"id":"c","label":"Terminal","glyph":"terminal"},{"id":"d","label":"Search","glyph":"search"}]}'),

-- --- social: more prompts so the room is not asking one question all night --
('s_talent',  'connect', 'social', 's_talent', 'Hidden Talent',
 'Find your target. Ask: "What is something you can do that almost nobody knows about?" Then both phones tap.',
 'Everyone has one. Give them a second to think.', 'star', 120, 2, '{}'),
('s_movie',   'connect', 'social', 's_movie', 'Rewatch',
 'Find your target. Ask: "What film or show have you rewatched the most?" Then both phones tap.',
 'No wrong answers, and no judgement.', 'camera', 120, 2, '{}'),
('s_travel',  'connect', 'social', 's_travel', 'One Ticket',
 'Find your target. Ask: "One free flight, anywhere — where are you going?" Then both phones tap.',
 'Ask why. That is where the conversation is.', 'mountain', 120, 2, '{}'),
('s_snack',   'connect', 'social', 's_snack', 'Canteen Verdict',
 'Find your target. Ask: "Best and worst thing in the canteen?" Then both phones tap.',
 'Strong opinions guaranteed.', 'apple', 120, 2, '{}'),

-- --- photo -----------------------------------------------------------------
('p_screen',  'photo', 'photo', 'p_screen', 'Evidence: Someone Else''s Vault',
 'Photograph another player''s screen showing their vault number. Ask first.',
 'They are holding it. Just ask.', 'camera', 90, 2, '{}'),

('p_high5',   'photo', 'photo', 'p_high5', 'Evidence: Mid-Air',
 'Photograph a high-five actually happening. Not posed afterwards.',
 'You will need a third person to take it, or good timing.', 'camera', 120, 3, '{}')

on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, family = excluded.family,
  title = excluded.title, question = excluded.question, hint = excluded.hint,
  glyph = excluded.glyph, time_limit = excluded.time_limit,
  difficulty = excluded.difficulty, payload = excluded.payload;

insert into public.challenge_answers (challenge_id, answer) values
  ('o_trap_4',  '{"option":"green"}'),
  ('o_trap_5',  '{"option":"blue"}'),
  -- impostor answers are ignored at grade time (the dealt index wins) but a
  -- row must exist or audit check #1 flags them as unanswerable.
  ('o_imp_6',   '{"option":"0"}'),
  ('o_imp_7',   '{"option":"0"}'),
  ('o_count_1', '{"option":"0"}'),
  ('t_bus',     '{"option":"a"}'),
  ('t_stairs',  '{"text":["10","ten"]}'),
  ('t_candles', '{"option":"a"}'),
  ('t_apples',  '{"text":["4","four"]}'),
  ('t_rope',    '{"option":"a"}'),
  ('t_word_1',  '{"option":"a"}'),
  ('t_days',    '{"option":"a"}'),
  ('t_pairs',   '{"text":["15","fifteen"]}'),
  ('t_boxes',   '{"option":"a"}'),
  ('t_clock',   '{"option":"a"}'),
  ('t_odd_2',   '{"option":"d"}'),
  ('t_odd_3',   '{"option":"b"}')
on conflict (challenge_id) do update set answer = excluded.answer;

-- o_count_1 is a counting puzzle, not an impostor. Retired rather than shipped
-- half-built: the client has no counting mode, so it would render as an
-- impostor grid with no impostor in it — unsolvable.
update public.challenges set active = false where id = 'o_count_1';

select category, difficulty, count(*)
from public.challenges where active and not is_bonus
group by category, difficulty order by category, difficulty;
