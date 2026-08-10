-- ============================================================================
-- OPERATION VAULT — content seed
-- ============================================================================
-- Run after 0003_storage.sql. Re-runnable: every insert upserts, so you can
-- edit a question here and re-run the file to push the change.
--
-- The mix is deliberate and follows Bible §15's shape. Roughly half the pool is
-- solo — puzzles, observation, a little CS literacy — and half puts a player on
-- their feet talking to someone they have never met. A player draws nine at
-- random, so most boards land somewhere near that ratio without anyone having
-- to hand-author sixty routes.
--
-- Audience note, from DESIGN-BRIEF §0: first-years with zero programming
-- background. Nothing here needs code knowledge. The few CS-flavoured questions
-- are answerable by reasoning about the words.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SOLO — multiple choice and image grid
-- ----------------------------------------------------------------------------

insert into public.challenges (id, kind, title, question, hint, glyph, time_limit, payload) values

('firewall', 'mcq', 'The Firewall',
 'Which of these guards a network against unauthorized access?',
 'It shares a name with a barrier that stops a blaze.', 'shield', 45,
 '{"options":[{"id":"a","label":"Router","glyph":"wave"},{"id":"b","label":"Firewall","glyph":"flame"},{"id":"c","label":"Switch","glyph":"box"},{"id":"d","label":"Modem","glyph":"circle"}]}'),

('open_source', 'mcq', 'Open Source',
 'What makes software "open source"?',
 'The clue is the word "source".', 'code', 45,
 '{"options":[{"id":"a","label":"It is always free of cost","glyph":"star"},{"id":"b","label":"Anyone can read and change the code","glyph":"code"},{"id":"c","label":"It only runs online","glyph":"wave"},{"id":"d","label":"It has no bugs","glyph":"hexagon"}]}'),

('odd_animal', 'image_grid', 'Odd One Out',
 'Which one does not belong with the others?',
 'Three of them share a home. One does not.', 'penguin', 35,
 '{"options":[{"id":"a","label":"Penguin","glyph":"penguin"},{"id":"b","label":"Dog","glyph":"dog"},{"id":"c","label":"Wave","glyph":"wave"},{"id":"d","label":"Droplet","glyph":"droplet"}]}'),

('peak_finder', 'image_grid', 'Peak Finder',
 'Which path leads straight to the highest summit flag?',
 'Look for the flag standing on the highest peak.', 'mountain', 35,
 '{"options":[{"id":"1","label":"North Ridge","glyph":"mountain"},{"id":"2","label":"Skyline Pass","glyph":"rocket"},{"id":"3","label":"Valley Loop","glyph":"wave"},{"id":"4","label":"Shadow Gulch","glyph":"shield"}]}'),

('liar_key', 'mcq', 'Exactly One Lies',
 'A says "B has the key". B says "D has the key". C says "I do not have the key". D says "B is lying". Exactly one statement is false. Who has the key?',
 'Try assuming each person holds it, and count how many statements break.', 'key', 90,
 '{"options":[{"id":"a","label":"A","glyph":"circle"},{"id":"b","label":"B","glyph":"key"},{"id":"c","label":"C","glyph":"triangle"},{"id":"d","label":"D","glyph":"hexagon"}]}'),

('shape_count', 'text_input', 'Count The Sides',
 'A triangle, a hexagon and a box are drawn on the blueprint. How many sides are there in total?',
 'Three, then six, then four.', 'hexagon', 40, '{}'),

-- ----------------------------------------------------------------------------
-- SOLO — observation and timing (Bible §11 and §12)
-- ----------------------------------------------------------------------------
-- These are the fast, tactile ones. `mode` in the payload tells the client
-- which micro-game to render; the answer key and the plausibility floor live
-- server-side like everything else.

('colour_trap', 'observe', 'Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Read it with your eyes, not your voice.', 'flame', 25,
 '{"mode":"colour_trap","word":"BLUE","ink":"red","choices":["red","blue","green","yellow"]}'),

('colour_trap_2', 'observe', 'Colour Trap II',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Your brain will read the word first. Ignore it.', 'droplet', 25,
 '{"mode":"colour_trap","word":"GREEN","ink":"yellow","choices":["red","blue","green","yellow"]}'),

('impostor', 'observe', 'Find The Impostor',
 'Every symbol in the grid is the same, except one. Tap it.',
 'Sweep row by row instead of staring at the middle.', 'search', 30,
 '{"mode":"impostor","fill":"circle","odd":"hexagon","count":16,"odd_index":11}'),

('impostor_2', 'observe', 'Find The Impostor II',
 'One of these is not like the others. Tap it.',
 'Check the corners first — that is where eyes skip.', 'search', 30,
 '{"mode":"impostor","fill":"triangle","odd":"star","count":25,"odd_index":19}'),

-- ----------------------------------------------------------------------------
-- SOCIAL — find and connect (Bible §3)
-- ----------------------------------------------------------------------------
-- The target is resolved per player at deal time by pick_target(), so the
-- question text says "your target" and the client fills in the number. The
-- prompts are the low-pressure kind §5 asks for: funny, safe, and short enough
-- that the room keeps moving.

('connect_useless', 'connect', 'New Friend Detected',
 'Find your target. Ask them: "What is your most useless talent?" Then both phones tap.',
 'Their vault number is on their screen. Just ask.', 'bubble', 120, '{}'),

('connect_hours', 'connect', 'Hundred Hours',
 'Find your target. Ask them: "What could you happily do for 100 hours?" Then both phones tap.',
 'Say your own answer first. It makes it easier for them.', 'headphones', 120, '{}'),

('connect_surprise', 'connect', 'Surprisingly Good',
 'Find your target. Ask them: "What is one thing you are surprisingly good at?" Then both phones tap.',
 'You are looking for one person, not the whole room.', 'star', 120, '{}'),

('connect_choice', 'connect', 'Pick A Side',
 'Find your target. Ask them: "Beach, mountains or city?" Then both phones tap.',
 'There is no wrong answer. That is the point.', 'mountain', 120, '{}'),

-- ----------------------------------------------------------------------------
-- SOCIAL — information exchange (Bible §4)
-- ----------------------------------------------------------------------------
-- You hold one number, your target holds another. Neither of you can answer
-- alone. build_board() generates the halves; confirm_connect() hands theirs
-- over only after a verified meeting.

('exchange_sum', 'exchange', 'Two Halves',
 'You each hold half of the combination. Find your target, meet, then add both numbers together.',
 'You cannot do this from your seat. Their half only arrives when you meet.', 'key', 150, '{}'),

('exchange_sum_2', 'exchange', 'Split Combination',
 'Your number is useless alone. Find your target, trade, and submit the total.',
 'Their number appears on your screen the moment they confirm.', 'terminal', 150, '{}'),

-- ----------------------------------------------------------------------------
-- SOCIAL — photo tasks
-- ----------------------------------------------------------------------------
-- No validation, by design — see record_photo(). You cannot fake these from a
-- chair, they need no adjudication, and they fill the hall display with the
-- best thing in the room, which is the room.

('photo_red', 'photo', 'Evidence: Red',
 'Photograph something red that is NOT a phone case. Anything in this room counts.',
 'Look at what people are wearing.', 'camera', 90, '{}'),

('photo_crew', 'photo', 'Evidence: The Crew',
 'Take a photo with someone you had not met before today. Both of you in frame.',
 'You have probably already met them doing another vault.', 'camera', 120, '{}'),

('photo_high', 'photo', 'Evidence: Altitude',
 'Photograph something from higher up than your own head.',
 'Arm up, screen down. You do not have to climb anything.', 'camera', 90, '{}'),

-- ----------------------------------------------------------------------------
-- SOCIAL — memory (Bible §6)
-- ----------------------------------------------------------------------------
-- Graded against the interaction log, so it is only answerable by someone who
-- was actually in the conversation. This is what makes the earlier meetings
-- mechanically matter instead of being a box to tick.

('recall_who', 'recall', 'Who Told You?',
 'Earlier, someone answered a question for you. Which vault number was it?',
 'Picture where you were standing when you asked.', 'bubble', 60, '{}')

on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, question = excluded.question,
  hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, payload = excluded.payload;

-- ----------------------------------------------------------------------------
-- BONUS VAULTS (Bible §13)
-- ----------------------------------------------------------------------------
-- Two are worth one regular vault, so they have to cost real time to be a real
-- decision. Harder, and on a shorter clock.

insert into public.challenges (id, kind, title, question, hint, glyph, time_limit, is_bonus, payload) values

('bonus_match', 'image_grid', 'Spot The Match',
 'Apple, banana, grapes, orange, grapes, banana, grapes, apple, grapes — which shows up most?',
 'Count them twice. Two of them tie on two each.', 'star', 30, true,
 '{"options":[{"id":"a","label":"Apple","glyph":"apple"},{"id":"b","label":"Banana","glyph":"banana"},{"id":"c","label":"Grapes","glyph":"grapes"},{"id":"d","label":"Orange","glyph":"orange"}]}'),

('bonus_trap', 'observe', 'Colour Trap: Hard',
 'Same rule, less time. Tap the COLOUR, not the word.',
 'Do not read it. Look at it.', 'flame', 15, true,
 '{"mode":"colour_trap","word":"YELLOW","ink":"blue","choices":["red","blue","green","yellow"]}'),

('bonus_double', 'connect', 'Double Up',
 'Find someone you have NOT met yet today. Ask what they thought of the last vault. Both phones tap.',
 'Anyone new counts. Repeat partners will be rejected.', 'rocket', 150, true, '{}')

on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, question = excluded.question,
  hint = excluded.hint, glyph = excluded.glyph, time_limit = excluded.time_limit,
  is_bonus = excluded.is_bonus, payload = excluded.payload;

-- ============================================================================
-- ANSWER KEY
-- ============================================================================
-- The half that never leaves the server. RLS on challenge_answers has no
-- policy, so this content is unreadable through the API by any role.

insert into public.challenge_answers (challenge_id, answer) values
  ('firewall',      '{"option":"b"}'),
  ('open_source',   '{"option":"b"}'),
  ('odd_animal',    '{"option":"b"}'),
  ('peak_finder',   '{"option":"1"}'),
  ('liar_key',      '{"option":"b"}'),
  -- Accepts the digits or the word, because a first-year typing "thirteen"
  -- has demonstrably done the puzzle.
  ('shape_count',   '{"text":["13","thirteen"]}'),
  -- min_ms is a floor on human reaction, not a speed score. Bible §12 asks for
  -- a generous window; this only rejects what a script would do.
  ('colour_trap',   '{"option":"red","min_ms":250}'),
  ('colour_trap_2', '{"option":"yellow","min_ms":250}'),
  ('impostor',      '{"option":"11","min_ms":300}'),
  ('impostor_2',    '{"option":"19","min_ms":300}'),
  ('bonus_match',   '{"option":"c"}'),
  ('bonus_trap',    '{"option":"blue","min_ms":200}')
on conflict (challenge_id) do update set answer = excluded.answer;

-- ============================================================================
-- REACTION LIBRARY
-- ============================================================================
-- Sixteen, not eighty. Every one has to earn its download on venue wifi, and a
-- reaction that fires constantly stops being funny by vault three — the whole
-- effect depends on them being rare enough to feel earned.
--
-- `trigger` is matched by src/lib/reactions.ts. `weight` biases the pick when
-- several share a trigger, so the same GIF does not open the game every time.
--
-- storage_path points into the `memes` bucket. Upload the files with the same
-- names and everything wires itself up — see scripts/upload-memes.md.

insert into public.memes (id, label, trigger, storage_path, weight) values
  -- Speed
  ('siu',        'Ronaldo SIUUU',            'fast_solve',     'speed/siu.gif',        2),
  ('mcqueen',    'Lightning McQueen',        'fast_solve',     'speed/mcqueen.gif',    1),
  ('flash',      'Flash running',            'fast_solve',     'speed/flash.gif',      1),
  ('spongebob',  'SpongeBob 3 Hours Later',  'slow_solve',     'speed/spongebob.gif',  1),
  ('mrbean',     'Mr Bean checking watch',   'slow_solve',     'speed/mrbean.gif',     1),
  ('ralph',      'I am in danger',           'timeout',        'speed/ralph.gif',      1),

  -- Streaks and big brain
  ('yachty',     'Lil Yachty laptop',        'streak_3',       'win/yachty.gif',       1),
  ('gatsby',     'DiCaprio cheers',          'streak_5',       'win/gatsby.gif',       1),
  ('galaxy',     'Galaxy brain',             'bonus_win',      'win/galaxy.gif',       1),
  ('captain',    'I am the captain now',     'rank_up',        'win/captain.gif',      1),
  ('thanos',     'Thanos I finally rest',    'vault_complete', 'win/thanos.gif',       1),

  -- Fails
  ('blud',       'Who invited my man blud',  'miss_3',         'fail/blud.gif',        1),
  ('thisisfine', 'This is fine dog',         'miss_3',         'fail/thisisfine.gif',  1),
  ('kevinhart',  'Kevin Hart aint no way',   'wrong',          'fail/kevinhart.gif',   1),
  ('egregious',  'Stephen A Smith',          'rank_down',      'fail/egregious.gif',   1),

  -- Social
  ('drakeclap',  'Drake clapping',           'first_connect',  'social/drakeclap.gif', 1),
  ('cinema',     'Absolute Cinema',          'photo_done',     'social/cinema.gif',    1)
on conflict (id) do update set
  label = excluded.label, trigger = excluded.trigger,
  storage_path = excluded.storage_path, weight = excluded.weight;

-- ============================================================================
-- A SESSION TO PLAY
-- ============================================================================
-- One lobby session so you can run the app the moment the SQL finishes. The
-- join code is fixed here rather than random so it can go straight on a slide.

insert into public.sessions (name, join_code, phase)
values ('CSI Induction', 'CSI1', 'lobby')
on conflict (join_code) do nothing;
