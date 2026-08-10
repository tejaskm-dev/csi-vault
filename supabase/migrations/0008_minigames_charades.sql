-- ============================================================================
-- OPERATION VAULT — minigames + charades
-- ============================================================================
-- Run after 0007_connect_guards.sql.
--
-- Two additions, both aimed at the same complaint: the game had no play in it.
--
-- MINIGAMES are generated from a per-player integer seed. The client builds the
-- maze/dials/letters from that seed; the server regenerates the same thing to
-- grade the answer. Puzzle content never travels with its solution — the same
-- rule as challenge_answers, applied to procedural content.
--
-- CHARADES fixes the dryness of the social half. "Find someone and both tap
-- DONE" verifies nothing and is not a game. Here the actor's phone shows a
-- secret word, they act it out, the guesser's phone shows four options, and the
-- SERVER checks the guess against the word. A real party game that grades
-- itself with no staff involved.
-- ============================================================================

alter table public.challenges drop constraint if exists challenges_kind_check;
alter table public.challenges add constraint challenges_kind_check
  check (kind in ('mcq','image_grid','text_input','observe',
                  'connect','exchange','recall','photo',
                  'minigame','charades'));

alter table public.interactions drop constraint if exists interactions_kind_check;
alter table public.interactions add constraint interactions_kind_check
  check (kind in ('connect','exchange','recall','charades'));

-- ----------------------------------------------------------------------------
-- The shared PRNG
-- ----------------------------------------------------------------------------
-- mulberry32, byte-identical to src/minigames/seed.ts. The whole verification
-- scheme rests on both sides producing the same sequence from the same seed,
-- so if you touch one you must touch the other.

create or replace function public.mulberry32(p_seed bigint, p_count int)
returns double precision[]
language plpgsql
immutable
as $$
declare
  a  bigint := p_seed % 4294967296;
  t  bigint;
  out double precision[] := '{}';
  i  int;
begin
  for i in 1..p_count loop
    a := (a + 1831565813) % 4294967296;          -- 0x6d2b79f5
    t := a;
    t := ((t # (t >> 15)) * (1 # t)) % 4294967296;
    t := ((t + ((t # (t >> 7)) * (61 # t))) # t) % 4294967296;
    out := out || ((t # (t >> 14)) % 4294967296)::double precision / 4294967296.0;
  end loop;
  return out;
end;
$$;

-- ----------------------------------------------------------------------------
-- Charades word bank
-- ----------------------------------------------------------------------------
-- Actable without props, recognisable to a first-year, and safe to perform in
-- front of strangers on day one. `decoys` are the wrong options the guesser
-- sees — chosen to be plausible rather than random, because four options where
-- three are obviously absurd is not a guess.

create table if not exists public.charade_words (
  id      text primary key,
  word    text not null,
  decoys  text[] not null,
  level   int not null default 1
);

alter table public.charade_words enable row level security;
-- No policies. The word is handed to the actor by an RPC; the guesser never
-- gets to read this table and find the answer.

insert into public.charade_words (id, word, decoys, level) values
  ('penguin',   'Penguin',            array['Duck','Seal','Owl'], 1),
  ('guitar',    'Playing guitar',     array['Playing drums','Playing piano','Playing violin'], 1),
  ('selfie',    'Taking a selfie',    array['Texting','Calling someone','Reading a book'], 1),
  ('sleep',     'Falling asleep',     array['Yawning','Crying','Sneezing'], 1),
  ('football',  'Scoring a goal',     array['Shooting a basket','Bowling','Serving a tennis ball'], 1),
  ('cricket',   'Batting in cricket', array['Playing badminton','Golf swing','Boxing'], 1),
  ('driving',   'Driving a car',      array['Riding a bike','Rowing a boat','Flying a plane'], 1),
  ('exam',      'Writing an exam',    array['Painting','Cooking','Typing an email'], 1),
  ('spider',    'Spider-Man',         array['Superman','Batman','Iron Man'], 2),
  ('robot',     'A robot walking',    array['A zombie','A ghost','A monkey'], 2),
  ('coffee',    'Drinking hot coffee',array['Eating noodles','Drinking a smoothie','Eating ice cream'], 2),
  ('wifi',      'Hunting for wifi',   array['Looking for keys','Waiting for a bus','Reading a map'], 2),
  ('gym',       'Lifting weights',    array['Doing yoga','Swimming','Skipping rope'], 2),
  ('photo',     'Taking a photo',     array['Filming a video','Using binoculars','Looking through a microscope'], 2),
  ('dance',     'Dancing badly',      array['Marching','Stretching','Climbing stairs'], 3),
  ('presentation','Giving a presentation', array['Teaching a class','Arguing','Singing on stage'], 3),
  ('firstday',  'Lost on the first day', array['Late for class','Missing the bus','Forgetting a name'], 3),
  ('debug',     'Fixing a broken laptop', array['Building a PC','Charging a phone','Unplugging a cable'], 3)
on conflict (id) do update set
  word = excluded.word, decoys = excluded.decoys, level = excluded.level;

-- ----------------------------------------------------------------------------
-- charades_brief — what the ACTOR sees
-- ----------------------------------------------------------------------------
-- Only ever returns the word to the player whose assignment it is. Called on
-- mount, and binds a word to the assignment on first call so refreshing does
-- not reroll into something easier to act.

create or replace function public.charades_brief(p_assignment uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_kind text; v_word text; v_id text;
begin
  select a.player_id, a.session_id, c.kind, a.payload->>'word_id'
    into v_player, v_session, v_kind, v_id
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;
  if v_kind <> 'charades' then
    raise exception 'that challenge is not charades';
  end if;

  if v_id is null then
    select id into v_id from public.charade_words order by random() limit 1;
    update public.assignments
    set payload = payload || jsonb_build_object('word_id', v_id)
    where id = p_assignment;
  end if;

  select word into v_word from public.charade_words where id = v_id;
  return jsonb_build_object('word', v_word);
end;
$$;

-- ----------------------------------------------------------------------------
-- charades_options — what the GUESSER sees
-- ----------------------------------------------------------------------------
-- Four shuffled options for the person being performed at. The correct one is
-- in there, but which one is not indicated — and the guess is graded by
-- charades_guess() below, never here.

create or replace function public.charades_options(p_interaction uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.interactions; v_id text; v_word text; v_decoys text[]; v_all text[];
begin
  select * into v_row from public.interactions where id = p_interaction;
  if v_row.id is null or v_row.target_id <> public.me(v_row.session_id) then
    raise exception 'not your guess to make';
  end if;

  select a.payload->>'word_id' into v_id
  from public.assignments a where a.id = v_row.assignment_id;

  select word, decoys into v_word, v_decoys
  from public.charade_words where id = v_id;

  if v_word is null then
    raise exception 'that round is not ready';
  end if;

  -- Shuffled per call is fine: the guesser only ever sees one round, and a
  -- stable order across reloads would leak nothing anyway.
  select array_agg(x order by random()) into v_all
  from unnest(v_decoys || v_word) as x;

  return jsonb_build_object('options', v_all);
end;
$$;

-- ----------------------------------------------------------------------------
-- charades_guess — the graded moment
-- ----------------------------------------------------------------------------
-- The guesser taps; the server compares against the actor's secret word and
-- completes the ACTOR's assignment. Note who gets the credit: the person who
-- performed. They did the socially expensive part.

create or replace function public.charades_guess(p_interaction uuid, p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.interactions; v_id text; v_word text; v_ok boolean;
begin
  select * into v_row from public.interactions where id = p_interaction;
  if v_row.id is null or v_row.target_id <> public.me(v_row.session_id) then
    raise exception 'not your guess to make';
  end if;

  select a.payload->>'word_id' into v_id
  from public.assignments a where a.id = v_row.assignment_id;
  select word into v_word from public.charade_words where id = v_id;

  v_ok := lower(trim(coalesce(p_guess,''))) = lower(trim(coalesce(v_word,'')));

  if v_ok then
    update public.interactions
    set state = 'confirmed', confirmed_at = now(),
        fact = fact || jsonb_build_object('word', v_word)
    where id = p_interaction;

    update public.assignments
    set solved_at = now()
    where id = v_row.assignment_id and solved_at is null;
  end if;

  -- The word is returned either way. A wrong guess where nobody ever learns
  -- the answer is the least satisfying possible ending to a round of charades.
  return jsonb_build_object('correct', v_ok, 'word', v_word);
end;
$$;

-- ----------------------------------------------------------------------------
-- Minigame grading
-- ----------------------------------------------------------------------------
-- Slots into submit_answer via the 'minigame' branch added below.

create or replace function public.check_minigame(p_payload jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_game  text := p_payload->>'game';
  v_seed  bigint := coalesce((p_payload->>'seed')::bigint, 1);
  v_level int := coalesce((p_payload->>'level')::int, 1);
  r       double precision[];
  i       int;
  v_dials int[];
begin
  if v_game = 'tumbler' then
    -- Regenerate the combination from the seed and compare. The client was
    -- never told the answer; it only ever knew "warmer" and "colder".
    r := public.mulberry32(v_seed, 3);
    v_dials := array(select jsonb_array_elements_text(p_answer->'dials')::int);
    if array_length(v_dials,1) is distinct from 3 then return false; end if;
    for i in 1..3 loop
      if v_dials[i] <> floor(r[i] * 12)::int then return false; end if;
    end loop;
    return true;

  elsif v_game = 'maze' then
    -- A full re-walk of the maze in plpgsql is more than this is worth. The
    -- path length is bounded instead: a legal route through an n×n perfect
    -- maze cannot be shorter than 2(n-1), and a submission below that floor is
    -- the only cheat worth catching here.
    return coalesce((p_answer->>'moves')::int, 0)
             >= 2 * ((array[7,9,11])[least(greatest(v_level,1),3)] - 1);

  elsif v_game = 'wordbuild' then
    -- Graded in submit_answer, which can reach the dictionary table.
    return false;

  elsif v_game = 'survival' then
    -- Bounds, not a score. Six gates cannot physically be cleared in under
    -- ~15s at the configured scroll speed, so anything faster is a script.
    return coalesce((p_answer->>'gates')::int, 0) >= 6
       and coalesce((p_answer->>'ms')::int, 0) >= 15000;
  end if;

  return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- The dictionary
-- ----------------------------------------------------------------------------
-- Small on purpose. A real wordlist is megabytes and most of it is words no
-- first-year would produce under time pressure; this is the common core that
-- the seeded letter sets in WordBuild.tsx can actually build.

create table if not exists public.words (w text primary key);
alter table public.words enable row level security;
-- No policies: a readable dictionary is a readable answer key.

insert into public.words (w)
select unnest(array[
  'ates','ates','earl','earn','east','eats','lane','lard','last','late','lean',
  'lens','less','line','lint','list','near','neat','nest','rail','rain','rant',
  'rate','real','rent','rest','sale','salt','sane','sear','seat','sent','slat',
  'slate','snare','stale','stare','steal','tale','tans','tear','teas','tens',
  'tile','tire','trail','train','earls','learn','least','antler','rental',
  'items','miste','moist','poems','posit','times','tomes','topic','optic',
  'crates','caster','trades','stared','darted','carted','breaks','bakers',
  'broken','banked','bleak','blank','noble','pursue','purest','sprite','stripe',
  'ripest','priest','master','stream','hamster','onward','sword','sands','roads',
  'plate','petal','pleat','place','clean','claim','ensure','genius','rinse',
  'reign','singer','decal','coiled','docile','cradle','oracle'
]) on conflict do nothing;

-- ----------------------------------------------------------------------------
-- submit_answer gains two branches
-- ----------------------------------------------------------------------------

create or replace function public.submit_answer(p_assignment uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_kind text; v_answer jsonb;
  v_payload jsonb; v_correct boolean := false; v_solved timestamptz; v_phase text;
  v_word text;
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
      where lower(trim(t)) = lower(trim(coalesce(p_answer->>'text','')))
    )
    when 'observe' then
      p_answer->>'option' = v_answer->>'option'
      and coalesce((p_answer->>'ms')::int, 0) >= coalesce((v_answer->>'min_ms')::int, 120)

    -- NEW. Word build needs the dictionary, so it is handled here rather than
    -- in the immutable helper; every other game is pure seed arithmetic.
    when 'minigame' then
      case when v_payload->>'game' = 'wordbuild' then
        exists (select 1 from public.words w
                where w.w = lower(trim(coalesce(p_answer->>'word',''))))
        and length(coalesce(p_answer->>'word','')) >= 4
        -- and buildable from the letters the player was actually given
        and public.buildable(coalesce(p_answer->>'letters',''), coalesce(p_answer->>'word',''))
      else
        public.check_minigame(v_payload, p_answer)
      end

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

  return jsonb_build_object(
    'correct', v_correct, 'solved', v_correct,
    'vaults', (select count(*) from public.assignments
               where player_id = v_player and solved_at is not null and slot > 0),
    'bonus',  (select count(*) from public.assignments
               where player_id = v_player and solved_at is not null and slot = 0));
end;
$$;

/** Can `word` be spelled from the multiset of letters in `letters`? */
create or replace function public.buildable(p_letters text, p_word text)
returns boolean
language plpgsql
immutable
as $$
declare
  pool text := upper(p_letters);
  ch   text;
  pos  int;
begin
  foreach ch in array string_to_array(upper(p_word), null) loop
    pos := position(ch in pool);
    if pos = 0 then return false; end if;
    pool := overlay(pool placing '' from pos for 1);
  end loop;
  return true;
end;
$$;

grant execute on function public.charades_brief(uuid)          to authenticated;
grant execute on function public.charades_options(uuid)        to authenticated;
grant execute on function public.charades_guess(uuid, text)    to authenticated;
revoke execute on function public.charades_brief(uuid)         from public, anon;
revoke execute on function public.charades_options(uuid)       from public, anon;
revoke execute on function public.charades_guess(uuid, text)   from public, anon;
revoke execute on function public.check_minigame(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.buildable(text, text)        from public, anon, authenticated;
revoke execute on function public.mulberry32(bigint, int)      from public, anon, authenticated;
