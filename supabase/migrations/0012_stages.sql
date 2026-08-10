-- ============================================================================
-- OPERATION VAULT — a vault is a stage, not a question
-- ============================================================================
-- Run after 0011_more_games.sql. THIS IS THE ONE YOU CAN SKIP.
--
-- Everything before this migration works standalone. If you run out of testing
-- time, do not run this file and the game stays as it is: nine vaults, one
-- challenge each. Nothing else depends on it.
--
-- What it changes, and why:
--
-- Design Bible §15 describes each vault as a themed stage — "Vault 3:
-- Information Exchange", "Vault 6: Collaborative Chain" — with micro-challenge
-- counts to be tuned. I built one question per vault, which makes a full run
-- nine taps long and gives no vault a character of its own.
--
-- Here a vault is 2-3 challenges drawn from ONE category, and the vault opens
-- only when all of them are done. Vault 3 is now genuinely "the networking
-- one" rather than a numbered question.
--
-- COMPATIBILITY: `step` defaults to 1, and a vault with a single step behaves
-- exactly as it did before. Boards dealt under the old scheme keep working.
-- ============================================================================

alter table public.assignments
  add column if not exists step int not null default 1;

-- The old constraint allowed one row per (player, slot). A stage needs several.
alter table public.assignments drop constraint if exists assignments_player_id_slot_key;
create unique index if not exists assignments_player_slot_step
  on public.assignments (player_id, slot, step);

-- ----------------------------------------------------------------------------
-- The plan
-- ----------------------------------------------------------------------------
-- One row per vault, naming the categories it draws from and how many. Editable
-- without touching a function — if vault 6 turns out to be a bottleneck on the
-- day, change `steps` to 2 and re-deal.
--
-- The shape follows §15's pacing: gentle and solo at the start, heaviest social
-- load in the middle, a mix at the end. Vault 1 is deliberately ONE step and
-- non-social — the first thing a nervous first-year meets should be winnable
-- alone, in ten seconds, sitting down.

create table if not exists public.vault_plan (
  vault_no   int primary key check (vault_no between 1 and 9),
  label      text not null,
  categories text[] not null,
  steps      int not null default 2
);

insert into public.vault_plan (vault_no, label, categories, steps) values
  (1, 'Warm Up',       array['observe','think'],                 1),
  (2, 'Eyes Open',     array['observe','minigame'],              2),
  (3, 'The Room',      array['social','photo'],                  2),
  (4, 'Handiwork',     array['minigame'],                        2),
  (5, 'Networking',    array['social','exchange'],               2),
  (6, 'Performance',   array['perform','social'],                2),
  (7, 'Head Scratch',  array['think'],                           3),
  (8, 'Teamwork',      array['exchange','social','perform'],      2),
  (9, 'The Finale',    array['minigame','think','memory'],       3)
on conflict (vault_no) do update set
  label = excluded.label, categories = excluded.categories, steps = excluded.steps;

-- ----------------------------------------------------------------------------
-- build_board, staged
-- ----------------------------------------------------------------------------
-- Deals each vault from its own category pool, never repeating a challenge
-- across the whole board.
--
-- The fallback matters: if a category runs dry (say only four `perform`
-- challenges exist and three vaults want them), the vault tops up from
-- anywhere rather than dealing a short stage. A vault with a missing step can
-- never be completed, which would strand the player permanently.

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

    -- Top up from anywhere if the category could not fill the stage.
    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus and not (c.id = any(v_used))
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

  -- The bonus, still a single challenge off the board at slot 0.
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
-- my_board gains step + the vault's label
-- ----------------------------------------------------------------------------

drop function if exists public.my_board(uuid);

create or replace function public.my_board(p_session uuid)
returns table (
  assignment_id uuid, slot int, step int, vault_label text,
  challenge_id text, kind text, title text, question text, hint text,
  glyph text, time_limit int, is_bonus boolean, payload jsonb,
  solved boolean, target_no int, target_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.slot, a.step, coalesce(vp.label, ''),
    c.id, c.kind, c.title, c.question, c.hint, c.glyph,
    c.time_limit, c.is_bonus,
    c.payload || a.payload,
    a.solved_at is not null,
    t.vault_no, t.name
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  left join public.players t on t.id = a.target_id
  left join public.vault_plan vp on vp.vault_no = a.slot
  where a.player_id = public.me(p_session)
  order by a.slot, a.step;
$$;

grant execute on function public.my_board(uuid) to authenticated;
revoke execute on function public.my_board(uuid) from public, anon;

-- ----------------------------------------------------------------------------
-- Scoring: a vault counts when ALL of its steps are done
-- ----------------------------------------------------------------------------
-- This is the part that would silently inflate every score if it were missed —
-- the old view counted solved ASSIGNMENTS, and there are now two or three per
-- vault. A player who finished two steps of vault 7 would have read as having
-- opened two vaults.

create or replace view public.player_scores as
with per_vault as (
  select
    a.player_id,
    a.slot,
    count(*)                                      as steps,
    count(*) filter (where a.solved_at is not null) as done,
    max(a.solved_at)                              as finished
  from public.assignments a
  group by a.player_id, a.slot
)
select
  p.id,
  p.session_id,
  p.name,
  p.vault_no,
  p.avatar_url,
  count(*) filter (where v.slot > 0 and v.done = v.steps)               as vaults,
  count(*) filter (where v.slot = 0 and v.done = v.steps)               as bonus,
  count(*) filter (where v.slot > 0 and v.done = v.steps)
    + count(*) filter (where v.slot = 0 and v.done = v.steps) * 0.5     as effective,
  coalesce(
    extract(epoch from (max(v.finished) filter (where v.done = v.steps) - s.started_at))::int,
    999999
  ) as elapsed
from public.players p
join public.sessions s on s.id = p.session_id
left join per_vault v on v.player_id = p.id
group by p.id, p.session_id, p.name, p.vault_no, p.avatar_url, s.started_at;

-- submit_answer's returned counts must agree with the view, or the success
-- screen and the leaderboard will disagree in front of the player.
create or replace function public.vault_counts(p_player uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with per_vault as (
    select a.slot, count(*) as steps,
           count(*) filter (where a.solved_at is not null) as done
    from public.assignments a where a.player_id = p_player group by a.slot
  )
  select jsonb_build_object(
    'vaults', (select count(*) from per_vault where slot > 0 and done = steps),
    'bonus',  (select count(*) from per_vault where slot = 0 and done = steps));
$$;

revoke execute on function public.vault_counts(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- submit_answer reports vault counts, not assignment counts
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
    when 'observe' then
      p_answer->>'option' = v_answer->>'option'
      and coalesce((p_answer->>'ms')::int, 0) >= coalesce((v_answer->>'min_ms')::int, 120)
    when 'minigame' then
      case when v_payload->>'game' = 'wordbuild' then
        exists (select 1 from public.words w
                where w.w = lower(trim(coalesce(p_answer->>'word',''))))
        and length(coalesce(p_answer->>'word','')) >= 4
        and public.buildable(coalesce(p_answer->>'letters',''), coalesce(p_answer->>'word',''))
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

  -- Completed VAULTS, matching public.player_scores. Counting solved
  -- assignments here would tell the success screen a number the leaderboard
  -- disagrees with, in front of the player, every time.
  v_counts := public.vault_counts(v_player);

  return jsonb_build_object(
    'correct', v_correct, 'solved', v_correct,
    'vaults', v_counts->'vaults', 'bonus', v_counts->'bonus');
end;
$$;

grant execute on function public.submit_answer(uuid, jsonb) to authenticated;
revoke execute on function public.submit_answer(uuid, jsonb) from public, anon;
