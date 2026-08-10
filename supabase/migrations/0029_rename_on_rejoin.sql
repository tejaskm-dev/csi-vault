-- ============================================================================
-- OPERATION VAULT — let a returning player change their name
-- ============================================================================
-- Run after 0028_new_glyphs.sql.
--
-- join_session's rejoin branch looked up the player by auth_id and returned the
-- row unchanged, ignoring p_name completely. So a student who came back and
-- typed something different got their old name back with no explanation — the
-- name field appeared to do nothing, and the only way "in" was as who you were
-- before.
--
-- The rejoin branch exists so a refresh does not cost a board, and that is
-- still what it does. It just no longer insists you are the same person you
-- were an hour ago.
-- ============================================================================

create or replace function public.join_session(p_join_code text, p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_session uuid; v_phase text; v_doors boolean;
  v_player public.players; v_no int; v_name text; v_pin text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  select id, phase, doors_open into v_session, v_phase, v_doors
  from public.sessions where join_code = upper(trim(p_join_code));

  if v_session is null then raise exception 'no such session'; end if;
  if v_phase = 'ended' then raise exception 'this session has ended'; end if;

  v_name := nullif(trim(left(coalesce(p_name, ''), 20)), '');

  select * into v_player from public.players
  where session_id = v_session and auth_id = auth.uid();

  if found then
    -- Same phone, same room. Keep the board, the vault number and everything
    -- earned — but take the new name if one was given. Blank means "no
    -- opinion", which is what an automatic rejoin sends, so it keeps the old.
    if v_name is not null and v_name <> v_player.name then
      update public.players set name = v_name where id = v_player.id
      returning * into v_player;
    end if;

    select pin into v_pin from public.player_secrets where player_id = v_player.id;
    return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin, 'rejoined', true);
  end if;

  if v_phase = 'live' and not v_doors then
    raise exception 'doors are closed';
  end if;

  perform 1 from public.sessions where id = v_session for update;
  select coalesce(max(vault_no), 0) + 1 into v_no
  from public.players where session_id = v_session;

  insert into public.players (session_id, auth_id, name, vault_no)
  values (v_session, auth.uid(), coalesce(v_name, 'Player ' || v_no), v_no)
  returning * into v_player;

  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  insert into public.player_secrets (player_id, pin) values (v_player.id, v_pin);
  perform public.build_board(v_session, v_player.id);

  return jsonb_build_object('player', to_jsonb(v_player), 'pin', v_pin, 'rejoined', false);
end;
$$;

revoke execute on function public.join_session(text, text) from public, anon;
grant execute on function public.join_session(text, text) to authenticated;
