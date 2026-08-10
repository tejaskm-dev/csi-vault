-- ============================================================================
-- OPERATION VAULT — 24 new glyphs, drawn rather than sourced
-- ============================================================================
-- Run after 0027_duel_and_compute.sql.
--
-- The asset set was 22 webp files, and 0022 had to REMAP seven glyph names to
-- other icons because the names existed in the type but no file did. That
-- capped how much visual variety the observe games could ever have: an
-- impostor grid is only as varied as the pool of things it can fill itself
-- with.
--
-- There are now 46, the extra 24 being SVGs drawn to DESIGN-BRIEF §1 — heavy
-- ink outline, rounded joins, chunky saturated fill, each rotated a degree or
-- two off true so the set reads as drawn rather than plotted. They cost
-- nothing at runtime: every one is under 4KB so Vite inlines them into the
-- bundle as data URIs, meaning zero extra requests on venue wifi.
--
-- The seven that 0022 had to remap are among them, so droplet, leaf, sun,
-- triangle, hexagon, lightning and wind are real icons again rather than the
-- two-letter placeholder that produced "DR" on screen.
-- ============================================================================
-- 24 impostor variants over the new SVG glyphs
insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('imp2_droplet','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"droplet","count":16,"variant":"rotate","strength":1}'),
('imp2_leaf','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"leaf","count":25,"variant":"size","strength":2}'),
('imp2_sun','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"sun","count":36,"variant":"flip","strength":2}'),
('imp2_triangle','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"triangle","count":16,"variant":"tint","strength":3}'),
('imp2_hexagon','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"hexagon","count":25,"variant":"rotate","strength":1}'),
('imp2_lightning','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"lightning","count":36,"variant":"size","strength":2}'),
('imp2_wind','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"wind","count":16,"variant":"flip","strength":2}'),
('imp2_clock','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"clock","count":25,"variant":"tint","strength":3}'),
('imp2_lock','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"lock","count":36,"variant":"rotate","strength":1}'),
('imp2_moon','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"moon","count":16,"variant":"size","strength":2}'),
('imp2_cloud','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"cloud","count":25,"variant":"flip","strength":2}'),
('imp2_tree','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"tree","count":36,"variant":"tint","strength":3}'),
('imp2_fish','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"fish","count":16,"variant":"rotate","strength":1}'),
('imp2_bird','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"bird","count":25,"variant":"size","strength":2}'),
('imp2_cup','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"cup","count":36,"variant":"flip","strength":2}'),
('imp2_ball','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"ball","count":16,"variant":"tint","strength":3}'),
('imp2_gear','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"gear","count":25,"variant":"rotate","strength":1}'),
('imp2_bell','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"bell","count":36,"variant":"size","strength":2}'),
('imp2_flag','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"flag","count":16,"variant":"flip","strength":2}'),
('imp2_crown','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"crown","count":25,"variant":"tint","strength":3}'),
('imp2_ghost','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"ghost","count":36,"variant":"rotate","strength":1}'),
('imp2_robot','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"robot","count":16,"variant":"size","strength":2}'),
('imp2_eye','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"eye","count":25,"variant":"flip","strength":2}'),
('imp2_house','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"house","count":36,"variant":"tint","strength":3}')
on conflict (id) do update set payload=excluded.payload, difficulty=excluded.difficulty,
  hint=excluded.hint, time_limit=excluded.time_limit;

insert into public.challenge_answers (challenge_id, answer) values
('imp2_droplet','{"option":"0"}'),
('imp2_leaf','{"option":"0"}'),
('imp2_sun','{"option":"0"}'),
('imp2_triangle','{"option":"0"}'),
('imp2_hexagon','{"option":"0"}'),
('imp2_lightning','{"option":"0"}'),
('imp2_wind','{"option":"0"}'),
('imp2_clock','{"option":"0"}'),
('imp2_lock','{"option":"0"}'),
('imp2_moon','{"option":"0"}'),
('imp2_cloud','{"option":"0"}'),
('imp2_tree','{"option":"0"}'),
('imp2_fish','{"option":"0"}'),
('imp2_bird','{"option":"0"}'),
('imp2_cup','{"option":"0"}'),
('imp2_ball','{"option":"0"}'),
('imp2_gear','{"option":"0"}'),
('imp2_bell','{"option":"0"}'),
('imp2_flag','{"option":"0"}'),
('imp2_crown','{"option":"0"}'),
('imp2_ghost','{"option":"0"}'),
('imp2_robot','{"option":"0"}'),
('imp2_eye','{"option":"0"}'),
('imp2_house','{"option":"0"}')
on conflict (challenge_id) do update set answer=excluded.answer;

-- The pool the flash and pair dealers draw from, widened to the full set.
create or replace function public.glyph_pool() returns text[]
language sql immutable as $$ select array[
  'apple','ball','banana','bell','bird','box','bubble','camera','circle','clock',
  'cloud','code','crown','cup','dice','dog','droplet','eye','fish','flag','flame',
  'gear','ghost','grapes','headphones','hexagon','house','key','leaf','lightning',
  'lock','moon','mountain','orange','penguin','robot','rocket','search','shield',
  'star','sun','terminal','tree','triangle','wave','wind']; $$;

revoke execute on function public.glyph_pool() from public, anon, authenticated;

select 'assets referenced by active content: ' ||
       count(distinct glyph)::text from public.challenges where active;
