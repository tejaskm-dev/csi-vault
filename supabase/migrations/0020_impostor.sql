-- ============================================================================
-- OPERATION VAULT — make the impostor actually hard
-- ============================================================================
-- Run after 0019_families.sql.
--
-- The impostor puzzle put a DIFFERENT ICON in the odd square: a hexagon among
-- circles, a sun among stars. That is not spot-the-difference, it is
-- spot-the-other-thing, and it is solved from across the room without looking.
-- Its difficulty also depended entirely on which two art assets happened to be
-- picked, which is not a dial anyone can tune.
--
-- Now every square is the same asset and the impostor differs by ONE property:
--
--   rotate   turned a few degrees
--   size     slightly smaller
--   flip     mirrored — brutal on a symmetrical glyph, so only used on
--            shapes that actually have a handedness
--   tint     a small hue shift
--
-- `strength` sets subtlety: 1 is generous, 3 is a real hunt. That means the
-- same mechanic covers a tutorial vault and a bonus vault with no new art,
-- which is what the asset budget in DESIGN-BRIEF §4 asks for.
-- ============================================================================

-- Tutorial: obvious once you look, and a shape whose rotation reads clearly.
update public.challenges set payload = jsonb_build_object(
  'mode','impostor','fill','triangle','count',16,'odd_index',11,
  'variant','rotate','strength',1)
where id = 'impostor';

-- Slightly meaner: a size difference, which the eye finds later than an angle.
update public.challenges set payload = jsonb_build_object(
  'mode','impostor','fill','star','count',25,'odd_index',6,
  'variant','size','strength',2)
where id = 'o_imp_3';

-- Dense grid, colour shift. The hardest of the three and the only one that
-- rewards scanning systematically rather than staring.
update public.challenges set payload = jsonb_build_object(
  'mode','impostor','fill','droplet','count',36,'odd_index',29,
  'variant','tint','strength',2)
where id = 'o_imp_4';

-- Hints now describe a hunt rather than a glance.
update public.challenges
set hint = 'They are all the same shape. One of them is turned.'
where id = 'impostor';

update public.challenges
set hint = 'Nothing is a different shape or colour. Compare their sizes.'
where id = 'o_imp_3';

update public.challenges
set hint = 'Same shape, same size. One is a slightly different shade.'
where id = 'o_imp_4';

update public.challenges
set question = 'Every tile is the same. One of them has been tampered with — tap it.'
where payload->>'mode' = 'impostor';

-- ----------------------------------------------------------------------------
-- The answer key must still point at the odd tile
-- ----------------------------------------------------------------------------
-- Derived from the payload rather than retyped, because typing an index twice
-- is exactly how audit check #7 came to exist.

update public.challenge_answers ca
set answer = jsonb_build_object('option', c.payload->>'odd_index')
from public.challenges c
where c.id = ca.challenge_id and c.payload->>'mode' = 'impostor';

-- ----------------------------------------------------------------------------
-- A harder one for the back half
-- ----------------------------------------------------------------------------

insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('o_imp_5', 'observe', 'observe', 'impostor', 'Impostor: Fine Print',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'It is turned, but barely. Look along the rows for a broken rhythm.',
 'search', 45, 3,
 '{"mode":"impostor","fill":"key","count":36,"odd_index":22,"variant":"rotate","strength":3}')
on conflict (id) do update set
  question = excluded.question, hint = excluded.hint,
  difficulty = excluded.difficulty, payload = excluded.payload;

insert into public.challenge_answers (challenge_id, answer)
values ('o_imp_5', '{"option":"22"}')
on conflict (challenge_id) do update set answer = excluded.answer;

-- ----------------------------------------------------------------------------
-- Check it
-- ----------------------------------------------------------------------------

select id, difficulty,
       payload->>'fill'     as asset,
       payload->>'variant'  as difference,
       payload->>'strength' as subtlety,
       payload->>'count'    as tiles,
       payload->>'odd_index' as odd,
       (select answer->>'option' from public.challenge_answers a
        where a.challenge_id = c.id) as key
from public.challenges c
where active and payload->>'mode' = 'impostor'
order by difficulty, id;
