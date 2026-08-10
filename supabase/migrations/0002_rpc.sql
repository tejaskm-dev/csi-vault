-- ============================================================================
-- OPERATION VAULT — game logic
-- ============================================================================
-- Run after 0001_core.sql.
--
-- Everything that decides whether a vault opens is in this file, and all of it
-- is SECURITY DEFINER — these functions run as the table owner, which is how
-- they can read `challenge_answers` when nothing else on the planet can.
--
-- Rule for reading this file: a function may trust `auth.uid()`, because
-- Supabase derives it from a signed JWT. It may trust NOTHING else the client
-- sends. Every argument below is treated as hostile.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Target picking — Bible §16, "avoid high-degree targets"
-- ----------------------------------------------------------------------------
-- The failure mode this exists to prevent: assign social targets at random and
-- with sixty players you get one poor student who is the answer to eleven other
-- people's challenge, mobbed for the whole session, while a dozen others are
-- never approached at all.
--
-- So the pick is least-loaded-first, excluding yourself and anyone you have
-- already met. `order by load, random()` breaks ties randomly, otherwise the
-- lowest vault_no would win every tie and become the new bottleneck.

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
    select count(*) as load
    from public.assignments a
    where a.target_id = p.id and a.solved_at is null
  ) l on true
  where p.session_id = p_session
    and p.id <> p_player
    -- never re-pair: an already-met partner cannot complete a new challenge
    and not exists (
      select 1 from public.interactions i
      where i.state = 'confirmed'
        and ((i.actor_id = p_player and i.target_id = p.id)
          or (i.actor_id = p.id and i.target_id = p_player))
    )
  order by l.load asc, random()
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Board construction
-- ----------------------------------------------------------------------------
-- Nine slots plus a bonus at slot 0. The draw is random per player — with
-- sixty phones in one room, a shared question order means the answer to
-- "number 4" is public knowledge within ninety seconds.
--
-- Social challenges get their target resolved here, at deal time, so the load
-- balancing above sees the assignments already handed out.

create or replace function public.build_board(p_session uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  n        int := 0;
  v_target uuid;
begin
  -- Idempotent: a player who refreshes during the deal does not get a second
  -- board, they get the one they already have.
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

    if r.kind in ('connect', 'exchange') then
      v_target := public.pick_target(p_session, p_player);
    end if;

    insert into public.assignments (session_id, player_id, challenge_id, slot, target_id, payload)
    values (
      p_session, p_player, r.id, n, v_target,
      -- Exchange challenges need generated halves. The player holds one value
      -- and their target holds the other; neither can answer alone, which is
      -- the entire point of the mechanic.
      case when r.kind = 'exchange'
        then jsonb_build_object(
          'mine', (10 + floor(random() * 40))::int,
          'symbol', (array['▲','●','■','◆'])[1 + floor(random() * 4)]
        )
        else '{}'::jsonb
      end
    );
  end loop;

  -- The bonus vault sits off the board at slot 0 and is worth half a vault.
  insert into public.assignments (session_id, player_id, challenge_id, slot)
  select p_session, p_player, id, 0
  from public.challenges
  where active and is_bonus
  order by random()
  limit 1;
end;
$$;

-- ----------------------------------------------------------------------------
-- join_session — the door
-- ----------------------------------------------------------------------------
-- Called once per phone, straight after anonymous sign-in. Returns the player
-- row so the client can render a name and vault number immediately.

create or replace function public.join_session(p_join_code text, p_name text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_phase   text;
  v_player  public.players;
  v_no      int;
  v_name    text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select id, phase into v_session, v_phase
  from public.sessions
  where join_code = upper(trim(p_join_code));

  if v_session is null then
    raise exception 'no such session';
  end if;
  if v_phase = 'ended' then
    raise exception 'this session has ended';
  end if;

  -- Rejoin path: same phone, same session. Refreshing the tab, or the browser
  -- reaping the page while a student walks across the room, must not cost a
  -- player their board.
  select * into v_player from public.players
  where session_id = v_session and auth_id = auth.uid();

  if found then
    return v_player;
  end if;

  -- Trim to something that fits a leaderboard row, and never trust a client to
  -- have done it. Empty names become their vault number rather than blank.
  v_name := nullif(trim(left(coalesce(p_name, ''), 20)), '');

  -- Lock the session row so two phones joining in the same millisecond cannot
  -- both read the same max(vault_no). Without this the unique constraint fires
  -- and one student gets an error at the door, which is the worst possible
  -- moment for one.
  perform 1 from public.sessions where id = v_session for update;

  select coalesce(max(vault_no), 0) + 1 into v_no
  from public.players where session_id = v_session;

  insert into public.players (session_id, auth_id, name, vault_no)
  values (v_session, auth.uid(), coalesce(v_name, 'Player ' || v_no), v_no)
  returning * into v_player;

  perform public.build_board(v_session, v_player.id);

  return v_player;
end;
$$;

-- ----------------------------------------------------------------------------
-- my_board — the player's nine, with the answers stripped
-- ----------------------------------------------------------------------------
-- The client never selects from `assignments` join `challenges` itself, because
-- doing so would make it very easy to widen the select list one day and start
-- shipping answers again. One function, one shape, no answer column in it.

create or replace function public.my_board(p_session uuid)
returns table (
  assignment_id uuid,
  slot          int,
  challenge_id  text,
  kind          text,
  title         text,
  question      text,
  hint          text,
  glyph         text,
  time_limit    int,
  is_bonus      boolean,
  payload       jsonb,
  solved        boolean,
  target_no     int,
  target_name   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.slot, c.id, c.kind, c.title, c.question, c.hint, c.glyph,
    c.time_limit, c.is_bonus,
    -- The challenge's own payload merged with this player's generated half.
    c.payload || a.payload,
    a.solved_at is not null,
    t.vault_no,
    t.name
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  left join public.players t on t.id = a.target_id
  where a.player_id = public.me(p_session)
  order by a.slot;
$$;

-- ----------------------------------------------------------------------------
-- submit_answer — the only way a vault opens
-- ----------------------------------------------------------------------------
-- Returns {correct, solved, vaults, bonus}. The client renders from the
-- response; it does not get to decide what happened.

create or replace function public.submit_answer(p_assignment uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player   uuid;
  v_session  uuid;
  v_kind     text;
  v_answer   jsonb;
  v_payload  jsonb;
  v_correct  boolean := false;
  v_solved   timestamptz;
  v_phase    text;
begin
  select a.player_id, a.session_id, c.kind, ca.answer, c.payload || a.payload, a.solved_at
    into v_player, v_session, v_kind, v_answer, v_payload, v_solved
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  left join public.challenge_answers ca on ca.challenge_id = c.id
  where a.id = p_assignment;

  if v_player is null then
    raise exception 'no such assignment';
  end if;

  -- Ownership. Without this check, a player could read another player's
  -- assignment id off the wire and solve someone else's board.
  if v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;

  select phase into v_phase from public.sessions where id = v_session;
  if v_phase <> 'live' then
    raise exception 'session is not live';
  end if;

  -- Already open. Re-submitting must not re-log or double-count.
  if v_solved is not null then
    return jsonb_build_object('correct', true, 'solved', true, 'replay', true);
  end if;

  v_correct := case v_kind

    -- Straight key comparison.
    when 'mcq'        then p_answer->>'option' = v_answer->>'option'
    when 'image_grid' then p_answer->>'option' = v_answer->>'option'

    -- Accept a list of spellings. "RAM" and "random access memory" are both
    -- right, and a first-year typing the long form should not be punished.
    when 'text_input' then exists (
      select 1 from jsonb_array_elements_text(v_answer->'text') t
      where lower(trim(t)) = lower(trim(coalesce(p_answer->>'text','')))
    )

    -- Observation and timing challenges. The tap itself is checked against the
    -- key like any other answer; the elapsed time is checked for plausibility.
    -- Bible §12 asks for a generous window, so this is not scored on speed —
    -- it only rejects the physically impossible, which is what a script looks
    -- like. A human cannot see a symbol and tap it in 80ms.
    when 'observe' then
      p_answer->>'option' = v_answer->>'option'
      and coalesce((p_answer->>'ms')::int, 0)
            >= coalesce((v_answer->>'min_ms')::int, 120)

    -- Social kinds resolve through the handshake, not here. `connect` never
    -- reaches this function at all; `exchange` and `recall` do, but only after
    -- a confirmed meeting, and the answer must match what was actually said.
    when 'exchange' then
      exists (
        select 1 from public.interactions i
        where i.assignment_id = p_assignment and i.state = 'confirmed'
      )
      and coalesce((p_answer->>'value')::int, -1) = (
        select coalesce((i.fact->>'value')::int, -1) + coalesce((v_payload->>'mine')::int, 0)
        from public.interactions i
        where i.assignment_id = p_assignment and i.state = 'confirmed'
        limit 1
      )

    -- "Who told you that?" — graded against the interaction log, so it is only
    -- answerable by someone who was actually there. Memory as a consequence of
    -- having met a person, exactly as Bible §6 asks.
    --
    -- Both directions count. A meeting is a meeting whether you walked up to
    -- them or they walked up to you, and the player has no idea which row in
    -- this table they were the actor on.
    when 'recall' then
      exists (
        select 1 from public.interactions i
        where i.id = (v_payload->>'about')::uuid
          and i.state = 'confirmed'
          and (
            (i.actor_id  = v_player and i.target_id = (p_answer->>'player_id')::uuid)
            or
            (i.target_id = v_player and i.actor_id  = (p_answer->>'player_id')::uuid)
          )
      )

    else false
  end;

  insert into public.attempts (assignment_id, player_id, submitted, correct)
  values (p_assignment, v_player, p_answer, v_correct);

  if v_correct then
    update public.assignments set solved_at = now() where id = p_assignment;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'solved',  v_correct,
    'vaults',  (select count(*) from public.assignments
                where player_id = v_player and solved_at is not null and slot > 0),
    'bonus',   (select count(*) from public.assignments
                where player_id = v_player and solved_at is not null and slot = 0)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- request_connect — "I am standing in front of you"
-- ----------------------------------------------------------------------------
-- The actor taps CONNECT. This writes a pending row, which lands on the
-- target's phone over realtime. It does not complete anything on its own —
-- one phone tapping a button is a claim, not a meeting.

create or replace function public.request_connect(p_assignment uuid, p_target_no int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player  uuid;
  v_session uuid;
  v_target  uuid;
  v_wanted  uuid;
  v_kind    text;
  v_id      uuid;
begin
  select a.player_id, a.session_id, a.target_id, c.kind
    into v_player, v_session, v_wanted, v_kind
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;

  select id into v_target
  from public.players
  where session_id = v_session and vault_no = p_target_no;

  if v_target is null then
    raise exception 'no player with that number in this room';
  end if;
  if v_target = v_player then
    raise exception 'that is you';
  end if;

  -- A named target must actually be the named target. Fallback challenges
  -- (target_id null) accept anyone, which is Bible §16's operational fallback
  -- for a player who genuinely cannot find their assigned person.
  if v_wanted is not null and v_target <> v_wanted then
    raise exception 'that is not your target';
  end if;

  -- One live request at a time. Otherwise a player could fan requests out to
  -- the whole room and wait for whoever confirms first.
  update public.interactions
  set state = 'expired'
  where actor_id = v_player and state = 'pending';

  insert into public.interactions (session_id, assignment_id, actor_id, target_id, kind)
  values (v_session, p_assignment, v_player, v_target,
          case when v_kind = 'exchange' then 'exchange' else 'connect' end)
  returning id into v_id;

  return jsonb_build_object('interaction_id', v_id, 'target_id', v_target);
end;
$$;

-- ----------------------------------------------------------------------------
-- confirm_connect — the second phone
-- ----------------------------------------------------------------------------
-- Only the *target* can call this, which is what makes the handshake real.
-- On confirmation a `connect` challenge is complete; an `exchange` opens up,
-- because now the player has been handed the other half of the sum.

create or replace function public.confirm_connect(p_interaction uuid, p_fact jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.interactions;
  v_kind    text;
begin
  select * into v_row from public.interactions where id = p_interaction;

  if v_row.id is null then
    raise exception 'no such request';
  end if;
  if v_row.target_id <> public.me(v_row.session_id) then
    raise exception 'only the person being met can confirm';
  end if;
  if v_row.state <> 'pending' then
    raise exception 'that request is no longer open';
  end if;
  if v_row.expires_at < now() then
    update public.interactions set state = 'expired' where id = p_interaction;
    raise exception 'that request timed out — ask them to tap again';
  end if;

  update public.interactions
  set state = 'confirmed',
      confirmed_at = now(),
      -- The target's half of the clue is read from THEIR assignment on the
      -- server. Passing it up from the client would let a player type any
      -- number they liked and solve their own exchange.
      fact = coalesce(p_fact, '{}'::jsonb) || jsonb_build_object(
        'value', (
          select (a.payload->>'mine')::int
          from public.assignments a
          where a.player_id = v_row.target_id
            and a.payload ? 'mine'
          order by a.slot limit 1
        )
      )
  where id = p_interaction;

  select kind into v_kind
  from public.challenges c
  join public.assignments a on a.challenge_id = c.id
  where a.id = v_row.assignment_id;

  -- A pure find-and-connect is done the moment the meeting is verified. An
  -- exchange has only just started — the player still has to do the sum.
  if v_kind = 'connect' then
    update public.assignments
    set solved_at = now()
    where id = v_row.assignment_id and solved_at is null;
  end if;

  return jsonb_build_object('ok', true, 'kind', v_kind);
end;
$$;

-- ----------------------------------------------------------------------------
-- record_photo — graded by having done it
-- ----------------------------------------------------------------------------
-- Deliberately no validation. "Photograph someone wearing something red" is
-- not checkable by machine, is not worth a staff member's afternoon, and is
-- also not fakeable from a chair — you have to get up and find a person. The
-- honesty is enforced by the room, and the payoff is a wall of real photos.

create or replace function public.record_photo(p_assignment uuid, p_path text, p_caption text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player  uuid;
  v_session uuid;
  v_kind    text;
begin
  select a.player_id, a.session_id, c.kind
    into v_player, v_session, v_kind
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;
  if v_kind <> 'photo' then
    raise exception 'that challenge does not take a photo';
  end if;

  -- The path must sit under this phone's own folder. The storage policy in
  -- 0003 enforces the same rule on the upload itself; this is the second half,
  -- stopping a row that points at a file somebody else uploaded. Folders are
  -- keyed by auth.uid() because that is the only identity storage policies can
  -- see natively.
  if p_path not like auth.uid()::text || '/%' then
    raise exception 'bad upload path';
  end if;

  insert into public.photos (session_id, player_id, assignment_id, storage_path, caption)
  values (v_session, v_player, p_assignment, p_path, left(coalesce(p_caption,''), 80));

  update public.assignments
  set solved_at = now()
  where id = p_assignment and solved_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- prepare_recall — bind a memory challenge to a meeting that actually happened
-- ----------------------------------------------------------------------------
-- Recall is the one kind that cannot be dealt fully formed. build_board() runs
-- the moment a player walks in, when they have met nobody, so there is no
-- meeting to ask about yet. The question has to be bound later — the first
-- time the player opens the challenge, against whoever they have met by then.
--
-- Called on mount by RecallTask. Idempotent: once bound, the same meeting is
-- returned forever, so refreshing the screen cannot reroll the question into
-- an easier one.

create or replace function public.prepare_recall(p_assignment uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player  uuid;
  v_session uuid;
  v_kind    text;
  v_about   uuid;
  v_other   uuid;
begin
  select a.player_id, a.session_id, c.kind, (a.payload->>'about')::uuid
    into v_player, v_session, v_kind, v_about
  from public.assignments a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_assignment;

  if v_player is null or v_player <> public.me(v_session) then
    raise exception 'not your assignment';
  end if;
  if v_kind <> 'recall' then
    raise exception 'that challenge is not a recall';
  end if;

  -- Already bound.
  if v_about is not null then
    select case when i.actor_id = v_player then i.target_id else i.actor_id end
      into v_other
    from public.interactions i where i.id = v_about;
    return jsonb_build_object('ready', true, 'about', v_about, 'other', v_other);
  end if;

  -- Pick a meeting. Oldest first, deliberately: the whole point of a memory
  -- challenge is the conversation you had a while ago, not the one thirty
  -- seconds before this screen opened.
  select i.id, case when i.actor_id = v_player then i.target_id else i.actor_id end
    into v_about, v_other
  from public.interactions i
  where i.state = 'confirmed'
    and (i.actor_id = v_player or i.target_id = v_player)
  order by i.confirmed_at asc
  limit 1;

  if v_about is null then
    -- Nobody met yet. The client shows a "come back once you have met
    -- someone" state rather than an unanswerable question.
    return jsonb_build_object('ready', false);
  end if;

  update public.assignments
  set payload = payload || jsonb_build_object('about', v_about)
  where id = p_assignment;

  return jsonb_build_object('ready', true, 'about', v_about, 'other', v_other);
end;
$$;

-- ----------------------------------------------------------------------------
-- leaderboard
-- ----------------------------------------------------------------------------
-- Bible §1's ordering, computed in one place: effective vaults desc, then
-- elapsed asc. Ties break on vault_no so the order is stable between polls and
-- rows on the projector do not jitter.

create or replace function public.leaderboard(p_session uuid, p_limit int default 100)
returns table (
  rank       bigint,
  player_id  uuid,
  name       text,
  vault_no   int,
  avatar_url text,
  vaults     bigint,
  bonus      bigint,
  effective  numeric,
  elapsed    int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by s.effective desc, s.elapsed asc, s.vault_no asc),
    s.id, s.name, s.vault_no, s.avatar_url, s.vaults, s.bonus, s.effective, s.elapsed
  from public.player_scores s
  where s.session_id = p_session
  order by s.effective desc, s.elapsed asc, s.vault_no asc
  limit p_limit;
$$;

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
-- Only the functions are callable. The tables underneath stay behind RLS.

grant execute on function public.join_session(text, text)          to authenticated;
grant execute on function public.my_board(uuid)                    to authenticated;
grant execute on function public.submit_answer(uuid, jsonb)        to authenticated;
grant execute on function public.request_connect(uuid, int)        to authenticated;
grant execute on function public.confirm_connect(uuid, jsonb)      to authenticated;
grant execute on function public.record_photo(uuid, text, text)    to authenticated;
grant execute on function public.prepare_recall(uuid)              to authenticated;
grant execute on function public.leaderboard(uuid, int)            to authenticated, anon;
grant execute on function public.me(uuid)                          to authenticated;

-- pick_target and build_board are internal. Nothing outside this file calls
-- them, and a client that could call build_board could re-deal its own board
-- until it liked the questions.
revoke execute on function public.pick_target(uuid, uuid)  from anon, authenticated;
revoke execute on function public.build_board(uuid, uuid)  from anon, authenticated;
