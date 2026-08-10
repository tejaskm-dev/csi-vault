-- ============================================================================
-- OPERATION VAULT — dealing seeds, and more to play
-- ============================================================================
-- Run after 0008_minigames_charades.sql.
--
-- build_board() has to do one new thing: give every minigame assignment its own
-- random seed. That integer is what makes two players get different mazes, the
-- same player get their maze back after a refresh, and the server able to
-- regenerate the puzzle to grade it.
--
-- Also fixes the near-duplicate problem. `colour_trap` and `colour_trap_2` were
-- separate rows, so a board could deal both and read as a repeat even though no
-- challenge appeared twice. Variants now live in one row and pick their
-- specifics from the seed, which means one draw per idea.
-- ============================================================================

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
  v_target uuid;
  v_payload jsonb;
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for r in
    select * from public.challenges
    where active and not is_bonus
    order by random()
    limit 9
  loop
    n := n + 1;
    v_target := null;
    v_payload := '{}'::jsonb;

    if r.kind in ('connect', 'exchange', 'charades') then
      v_target := public.pick_target(p_session, p_player);
    end if;

    if r.kind = 'exchange' then
      v_payload := jsonb_build_object(
        'mine', (10 + floor(random() * 40))::int,
        'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);

    elsif r.kind = 'minigame' then
      -- The seed. Random per assignment, stored here, never derived from
      -- anything the client can predict or influence.
      v_payload := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
    end if;

    insert into public.assignments
      (session_id, player_id, challenge_id, slot, target_id, payload)
    values (p_session, p_player, r.id, n, v_target, v_payload);
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, payload)
  select p_session, p_player, id, 0,
         case when kind = 'minigame'
              then jsonb_build_object('seed', floor(random() * 2000000000)::bigint)
              else '{}'::jsonb end
  from public.challenges
  where active and is_bonus
  order by random()
  limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- ============================================================================
-- THE NEW CHALLENGES
-- ============================================================================

insert into public.challenges (id, kind, title, question, hint, glyph, time_limit, payload) values

-- --- Minigames --------------------------------------------------------------
('mg_tumbler', 'minigame', 'Crack The Tumbler',
 'Three dials, one combination. Each dial tells you how close it is — turn until all three read SET.',
 'Cold means far. Keep turning the same way and watch it change.', 'key', 120,
 '{"game":"tumbler","level":1}'),

('mg_maze', 'minigame', 'Ventilation Shaft',
 'Swipe your way from the top-left to the green corner.',
 'Dead ends are normal. Back out and try the other branch.', 'search', 120,
 '{"game":"maze","level":1}'),

('mg_maze_hard', 'minigame', 'Deep Ducts',
 'A bigger shaft. Same rules — reach the green corner.',
 'Hug one wall and follow it. It always works in a maze like this.', 'search', 150,
 '{"game":"maze","level":2}'),

('mg_word', 'minigame', 'Codeword',
 'Build a word of four letters or more from the tiles.',
 'Short and certain beats long and hopeful.', 'terminal', 90,
 '{"game":"wordbuild","level":1}'),

('mg_runner', 'minigame', 'Vault Runner',
 'Tap to fly. Clear six gates without touching anything.',
 'Small taps. Everyone over-taps at first and hits the ceiling.', 'rocket', 120,
 '{"game":"survival","level":1}'),

-- --- Charades ---------------------------------------------------------------
('charades_1', 'charades', 'Act It Out',
 'Your phone shows a secret. Find your target and act it out — no talking, no pointing at words. They guess on their phone.',
 'Big movements. You will feel silly. That is the point.', 'bubble', 180, '{}'),

('charades_2', 'charades', 'No Words',
 'Another secret to perform. Same rules: mime only, they tap what they think it is.',
 'Show the action, not the object.', 'star', 180, '{}')

on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, question = excluded.question,
  hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, payload = excluded.payload;

insert into public.challenges (id, kind, title, question, hint, glyph, time_limit, is_bonus, payload) values
('bonus_maze', 'minigame', 'The Long Way Out',
 'The biggest shaft in the building. Reach the green corner.',
 'Pick a wall. Follow it. Do not second-guess it.', 'search', 150, true,
 '{"game":"maze","level":3}'),
('bonus_runner', 'minigame', 'Runner: Overclocked',
 'Six gates, and the clock is shorter. Tap to fly.',
 'Rhythm, not panic.', 'lightning', 90, true,
 '{"game":"survival","level":2}')
on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, question = excluded.question,
  hint = excluded.hint, glyph = excluded.glyph, time_limit = excluded.time_limit,
  is_bonus = excluded.is_bonus, payload = excluded.payload;

-- ============================================================================
-- KILL THE NEAR-DUPLICATES
-- ============================================================================
-- These read as repeats on a board even though the draw never deals the same
-- challenge twice — "Colour Trap" followed by "Colour Trap II" is, to a player,
-- the same question asked again. Deactivated rather than deleted so existing
-- assignments referencing them keep working.

update public.challenges set active = false
where id in ('colour_trap_2', 'impostor_2');
