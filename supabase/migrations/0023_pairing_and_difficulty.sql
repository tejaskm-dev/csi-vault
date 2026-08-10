-- ============================================================================
-- OPERATION VAULT — the pairing graph, and a difficulty floor
-- ============================================================================
-- Run after 0022_assets_and_variety.sql.
--
-- THE DEADLOCK.
--
-- Social challenges refuse a partner you have already met. With N players in
-- the room and K social challenges on a board, every player needs K DISTINCT
-- partners — and the complete graph on N vertices gives each vertex degree
-- N-1. So the whole thing only works while
--
--     K <= N - 1
--
-- Test with three screens and K is 2: the third social challenge cannot be
-- satisfied by anybody, pick_target returns null, and request_connect rejects
-- every number typed into it. Since 0019 made vaults strictly sequential, that
-- is not an annoyance — it is a player who can never progress again.
--
-- It is not only the small-room case. Even with K <= N-1 the greedy assignment
-- can strand someone: everyone still available to them is someone they have
-- already met, while unmet pairs exist elsewhere in the room. A perfect
-- matching exists but the order of play did not find it.
--
-- Rather than model the graph, the rule becomes: refuse repeats WHILE there is
-- anyone new, and stop refusing once there is not. Anti-farming survives —
-- you cannot re-pair with a friend while strangers remain — and the game
-- cannot wedge.
-- ============================================================================

/**
 * Has this player met everyone available to them?
 *
 * Compares distinct confirmed partners against everyone else in the room. The
 * moment those are equal there is nobody new left, and insisting on a new
 * partner would be insisting on the impossible.
 */
create or replace function public.pairings_exhausted(p_session uuid, p_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*) from public.players p
    where p.session_id = p_session and p.id <> p_player
  ) <= (
    select count(distinct case when i.actor_id = p_player then i.target_id else i.actor_id end)
    from public.interactions i
    where i.session_id = p_session and i.state = 'confirmed'
      and (i.actor_id = p_player or i.target_id = p_player)
  );
$$;

-- pick_target: prefer someone new, but never return null while the room has
-- anyone else in it. A null target used to leave the player staring at "ANY"
-- with no way to satisfy it.
create or replace function public.pick_target(p_session uuid, p_player uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.players p
  left join lateral (
    select count(*) as load from public.assignments a
    where a.target_id = p.id and a.solved_at is null
  ) l on true
  where p.session_id = p_session and p.id <> p_player
  order by
    -- Unmet players first, then least-loaded, then random. Ordering rather
    -- than filtering is the fix: a met player is a last resort, not excluded.
    (exists (
      select 1 from public.interactions i
      where i.state = 'confirmed'
        and ((i.actor_id = p_player and i.target_id = p.id)
          or (i.actor_id = p.id and i.target_id = p_player))
    ))::int asc,
    l.load asc,
    random()
  limit 1;
$$;

revoke execute on function public.pick_target(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.pairings_exhausted(uuid, uuid) from public, anon;
grant execute on function public.pairings_exhausted(uuid, uuid) to authenticated;

-- request_connect: the already-met rule now yields when there is nobody new.
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

  -- Repeats are refused only while somebody new exists. In a room too small
  -- to satisfy the board — or for a player who has genuinely met everyone —
  -- the rule would otherwise make the vault unopenable.
  if exists (
    select 1 from public.interactions i
    where i.state = 'confirmed'
      and ((i.actor_id = v_player and i.target_id = v_target)
        or (i.actor_id = v_target and i.target_id = v_player))
  ) and not public.pairings_exhausted(v_session, v_player) then
    raise exception 'already met that player';
  end if;

  -- Likewise the assigned target is only binding while alternatives exist.
  if v_wanted is not null and v_target <> v_wanted
     and not public.pairings_exhausted(v_session, v_player) then
    raise exception 'not your target';
  end if;

  update public.interactions set state = 'expired'
  where actor_id = v_player and state = 'pending';

  insert into public.interactions (session_id, assignment_id, actor_id, target_id, kind)
  values (v_session, p_assignment, v_player, v_target,
          case when v_kind = 'exchange' then 'exchange' else 'connect' end)
  returning id into v_id;

  return jsonb_build_object('interaction_id', v_id, 'target_id', v_target);
end;
$$;

revoke execute on function public.request_connect(uuid, int) from public, anon;
grant execute on function public.request_connect(uuid, int) to authenticated;

-- The one-confirmed-pair-per-room unique index would still block the retry, so
-- it becomes a count rather than a hard uniqueness rule.
drop index if exists public.interactions_no_pair_farming;

create index if not exists interactions_pair_lookup
  on public.interactions (
    session_id,
    least(actor_id::text, greatest(actor_id::text, target_id::text)),
    state
  );

-- ============================================================================
-- DIFFICULTY FLOOR
-- ============================================================================
-- max_difficulty stopped vault 1 serving a logic puzzle. Nothing stopped vault
-- 9 serving a tutorial tap — and with the pool now much larger and weighted
-- toward easy observe variants, the late vaults were increasingly likely to
-- draw one. A floor keeps the curve pointing upward.

alter table public.vault_plan
  add column if not exists min_difficulty int not null default 1;

update public.vault_plan set min_difficulty = 1 where vault_no <= 4;
update public.vault_plan set min_difficulty = 2 where vault_no in (5, 6, 7);
update public.vault_plan set min_difficulty = 2 where vault_no = 8;
update public.vault_plan set min_difficulty = 3 where vault_no = 9;

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record; r record; s int;
  v_used text[] := '{}'; v_families text[] := '{}';
begin
  if exists (select 1 from public.assignments where player_id = p_player) then
    return;
  end if;

  for v in select * from public.vault_plan order by vault_no loop
    s := 0;
    for r in
      select * from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used)) and not (c.family = any(v_families))
        and c.category = any(v.categories)
        and c.difficulty between v.min_difficulty and v.max_difficulty
      order by random() limit v.steps
    loop
      s := s + 1; v_used := v_used || r.id; v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload));
    end loop;

    -- Widening order matters: drop the CATEGORY first, then the floor, and
    -- only then allow a repeated family. A vault that comes up short can never
    -- be completed, so filling it always wins — but it should give up its
    -- theme before it gives up its difficulty.
    while s < v.steps loop
      select * into r from public.challenges c
      where c.active and not c.is_bonus
        and not (c.id = any(v_used)) and not (c.family = any(v_families))
        and c.difficulty between v.min_difficulty and v.max_difficulty
      order by random() limit 1;

      if r.id is null then
        select * into r from public.challenges c
        where c.active and not c.is_bonus
          and not (c.id = any(v_used)) and not (c.family = any(v_families))
          and c.difficulty <= v.max_difficulty
        order by random() limit 1;
      end if;

      if r.id is null then
        select * into r from public.challenges c
        where c.active and not c.is_bonus and not (c.id = any(v_used))
          and c.difficulty <= v.max_difficulty
        order by random() limit 1;
      end if;
      exit when r.id is null;

      s := s + 1; v_used := v_used || r.id; v_families := v_families || r.family;
      insert into public.assignments
        (session_id, player_id, challenge_id, slot, step, target_id, payload)
      values (p_session, p_player, r.id, v.vault_no, s,
              case when r.kind in ('connect','exchange','charades')
                   then public.pick_target(p_session, p_player) end,
              public.deal_payload(r.kind, r.payload));
    end loop;
  end loop;

  insert into public.assignments (session_id, player_id, challenge_id, slot, step, payload)
  select p_session, p_player, c.id, 0, 1, public.deal_payload(c.kind, c.payload)
  from public.challenges c
  where c.active and c.is_bonus and not (c.id = any(v_used))
  order by random() limit 1;
end;
$$;

revoke execute on function public.build_board(uuid, uuid) from public, anon, authenticated;
-- 34 parametric challenges
insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('ct_red_blue','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"RED","ink":"blue","choices":["red","blue","green","yellow"]}'),
('ct_red_green','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"RED","ink":"green","choices":["red","blue","green","yellow"]}'),
('ct_red_yellow','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"RED","ink":"yellow","choices":["red","blue","green","yellow"]}'),
('ct_blue_red','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"BLUE","ink":"red","choices":["red","blue","green","yellow"]}'),
('ct_blue_green','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"BLUE","ink":"green","choices":["red","blue","green","yellow"]}'),
('ct_blue_yellow','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,1,
 '{"mode":"colour_trap","word":"BLUE","ink":"yellow","choices":["red","blue","green","yellow"]}'),
('ct_green_red','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"GREEN","ink":"red","choices":["red","blue","green","yellow"]}'),
('ct_green_blue','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"GREEN","ink":"blue","choices":["red","blue","green","yellow"]}'),
('ct_green_yellow','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"GREEN","ink":"yellow","choices":["red","blue","green","yellow"]}'),
('ct_yellow_red','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"YELLOW","ink":"red","choices":["red","blue","green","yellow"]}'),
('ct_yellow_blue','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"YELLOW","ink":"blue","choices":["red","blue","green","yellow"]}'),
('ct_yellow_green','observe','observe','colour_trap','Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your eyes read the word first. Overrule them.','flame',25,2,
 '{"mode":"colour_trap","word":"YELLOW","ink":"green","choices":["red","blue","green","yellow"]}'),
('imp_apple_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"apple","count":16,"variant":"rotate","strength":1}'),
('imp_banana_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"banana","count":25,"variant":"size","strength":2}'),
('imp_box_flip','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"box","count":36,"variant":"flip","strength":2}'),
('imp_bubble_tint','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"bubble","count":16,"variant":"tint","strength":3}'),
('imp_camera_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"camera","count":25,"variant":"rotate","strength":1}'),
('imp_circle_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"circle","count":36,"variant":"size","strength":2}'),
('imp_code_flip','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"code","count":16,"variant":"flip","strength":2}'),
('imp_dice_tint','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"dice","count":25,"variant":"tint","strength":3}'),
('imp_dog_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"dog","count":36,"variant":"rotate","strength":1}'),
('imp_flame_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"flame","count":16,"variant":"size","strength":2}'),
('imp_grapes_flip','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"grapes","count":25,"variant":"flip","strength":2}'),
('imp_headphones_tint','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"headphones","count":36,"variant":"tint","strength":3}'),
('imp_key_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"key","count":16,"variant":"rotate","strength":1}'),
('imp_mountain_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"mountain","count":25,"variant":"size","strength":2}'),
('imp_orange_flip','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"orange","count":36,"variant":"flip","strength":2}'),
('imp_penguin_tint','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"penguin","count":16,"variant":"tint","strength":3}'),
('imp_rocket_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"rocket","count":25,"variant":"rotate","strength":1}'),
('imp_search_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"search","count":36,"variant":"size","strength":2}'),
('imp_shield_flip','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is mirrored. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"shield","count":16,"variant":"flip","strength":2}'),
('imp_star_tint','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a slightly different shade. Sweep row by row.',
 'search',54,3,
 '{"mode":"impostor","fill":"star","count":25,"variant":"tint","strength":3}'),
('imp_terminal_rotate','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is turned. Sweep row by row.',
 'search',38,1,
 '{"mode":"impostor","fill":"terminal","count":36,"variant":"rotate","strength":1}'),
('imp_wave_size','observe','observe','impostor','Find The Impostor',
 'Every tile is the same. One of them has been tampered with — tap it.',
 'One is a little smaller. Sweep row by row.',
 'search',46,2,
 '{"mode":"impostor","fill":"wave","count":16,"variant":"size","strength":2}')
on conflict (id) do update set
  title = excluded.title, question = excluded.question, hint = excluded.hint,
  glyph = excluded.glyph, time_limit = excluded.time_limit,
  difficulty = excluded.difficulty, payload = excluded.payload;

insert into public.challenge_answers (challenge_id, answer) values
('ct_red_blue','{"option":"blue"}'),
('ct_red_green','{"option":"green"}'),
('ct_red_yellow','{"option":"yellow"}'),
('ct_blue_red','{"option":"red"}'),
('ct_blue_green','{"option":"green"}'),
('ct_blue_yellow','{"option":"yellow"}'),
('ct_green_red','{"option":"red"}'),
('ct_green_blue','{"option":"blue"}'),
('ct_green_yellow','{"option":"yellow"}'),
('ct_yellow_red','{"option":"red"}'),
('ct_yellow_blue','{"option":"blue"}'),
('ct_yellow_green','{"option":"green"}'),
('imp_apple_rotate','{"option":"0"}'),
('imp_banana_size','{"option":"0"}'),
('imp_box_flip','{"option":"0"}'),
('imp_bubble_tint','{"option":"0"}'),
('imp_camera_rotate','{"option":"0"}'),
('imp_circle_size','{"option":"0"}'),
('imp_code_flip','{"option":"0"}'),
('imp_dice_tint','{"option":"0"}'),
('imp_dog_rotate','{"option":"0"}'),
('imp_flame_size','{"option":"0"}'),
('imp_grapes_flip','{"option":"0"}'),
('imp_headphones_tint','{"option":"0"}'),
('imp_key_rotate','{"option":"0"}'),
('imp_mountain_size','{"option":"0"}'),
('imp_orange_flip','{"option":"0"}'),
('imp_penguin_tint','{"option":"0"}'),
('imp_rocket_rotate','{"option":"0"}'),
('imp_search_size','{"option":"0"}'),
('imp_shield_flip','{"option":"0"}'),
('imp_star_tint','{"option":"0"}'),
('imp_terminal_rotate','{"option":"0"}'),
('imp_wave_size','{"option":"0"}')
on conflict (challenge_id) do update set answer = excluded.answer;
-- 20 reasoning questions
insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('t_windows','mcq','think','t_windows','Counting Windows',
 'A building has 4 floors. Each floor has 6 windows on the front and 6 on the back. How many windows in total?','Front and back, then multiply by floors.','box',60,1,
 '{"options":[{"id":"a","label":"48","glyph":"box"},{"id":"b","label":"24","glyph":"circle"},{"id":"c","label":"12","glyph":"star"},{"id":"d","label":"96","glyph":"shield"}]}'),
('t_pencils','mcq','think','t_pencils','Sharing Out',
 'You have 12 pencils and want to give an equal number to 5 people, keeping the leftovers. How many do you keep?','12 does not divide by 5 evenly.','key',60,1,
 '{"options":[{"id":"a","label":"Two","glyph":"key"},{"id":"b","label":"One","glyph":"circle"},{"id":"c","label":"Three","glyph":"box"},{"id":"d","label":"None","glyph":"star"}]}'),
('t_older','mcq','think','t_older','Ages',
 'Ravi is twice as old as Sam. Together they are 27. How old is Sam?','One part plus two parts is three parts.','bubble',75,2,
 '{"options":[{"id":"a","label":"Nine","glyph":"bubble"},{"id":"b","label":"Thirteen","glyph":"circle"},{"id":"c","label":"Eighteen","glyph":"box"},{"id":"d","label":"Twelve","glyph":"star"}]}'),
('t_train','mcq','think','t_train','Passing Trains',
 'A train leaves at 2pm going 60km/h. Another leaves the same place at 3pm going 90km/h, same direction. At what time does the second catch the first?','The first is 60km ahead when the second starts.','rocket',90,3,
 '{"options":[{"id":"a","label":"5pm","glyph":"rocket"},{"id":"b","label":"4pm","glyph":"circle"},{"id":"c","label":"6pm","glyph":"box"},{"id":"d","label":"Never","glyph":"shield"}]}'),
('t_water','mcq','think','t_water','Two Jugs',
 'You have a 3-litre and a 5-litre jug and need exactly 4 litres. What is the first pour?','Fill the big one and pour off into the small one.','wave',90,3,
 '{"options":[{"id":"a","label":"Fill the 5 and pour into the 3","glyph":"wave"},{"id":"b","label":"Fill the 3 twice","glyph":"circle"},{"id":"c","label":"Half-fill the 5","glyph":"box"},{"id":"d","label":"It cannot be done","glyph":"shield"}]}'),
('t_gloves','mcq','think','t_gloves','In the Dark',
 'A bag holds 6 red and 6 blue marbles. Without looking, how many must you take out to be certain you have two of the SAME colour?','Two might be one of each. What is the next one?','dice',75,2,
 '{"options":[{"id":"a","label":"Three","glyph":"dice"},{"id":"b","label":"Two","glyph":"circle"},{"id":"c","label":"Seven","glyph":"box"},{"id":"d","label":"Six","glyph":"star"}]}'),
('t_cake','mcq','think','t_cake','One Cut',
 'What is the fewest straight cuts to divide a round cake into 8 equal pieces, if you may stack pieces?','You are allowed to stack.','circle',90,3,
 '{"options":[{"id":"a","label":"Three","glyph":"circle"},{"id":"b","label":"Four","glyph":"box"},{"id":"c","label":"Seven","glyph":"star"},{"id":"d","label":"Eight","glyph":"shield"}]}'),
('t_shadow','mcq','think','t_shadow','Noon',
 'At what time of day is your shadow shortest?','When the sun is highest.','star',60,1,
 '{"options":[{"id":"a","label":"Midday","glyph":"star"},{"id":"b","label":"Sunrise","glyph":"circle"},{"id":"c","label":"Sunset","glyph":"box"},{"id":"d","label":"Midnight","glyph":"shield"}]}'),
('t_letters2','mcq','think','t_letters2','Missing Piece',
 'B, D, F, H, ... what comes next?','Every other letter of the alphabet.','code',60,1,
 '{"options":[{"id":"a","label":"J","glyph":"code"},{"id":"b","label":"I","glyph":"circle"},{"id":"c","label":"K","glyph":"box"},{"id":"d","label":"G","glyph":"star"}]}'),
('t_double','mcq','think','t_double','Doubling',
 'A pond weed doubles daily and fills the pond in 30 days. Two weeds are planted instead of one. How long now?','Starting with two is starting a day later.','wave',90,3,
 '{"options":[{"id":"a","label":"29 days","glyph":"wave"},{"id":"b","label":"15 days","glyph":"circle"},{"id":"c","label":"28 days","glyph":"box"},{"id":"d","label":"30 days","glyph":"star"}]}'),
('t_coins2','mcq','think','t_coins2','Two Coins',
 'Two coins add up to 30 rupees. One of them is not a 20. What are they?','Read it again — ONE of them is not.','key',75,2,
 '{"options":[{"id":"a","label":"A 20 and a 10","glyph":"key"},{"id":"b","label":"Two 15s","glyph":"circle"},{"id":"c","label":"A 25 and a 5","glyph":"box"},{"id":"d","label":"Impossible","glyph":"shield"}]}'),
('t_family','mcq','think','t_family','Brothers',
 'A man says: brothers and sisters have I none, but that man''''s father is my father''''s son. Who is he pointing at?','My father''''s son, with no brothers, is me.','bubble',90,3,
 '{"options":[{"id":"a","label":"His son","glyph":"bubble"},{"id":"b","label":"His father","glyph":"circle"},{"id":"c","label":"Himself","glyph":"box"},{"id":"d","label":"His nephew","glyph":"star"}]}'),
('t_floors','mcq','think','t_floors','The Lift Again',
 'You are on floor 1. You go up 5, down 2, up 7, down 3. Which floor?','Add and subtract in order.','mountain',60,1,
 '{"options":[{"id":"a","label":"Eight","glyph":"mountain"},{"id":"b","label":"Seven","glyph":"circle"},{"id":"c","label":"Nine","glyph":"box"},{"id":"d","label":"Six","glyph":"star"}]}'),
('t_month2','mcq','think','t_month2','Thirty Days',
 'How many months have exactly 30 days?','Not 28, not 31.','star',75,2,
 '{"options":[{"id":"a","label":"Four","glyph":"star"},{"id":"b","label":"Eleven","glyph":"circle"},{"id":"c","label":"Seven","glyph":"box"},{"id":"d","label":"Twelve","glyph":"shield"}]}'),
('t_race2','mcq','think','t_race2','Last Place',
 'In a race you overtake the person in LAST place. What position are you in?','You cannot be behind the last person.','rocket',75,2,
 '{"options":[{"id":"a","label":"Impossible — you were already last","glyph":"rocket"},{"id":"b","label":"Last","glyph":"circle"},{"id":"c","label":"Second to last","glyph":"box"},{"id":"d","label":"First","glyph":"star"}]}'),
('t_socks2','mcq','think','t_socks2','Odd Socks',
 'You have 10 pairs of socks, all identical, loose in a drawer. How many single socks must you grab to be sure of one pair?','They are all identical.','box',60,1,
 '{"options":[{"id":"a","label":"Two","glyph":"box"},{"id":"b","label":"Eleven","glyph":"circle"},{"id":"c","label":"Ten","glyph":"star"},{"id":"d","label":"Three","glyph":"shield"}]}'),
('t_ducks','mcq','think','t_ducks','In a Row',
 'Two ducks in front of a duck, two ducks behind a duck, one duck in the middle. How many ducks?','Try drawing three in a line.','penguin',75,2,
 '{"options":[{"id":"a","label":"Three","glyph":"penguin"},{"id":"b","label":"Five","glyph":"circle"},{"id":"c","label":"Seven","glyph":"box"},{"id":"d","label":"Six","glyph":"star"}]}'),
('t_matches','mcq','think','t_matches','Triangles',
 'With 6 matchsticks of equal length, what is the most equilateral triangles you can make?','Stop thinking flat.','flame',90,3,
 '{"options":[{"id":"a","label":"Four — build a pyramid","glyph":"flame"},{"id":"b","label":"Two","glyph":"circle"},{"id":"c","label":"One","glyph":"box"},{"id":"d","label":"Three","glyph":"star"}]}'),
('t_wordlong','mcq','think','t_wordlong','Long Way Round',
 'Which of these is spelled with the most letters?','Count them, do not guess.','code',60,1,
 '{"options":[{"id":"a","label":"MOUNTAIN","glyph":"mountain"},{"id":"b","label":"ORANGE","glyph":"orange"},{"id":"c","label":"ROCKET","glyph":"rocket"},{"id":"d","label":"APPLE","glyph":"apple"}]}'),
('t_half','mcq','think','t_half','Half of Eight',
 'What is half of eight, if you are allowed to cut the numeral rather than the number?','Cut the digit 8 across the middle.','dice',75,2,
 '{"options":[{"id":"a","label":"Zero or three","glyph":"dice"},{"id":"b","label":"Four","glyph":"circle"},{"id":"c","label":"Two","glyph":"box"},{"id":"d","label":"Sixteen","glyph":"star"}]}')
on conflict (id) do update set
  title = excluded.title, question = excluded.question, hint = excluded.hint,
  glyph = excluded.glyph, time_limit = excluded.time_limit,
  difficulty = excluded.difficulty, payload = excluded.payload;

insert into public.challenge_answers (challenge_id, answer) values
('t_windows','{"option":"a"}'),
('t_pencils','{"option":"a"}'),
('t_older','{"option":"a"}'),
('t_train','{"option":"a"}'),
('t_water','{"option":"a"}'),
('t_gloves','{"option":"a"}'),
('t_cake','{"option":"a"}'),
('t_shadow','{"option":"a"}'),
('t_letters2','{"option":"a"}'),
('t_double','{"option":"a"}'),
('t_coins2','{"option":"a"}'),
('t_family','{"option":"a"}'),
('t_floors','{"option":"a"}'),
('t_month2','{"option":"a"}'),
('t_race2','{"option":"a"}'),
('t_socks2','{"option":"a"}'),
('t_ducks','{"option":"a"}'),
('t_matches','{"option":"a"}'),
('t_wordlong','{"option":"a"}'),
('t_half','{"option":"a"}')
on conflict (challenge_id) do update set answer = excluded.answer;
-- anagram words
insert into public.anagram_words (id, word, alts, level) values
('ocean','OCEAN',array['CANOE'],1),
('north','NORTH',array['THORN'],1),
('stream','STREAM',array['MASTER','TAMERS'],2),
('thing','THING',array['NIGHT'],1),
('saved','SAVED',array['VADES'],1),
('cause','CAUSE',array['SAUCE'],1),
('latest','LATEST',array['TALEST','SLATE'],2),
('signal','SIGNAL',array['ALIGNS','LASING'],2),
('rescued','RESCUED',array['SECURED','REDUCES'],2),
('marine','MARINE',array['REMAIN','AIRMEN'],2),
('danger2','GARDEN',array['DANGER','RANGED'],2),
('listen2','SILENT',array['LISTEN','TINSEL'],2),
('parties','PARTIES',array['PIRATES','TRAIPSE'],2),
('earnest','EARNEST',array['NEAREST','EASTERN'],2),
('diaper','DIAPER',array['REPAID','PAIRED'],2),
('lemons','LEMONS',array['MELONS','SOLEMN'],2),
('staple','STAPLE',array['PLATES','PASTEL','PLEATS'],2),
('carets','CARETS',array['CRATES','TRACES','REACTS'],2),
('dusty','DUSTY',array['STUDY'],1),
('these','THESE',array['SHEET'],1),
('angered','ANGERED',array['ENRAGED','GRENADE'],2),
('notes2','ONSET',array['NOTES','STONE','TONES'],1),
('reset','RESET',array['STEER','TERSE','TREES'],1),
('salt','SALT',array['LAST','SLAT'],1),
('care','CARE',array['RACE','ACRE'],1),
('west','WEST',array['STEW','WETS'],1),
('form','FORM',array['FROM'],1),
('item','ITEM',array['TIME','EMIT','MITE'],1),
('star2','STAR',array['RATS','ARTS','TARS'],1),
('dear','DEAR',array['READ','DARE'],1),
('evil','EVIL',array['VILE','LIVE','VEIL'],1),
('snap','SNAP',array['SPAN','PANS','NAPS'],1),
('silver2','SLIVER',array['SILVER','LIVERS'],2),
('throne','THRONE',array['HORNET'],2),
('cellar','CELLAR',array['RECALL','CALLER'],2)
on conflict (id) do update set word=excluded.word, alts=excluded.alts, level=excluded.level;

-- charade words
insert into public.charade_words (id, word, decoys, level) values
('cooking','Cooking a meal',array['Washing dishes','Setting a table','Shopping'],2),
('fishing','Fishing',array['Rowing','Swimming','Sailing'],2),
('typing','Typing fast',array['Playing piano','Waving','Counting money'],2),
('climbing','Climbing a ladder',array['Climbing stairs','Doing pull-ups','Reaching a shelf'],2),
('camera2','Taking a group photo',array['Filming','Painting','Presenting'],2),
('headache','Having a headache',array['Being sleepy','Being cold','Thinking hard'],2),
('sneeze','Sneezing',array['Coughing','Laughing','Yawning'],2),
('heavy','Carrying something heavy',array['Pushing a door','Pulling a rope','Lifting a child'],2),
('cold','Freezing cold',array['Very hot','Scared','Excited'],2),
('late','Realising you are late',array['Losing something','Remembering something','Winning'],2),
('queue2','Being stuck in traffic',array['Waiting for a lift','Standing in line','Riding a bus'],2),
('study','Studying the night before',array['Reading for fun','Writing a letter','Drawing'],2),
('dog2','Walking a dog',array['Riding a horse','Carrying bags','Pushing a pram'],2),
('selfie2','Failing to take a selfie',array['Dropping a phone','Texting','Video calling'],2),
('guitar2','Playing drums',array['Playing guitar','Conducting','Dancing'],2),
('ghost','Being a ghost',array['Being a robot','Being a zombie','Sleepwalking'],2),
('balloon','Blowing up a balloon',array['Blowing out candles','Whistling','Drinking through a straw'],2),
('mirror2','Checking your hair',array['Brushing teeth','Putting on glasses','Washing your face'],2)
on conflict (id) do update set word=excluded.word, decoys=excluded.decoys;

-- social prompts and photo tasks
insert into public.challenges
  (id, kind, category, family, title, question, hint, glyph, time_limit, difficulty, payload)
values
('s_habit','connect','social','s_habit','Small Habit',
 'Find your target. Ask: "What is a small habit you would recommend to anyone?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_wrong','connect','social','s_wrong','Held Wrong',
 'Find your target. Ask: "What is something everyone gets wrong about you?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_skill','connect','social','s_skill','Free Skill',
 'Find your target. Ask: "One skill downloaded instantly — what is it?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_place','connect','social','s_place','Best Spot',
 'Find your target. Ask: "Best spot on campus you have found so far?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_game','connect','social','s_game','Board Game',
 'Find your target. Ask: "What game do you actually enjoy playing with people?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_advice','connect','social','s_advice','First Day',
 'Find your target. Ask: "What advice would you give someone starting today?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_late','connect','social','s_late','Running Late',
 'Find your target. Ask: "What makes you late more than anything else?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_meal','connect','social','s_meal','Home Food',
 'Find your target. Ask: "What food does home taste like?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_scared','connect','social','s_scared','Mild Fear',
 'Find your target. Ask: "What is something small that genuinely unsettles you?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('s_proud','connect','social','s_proud','Quiet Win',
 'Find your target. Ask: "What is a small thing you are quietly proud of?" Then both phones tap.',
 'Answer it yourself first — it makes them answer.','bubble',120,2,'{}'),
('p_blue','photo','photo','p_blue','Evidence: Blue','Photograph something blue that is not clothing.',
 'Anything in this room counts.','camera',90,2,'{}'),
('p_round','photo','photo','p_round','Evidence: Perfectly Round','Photograph the roundest thing you can find.',
 'Anything in this room counts.','camera',90,2,'{}'),
('p_old','photo','photo','p_old','Evidence: Oldest Thing','Photograph the oldest-looking object in this room.',
 'Anything in this room counts.','camera',90,2,'{}'),
('p_two','photo','photo','p_two','Evidence: A Pair','Photograph two people wearing something in common.',
 'Anything in this room counts.','camera',90,2,'{}'),
('p_up','photo','photo','p_up','Evidence: Ceiling','Photograph the ceiling directly above you.',
 'Anything in this room counts.','camera',90,2,'{}'),
('p_number','photo','photo','p_number','Evidence: The Number Seven','Find a seven somewhere in this building and photograph it.',
 'Anything in this room counts.','camera',90,2,'{}')
on conflict (id) do update set title=excluded.title, question=excluded.question,
  hint=excluded.hint, glyph=excluded.glyph, difficulty=excluded.difficulty;

-- 35 anagrams, 18 charades, 10 social, 6 photo
-- Final counts
select
  (select count(*) from public.challenges where active)      as challenges,
  (select count(*) from public.anagram_words)                as anagram_words,
  (select count(*) from public.charade_words)                as charade_words;
