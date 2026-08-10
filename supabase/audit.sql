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
--    Also catches an impostor with no `variant`, which would render 36
--    identical tiles and be unsolvable by anyone.
select 'BLOCKER', 'impostor odd_index wrong', c.id,
       'odd_index=' || (c.payload->>'odd_index') || ' count=' || (c.payload->>'count')
from public.challenges c
join public.challenge_answers ca on ca.challenge_id = c.id
where c.active and c.payload->>'mode' = 'impostor'
  and (
    (c.payload->>'odd_index')::int >= (c.payload->>'count')::int
    or ca.answer->>'option' <> c.payload->>'odd_index'
    or coalesce(c.payload->>'variant','') not in ('rotate','size','flip','tint'))

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

-- 13. A vault that cannot be filled without repeating a mechanic. Counts
--     DISTINCT FAMILIES, because a vault offered two colour traps has enough
--     rows but not enough variety, and the board refuses the repeat.
select 'WARNING', 'vault short on distinct mechanics',
       'vault ' || v.vault_no, v.label || ' wants ' || v.steps || ' families, has ' || (
  select count(distinct c.family) from public.challenges c
  where c.active and not c.is_bonus
    and c.category = any(v.categories)
    and c.difficulty <= v.max_difficulty)
from public.vault_plan v
where (select count(distinct c.family) from public.challenges c
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

union all

-- 18. A vault that deals the same MECHANIC twice.
--     Checks boards as actually dealt rather than the dealer's intent, which
--     is the only way this was ever going to be caught: the family rule read
--     correctly for four migrations while doing nothing inside a vault,
--     because the SELECT that applied it ran once for all of the vault's
--     steps. Two colour traps in vault 1, three odd-one-outs in vault 2.
select 'BLOCKER', 'vault repeats a mechanic',
       p.name || ' vault ' || a.slot,
       string_agg(c.family, ', ' order by a.step)
from public.assignments a
join public.challenges c on c.id = a.challenge_id
join public.players p on p.id = a.player_id
where a.slot > 0
group by p.name, a.slot
having count(*) > count(distinct c.family)

union all

-- 19. A board that points two steps at the same person.
--     Unsolved steps only: once a step is solved its partner is history, and
--     what matters is whether the player still has two live challenges telling
--     them to go and find the same number — which is unsatisfiable, because
--     the second visit is refused as a repeat while every other number is
--     refused as "not your target".
select 'BLOCKER', 'board sends a player to the same partner twice',
       p.name, 'target #' || t.vault_no || ' on ' || count(*) || ' open steps'
from public.assignments a
join public.players p on p.id = a.player_id
join public.players t on t.id = a.target_id
where a.solved_at is null
group by p.name, t.vault_no
having count(*) > 1

union all

-- 20. Evidence nobody has looked at.
--     Not a fault — photos count as accepted until crossed, which is the whole
--     point of the default. But a cross after the game ends still takes a vault
--     back, so the standings can move once the podium is up. Clear the queue
--     before pressing END THE GAME.
select 'INFO', 'photos awaiting a verdict', count(*)::text,
       'they score as accepted; a late cross would move the standings'
from public.photos where verdict = 'pending'
having count(*) > 0

union all

-- 21. A rejected photo whose vault is somehow still open.
--     review_photo clears solved_at unless another non-rejected photo covers
--     the same assignment. If this ever fires, that guard has a hole in it and
--     a player is scoring for evidence a human refused.
select 'BLOCKER', 'rejected evidence still counting',
       p.name, 'vault ' || a.slot
from public.photos ph
join public.assignments a on a.id = ph.assignment_id
join public.players p on p.id = ph.player_id
where ph.verdict = 'rejected'
  and a.solved_at is not null
  and not exists (
    select 1 from public.photos p2
    where p2.assignment_id = ph.assignment_id and p2.verdict <> 'rejected')

)
select severity, problem, id, detail
from problems
order by
  case severity when 'BLOCKER' then 1 when 'WARNING' then 2 else 3 end,
  problem, id;
