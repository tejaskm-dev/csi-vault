-- ============================================================================
-- OPERATION VAULT — what the operator does when something breaks anyway
-- ============================================================================
-- Run after 0025_new_mechanics.sql.
--
-- Every fix so far has been for a bug we found. This is for the ones we did
-- not. Sixty students, thirty minutes, no second chance — the question is not
-- whether something unexpected happens, it is whether one person with a laptop
-- can do anything about it while it is happening.
--
-- Right now they cannot. If a challenge turns out to be broken at 10:40, the
-- host can watch every player hit it in turn and skip them one at a time. If
-- the room needs telling something, there is no way to tell them. And if
-- phones are throwing errors, nobody finds out until a student walks over.
--
-- Three tools, chosen because each converts a whole class of unknown problem
-- into something one tap can handle:
--
--   BROADCAST   say something to every phone at once
--   KILL        take a broken challenge out of the game and free everyone on it
--   REPORTS     see errors as they happen, instead of hearing about them later
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Broadcast
-- ----------------------------------------------------------------------------
-- The highest-leverage of the three, because it does not need to know what
-- went wrong. "Vault 5 is broken, use the skip button" or "everyone come to
-- the front" solves an enormous range of problems that no amount of code can
-- anticipate. Players already poll the session every four seconds, so this
-- costs nothing new.

alter table public.sessions
  add column if not exists notice text,
  add column if not exists notice_at timestamptz;

create or replace function public.host_broadcast(p_session uuid, p_code text, p_text text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;

  update public.sessions
  set notice = nullif(trim(left(coalesce(p_text, ''), 240)), ''),
      -- Stamped so a re-sent identical message still reappears for players who
      -- dismissed the previous one.
      notice_at = case when nullif(trim(coalesce(p_text,'')), '') is null then null else now() end
  where id = p_session;

  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'broadcast', jsonb_build_object('text', p_text));

  return jsonb_build_object('ok', true);
end;
$$;

-- Players read it through the public view, which already carries no secrets.
drop view if exists public.sessions_public;
create view public.sessions_public as
select id, name, phase, started_at, ends_at, join_code, created_at, doors_open,
       notice, notice_at
from public.sessions;
grant select on public.sessions_public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Kill a broken challenge
-- ----------------------------------------------------------------------------
-- Deactivating alone is not enough: it stops the challenge being DEALT, but
-- every player already holding it stays stuck. This does both — takes it out
-- of circulation and releases everyone currently sitting on it, in one call.

create or replace function public.host_kill_challenge(p_session uuid, p_code text, p_challenge text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_freed int;
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;

  update public.challenges set active = false where id = p_challenge;

  with released as (
    update public.assignments a
    set solved_at = now(), skipped = true
    where a.session_id = p_session
      and a.challenge_id = p_challenge
      and a.solved_at is null
    returning 1
  )
  select count(*) into v_freed from released;

  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'kill',
          jsonb_build_object('challenge', p_challenge, 'freed', v_freed));

  return jsonb_build_object('ok', true, 'freed', v_freed);
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Error reports from the phones
-- ----------------------------------------------------------------------------
-- The gap this closes: a student whose phone is erroring does not come and
-- tell you, they just stop playing. By the time three of them have drifted off
-- the event is half over.
--
-- Deliberately open to INSERT by any signed-in player — a phone that is
-- failing needs to be able to say so, and the whole point is to hear from the
-- ones that are broken. Read is host-only.

create table if not exists public.client_errors (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  vault_no   int,
  where_at   text,
  message    text,
  at         timestamptz not null default now()
);

create index if not exists client_errors_recent on public.client_errors (session_id, at desc);
alter table public.client_errors enable row level security;

drop policy if exists client_errors_write on public.client_errors;
create policy client_errors_write on public.client_errors
  for insert to authenticated with check (true);

create or replace function public.report_error(p_where text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_session uuid; v_player uuid; v_no int;
begin
  select p.session_id, p.id, p.vault_no into v_session, v_player, v_no
  from public.players p where p.auth_id = auth.uid() limit 1;

  insert into public.client_errors (session_id, player_id, vault_no, where_at, message)
  values (v_session, v_player, v_no,
          left(coalesce(p_where, '?'), 60), left(coalesce(p_message, ''), 400));
end;
$$;

/**
 * Grouped rather than raw.
 *
 * Sixty phones hitting one bug produce sixty rows, and a wall of identical
 * lines is harder to act on than a single line saying it happened sixty times.
 */
create or replace function public.host_errors(p_session uuid, p_code text)
returns table (where_at text, message text, hits bigint, players bigint, last_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select e.where_at, e.message, count(*), count(distinct e.player_id), max(e.at)
  from public.client_errors e
  where e.session_id = p_session
    and e.at > now() - interval '30 minutes'
    and public.host_ok(p_session, p_code)
  group by e.where_at, e.message
  order by max(e.at) desc
  limit 20;
$$;

grant execute on function public.host_broadcast(uuid, text, text)        to authenticated;
grant execute on function public.host_kill_challenge(uuid, text, text)   to authenticated;
grant execute on function public.host_errors(uuid, text)                 to authenticated;
grant execute on function public.report_error(text, text)                to authenticated;
revoke execute on function public.host_broadcast(uuid, text, text)       from public, anon;
revoke execute on function public.host_kill_challenge(uuid, text, text)  from public, anon;
revoke execute on function public.host_errors(uuid, text)                from public, anon;
revoke execute on function public.report_error(text, text)               from public, anon;
