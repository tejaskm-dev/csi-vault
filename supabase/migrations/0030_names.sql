-- ============================================================================
-- OPERATION VAULT — duplicate names, and the one nobody can fix
-- ============================================================================
-- Run after 0029_rename_on_rejoin.sql.
--
-- DUPLICATES ARE FINE, AND DELIBERATELY ALLOWED.
--
-- Nothing in the app identifies a player by name — every lookup is by id or by
-- vault_no, both unique within a session. Two students called Aarav break
-- nothing.
--
-- Enforcing uniqueness would be worse than the problem. Sixty first-years in
-- one room WILL collide on common names, and rejecting them at the door
-- creates a queue at the exact moment you want everyone seated and playing.
-- "Aarav2" is not a better outcome than two Aaravs.
--
-- What duplicates DO cost is legibility on the leaderboard and the hall
-- display, which is handled in the client by showing the vault number beside
-- any name that appears twice.
--
-- THE REAL GAP is moderation. A student types something rude, it goes on a
-- projector in front of the whole year, and there was no way to change it —
-- not by the host, and not by them once they had joined. That is a much more
-- likely event-day problem than two people sharing a name.
-- ============================================================================

create or replace function public.host_rename(p_session uuid, p_code text, p_vault_no int, p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_player uuid; v_name text; v_old text;
begin
  if not public.host_ok(p_session, p_code) then
    raise exception 'not hosting this session';
  end if;

  v_name := nullif(trim(left(coalesce(p_name, ''), 20)), '');
  if v_name is null then raise exception 'give them a name'; end if;

  select id, name into v_player, v_old from public.players
  where session_id = p_session and vault_no = p_vault_no;
  if v_player is null then raise exception 'no player with that number'; end if;

  update public.players set name = v_name where id = v_player;

  -- Audited, because renaming somebody else is the one host action that
  -- changes what a specific student sees about themselves.
  insert into public.host_audit (session_id, auth_id, action, detail)
  values (p_session, auth.uid(), 'rename',
          jsonb_build_object('vault_no', p_vault_no, 'from', v_old, 'to', v_name));

  return jsonb_build_object('ok', true, 'from', v_old, 'to', v_name);
end;
$$;

revoke execute on function public.host_rename(uuid, text, int, text) from public, anon;
grant execute on function public.host_rename(uuid, text, int, text) to authenticated;

/**
 * Names that appear more than once, so the operator can see collisions rather
 * than discover them on the projector.
 */
create or replace function public.host_duplicate_names(p_session uuid, p_code text)
returns table (name text, numbers int[])
language sql stable security definer set search_path = public
as $$
  select p.name, array_agg(p.vault_no order by p.vault_no)
  from public.players p
  where p.session_id = p_session
    and public.host_ok(p_session, p_code)
  group by lower(p.name), p.name
  having count(*) > 1
  order by count(*) desc;
$$;

revoke execute on function public.host_duplicate_names(uuid, text) from public, anon;
grant execute on function public.host_duplicate_names(uuid, text) to authenticated;
