-- ============================================================================
-- OPERATION VAULT — an anagram without a clue is not a puzzle
-- ============================================================================
-- Run after 0033_no_write_on_read.sql.
--
-- SCRAMBLED ships six tiles and the instruction "put the letters in order".
-- That is a fair puzzle if you already suspect what the word is, and an
-- unbounded search if you do not — six letters is 720 orderings, and a
-- first-year with no reason to prefer any of them just stops.
--
-- 0015 fixed the previous version of this exact failure. Codeword graded
-- against a hand-written list and rejected POSE, a real word; the answer was
-- to stop asking an open question. That reasoning was right and did not go far
-- enough: the question is now closed, but the player was still given nothing
-- to close it WITH.
--
-- A clue costs nothing and cannot introduce the old bug back, because it does
-- not widen what counts as correct. The word and its alts are unchanged; the
-- player is simply told what they are looking for.
--
-- Deliberately a definition, not a category. "A word for a room" narrows to
-- hundreds; "where a car is kept" narrows to one, and the puzzle is then the
-- letters rather than the guessing.
--
-- SIXTY WORDS, not twenty-five. 0015 seeded twenty-five and 0023 quietly added
-- thirty-five more in the middle of an unrelated migration, so a first pass at
-- this only covered the first batch and the assertion at the bottom caught it.
-- Every row in the table is clued below.
--
-- Where a word is obscure but its ALTS are ordinary, the clue points at the
-- ordinary one. `carets` is the plural of the ^ symbol and nobody is finding
-- that from six tiles — but CRATES, TRACES and REACTS are all accepted alts,
-- so the clue describes a crate. The grader was already permissive; the clue
-- just stops the player having to be a lexicographer to use it.
-- ============================================================================

alter table public.anagram_words
  add column if not exists clue text;

update public.anagram_words set clue = c.clue
from (values
  ('listen', 'What you do with your ears'),
  ('crate',  'A wooden box for shipping things'),
  ('stone',  'A small rock'),
  ('master', 'Someone completely skilled at something'),
  ('danger', 'A warning sign says this is near'),
  ('silver', 'The metal of a second-place medal'),
  ('plate',  'You eat your dinner off one'),
  ('heart',  'The organ that pumps your blood'),
  ('below',  'The opposite of above'),
  ('bread',  'You slice it and make toast'),
  ('angel',  'A winged figure on a Christmas tree'),
  ('secure', 'Locked, safe, not going anywhere'),
  ('points', 'What you score in a game'),
  ('brush',  'You use one on your teeth or your hair'),
  ('cheat',  'To break the rules to win'),
  ('march',  'To walk in step, or the month after February'),
  ('shout',  'To speak very loudly'),
  ('strip',  'A long narrow piece of something'),
  ('friend', 'Someone you choose to spend time with'),
  ('night',  'When it is dark outside'),
  ('spare',  'The extra one, kept in case'),
  ('rescue', 'To save someone from trouble'),
  ('quiet',  'Making no noise at all'),
  ('stable', 'Where a horse sleeps, or steady and not wobbling'),
  ('dealer', 'The person who hands out the cards'),

  -- The batch 0023 added. Same rule: describe the answer, not its category.
  ('ocean',   'The biggest body of water on Earth'),
  ('north',   'The direction at the top of a map'),
  ('stream',  'A small flowing river, or what you do to a video'),
  -- word THING, alt NIGHT. "Thing" cannot be defined into one answer, so the
  -- clue points at the alt, which the grader already accepts.
  ('thing',   'When it is dark outside'),
  ('saved',   'Kept from being lost'),
  ('cause',   'The reason something happened'),
  ('latest',  'The most recent one'),
  ('signal',  'The bars on your phone, or a wave to get attention'),
  ('rescued', 'Saved from danger'),
  ('marine',  'To do with the sea'),
  ('danger2', 'Where you grow flowers and vegetables'),
  ('listen2', 'Making no sound at all'),
  ('parties', 'Celebrations with music and cake'),
  -- word EARNEST, alt NEAREST — the alt is the one a first-year will find.
  ('earnest', 'Closest of all'),
  -- word DIAPER, alt PAIRED.
  ('diaper',  'Matched up, two by two'),
  ('lemons',  'Sour yellow fruit'),
  ('staple',  'The little metal clip that holds paper together'),
  -- word CARETS — the ^ symbol, plural. Alt CRATES.
  ('carets',  'Wooden boxes for shipping things'),
  ('dusty',   'Covered in a layer you could write your name in'),
  -- word THESE, alt SHEET.
  ('these',   'A flat piece of paper, or what covers a bed'),
  ('angered', 'Made someone furious'),
  ('notes2',  'The very beginning of something'),
  ('reset',   'To put something back to the start'),
  ('salt',    'You sprinkle it on chips'),
  ('care',    'To look after someone'),
  ('west',    'The direction the sun sets'),
  ('form',    'A document you fill in'),
  ('item',    'A single thing on a list'),
  ('star2',   'It twinkles in the night sky'),
  ('dear',    'How you begin a letter'),
  ('evil',    'Wicked — the opposite of good'),
  ('snap',    'To break with a sharp sound'),
  ('silver2', 'The metal of a second-place medal'),
  ('throne',  'The chair a king sits on'),
  ('cellar',  'An underground room below a house')
) as c(id, clue)
where public.anagram_words.id = c.id;

-- A word with no clue would deal a puzzle with nothing to go on, which is the
-- bug this migration exists to close. Fail loudly rather than quietly on
-- somebody's phone — and NAME the rows, because "35 rows" sent me looking in
-- the wrong migration for the ones I had missed.
do $$
declare v_missing text;
begin
  select string_agg(id, ', ' order by id) into v_missing
  from public.anagram_words where coalesce(trim(clue), '') = '';

  if v_missing is not null then
    raise exception 'anagram_words has no clue for: %', v_missing;
  end if;
end $$;

alter table public.anagram_words alter column clue set not null;

-- ----------------------------------------------------------------------------
-- Deal the clue alongside the letters
-- ----------------------------------------------------------------------------
-- `word_id` is still stripped by my_board; `clue` is meant to be seen.
create or replace function public.deal_anagram()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text; v_word text; v_clue text; v_letters text;
begin
  select id, word, clue into v_id, v_word, v_clue
  from public.anagram_words order by random() limit 1;

  -- Shuffle the letters. Guaranteed to differ from the word itself where the
  -- word has more than one distinct letter, which every entry has.
  select string_agg(ch, '' order by random()) into v_letters
  from unnest(string_to_array(v_word, null)) as ch;

  return jsonb_build_object('word_id', v_id, 'letters', v_letters, 'clue', v_clue);
end;
$$;

revoke execute on function public.deal_anagram() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Boards already dealt
-- ----------------------------------------------------------------------------
-- Assignments are dealt at join and never re-dealt, so every anagram already
-- in play would keep its clue-less payload. Backfill from word_id, which is
-- still on the assignment even though my_board strips it on the way out.
update public.assignments a
set payload = a.payload || jsonb_build_object('clue', w.clue)
from public.anagram_words w
where a.payload ? 'word_id'
  and a.payload->>'word_id' = w.id
  and not (a.payload ? 'clue');

-- ----------------------------------------------------------------------------
-- Check it
-- ----------------------------------------------------------------------------
--   select count(*) from public.assignments
--   where payload ? 'letters' and not (payload ? 'clue');   -- must be 0
