-- ============================================================================
-- OPERATION VAULT — a vault must not be three of the same thing,
--                   and it must never send you to the same person twice
-- ============================================================================
-- Run after 0030_names.sql.
--
-- TWO BUGS. The second one is a hard wedge — a player who cannot continue.
--
-- ----------------------------------------------------------------------------
-- 1. THE FAMILY RULE HAS NEVER WORKED WITHIN A VAULT
-- ----------------------------------------------------------------------------
-- 0019 added `family` — "the same mechanic" — and said a board never repeats
-- one. Written like this, in 0019 and unchanged through 0022, 0023 and 0027:
--
--     for r in
--       select * from challenges c
--       where ... and not (c.family = any(v_families))
--       order by random() limit v.steps          -- <- v.steps AT ONCE
--     loop
--       v_families := v_families || r.family;    -- <- too late
--     end loop;
--
-- The SELECT is evaluated once, before the loop body runs even once. All three
-- rows for a vault come back from a single query, and that query sees
-- `v_families` as it was BEFORE the vault started. Appending inside the loop
-- cannot affect rows that have already been chosen.
--
-- So the rule only ever separated vaults from each other. WITHIN a vault it
-- was inert, which is the place it matters most: vault 1 dealing two colour
-- traps, vault 2 dealing three find-the-odd-one-out. Exactly as reported, and
-- exactly what the column was added to prevent.
--
-- Dealing one at a time fixes it, and makes room for two softer preferences
-- the batched form could not express at all: within one vault, prefer a
-- different KIND and a different CATEGORY from what is already there. Those
-- are ORDER BY terms rather than filters, so a vault always fills — it just
-- reaches for variety first. "Mix and match within the vault" is a preference
-- the dealer can now actually hold.
--
-- ----------------------------------------------------------------------------
-- 2. THE SAME PARTNER, TWICE, WITH NO WAY OUT
-- ----------------------------------------------------------------------------
-- pick_target() was called once per social assignment and knew nothing about
-- the others. Two steps on one board could therefore be dealt the SAME person
-- — and social families are per-challenge by design (0019: asking two people
-- two different things is the point), so nothing else caught it either.
--
-- Then, at play time, the two rules in request_connect close on the player:
--
--     · "already met that player"  — refuses the assigned target, because the
--                                    earlier step already met them
--     · "not your target"          — refuses everybody else
--
-- Both fire while unmet players remain, so neither yields. There is no number
-- that phone can type. Vaults are strictly sequential, so that is not an
-- annoyance — the game is over for that player.
--
-- Three fixes, because the deal-time one alone cannot help a board that has
-- already been dealt:
--
--   · pick_target_apart() takes the partners already spent on this board and
--     sorts them last, so a fresh deal spreads across the room.
--   · retarget_board() repairs a live board — a target that is null, already
--     met, or duplicated by another unsolved step gets repointed. my_board
--     calls it, so a stuck player is freed by their next refresh with no
--     reset and no host intervention.
--   · request_connect stops treating an impossible target as binding. If the
--     assigned partner has already been met, any unmet player is accepted.
--     The anti-farming rule survives untouched: you still cannot go back to
--     a friend while strangers remain.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- pick_target_apart — a partner this board has not already spent
-- ----------------------------------------------------------------------------
-- Same shape as pick_target, with one term in front: whoever this board has
-- already been pointed at sorts last.
--
-- Ordering, never filtering. A room of three cannot supply four distinct
-- partners, and returning null there would put the player back in front of
-- "ANY" with nothing that satisfies it — the failure 0023 was written to end.
-- A duplicate is a bad deal; a null is an unplayable one.
create or replace function public.pick_target_apart(
  p_session uuid,
  p_player  uuid,
  p_avoid   uuid[]
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.players p
  left join lateral (
    select count(*) as load
    from public.assignments a
    where a.target_id = p.id and a.solved_at is null
  ) l on true
  where p.session_id = p_session and p.id <> p_player
  order by
    -- Not already spent by this board. At deal time nothing has been met yet,
    -- so this is the term that actually decides.
    (p.id = any(coalesce(p_avoid, '{}'::uuid[])))::int asc,
    -- Then somebody this player has not met, exactly as before.
    (exists (
      select 1 from public.interactions i
      where i.state = 'confirmed'
        and ((i.actor_id = p_player and i.target_id = p.id)
          or (i.actor_id = p.id and i.target_id = p_player))
    ))::int asc,
    -- Then spread the load, so one popular number is not hunted by ten people.
    l.load asc,
    random()
  limit 1;
$$;

revoke execute on function public.pick_target_apart(uuid, uuid, uuid[])
  from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- build_board — one pick at a time
-- ----------------------------------------------------------------------------
create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;                              -- the vault plan row
  r record;                              -- the challenge being dealt
  s int;                                 -- step within this vault
  v_used     text[] := '{}'::text[];     -- challenge ids,  board-wide
  v_families text[] := '{}'::text[];     -- mechanics,      board-wide
  v_targets  uuid[] := '{}'::uuid[];     -- partners,       board-wide
  v_kinds    text[];                     -- kinds,      THIS vault only
  v_cats     text[];                     -- categories, THIS vault only
  v_target   uuid;
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;
    v_kinds := '{}'::text[];
    v_cats  := '{}'::text[];

    while s < v.steps loop
      /*
       * Four attempts, each dropping one constraint. The ORDER BY is the same
       * every time: never a mechanic this board has used, and among what is
       * left, prefer something this VAULT has not done yet.
       */

      -- 1. The vault's own categories, at its own difficulty band.
      select c.* into r
      from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used))
        and not (c.family = any(v_families))
        and c.category = any(v.categories)
        and c.difficulty between v.min_difficulty and v.max_difficulty
      order by (c.kind     = any(v_kinds))::int asc,
               (c.category = any(v_cats))::int  asc,
               random()
      limit 1;

      -- 2. Any category, same difficulty band.
      if r.id is null then
        select c.* into r
        from public.challenges c
        where c.active and not c.is_bonus
          and not (c.id = any(v_used))
          and not (c.family = any(v_families))
          and c.difficulty between v.min_difficulty and v.max_difficulty
        order by (c.kind     = any(v_kinds))::int asc,
                 (c.category = any(v_cats))::int  asc,
                 random()
        limit 1;
      end if;

      -- 3. Drop the floor. An easy question is better than a short vault.
      if r.id is null then
        select c.* into r
        from public.challenges c
        where c.active and not c.is_bonus
          and not (c.id = any(v_used))
          and not (c.family = any(v_families))
          and c.difficulty <= v.max_difficulty
        order by (c.kind     = any(v_kinds))::int asc,
                 (c.category = any(v_cats))::int  asc,
                 random()
        limit 1;
      end if;

      -- 4. Last resort: allow a repeated mechanic, but sort it last so it is
      --    genuinely a last resort rather than a coin toss.
      if r.id is null then
        select c.* into r
        from public.challenges c
        where c.active and not c.is_bonus
          and not (c.id = any(v_used))
          and c.difficulty <= v.max_difficulty
        order by (c.family = any(v_families))::int asc,
                 (c.kind   = any(v_kinds))::int    asc,
                 random()
        limit 1;
      end if;

      exit when r.id is null;                 -- the pool is genuinely spent

      s := s + 1;
      v_used     := v_used     || r.id;
      v_families := v_families || r.family;
      v_kinds    := v_kinds    || r.kind;
      v_cats     := v_cats     || r.category;

      v_target := null;
      if r.kind in ('connect', 'exchange', 'charades', 'duel') then
        v_target := public.pick_target_apart(p_session, p_player, v_targets);
        if v_target is not null then
          v_targets := v_targets || v_target;
        end if;
      end if;

      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s, v_target,
              public.deal_payload_for(r.kind, r.payload, p_player));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1,
         public.deal_payload_for(c.kind, c.payload, p_player)
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random()
  limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- retarget_board — repair a board that is already in play
-- ----------------------------------------------------------------------------
-- build_board only runs once, at join. Every board dealt before this migration
-- still carries whatever pick_target happened to return, and a player wedged
-- behind a duplicate partner cannot be freed by a better dealer.
--
-- This walks the social steps in play order and repoints any that cannot be
-- satisfied. It is deliberately conservative: a target that is still usable is
-- left exactly where it is, so the number on a player's screen does not move
-- around underneath them between refreshes.
create or replace function public.retarget_board(p_session uuid, p_player uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_avoid uuid[] := '{}'::uuid[];
  v_new uuid;
  v_fixed int := 0;
  v_exhausted boolean;
  v_ok boolean;
begin
  -- Once a player has met everybody, "you have already met them" stops being
  -- a reason to move a target — there is nobody left to move it to.
  v_exhausted := public.pairings_exhausted(p_session, p_player);

  for a in
    select ax.id, ax.target_id, ax.solved_at
    from public.assignments ax
    join public.challenges c on c.id = ax.challenge_id
    where ax.player_id = p_player
      and c.kind in ('connect', 'exchange', 'charades', 'duel')
    order by ax.slot, ax.step
  loop
    -- A solved step keeps its partner, and that partner is still spent: the
    -- entire failure is being sent to the same person a second time.
    if a.solved_at is not null then
      if a.target_id is not null then v_avoid := v_avoid || a.target_id; end if;
      continue;
    end if;

    v_ok := a.target_id is not null
        and not (a.target_id = any(v_avoid))
        and (v_exhausted or not exists (
              select 1 from public.interactions i
              where i.state = 'confirmed'
                and ((i.actor_id = p_player     and i.target_id = a.target_id)
                  or (i.actor_id = a.target_id  and i.target_id = p_player))));

    if v_ok then
      v_avoid := v_avoid || a.target_id;
      continue;
    end if;

    v_new := public.pick_target_apart(p_session, p_player, v_avoid);

    if v_new is not null and v_new is distinct from a.target_id then
      update public.assignments set target_id = v_new where id = a.id;
      v_fixed := v_fixed + 1;
    end if;

    -- Spent either way. In a room too small to supply distinct partners
    -- pick_target_apart hands back a duplicate rather than nothing, and
    -- request_connect's exhausted-pairings escape covers that at play time.
    if coalesce(v_new, a.target_id) is not null then
      v_avoid := v_avoid || coalesce(v_new, a.target_id);
    end if;
  end loop;

  return v_fixed;
end;
$$;

revoke execute on function public.retarget_board(uuid, uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- my_board — repair before reporting
-- ----------------------------------------------------------------------------
-- The board is fetched every few seconds by every phone, which makes it the
-- one place a repair is guaranteed to run without anybody noticing. It stops
-- being `stable` to do it, so the guard below matters: the repair costs one
-- EXISTS against an indexed column, and only pays for the walk when something
-- is genuinely broken. On a healthy board it never fires twice.
drop function if exists public.my_board(uuid);

create or replace function public.my_board(p_session uuid)
returns table (
  assignment_id uuid, slot int, step int, vault_label text,
  challenge_id text, kind text, title text, question text, hint text,
  glyph text, time_limit int, is_bonus boolean, payload jsonb,
  solved boolean, target_no int, target_name text
)
language plpgsql
security definer
set search_path = public
as $$
-- RETURNS TABLE declares `slot`, `step`, `kind`, `payload`, `title`… as
-- variables, and every one of those is also a column in the query below. Every
-- reference is alias-qualified, but say which wins rather than rely on that
-- surviving the next edit. The pragma has to precede DECLARE.
#variable_conflict use_column
declare
  v_player uuid;
  v_exhausted boolean;
begin
  v_player := public.me(p_session);
  if v_player is null then return; end if;

  v_exhausted := public.pairings_exhausted(p_session, v_player);

  if exists (
    select 1
    from public.assignments a
    join public.challenges c on c.id = a.challenge_id
    where a.player_id = v_player
      and a.solved_at is null
      and c.kind in ('connect', 'exchange', 'charades', 'duel')
      and (
        -- No partner at all: dealt while this phone was the only one in the
        -- room, which is every player who joined first.
        a.target_id is null
        -- The same partner as another step on this board.
        or exists (
          select 1 from public.assignments b
          where b.player_id = v_player and b.id <> a.id
            and b.target_id = a.target_id)
        -- Already met, while somebody new is still available. Both of the
        -- rules in request_connect refuse this, and between them they leave
        -- the player with no number they are allowed to type.
        or (not v_exhausted and exists (
          select 1 from public.interactions i
          where i.state = 'confirmed'
            and ((i.actor_id = v_player    and i.target_id = a.target_id)
              or (i.actor_id = a.target_id and i.target_id = v_player))))
      )
  ) then
    perform public.retarget_board(p_session, v_player);
  end if;

  return query
    select
      a.id, a.slot, a.step, coalesce(vp.label, ''),
      c.id, c.kind, c.title, c.question, c.hint, c.glyph,
      c.time_limit, c.is_bonus,
      -- Strip every key that IS the answer. `twin` would name the matching
      -- tile outright; `answer` would name the flashed symbol.
      ((c.payload || a.payload) - 'word_id' - 'answer' - 'twin'),
      a.solved_at is not null,
      t.vault_no, t.name
    from public.assignments a
    join public.challenges c on c.id = a.challenge_id
    left join public.players t on t.id = a.target_id
    left join public.vault_plan vp on vp.vault_no = a.slot
    where a.player_id = v_player
    order by a.slot, a.step;
end;
$$;

grant  execute on function public.my_board(uuid) to authenticated;
revoke execute on function public.my_board(uuid) from public, anon;


-- ----------------------------------------------------------------------------
-- request_connect — an impossible target is not binding
-- ----------------------------------------------------------------------------
-- The one line that turns the wedge into a shrug. Everything else about this
-- function is unchanged from 0027.
create or replace function public.request_connect(p_assignment uuid, p_target_no int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid; v_session uuid; v_target uuid; v_wanted uuid;
  v_kind text; v_phase text; v_id uuid;
begin
  select a.player_id, a.session_id, a.target_id, c.kind
    into v_player, v_session, v_wanted, v_kind
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;

  select phase into v_phase from public.sessions where id = v_session;
  if v_phase <> 'live' then raise exception 'session is not live'; end if;

  select id into v_target from public.players
  where session_id = v_session and vault_no = p_target_no;

  if v_target is null then raise exception 'no player with that number in this room'; end if;
  if v_target = v_player then raise exception 'that is you'; end if;

  -- Anti-farming, unchanged: no going back to a friend while strangers remain.
  if exists (
    select 1 from public.interactions i
    where i.state = 'confirmed'
      and ((i.actor_id = v_player and i.target_id = v_target)
        or (i.actor_id = v_target and i.target_id = v_player))
  ) and not public.pairings_exhausted(v_session, v_player) then
    raise exception 'already met that player';
  end if;

  -- The assigned target binds only while it is POSSIBLE. If this player has
  -- already met the person they were sent to, the rule above has permanently
  -- refused that number — so insisting on it here refuses every number, and
  -- the player can never open the vault. Let them find somebody new instead.
  if v_wanted is not null
     and v_target <> v_wanted
     and not public.pairings_exhausted(v_session, v_player)
     and not exists (
       select 1 from public.interactions i
       where i.state = 'confirmed'
         and ((i.actor_id = v_player and i.target_id = v_wanted)
           or (i.actor_id = v_wanted and i.target_id = v_player)))
  then
    raise exception 'not your target';
  end if;

  update public.interactions set state = 'expired'
  where actor_id = v_player and state = 'pending';

  insert into public.interactions (session_id, assignment_id, actor_id, target_id, kind)
  values (v_session, p_assignment, v_player, v_target,
          case v_kind when 'exchange' then 'exchange'
                      when 'duel'     then 'duel'
                      else 'connect' end)
  returning id into v_id;

  return jsonb_build_object('interaction_id', v_id, 'target_id', v_target);
end;
$$;

revoke execute on function public.request_connect(uuid, int) from public, anon;
grant  execute on function public.request_connect(uuid, int) to authenticated;


-- ----------------------------------------------------------------------------
-- A small nudge to the curve
-- ----------------------------------------------------------------------------
-- Vaults 1 and 2 are the tutorial and stay there. Vault 3 is the first real
-- one and was still allowed to draw tutorial-tier questions — a one-tap answer
-- three vaults in reads as the game not having started yet. Raising the floor
-- costs nothing: the dealer widens on its own if a band runs dry.
update public.vault_plan set min_difficulty = 2 where vault_no in (3, 4);


-- ----------------------------------------------------------------------------
-- Check it
-- ----------------------------------------------------------------------------
-- Deal ten throwaway boards and count the vaults that repeat a mechanic. The
-- old dealer scored several every time; this one should score zero.
--
--   select a.slot, count(*) - count(distinct c.family) as repeats
--   from public.assignments a join public.challenges c on c.id = a.challenge_id
--   where a.slot > 0 group by a.player_id, a.slot having count(*) > count(distinct c.family);
--
-- And the partners, which must be distinct per board while the room can
-- supply them:
--
--   select a.player_id, a.target_id, count(*) from public.assignments a
--   where a.target_id is not null group by 1, 2 having count(*) > 1;
