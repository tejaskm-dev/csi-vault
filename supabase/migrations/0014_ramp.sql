-- ============================================================================
-- OPERATION VAULT — difficulty ramp and a real tutorial
-- ============================================================================
-- Run after 0013_doors.sql.
--
-- TWO PROBLEMS THIS FIXES.
--
-- 1. THE FIRST THING A PLAYER SAW WAS ARBITRARY.
--    build_board drew each vault at random from its categories, so vault 1
--    could open with the bat-and-ball problem or a three-part logic puzzle.
--    That is a terrible first sixty seconds for a first-year who has never
--    seen the app: they do not yet know what a vault is, what a step is, or
--    that a hint exists — and the game asks them to do lateral arithmetic.
--
-- 2. "CONFUSING" IS NOT THE SAME AS "HARD".
--    Several of the puzzles I wrote are wordy rather than difficult. A player
--    standing in a loud room reading four lines of setup is not being
--    challenged, they are being delayed. Those are pushed to the back half
--    where someone has settled in, and the ones that were confusing rather
--    than interesting are retired.
--
-- The mechanism is one column. `difficulty` 1-3, and vault_plan gains a cap.
-- ============================================================================

alter table public.challenges
  add column if not exists difficulty int not null default 2
  check (difficulty between 1 and 3);

alter table public.vault_plan
  add column if not exists max_difficulty int not null default 3;

-- ----------------------------------------------------------------------------
-- Rate the pool
-- ----------------------------------------------------------------------------
-- 1 = instant. One tap, no reading, cannot really be got wrong. Tutorial only.
-- 2 = the normal game.
-- 3 = worth pausing over. Back half and bonuses.

update public.challenges set difficulty = 2;

-- Tier 1 — a player who has never seen this app can do these immediately.
update public.challenges set difficulty = 1 where id in (
  'colour_trap',      -- tap a colour
  'o_trap_3',
  'impostor',         -- tap the odd one out of 16
  'o_imp_3',
  'mg_pairs',         -- flip and match, nobody fails it
  'mg_wires',         -- tap left, tap right
  'odd_animal',       -- one obviously wrong item
  't_race',           -- one line, one "oh!"
  't_match',          -- one line
  't_eggs',           -- one line
  'mg_tumbler'        -- warmer/colder, no knowledge at all
);

-- Tier 3 — genuinely worth thinking about, and long enough to want a quiet
-- moment. Never in the first three vaults.
update public.challenges set difficulty = 3 where id in (
  'liar_key', 't_burning', 't_coin', 't_river', 't_sequence',
  't_lilies', 't_bat', 't_elevator', 'mg_maze_hard', 'mg_wires_hard',
  't_hallway', 't_handshake', 'recall_who'
);

-- ----------------------------------------------------------------------------
-- Retire the ones that were confusing rather than fun
-- ----------------------------------------------------------------------------
-- Each of these fails the same test: a first-year reads it twice and still is
-- not sure what is being asked. That is not difficulty, it is bad writing.
--
--   t_word_odd   needs you to spot an anagram set AND the exception. Two
--                puzzles stacked, and the answer looks arbitrary if you miss
--                the first.
--   t_letters    O-T-T-F-F-S-S-E is a classic, but unguessable without the
--                trick, and the hint gives the whole thing away. No middle.
--   t_month      a pure gotcha. The "correct" answer feels like being told off.
--   t_emoji1     "Beleaf" vs "Belief" is a spelling coin-flip, not a rebus.
--   peak_finder  the question describes art that does not exist — there is no
--                actual summit to look at, just four labels. Unanswerable.
--   spot_diff    same problem: "identical in angle and proportion" to a key
--                the player is never shown.
--   binary1010   the only question in the pool that needs prior knowledge,
--                which DESIGN-BRIEF §0 rules out for this audience.

update public.challenges set active = false where id in (
  't_word_odd', 't_letters', 't_month', 't_emoji1',
  'peak_finder', 'spot_diff', 'binary1010'
);

-- ----------------------------------------------------------------------------
-- The ramp
-- ----------------------------------------------------------------------------
-- Vaults 1 and 2 are the tutorial and are capped at tier 1. Vault 1 is a
-- single tap-to-answer challenge — it exists to teach that a vault opens, and
-- nothing else. Vault 2 introduces a minigame while staying trivial.
--
-- Social work does not start until vault 3, deliberately: asking a nervous
-- first-year to walk up to a stranger before they understand the game is how
-- you lose them in the first two minutes.

insert into public.vault_plan (vault_no, label, categories, steps, max_difficulty) values
  (1, 'First Contact', array['observe'],                        1, 1),
  (2, 'Warm Up',       array['observe','minigame'],             2, 1),
  (3, 'The Room',      array['social','photo'],                 2, 2),
  (4, 'Handiwork',     array['minigame'],                       2, 2),
  (5, 'Networking',    array['social','exchange'],              2, 2),
  (6, 'Performance',   array['perform','social'],               2, 2),
  (7, 'Head Scratch',  array['think'],                          2, 3),
  (8, 'Teamwork',      array['exchange','social','perform'],    2, 3),
  (9, 'The Finale',    array['minigame','think','memory'],      3, 3)
on conflict (vault_no) do update set
  label = excluded.label, categories = excluded.categories,
  steps = excluded.steps, max_difficulty = excluded.max_difficulty;

-- ----------------------------------------------------------------------------
-- build_board honours the cap
-- ----------------------------------------------------------------------------
-- Note the ordering inside each vault: easiest step first. Within a two-step
-- vault the player should meet the gentler one first, so the stage itself
-- ramps rather than opening on its hardest moment.

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v        record;
  r        record;
  s        int;
  v_target uuid;
  v_payload jsonb;
  v_used   text[] := '{}';
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;

    for r in
      select * from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used))
        and c.category = any(v.categories)
        and c.difficulty <= v.max_difficulty
      order by random()
      limit v.steps
    loop
      s := s + 1;
      v_used := v_used || r.id;
      v_target := null;
      v_payload := '{}'::jsonb;

      if r.kind in ('connect','exchange','charades') then
        v_target := public.pick_target(p_session, p_player);
      end if;
      if r.kind = 'exchange' then
        v_payload := jsonb_build_object(
          'mine', (10 + floor(random() * 40))::int,
          'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);
      elsif r.kind = 'minigame' then
        v_payload := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
      end if;

      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s, v_target, v_payload);
    end loop;

    -- Top up if the category ran dry, still respecting the cap. A vault that
    -- cannot be filled is a vault that can never be completed, which would
    -- strand the player permanently — so this widens the category but NOT the
    -- difficulty.
    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
        and c.difficulty <= v.max_difficulty
      order by random() limit 1;
      exit when r.id is null;

      s := s + 1;
      v_used := v_used || r.id;
      v_target := null;
      v_payload := '{}'::jsonb;
      if r.kind in ('connect','exchange','charades') then
        v_target := public.pick_target(p_session, p_player);
      end if;
      if r.kind = 'exchange' then
        v_payload := jsonb_build_object(
          'mine', (10 + floor(random() * 40))::int,
          'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]);
      elsif r.kind = 'minigame' then
        v_payload := jsonb_build_object('seed', floor(random() * 2000000000)::bigint);
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
              else '{}'::jsonb end
  from public.challenges
  where active and is_bonus and not (id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Sanity check
-- ----------------------------------------------------------------------------
-- Run this after the migration. Every vault must have at least `steps`
-- candidates or boards will come out short — and a short vault can never be
-- completed. Anything reported here needs more content at that difficulty.

do $$
declare v record; n int;
begin
  for v in select * from public.vault_plan order by vault_no loop
    select count(*) into n from public.challenges c
    where c.active and not c.is_bonus
      and c.category = any(v.categories)
      and c.difficulty <= v.max_difficulty;
    if n < v.steps then
      raise warning 'Vault % (%) wants % step(s) but only % challenge(s) qualify',
        v.vault_no, v.label, v.steps, n;
    end if;
  end loop;
end $$;
