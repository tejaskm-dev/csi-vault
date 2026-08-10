-- ============================================================================
-- OPERATION VAULT — one request where there were eight
-- ============================================================================
-- Run after 0031_vault_variety.sql.
--
-- THE TIMEOUTS ARE SELF-INFLICTED.
--
-- Count what one phone sends in a four-second window, today:
--
--     my_board            ·  every 4s   (the board poll)
--     leaderboard         ·  every 4s
--     players             ·  every 4s
--     sessions_public     ·  every 4s   (the phase poll)
--     interactions        ·  every 3s   (the handshake poll)
--     + my_board, leaderboard and players AGAIN on that same 3s tick
--       whenever the realtime channel is not subscribed
--
-- That is four to eight requests per phone per four seconds. Sixty phones is
-- 60-120 requests a second, sustained, for thirty minutes — against a project
-- sized for a class exercise. The pooler starts queueing, queued requests pass
-- the client's 12-second deadline, and the deadline surfaces as "connection
-- error" on the phone and a wall of errors in the Supabase dashboard. Nothing
-- is broken; it is simply being asked far more than it can answer.
--
-- Worse, those calls are independent. The board can come from one instant and
-- the leaderboard from another, so the two disagree on screen — and a board
-- response that was issued BEFORE a submit can land AFTER it, putting a solved
-- step back to unsolved. That is the blink between the previous question and
-- the current one: the client is not glitching, it is being told the truth
-- twice in the wrong order.
--
-- One RPC. One round trip, one snapshot, one consistent instant. Everything
-- the phone polls for is in it.
--
-- The redundant 3s duplicate goes on the client side; between them the two
-- changes take a phone from up to 8 requests per 4s to exactly 1.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- my_board — stop paying for the repair check on a healthy board
-- ----------------------------------------------------------------------------
-- 0031 called pairings_exhausted() on every board fetch, before deciding
-- whether anything needed repairing at all. On a board with nothing wrong that
-- is two count(*) queries per player per four seconds, bought for nothing.
--
-- retarget_board works that out for itself, so the guard here is now purely
-- "is any social step in a state it cannot be played from", and a healthy
-- board pays one indexed EXISTS.
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
begin
  v_player := public.me(p_session);
  if v_player is null then return; end if;

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
        -- Already met. Both rules in request_connect refuse this, and between
        -- them they leave the player with no number they are allowed to type.
        or exists (
          select 1 from public.interactions i
          where i.state = 'confirmed'
            and ((i.actor_id = v_player    and i.target_id = a.target_id)
              or (i.actor_id = a.target_id and i.target_id = v_player)))
      )
  ) then
    -- Decides for itself whether each of those is actually a problem — in a
    -- room where everyone has met everyone, "already met" is not one.
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
-- game_snapshot — everything a phone polls for, in one answer
-- ----------------------------------------------------------------------------
-- Returns, always:
--   auth     the caller's identity, or null if the token did not arrive
--   session  the CURRENT room, which may not be the one asked about
-- and, when the caller is a player in the room asked about:
--   player   their row              (null means the row is gone — see below)
--   board    my_board()
--   leaders  leaderboard()
--   roster   everyone in the room
--   pending  handshakes waiting on this phone
--
-- `player` is the authoritative answer to "am I still in this room", and that
-- matters more than it looks. The client used to infer it by fetching the
-- roster and checking whether it could see itself — but that fetch is an
-- ordinary RLS-filtered select, so a request whose token has not attached yet
-- returns an empty list with no error, indistinguishable from a room the host
-- has just wiped. Guessing wrong in one direction evicted every player at
-- once; guessing wrong in the other meant a reset reached nobody. This runs as
-- SECURITY DEFINER against auth.uid(), so an absent player row means the row
-- is absent. Nothing to infer.
create or replace function public.game_snapshot(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid uuid; v_sname text; v_phase text; v_started timestamptz;
  v_code text; v_doors boolean; v_notice text; v_notice_at timestamptz;
  v_pid uuid; v_pname text; v_vault int; v_avatar text;
  v_session jsonb;
  v_board jsonb; v_leaders jsonb; v_roster jsonb; v_pending jsonb;
begin
  -- The current room, by the same rule defaultSession() uses. Deliberately not
  -- filtered by phase: an ended session is still the session, and hiding it
  -- was what stopped players ever learning the game was over.
  select s.id, s.name, s.phase, s.started_at, s.join_code,
         s.doors_open, s.notice, s.notice_at
    into v_sid, v_sname, v_phase, v_started, v_code, v_doors, v_notice, v_notice_at
  from public.sessions s
  order by s.created_at desc
  limit 1;

  if v_sid is null then
    return jsonb_build_object('auth', auth.uid(), 'session', null);
  end if;

  v_session := jsonb_build_object(
    'id', v_sid, 'name', v_sname, 'phase', v_phase, 'started_at', v_started,
    'join_code', v_code, 'doors_open', v_doors,
    'notice', v_notice, 'notice_at', v_notice_at);

  -- A different room has opened since this phone last looked. Everything below
  -- would describe a game that is over, so say only that.
  if p_session is null or p_session <> v_sid then
    return jsonb_build_object('auth', auth.uid(), 'session', v_session);
  end if;

  select p.id, p.name, p.vault_no, p.avatar_url
    into v_pid, v_pname, v_vault, v_avatar
  from public.players p
  where p.session_id = p_session and p.auth_id = auth.uid()
  limit 1;

  if v_pid is not null then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.slot, b.step), '[]'::jsonb)
      into v_board
    from public.my_board(p_session) b;

    select coalesce(jsonb_agg(to_jsonb(i) order by i.expires_at), '[]'::jsonb)
      into v_pending
    from (
      select id, actor_id, target_id, assignment_id, kind, state, fact, expires_at
      from public.interactions
      where target_id = v_pid and state = 'pending' and expires_at > now()
    ) i;
  else
    v_board   := '[]'::jsonb;
    v_pending := '[]'::jsonb;
  end if;

  -- jsonb_agg without ORDER BY has no defined order, and the client renders
  -- these lists in the order they arrive.
  select coalesce(jsonb_agg(to_jsonb(l) order by l.rank), '[]'::jsonb)
    into v_leaders
  from public.leaderboard(p_session, 100) l;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.vault_no), '[]'::jsonb)
    into v_roster
  from (
    select id, session_id, name, vault_no, avatar_url
    from public.players where session_id = p_session
  ) p;

  return jsonb_build_object(
    'auth',    auth.uid(),
    'session', v_session,
    'player',  case when v_pid is null then null
               else jsonb_build_object('id', v_pid, 'session_id', p_session,
                                       'name', v_pname, 'vault_no', v_vault,
                                       'avatar_url', v_avatar) end,
    'board',   v_board,
    'leaders', v_leaders,
    'roster',  v_roster,
    'pending', v_pending);
end;
$$;

grant  execute on function public.game_snapshot(uuid) to authenticated;
revoke execute on function public.game_snapshot(uuid) from public, anon;


-- ----------------------------------------------------------------------------
-- Indexes the snapshot leans on
-- ----------------------------------------------------------------------------
-- Every one of these is now hit once per player every four seconds, so a
-- sequential scan that was invisible at one request per player becomes sixty
-- of them. Cheap insurance; all are no-ops if they already exist.

create index if not exists players_session_auth
  on public.players (session_id, auth_id);

create index if not exists assignments_player_solved
  on public.assignments (player_id, solved_at);

create index if not exists interactions_target_state
  on public.interactions (target_id, state, expires_at);


-- ----------------------------------------------------------------------------
-- Check it
-- ----------------------------------------------------------------------------
--   select jsonb_pretty(public.game_snapshot(
--     (select id from public.sessions order by created_at desc limit 1)));
--
-- Called as the host (not a player) it should return auth, session, and a null
-- player — never an error.
