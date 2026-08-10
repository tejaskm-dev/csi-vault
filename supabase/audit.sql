-- ============================================================================
-- OPERATION VAULT — content audit
-- ============================================================================
-- Paste into the SQL editor and run. Returns one row per problem; an empty
-- result means the content is internally consistent.
--
-- This exists because the bugs that have actually hurt were all content bugs
-- that no amount of playing would reliably surface: an answer key pointing at
-- an option that does not exist, a question describing art that was never
-- drawn, a vault whose category cannot be filled. You cannot tap your way
-- through fifty challenges before an event. The database can check itself in
-- two seconds.
--
-- Run it after every content migration.
-- ============================================================================

with problems as (

-- 1. Answerable kinds with no answer key at all. These can NEVER be solved.
select 'BLOCKER' as severity, 'no answer key' as problem, c.id, c.title as detail
from public.challenges c
left join public.challenge_answers ca on ca.challenge_id = c.id
where c.active
  and c.kind in ('mcq','image_grid','text_input','observe')
  and ca.challenge_id is null

union all

-- 2. The answer names an option that is not on the card. Unsolvable, and the
--    single most likely mistake when hand-writing content.
select 'BLOCKER', 'answer option not in options', c.id, ca.answer->>'option'
from public.challenges c
join public.challenge_answers ca on ca.challenge_id = c.id
where c.active and c.kind in ('mcq','image_grid')
  and not exists (
    select 1 from jsonb_array_elements(c.payload->'options') o
    where o->>'id' = ca.answer->>'option')

union all

-- 3. Multiple choice with no options, or fewer than two.
select 'BLOCKER', 'needs at least 2 options', c.id, c.title
from public.challenges c
where c.active and c.kind in ('mcq','image_grid')
  and coalesce(jsonb_array_length(c.payload->'options'), 0) < 2

union all

-- 4. Duplicate option ids — the player can pick the "right" one and be told no.
select 'BLOCKER', 'duplicate option id', c.id, o->>'id'
from public.challenges c,
     lateral jsonb_array_elements(c.payload->'options') o
where c.active and c.kind in ('mcq','image_grid')
group by c.id, o->>'id'
having count(*) > 1

union all

-- 5. Colour trap whose answer is not one of the offered colours.
select 'BLOCKER', 'colour_trap answer not in choices', c.id, ca.answer->>'option'
from public.challenges c
join public.challenge_answers ca on ca.challenge_id = c.id
where c.active and c.payload->>'mode' = 'colour_trap'
  and ca.answer->>'option' not in (
    select jsonb_array_elements_text(c.payload->'choices'))

union all

-- 6. Colour trap where the word and the ink are the same colour. Not a trap,
--    and the "wrong" answer is indistinguishable from the right one.
select 'WARNING', 'colour_trap word matches its ink', c.id, c.payload->>'word'
from public.challenges c
where c.active and c.payload->>'mode' = 'colour_trap'
  and lower(c.payload->>'word') = lower(c.payload->>'ink')

union all

-- 7. Impostor grid where the odd tile is outside the grid, or the answer does
--    not point at it. Tapping the visibly-odd square would be marked wrong.
select 'BLOCKER', 'impostor odd_index wrong', c.id,
       'odd_index=' || (c.payload->>'odd_index') || ' count=' || (c.payload->>'count')
from public.challenges c
join public.challenge_answers ca on ca.challenge_id = c.id
where c.active and c.payload->>'mode' = 'impostor'
  and (
    (c.payload->>'odd_index')::int >= (c.payload->>'count')::int
    or ca.answer->>'option' <> c.payload->>'odd_index')

union all

-- 8. Text input with no accepted spellings.
select 'BLOCKER', 'text_input has no accepted answers', c.id, c.title
from public.challenges c
join public.challenge_answers ca on ca.challenge_id = c.id
where c.active and c.kind = 'text_input'
  and coalesce(jsonb_array_length(ca.answer->'text'), 0) = 0

union all

-- 9. Minigame naming a game the client cannot render.
select 'BLOCKER', 'unknown minigame', c.id, coalesce(c.payload->>'game','(none)')
from public.challenges c
where c.active and c.kind = 'minigame'
  and coalesce(c.payload->>'game','') not in
      ('tumbler','maze','anagram','survival','pairs','wires')

union all

-- 10. An "alt" that is not actually an anagram of its word. Accepting it would
--     mean accepting a word the tiles cannot spell; the player could never
--     enter it, so the alt is dead — or worse, the WORD itself is misspelled.
select 'BLOCKER', 'anagram alt is not an anagram', w.id, a
from public.anagram_words w, lateral unnest(w.alts) a
where (select string_agg(ch, '' order by ch)
       from unnest(string_to_array(upper(w.word), null)) ch)
   <> (select string_agg(ch, '' order by ch)
       from unnest(string_to_array(upper(a), null)) ch)

union all

-- 11. Charades with too few decoys — a guess between two options is a coin flip.
select 'WARNING', 'charade needs 3 decoys', w.id, w.word
from public.charade_words w
where coalesce(array_length(w.decoys, 1), 0) < 3

union all

-- 12. A decoy identical to the answer. Two correct options, one marked wrong.
select 'BLOCKER', 'charade decoy equals the word', w.id, w.word
from public.charade_words w
where upper(w.word) = any (select upper(unnest(w.decoys)))

union all

-- 13. A vault that cannot be filled. Its steps would come up short, and a
--     short vault can never be completed — the player is stranded forever.
select 'BLOCKER', 'vault cannot be filled',
       'vault ' || v.vault_no, v.label || ' wants ' || v.steps || ', has ' || (
  select count(*) from public.challenges c
  where c.active and not c.is_bonus
    and c.category = any(v.categories)
    and c.difficulty <= v.max_difficulty)
from public.vault_plan v
where (select count(*) from public.challenges c
       where c.active and not c.is_bonus
         and c.category = any(v.categories)
         and c.difficulty <= v.max_difficulty) < v.steps

union all

-- 14. Content no vault will ever draw. Not broken, just wasted — usually a
--     category typo.
select 'WARNING', 'category unreachable', c.id, c.category
from public.challenges c
where c.active and not c.is_bonus
  and not exists (
    select 1 from public.vault_plan v
    where c.category = any(v.categories) and c.difficulty <= v.max_difficulty)

union all

-- 15. Missing hint. Every challenge has a NUDGE button; an empty one is a
--     dead end for exactly the player who needed it.
select 'WARNING', 'no hint', c.id, c.title
from public.challenges c
where c.active and coalesce(trim(c.hint), '') = ''

union all

-- 16. No bonus vault available at all.
select 'WARNING', 'no active bonus challenges', '-', 'players get no bonus vault'
from (select 1) x
where not exists (select 1 from public.challenges where active and is_bonus)

union all

-- 17. Reaction rows whose file was never uploaded show as a broken image.
--     The client hides them on error, so this is cosmetic — but it means the
--     GIF layer is doing nothing.
select 'INFO', 'meme file may be missing', m.id, m.storage_path
from public.memes m
left join storage.objects o
  on o.bucket_id = 'memes' and o.name = m.storage_path
where m.active and o.id is null

)
select severity, problem, id, detail
from problems
order by
  case severity when 'BLOCKER' then 1 when 'WARNING' then 2 else 3 end,
  problem, id;
