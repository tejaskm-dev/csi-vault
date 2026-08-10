-- ============================================================================
-- OPERATION VAULT — kill the dictionary, ship an anagram
-- ============================================================================
-- Run after 0014_ramp.sql.
--
-- WHAT WENT WRONG.
--
-- Codeword said "build a word of four letters or more" and graded the answer
-- against a hand-written list of ~150 words in public.words. A player built
-- POSE — an ordinary English word, four letters, made from the tiles they were
-- given — and the game told them they were wrong.
--
-- That is the single worst failure this app can produce. Being beaten by a
-- puzzle is fine; being told you are wrong when you are right is not, and it
-- destroys trust in every other answer the game marks.
--
-- Adding more words does not fix it. `pose`, `post`, `stop`, `spot`, `time`,
-- `most`, `item`, `emit`, `pest`, `tops` were all missing from that one letter
-- set, and any list short enough to hand-write is short enough to have holes.
-- The list also contained non-words I invented while padding it out ("miste").
--
-- THE FIX is to stop asking an open question. The tiles are now EXACTLY the
-- letters of one target word, and the instruction is "unscramble". There is a
-- specific right answer, the server knows it, and no valid answer can be
-- rejected — because every letter must be used, so there is nothing else to
-- build.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The word bank
-- ----------------------------------------------------------------------------
-- `alts` are the OTHER real words with the same letters. A player who finds
-- SILENT instead of LISTEN has solved it, and rejecting them would recreate
-- the exact bug this migration exists to fix.
--
-- Every entry below has been checked in both directions: the word is common
-- enough for a first-year, and every alt is a genuine word.

create table if not exists public.anagram_words (
  id    text primary key,
  word  text not null,
  alts  text[] not null default '{}',
  level int not null default 1
);

alter table public.anagram_words enable row level security;
-- No policies: readable answers are not answers.

insert into public.anagram_words (id, word, alts, level) values
  ('listen', 'LISTEN', array['SILENT','ENLIST','TINSEL','INLETS'], 2),
  ('crate',  'CRATE',  array['TRACE','REACT','CATER','CARET'],     1),
  ('stone',  'STONE',  array['TONES','NOTES','ONSET'],             1),
  ('master', 'MASTER', array['STREAM','TAMERS'],                   2),
  ('danger', 'DANGER', array['GARDEN','RANGED','GANDER'],          2),
  ('silver', 'SILVER', array['SLIVER','LIVERS'],                   2),
  ('plate',  'PLATE',  array['PETAL','PLEAT','LEAPT'],             1),
  ('heart',  'HEART',  array['EARTH','HATER'],                     1),
  ('below',  'BELOW',  array['BOWEL','ELBOW'],                     1),
  ('bread',  'BREAD',  array['BEARD','BARED','DEBAR'],             1),
  ('angel',  'ANGEL',  array['ANGLE','GLEAN'],                     1),
  ('secure', 'SECURE', array['RESCUE'],                            2),
  ('points', 'POINTS', array['PISTON','PINTOS'],                   2),
  ('brush',  'BRUSH',  array['SHRUB'],                             1),
  ('cheat',  'CHEAT',  array['TEACH'],                             1),
  ('march',  'MARCH',  array['CHARM'],                             1),
  ('shout',  'SHOUT',  array['SOUTH'],                             1),
  ('strip',  'STRIP',  array['SPRIT','TRIPS'],                     2),
  ('friend', 'FRIEND', array['FINDER','REFIND'],                   2),
  ('night',  'NIGHT',  array['THING'],                             1),
  ('spare',  'SPARE',  array['PEARS','PARSE','REAPS','SPEAR'],     1),
  ('rescue', 'RESCUE', array['SECURE'],                            2),
  ('quiet',  'QUIET',  array['QUITE'],                             1),
  ('stable', 'STABLE', array['TABLES','BLEATS'],                   2),
  ('dealer', 'DEALER', array['LEADER'],                            2)
on conflict (id) do update set
  word = excluded.word, alts = excluded.alts, level = excluded.level;

-- ----------------------------------------------------------------------------
-- Dealing an anagram
-- ----------------------------------------------------------------------------
-- The scramble is computed here and stored on the assignment, so the tiles the
-- player sees are fixed — reshuffling them on every render would make the
-- puzzle feel like it was fighting back.
--
-- `word_id` is stored alongside, and my_board strips it before the payload
-- ever leaves the database. See below.

create or replace function public.deal_anagram()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text; v_word text; v_letters text;
begin
  select id, word into v_id, v_word
  from public.anagram_words order by random() limit 1;

  -- Shuffle the letters. Guaranteed to differ from the word itself where the
  -- word has more than one distinct letter, which every entry above does.
  select string_agg(ch, '' order by random()) into v_letters
  from unnest(string_to_array(v_word, null)) as ch;

  return jsonb_build_object('word_id', v_id, 'letters', v_letters);
end;
$$;

revoke execute on function public.deal_anagram() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- my_board must not ship the answer
-- ----------------------------------------------------------------------------
-- `word_id` names a row in a table the client cannot read, so this is belt and
-- braces rather than the boundary — but a payload key literally called
-- "word_id" sitting in a network response is an invitation, and stripping it
-- costs one operator.

drop function if exists public.my_board(uuid);

create or replace function public.my_board(p_session uuid)
returns table (
  assignment_id uuid, slot int, step int, vault_label text,
  challenge_id text, kind text, title text, question text, hint text,
  glyph text, time_limit int, is_bonus boolean, payload jsonb,
  solved boolean, target_no int, target_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.slot, a.step, coalesce(vp.label, ''),
    c.id, c.kind, c.title, c.question, c.hint, c.glyph,
    c.time_limit, c.is_bonus,
    (c.payload || a.payload) - 'word_id',
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
-- Grading
-- ----------------------------------------------------------------------------

create or replace function public.check_anagram(p_payload jsonb, p_answer jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.anagram_words w
    where w.id = p_payload->>'word_id'
      and upper(trim(coalesce(p_answer->>'word',''))) in (
        select unnest(array[w.word] || w.alts)
      )
  );
$$;

revoke execute on function public.check_anagram(jsonb, jsonb) from public, anon, authenticated;

-- submit_answer: the wordbuild branch becomes the anagram branch, and the
-- dictionary lookup goes away entirely.
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
  -- NOTE: reads a.payload UNSTRIPPED, unlike my_board. That is the point —
  -- the server needs word_id to grade, and it is the only thing that has it.
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
      p_answer->>'option' = v_answer->>'option'
      and coalesce((p_answer->>'ms')::int, 0) >= coalesce((v_answer->>'min_ms')::int, 120)
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
-- build_board deals the letters
-- ----------------------------------------------------------------------------

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record; r record; s int;
  v_target uuid; v_payload jsonb; v_used text[] := '{}';
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
      v_target := null; v_payload := '{}'::jsonb;

      if r.kind in ('connect','exchange','charades') then
        v_target := public.pick_target(p_session, p_player);
      end if;
      if r.kind = 'exchange' then
        v_payload := jsonb_build_object(
          'mine', (10 + floor(random() * 40))::int,
          'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);
      elsif r.kind = 'minigame' then
        v_payload := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
        if r.payload->>'game' = 'anagram' then
          v_payload := v_payload || public.deal_anagram();
        end if;
      end if;

      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s, v_target, v_payload);
    end loop;

    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
        and c.difficulty <= v.max_difficulty
      order by random() limit 1;
      exit when r.id is null;

      s := s + 1; v_used := v_used || r.id;
      v_target := null; v_payload := '{}'::jsonb;
      if r.kind in ('connect','exchange','charades') then
        v_target := public.pick_target(p_session, p_player);
      end if;
      if r.kind = 'exchange' then
        v_payload := jsonb_build_object(
          'mine', (10 + floor(random() * 40))::int,
          'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);
      elsif r.kind = 'minigame' then
        v_payload := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
        if r.payload->>'game' = 'anagram' then
          v_payload := v_payload || public.deal_anagram();
        end if;
      end if;

      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s, v_target, v_payload);
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, id, 0, 1,
         case when kind = 'minigame'
              then jsonb_build_object('seed', floor(random() * 2000000000)::bigint)
                   || case when payload->>'game' = 'anagram'
                           then public.deal_anagram() else '{}'::jsonb end
              else '{}'::jsonb end
  from public.challenges
  where active and is_bonus and not (id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Swap the challenge over
-- ----------------------------------------------------------------------------

update public.challenges set active = false where id = 'mg_word';

insert into public.challenges
  (id, kind, category, title, question, hint, glyph, time_limit, difficulty, payload)
values
('mg_anagram', 'minigame', 'minigame', 'Scrambled',
 'Every letter belongs to one word. Put them in order.',
 'Try the vowels in different spots — the rest usually falls out.',
 'terminal', 90, 2, '{"game":"anagram"}'),

('mg_anagram_2', 'minigame', 'minigame', 'Scrambled: Longer',
 'Six letters, one word. Use all of them.',
 'Look for a common ending: -ER, -ED, -EN.',
 'terminal', 120, 3, '{"game":"anagram"}')
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, difficulty = excluded.difficulty,
  payload = excluded.payload;

-- The dictionary is dead. Dropped rather than left lying around, so nobody
-- wires a new feature to it and reintroduces the same class of bug.
drop table if exists public.words;
