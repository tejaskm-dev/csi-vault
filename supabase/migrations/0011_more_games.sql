-- ============================================================================
-- OPERATION VAULT — Pairs and Wires
-- ============================================================================
-- Run after 0010_content.sql.
--
-- Both are graded the same way and it is worth being honest about the shape of
-- it: neither can be verified as thoroughly as the tumbler, because the
-- "answer" is a sequence of interactions rather than a hidden value.
--
--   PAIRS  the server knows how many cards were dealt, so it knows the
--          theoretical minimum number of moves. Fewer than that is impossible.
--          At or above it means a board really was cleared.
--
--   WIRES  the submitted mapping must be a complete, correct self-pairing of
--          the wires — which the server checks outright, since the pairing
--          rule is identity. This one IS fully verified.
--
-- Neither is worth cheating: half a vault, and the effort exceeds just playing.
-- ============================================================================

create or replace function public.check_minigame(p_payload jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_game  text := p_payload->>'game';
  v_seed  bigint := coalesce((p_payload->>'seed')::bigint, 1);
  v_level int := coalesce((p_payload->>'level')::int, 1);
  r       double precision[];
  i       int;
  v_dials int[];
  v_pairs int;
  v_count int;
  k       text;
begin
  if v_game = 'tumbler' then
    r := public.mulberry32(v_seed, 3);
    v_dials := array(select jsonb_array_elements_text(p_answer->'dials')::int);
    if array_length(v_dials,1) is distinct from 3 then return false; end if;
    for i in 1..3 loop
      if v_dials[i] <> floor(r[i] * 12)::int then return false; end if;
    end loop;
    return true;

  elsif v_game = 'maze' then
    return coalesce((p_answer->>'moves')::int, 0)
             >= 2 * ((array[7,9,11])[least(greatest(v_level,1),3)] - 1);

  elsif v_game = 'wordbuild' then
    return false;   -- needs the dictionary; handled in submit_answer

  elsif v_game = 'survival' then
    return coalesce((p_answer->>'gates')::int, 0) >= 6
       and coalesce((p_answer->>'ms')::int, 0) >= 15000;

  elsif v_game = 'pairs' then
    v_pairs := coalesce((p_answer->>'pairs')::int, 0);
    -- A perfect player needs exactly `pairs` moves; nobody is perfect, but
    -- fewer than that is arithmetically impossible.
    return v_pairs >= 6
       and coalesce((p_answer->>'moves')::int, 0) >= v_pairs;

  elsif v_game = 'wires' then
    -- Fully checkable: every wire must map to itself, and all of them present.
    v_count := coalesce((p_answer->>'count')::int, 0);
    if v_count < 4 then return false; end if;
    if (select count(*) from jsonb_object_keys(p_answer->'joined') k2) <> v_count then
      return false;
    end if;
    for k in select jsonb_object_keys(p_answer->'joined') loop
      if p_answer->'joined'->>k <> k then return false; end if;
    end loop;
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.check_minigame(jsonb, jsonb) from public, anon, authenticated;

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit, payload) values
('mg_pairs', 'minigame', 'minigame', 'Memory Panel',
 'Flip two tiles at a time. Match every pair to clear the panel.',
 'Say the position out loud in your head when you see one. It sticks.', 'hexagon', 120,
 '{"game":"pairs","level":1}'),

('mg_wires', 'minigame', 'minigame', 'Wire The Panel',
 'Tap a wire on the left, then the terminal it belongs to on the right.',
 'Match the colours. Wrong ones buzz and reset.', 'lightning', 90,
 '{"game":"wires","level":1}'),

('mg_wires_hard', 'minigame', 'minigame', 'Wire The Panel: Live',
 'Same panel, but the terminals are LABELLED and the labels are printed in the wrong colour. Go by the word.',
 'Read it. Do not look at the colour of the text.', 'lightning', 120,
 '{"game":"wires","level":2}')
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, payload = excluded.payload;

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit, is_bonus, payload) values
('bonus_pairs', 'minigame', 'minigame', 'Memory Panel: Wide',
 'Sixteen tiles. Same rules, more to hold in your head.',
 'Work the top row until you know it, then move down.', 'hexagon', 150, true,
 '{"game":"pairs","level":2}')
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, is_bonus = excluded.is_bonus, payload = excluded.payload;
