-- ============================================================================
-- OPERATION VAULT — stop rejecting fast taps, stop repeating puzzles
-- ============================================================================
-- Run after 0018_meme_links.sql.
--
-- THREE FIXES.
--
-- 1. A CORRECT FAST TAP WAS GRADED WRONG.
--    Observe challenges carried `min_ms` (250-300ms) and the server rejected
--    anything faster, on the theory that no human could be that quick. That is
--    wrong: a player who sees the word RED printed in blue and taps BLUE has
--    already decided before the screen finished settling, and 200ms is an
--    ordinary reaction. So the game marked correct answers wrong, at random,
--    for the fastest players — and from the phone it looked like the touch
--    simply had not registered.
--
--    This is the same mistake as the word dictionary: a rule invented to catch
--    cheating that mostly catches real people. It buys almost nothing — a
--    script can trivially wait 300ms — so it is gone. `ms` is still recorded on
--    the attempt for interest; it just no longer decides anything.
--
-- 2. THE SAME PUZZLE TWICE.
--    Vault 1 gave "find the odd one out" and vault 2 gave "find the odd one
--    out" with a different symbol. Nothing in the schema knew those were the
--    same puzzle — `impostor` and `o_imp_3` are separate rows, so the draw
--    considered them unrelated. With only two colour traps and two impostors
--    at tutorial difficulty, drawing two of a kind was likely rather than
--    unlucky.
--
--    `family` names the MECHANIC. A board never repeats one.
--
-- 3. VAULTS WERE TOO SHORT.
--    One challenge in vault 1 and two in vault 2. Every vault below is now
--    three, except the very first, which stays at two so the opening minute
--    is still a gentle on-ramp.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The min_ms floor goes
-- ----------------------------------------------------------------------------

update public.challenge_answers
set answer = answer - 'min_ms'
where answer ? 'min_ms';

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

    -- No timing floor. Tapping the right thing is the whole task; how fast a
    -- player did it is not the app's business to disbelieve.
    when 'observe' then p_answer->>'option' = v_answer->>'option'

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
-- 2. Families
-- ----------------------------------------------------------------------------
-- A family is "the same thing to do". Two colour traps are one family even
-- though the word and ink differ; two connect prompts are NOT, because the
-- question you ask a stranger is the content, and asking two different people
-- two different things is the point.
--
-- So: observe groups by its mode, minigames by their game, and everything else
-- is its own family — which imposes no restriction, exactly as intended.

alter table public.challenges
  add column if not exists family text;

update public.challenges set family = case
  when kind = 'observe'  then coalesce(payload->>'mode', id)
  when kind = 'minigame' then coalesce(payload->>'game', id)
  else id
end;

alter table public.challenges alter column family set not null;

-- ----------------------------------------------------------------------------
-- 3. Longer vaults
-- ----------------------------------------------------------------------------
-- Categories are widened where a single one cannot supply three distinct
-- families — `exchange` has only two challenges of one family, so a vault
-- built on it alone could never fill.

insert into public.vault_plan (vault_no, label, categories, steps, max_difficulty) values
  (1, 'First Contact', array['observe','think'],                     2, 1),
  (2, 'Warm Up',       array['observe','minigame','think'],          3, 1),
  (3, 'The Room',      array['social','photo'],                      3, 2),
  (4, 'Handiwork',     array['minigame'],                            3, 2),
  (5, 'Networking',    array['social','exchange'],                   3, 2),
  (6, 'Performance',   array['perform','social','photo'],            3, 2),
  (7, 'Head Scratch',  array['think'],                               3, 3),
  (8, 'Teamwork',      array['social','exchange','photo'],           3, 3),
  (9, 'The Finale',    array['minigame','think','memory'],           3, 3)
on conflict (vault_no) do update set
  label = excluded.label, categories = excluded.categories,
  steps = excluded.steps, max_difficulty = excluded.max_difficulty;

-- ----------------------------------------------------------------------------
-- build_board refuses to repeat a family
-- ----------------------------------------------------------------------------

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record; r record; s int;
  v_used     text[] := '{}';   -- challenge ids already dealt
  v_families text[] := '{}';   -- mechanics already dealt
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
        and not (c.family = any(v_families))
        and c.category = any(v.categories)
        and c.difficulty <= v.max_difficulty
      order by random() limit v.steps
    loop
      s := s + 1;
      v_used := v_used || r.id;
      v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload->>'game'));
    end loop;

    -- Top up outside the category, still refusing repeats. A vault that comes
    -- up short can never be completed, so filling it matters more than
    -- staying on theme.
    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used))
        and not (c.family = any(v_families))
        and c.difficulty <= v.max_difficulty
      order by random() limit 1;

      -- Last resort: allow a repeated family rather than deal a short vault.
      -- Better a familiar puzzle than an unopenable safe.
      if r.id is null then
        select * into r from public.challenges c
        where c.active and not c.is_bonus
          and not (c.id = any(v_used))
          and c.difficulty <= v.max_difficulty
        order by random() limit 1;
      end if;
      exit when r.id is null;

      s := s + 1;
      v_used := v_used || r.id;
      v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload->>'game'));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1,
         public.deal_payload(c.kind, c.payload->>'game')
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Can every board actually be dealt?
-- ----------------------------------------------------------------------------
-- Counts DISTINCT FAMILIES, not challenges — the number that now decides
-- whether a vault can be filled without repeating itself.

do $$
declare v record; fam int; tot int := 0;
begin
  for v in select * from public.vault_plan order by vault_no loop
    select count(distinct family) into fam from public.challenges c
    where c.active and not c.is_bonus
      and c.category = any(v.categories)
      and c.difficulty <= v.max_difficulty;
    tot := tot + v.steps;
    if fam < v.steps then
      raise warning 'Vault % (%): wants % steps, only % distinct families available',
        v.vault_no, v.label, v.steps, fam;
    end if;
  end loop;
  raise notice 'Board is % challenges across 9 vaults.', tot;
end $$;
