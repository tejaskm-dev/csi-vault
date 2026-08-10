-- ============================================================================
-- OPERATION VAULT — judged evidence
-- ============================================================================
-- Run after 0034_anagram_clues.sql.
--
-- Photo challenges have never been validated. record_photo() writes the row and
-- stamps solved_at in the same breath, so a black screenshot opens a vault
-- exactly as well as a photograph of the thing that was asked for. That was a
-- deliberate call — there is no automated way to grade "photograph something
-- red" — but it left the one part of the game with a human in it with no human
-- in it.
--
-- Invigilators now tick or cross each upload.
--
-- FOUR RULES, and the second is the one everything else is shaped around.
--
--  1. APPROVED UNTIL PROVEN OTHERWISE. A photo scores from the moment it lands.
--     The tick clears the queue and records that somebody looked; only an
--     explicit cross takes anything away. So a review desk that cannot keep up
--     costs the room nothing, and an under-staffed event degrades to exactly
--     today's behaviour rather than to players being punished for it.
--
--  2. A CROSS TAKES THE VAULT BACK. solved_at is cleared and the player has to
--     retake. This is the strongest deterrent and it is also the most dangerous
--     thing in this file: nothing in the game has ever un-solved a step before,
--     and two pieces of client code quietly assume nothing ever will. Both are
--     fixed alongside this migration; without them a rejection leaves the
--     player with a board that has no active tile at all.
--
--  3. REVIEWERS ARE NOT HOSTS. host_claim is exclusive by design — one device
--     owns the room. Review is membership instead: any number of phones can
--     hold the reviewer code at once, and they get four functions and nothing
--     else. No phase control, no reset, no broadcast, no recovery PINs.
--
--  4. EVERY VERDICT IS ATTRIBUTABLE. Who judged it, when, and why it was
--     rejected. "Who crossed mine?" is a question that will be asked out loud
--     in a room of sixty people, and it should have an answer.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The verdict
-- ----------------------------------------------------------------------------
alter table public.photos
  add column if not exists verdict       text not null default 'pending',
  add column if not exists reviewed_at   timestamptz,
  add column if not exists reviewed_by   uuid,
  add column if not exists reviewer_name text,
  add column if not exists reject_reason text;

alter table public.photos drop constraint if exists photos_verdict_chk;
alter table public.photos add constraint photos_verdict_chk
  check (verdict in ('pending', 'ok', 'rejected'));

-- The review queue reads (session, verdict, oldest first) on every poll.
create index if not exists photos_review_queue
  on public.photos (session_id, verdict, created_at);

-- The score reads (player, verdict) for every player on every leaderboard.
create index if not exists photos_player_verdict
  on public.photos (player_id, verdict);


-- ----------------------------------------------------------------------------
-- 2. Telling the player
-- ----------------------------------------------------------------------------
-- A vault that closes without explanation is indistinguishable from a bug, and
-- the player is three vaults further on by the time it happens. The room-wide
-- `sessions.notice` cannot carry this — it is one message to sixty phones, and
-- this is one message to one.
alter table public.players
  add column if not exists notice    text,
  add column if not exists notice_at timestamptz;


-- ----------------------------------------------------------------------------
-- 3. The reviewer role
-- ----------------------------------------------------------------------------
alter table public.sessions
  add column if not exists review_code text;

-- A default so the feature works the moment this runs. CHANGE IT — see the
-- note at the bottom of this file.
update public.sessions set review_code = '246813' where review_code is null;

/**
 * Membership, not a claim.
 *
 * host_claim binds the room to ONE auth user precisely so that knowing the
 * code is not enough to act. That is right for the controls that can end a
 * game for sixty people and wrong for a review desk, which is two or three
 * people working the same queue on their own phones. So this is a join, it is
 * idempotent, and nobody evicts anybody.
 *
 * The code still cannot be brute-forced: review_claim runs through the same
 * throttle as host_claim, keyed separately.
 */
create table if not exists public.session_reviewers (
  session_id uuid not null references public.sessions(id) on delete cascade,
  auth_id    uuid not null,
  name       text not null default 'Reviewer',
  joined_at  timestamptz not null default now(),
  primary key (session_id, auth_id)
);

alter table public.session_reviewers enable row level security;
-- No policies. Membership is checked by SECURITY DEFINER functions only.

create or replace function public.review_claim(
  p_session uuid,
  p_code    text,
  p_name    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not signed in');
  end if;

  -- throttle() RAISES; it does not return a boolean. Raising here is correct
  -- and safe for the same reason host_claim gives: nothing has been written
  -- yet, so there is no attempt row for the rollback to destroy, and a
  -- throttled caller must not be able to extend their own window by logging
  -- more attempts.
  perform public.throttle('review');

  select review_code into v_code from public.sessions where id = p_session;

  if v_code is null or trim(p_code) <> v_code then
    -- A rejection is a VALUE, not an exception — raising would roll back the
    -- attempt row written on the line above it, which is the bug 0006
    -- documents at length. The throttle has to survive the failure it counts.
    insert into public.auth_attempts (kind, auth_id, session_id, ok)
    values ('review', auth.uid(), p_session, false);
    return jsonb_build_object('ok', false, 'error', 'bad review code');
  end if;

  insert into public.session_reviewers (session_id, auth_id, name)
  values (p_session, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Reviewer'))
  on conflict (session_id, auth_id) do update set name = excluded.name;

  insert into public.auth_attempts (kind, auth_id, session_id, ok)
  values ('review', auth.uid(), p_session, true);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.review_claim(uuid, text, text) from public, anon;
grant  execute on function public.review_claim(uuid, text, text) to authenticated;

/**
 * May this caller judge photos in this room?
 *
 * A reviewer OR the current host. One predicate so the standalone /review page
 * and the Review tab inside the host dashboard run the same code — the host
 * should never have to type a second code to do a job they already have the
 * authority for.
 */
create or replace function public.reviewer_ok(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.session_reviewers r
    where r.session_id = p_session and r.auth_id = auth.uid()
  ) or exists (
    select 1 from public.sessions s
    where s.id = p_session
      and s.host_auth_id is not null
      and s.host_auth_id = auth.uid()
  );
$$;

revoke execute on function public.reviewer_ok(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. The queue
-- ----------------------------------------------------------------------------
-- Carries THE TASK, not just the picture. A reviewer looking at a photo of a
-- ceiling fan cannot judge it without knowing the challenge said "photograph
-- something that spins" — so the prompt travels with the image and sits above
-- it on screen.
create or replace function public.review_queue(p_session uuid, p_limit int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_out jsonb;
begin
  if not public.reviewer_ok(p_session) then
    raise exception 'not a reviewer';
  end if;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at), '[]'::jsonb)
    into v_out
  from (
    select
      ph.id,
      ph.storage_path,
      ph.caption,
      ph.created_at,
      pl.name       as player_name,
      pl.vault_no   as player_vault,
      a.slot        as vault,
      a.step        as step,
      c.title       as task_title,
      c.question    as task_question
    from public.photos ph
    join public.players pl on pl.id = ph.player_id
    left join public.assignments a on a.id = ph.assignment_id
    left join public.challenges  c on c.id = a.challenge_id
    where ph.session_id = p_session and ph.verdict = 'pending'
    order by ph.created_at
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) q;

  return v_out;
end;
$$;

revoke execute on function public.review_queue(uuid, int) from public, anon;
grant  execute on function public.review_queue(uuid, int) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. The verdict itself
-- ----------------------------------------------------------------------------
-- Idempotent and OVERTURNABLE in both directions. Two reviewers working the
-- same queue will occasionally land on the same photo, and a reviewer will
-- occasionally hit the wrong button on a phone — neither should be a problem
-- somebody has to come and find a laptop to fix.
create or replace function public.review_photo(
  p_photo  uuid,
  p_ok     boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session    uuid;
  v_assignment uuid;
  v_player     uuid;
  v_slot       int;
  v_name       text;
  v_was        text;
begin
  select ph.session_id, ph.assignment_id, ph.player_id, ph.verdict
    into v_session, v_assignment, v_player, v_was
  from public.photos ph where ph.id = p_photo;

  if v_session is null then raise exception 'no such photo'; end if;
  if not public.reviewer_ok(v_session) then raise exception 'not a reviewer'; end if;

  select coalesce(r.name, 'Host') into v_name
  from public.session_reviewers r
  where r.session_id = v_session and r.auth_id = auth.uid();

  select a.slot into v_slot from public.assignments a where a.id = v_assignment;

  if p_ok then
    update public.photos
    set verdict = 'ok', visible = true, reviewed_at = now(),
        reviewed_by = auth.uid(), reviewer_name = coalesce(v_name, 'Host'),
        reject_reason = null
    where id = p_photo;

    -- Undoing a cross has to put the vault back. Guarded on solved_at is null
    -- so approving an old photo for an assignment the player has already
    -- redone changes nothing.
    if v_was = 'rejected' and v_assignment is not null then
      update public.assignments
      set solved_at = now()
      where id = v_assignment and solved_at is null;

      update public.players
      set notice = 'Your evidence for vault ' || coalesce(v_slot::text, '?')
                   || ' was accepted after all. That vault is open again.',
          notice_at = now()
      where id = v_player;
    end if;

  else
    update public.photos
    set verdict = 'rejected', visible = false, reviewed_at = now(),
        reviewed_by = auth.uid(), reviewer_name = coalesce(v_name, 'Host'),
        reject_reason = nullif(trim(coalesce(p_reason, '')), '')
    where id = p_photo;

    /*
     * Only close the vault if this photo was the ONLY thing holding it open.
     *
     * A player who was crossed once and retook has two rows against one
     * assignment. Rejecting the first — a reviewer working down a stale queue,
     * or correcting themselves — must not undo the replacement they have
     * already accepted.
     */
    if v_assignment is not null and not exists (
      select 1 from public.photos p2
      where p2.assignment_id = v_assignment
        and p2.id <> p_photo
        and p2.verdict <> 'rejected'
    ) then
      update public.assignments set solved_at = null where id = v_assignment;

      update public.players
      set notice = 'Evidence for vault ' || coalesce(v_slot::text, '?')
                   || ' was not accepted'
                   || case when nullif(trim(coalesce(p_reason, '')), '') is null
                           then '. ' else ' — ' || trim(p_reason) || '. ' end
                   || 'Open that vault and take it again.',
          notice_at = now()
      where id = v_player;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'verdict', case when p_ok then 'ok' else 'rejected' end);
end;
$$;

revoke execute on function public.review_photo(uuid, boolean, text) from public, anon;
grant  execute on function public.review_photo(uuid, boolean, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 6. How the desk is doing
-- ----------------------------------------------------------------------------
create or replace function public.review_stats(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not public.reviewer_ok(p_session) then raise exception 'not a reviewer'; end if;

  select jsonb_build_object(
    'pending',  count(*) filter (where verdict = 'pending'),
    'ok',       count(*) filter (where verdict = 'ok'),
    'rejected', count(*) filter (where verdict = 'rejected'),
    'total',    count(*)
  ) into v
  from public.photos where session_id = p_session;

  return v;
end;
$$;

revoke execute on function public.review_stats(uuid) from public, anon;
grant  execute on function public.review_stats(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 7. Scoring
-- ----------------------------------------------------------------------------
-- Half a vault per approved photo, the same as a bonus. With roughly two photo
-- steps on a board that is up to +1.0: enough to settle a close finish, not
-- enough to beat somebody who simply cracked more vaults.
--
-- DISTINCT ASSIGNMENT, not distinct photo. Counting rows would make uploading
-- the same challenge four times worth 2.0, and the retake path guarantees some
-- players legitimately have several rows against one assignment.
--
-- create or replace view can change an expression and append a column; it
-- cannot rename, retype or reorder. `effective` keeps its name and its numeric
-- type, `evidence` goes last.
create or replace view public.player_scores as
select
  p.id,
  p.session_id,
  p.name,
  p.vault_no,
  p.avatar_url,
  count(*) filter (where a.solved_at is not null and a.slot > 0) as vaults,
  count(*) filter (where a.solved_at is not null and a.slot = 0) as bonus,
  count(*) filter (where a.solved_at is not null and a.slot > 0)
    + count(*) filter (where a.solved_at is not null and a.slot = 0) * 0.5
    + ev.n * 0.5
    as effective,
  -- Seconds from the session start to this player's last unlock. A player who
  -- has solved nothing is parked at the end of the ordering rather than at the
  -- front, which a plain max() of nulls would do.
  coalesce(
    extract(epoch from (max(a.solved_at) - s.started_at))::int,
    999999
  ) as elapsed,
  ev.n as evidence
from public.players p
join public.sessions s on s.id = p.session_id
left join public.assignments a on a.player_id = p.id
left join lateral (
  select count(distinct ph.assignment_id) as n
  from public.photos ph
  where ph.player_id = p.id
    and ph.assignment_id is not null
    and ph.verdict <> 'rejected'
) ev on true
group by p.id, p.session_id, p.name, p.vault_no, p.avatar_url, s.started_at, ev.n;


-- The leaderboard has to carry it. Adding a column to a RETURNS TABLE needs a
-- drop, so the grants below are re-issued.
drop function if exists public.leaderboard(uuid, int);

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
  elapsed    int,
  evidence   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by s.effective desc, s.elapsed asc, s.vault_no asc),
    s.id, s.name, s.vault_no, s.avatar_url, s.vaults, s.bonus, s.effective,
    s.elapsed, s.evidence
  from public.player_scores s
  where s.session_id = p_session
  order by s.effective desc, s.elapsed asc, s.vault_no asc
  limit coalesce(p_limit, 100);
$$;

grant execute on function public.leaderboard(uuid, int) to authenticated, anon;


-- ----------------------------------------------------------------------------
-- 8. The snapshot carries the notice and the evidence count
-- ----------------------------------------------------------------------------
-- Both ride inside the existing payload. No new request, and the board hash
-- already covers solved_at, so a rejection reaches the phone within one tick.
create or replace function public.game_snapshot(
  p_session    uuid,
  p_board_ver  text default null,
  p_roster_ver text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid uuid; v_sname text; v_phase text; v_started timestamptz;
  v_code text; v_doors boolean; v_notice text; v_notice_at timestamptz;
  v_pid uuid; v_pname text; v_vault int; v_avatar text;
  v_pnotice text; v_pnotice_at timestamptz;
  v_session jsonb; v_out jsonb;
  v_board_ver text; v_roster_ver text;
  v_leaders jsonb; v_pending jsonb;
begin
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

  if p_session is null or p_session <> v_sid then
    return jsonb_build_object('auth', auth.uid(), 'session', v_session);
  end if;

  select p.id, p.name, p.vault_no, p.avatar_url, p.notice, p.notice_at
    into v_pid, v_pname, v_vault, v_avatar, v_pnotice, v_pnotice_at
  from public.players p
  where p.session_id = p_session and p.auth_id = auth.uid()
  limit 1;

  v_out := jsonb_build_object(
    'auth',    auth.uid(),
    'session', v_session,
    'player',  case when v_pid is null then null
               else jsonb_build_object('id', v_pid, 'session_id', p_session,
                                       'name', v_pname, 'vault_no', v_vault,
                                       'avatar_url', v_avatar,
                                       'notice', v_pnotice,
                                       'notice_at', v_pnotice_at) end);

  select md5(coalesce(string_agg(p.id::text || p.name, ',' order by p.vault_no), ''))
    into v_roster_ver
  from public.players p where p.session_id = p_session;

  v_out := v_out || jsonb_build_object('roster_ver', v_roster_ver);

  if p_roster_ver is distinct from v_roster_ver then
    v_out := v_out || jsonb_build_object('roster', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.vault_no), '[]'::jsonb)
      from (
        select id, session_id, name, vault_no, avatar_url
        from public.players where session_id = p_session
      ) p));
  end if;

  if v_pid is not null then
    select md5(coalesce(string_agg(
             a.id::text || coalesce(a.solved_at::text, '') ||
             coalesce(a.target_id::text, ''), ',' order by a.slot, a.step), ''))
      into v_board_ver
    from public.assignments a where a.player_id = v_pid;

    v_out := v_out || jsonb_build_object('board_ver', v_board_ver);

    if p_board_ver is distinct from v_board_ver then
      v_out := v_out || jsonb_build_object('board', (
        select coalesce(jsonb_agg(to_jsonb(b) order by b.slot, b.step), '[]'::jsonb)
        from public.my_board(p_session) b));
    end if;

    select coalesce(jsonb_agg(to_jsonb(i) order by i.expires_at), '[]'::jsonb)
      into v_pending
    from (
      select id, actor_id, target_id, assignment_id, kind, state, fact, expires_at
      from public.interactions
      where target_id = v_pid and state = 'pending' and expires_at > now()
    ) i;
  else
    v_pending := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', l.rank, 'player_id', l.player_id, 'name', l.name,
           'vault_no', l.vault_no, 'vaults', l.vaults, 'bonus', l.bonus,
           'evidence', l.evidence
         ) order by l.rank), '[]'::jsonb)
    into v_leaders
  from public.leaderboard(p_session, 200) l;

  return v_out || jsonb_build_object('leaders', v_leaders, 'pending', v_pending);
end;
$$;

grant  execute on function public.game_snapshot(uuid, text, text) to authenticated;
revoke execute on function public.game_snapshot(uuid, text, text) from public, anon;


-- ----------------------------------------------------------------------------
-- 9. Dismissing a notice
-- ----------------------------------------------------------------------------
-- Client-side dismissal alone would bring the banner back on every reload for
-- the rest of the game. The player clears their own, and only their own.
create or replace function public.clear_my_notice(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
  set notice = null, notice_at = null
  where session_id = p_session and auth_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.clear_my_notice(uuid) from public, anon;
grant  execute on function public.clear_my_notice(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- SET THE REVIEWER CODE
-- ----------------------------------------------------------------------------
-- It ships as 246813 so the queue works the moment this runs. Change it before
-- the event — it is handed to invigilators, so it will be seen and repeated:
--
--   update public.sessions set review_code = '<six digits>';
--
-- And to check the plumbing without a phone:
--
--   select public.review_stats((select id from public.sessions
--                               order by created_at desc limit 1));
