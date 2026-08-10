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
  ('dealer', 'The person who hands out the cards')
) as c(id, clue)
where public.anagram_words.id = c.id;

-- A word with no clue would deal a puzzle with nothing to go on, which is the
-- bug this migration exists to close. Fail loudly here rather than quietly on
-- somebody's phone.
do $$
declare n int;
begin
  select count(*) into n from public.anagram_words where coalesce(trim(clue), '') = '';
  if n > 0 then
    raise exception 'anagram_words: % row(s) still have no clue', n;
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
