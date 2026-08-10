-- ============================================================================
-- OPERATION VAULT — the real content pool
-- ============================================================================
-- Run after 0009_deal_and_content.sql.
--
-- The old pool was twenty rows and most of them were trivia with one right
-- answer you either knew or did not. That is the definition of dry: nothing to
-- *do*, no way in if you do not already know, and no satisfaction when you do.
--
-- What replaces it is chosen against one test — can a first-year with zero
-- programming background get there by THINKING, in under a minute, and feel
-- clever rather than examined? So: lateral puzzles, visual counting, pattern
-- spotting, wordplay, and riddles that give themselves away once you see them.
-- Almost nothing here rewards prior knowledge.
--
-- `category` is new, and it is what lets 0011 build themed vaults instead of
-- nine unrelated questions.
-- ============================================================================

alter table public.challenges
  add column if not exists category text not null default 'misc';

-- Backfill the existing rows so the stage planner in 0011 can see them.
update public.challenges set category = case
  when kind in ('connect')            then 'social'
  when kind in ('exchange')           then 'exchange'
  when kind in ('recall')             then 'memory'
  when kind in ('photo')              then 'photo'
  when kind in ('charades')           then 'perform'
  when kind in ('minigame')           then 'minigame'
  when kind in ('observe')            then 'observe'
  else 'think'
end
where category = 'misc';

-- ============================================================================
-- THINK — lateral, visual and wordplay. No prior knowledge.
-- ============================================================================

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit, payload) values

('t_sisters', 'mcq', 'think', 'Family Maths',
 'Riya has four brothers. Each brother has three sisters. How many girls are in the family?',
 'Count from a brother''s point of view. He does not count himself.', 'star', 60,
 '{"options":[{"id":"a","label":"One","glyph":"circle"},{"id":"b","label":"Three","glyph":"triangle"},{"id":"c","label":"Four","glyph":"box"},{"id":"d","label":"Seven","glyph":"hexagon"}]}'),

('t_bat', 'mcq', 'think', 'Bat And Ball',
 'A bat and a ball cost 110 rupees together. The bat costs 100 more than the ball. What does the ball cost?',
 'The obvious answer is wrong. Check it by adding them back up.', 'key', 75,
 '{"options":[{"id":"a","label":"10 rupees","glyph":"circle"},{"id":"b","label":"5 rupees","glyph":"star"},{"id":"c","label":"11 rupees","glyph":"box"},{"id":"d","label":"1 rupee","glyph":"triangle"}]}'),

('t_lilies', 'mcq', 'think', 'The Lake',
 'Lilies double in area every day and cover the whole lake on day 48. On which day is the lake half covered?',
 'Work backwards one single day.', 'droplet', 60,
 '{"options":[{"id":"a","label":"Day 24","glyph":"wave"},{"id":"b","label":"Day 47","glyph":"droplet"},{"id":"c","label":"Day 12","glyph":"leaf"},{"id":"d","label":"Day 46","glyph":"sun"}]}'),

('t_race', 'mcq', 'think', 'Overtaking',
 'You are running a race and you overtake the person in second place. What position are you in now?',
 'You took their place, not the leader''s.', 'rocket', 45,
 '{"options":[{"id":"a","label":"First","glyph":"star"},{"id":"b","label":"Second","glyph":"rocket"},{"id":"c","label":"Third","glyph":"circle"},{"id":"d","label":"Cannot tell","glyph":"hexagon"}]}'),

('t_match', 'mcq', 'think', 'One Match',
 'You walk into a dark room with one match, a candle, an oil lamp and a fireplace. What do you light first?',
 'Before any of them.', 'flame', 45,
 '{"options":[{"id":"a","label":"The candle","glyph":"flame"},{"id":"b","label":"The match","glyph":"lightning"},{"id":"c","label":"The lamp","glyph":"sun"},{"id":"d","label":"The fireplace","glyph":"box"}]}'),

('t_socks', 'text_input', 'think', 'Sock Drawer',
 'A drawer has 10 black socks and 10 white socks, all mixed up, in the dark. How many must you take out to be certain of a matching pair?',
 'Two might not match. What is the very next one?', 'box', 60, '{}'),

('t_eggs', 'mcq', 'think', 'Boiling',
 'It takes 5 minutes to boil one egg. How long to boil five eggs in the same pot at the same time?',
 'They all sit in the water together.', 'circle', 45,
 '{"options":[{"id":"a","label":"5 minutes","glyph":"circle"},{"id":"b","label":"25 minutes","glyph":"box"},{"id":"c","label":"10 minutes","glyph":"triangle"},{"id":"d","label":"15 minutes","glyph":"hexagon"}]}'),

('t_hole', 'mcq', 'think', 'Digging',
 'If two people dig two holes in two hours, how long do four people take to dig four holes?',
 'Everyone digs their own hole at the same time.', 'search', 45,
 '{"options":[{"id":"a","label":"Two hours","glyph":"circle"},{"id":"b","label":"One hour","glyph":"star"},{"id":"c","label":"Four hours","glyph":"box"},{"id":"d","label":"Eight hours","glyph":"hexagon"}]}'),

('t_word_odd', 'mcq', 'think', 'The Odd Word',
 'STONE · TONES · NOTES · ONSET · SNORE — which one does not belong?',
 'Four of them are made of exactly the same letters.', 'terminal', 60,
 '{"options":[{"id":"a","label":"STONE","glyph":"box"},{"id":"b","label":"NOTES","glyph":"terminal"},{"id":"c","label":"SNORE","glyph":"wind"},{"id":"d","label":"ONSET","glyph":"triangle"}]}'),

('t_sequence', 'mcq', 'think', 'What Comes Next',
 '1, 11, 21, 1211, 111221, … what comes next?',
 'Read the previous line out loud. Literally describe it.', 'code', 90,
 '{"options":[{"id":"a","label":"312211","glyph":"code"},{"id":"b","label":"111222","glyph":"box"},{"id":"c","label":"122112","glyph":"hexagon"},{"id":"d","label":"221121","glyph":"triangle"}]}'),

('t_letters', 'mcq', 'think', 'Missing Letter',
 'O · T · T · F · F · S · S · E · ? — what letter comes next?',
 'Say the numbers one, two, three out loud.', 'key', 75,
 '{"options":[{"id":"a","label":"N","glyph":"star"},{"id":"b","label":"T","glyph":"triangle"},{"id":"c","label":"E","glyph":"hexagon"},{"id":"d","label":"S","glyph":"circle"}]}'),

('t_month', 'text_input', 'think', 'Calendar Trick',
 'Some months have 31 days, some have 30. How many have 28 days?',
 'Read it again. It says "have", not "have only".', 'sun', 45, '{}'),

('t_elevator', 'mcq', 'think', 'The Lift',
 'A man lives on floor 20. Every morning he takes the lift down. Coming home he rides to floor 10 and walks the rest — unless it is raining, when he rides all the way. Why?',
 'What do you carry when it rains?', 'box', 90,
 '{"options":[{"id":"a","label":"He is short and cannot reach button 20","glyph":"circle"},{"id":"b","label":"He wants the exercise","glyph":"rocket"},{"id":"c","label":"The lift is broken above 10","glyph":"lightning"},{"id":"d","label":"He is afraid of heights","glyph":"triangle"}]}'),

('t_burning', 'mcq', 'think', 'Two Ropes',
 'Two ropes each burn for exactly 60 minutes, but not evenly. How do you measure 45 minutes?',
 'You are allowed to light a rope at BOTH ends.', 'flame', 120,
 '{"options":[{"id":"a","label":"Light rope A both ends and rope B one end; when A ends, light B''s other end","glyph":"flame"},{"id":"b","label":"Light both ropes at one end each","glyph":"lightning"},{"id":"c","label":"Cut one rope exactly in half","glyph":"box"},{"id":"d","label":"Light both ropes at both ends","glyph":"sun"}]}'),

('t_hallway', 'text_input', 'think', 'Count The Squares',
 'A 3 by 3 grid is drawn on the blueprint. How many squares of ANY size can you count in it?',
 'Nine small ones, plus the bigger ones sitting across them.', 'hexagon', 90, '{}'),

('t_handshake', 'text_input', 'think', 'Handshakes',
 'Five people in a room each shake hands with every other person exactly once. How many handshakes happen?',
 'The first person shakes four hands, the next three new ones, and so on.', 'bubble', 75, '{}'),

('t_river', 'mcq', 'think', 'The Crossing',
 'You must ferry a wolf, a goat and a cabbage across a river. The boat holds you plus one. Alone together, the wolf eats the goat and the goat eats the cabbage. What goes first?',
 'Whichever one is dangerous to BOTH of the others.', 'wave', 90,
 '{"options":[{"id":"a","label":"The goat","glyph":"leaf"},{"id":"b","label":"The wolf","glyph":"dog"},{"id":"c","label":"The cabbage","glyph":"leaf"},{"id":"d","label":"It cannot be done","glyph":"hexagon"}]}'),

('t_coin', 'mcq', 'think', 'Heavier',
 'You have nine identical-looking coins. One is heavier. Using a balance scale, what is the fewest weighings that GUARANTEES finding it?',
 'Split into three groups, not two.', 'key', 90,
 '{"options":[{"id":"a","label":"Two","glyph":"star"},{"id":"b","label":"Three","glyph":"triangle"},{"id":"c","label":"Four","glyph":"box"},{"id":"d","label":"Eight","glyph":"hexagon"}]}'),

('t_emoji1', 'mcq', 'think', 'Rebus',
 'A picture of a BEE, then a LEAF. What word is it?',
 'Say the two pictures out loud, one after the other.', 'leaf', 45,
 '{"options":[{"id":"a","label":"Believe","glyph":"star"},{"id":"b","label":"Beehive","glyph":"box"},{"id":"c","label":"Belief","glyph":"leaf"},{"id":"d","label":"Beleaf","glyph":"triangle"}]}'),

('t_mirror', 'mcq', 'think', 'Mirror Words',
 'Which of these words reads the same forwards and backwards?',
 'Try spelling each one in reverse.', 'search', 45,
 '{"options":[{"id":"a","label":"LEVEL","glyph":"box"},{"id":"b","label":"STRESS","glyph":"flame"},{"id":"c","label":"DESSERT","glyph":"star"},{"id":"d","label":"SILVER","glyph":"circle"}]}')

on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, payload = excluded.payload;

-- ============================================================================
-- OBSERVE — fast, visual, tap-and-go
-- ============================================================================

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit, payload) values
('o_trap_3', 'observe', 'observe', 'Colour Trap',
 'Tap the COLOUR the word is printed in. Not the word.',
 'Squint. It stops the reading reflex.', 'droplet', 25,
 '{"mode":"colour_trap","word":"RED","ink":"green","choices":["red","blue","green","yellow"]}'),

('o_imp_3', 'observe', 'observe', 'Find The Impostor',
 'One symbol is not like the rest. Tap it.',
 'Scan the edges first — eyes always start in the middle.', 'search', 30,
 '{"mode":"impostor","fill":"star","odd":"sun","count":25,"odd_index":6}'),

('o_imp_4', 'observe', 'observe', 'Impostor: Dense',
 'Thirty-six of them, one is wrong. Tap it.',
 'Go row by row. Do not try to see it all at once.', 'search', 35,
 '{"mode":"impostor","fill":"droplet","odd":"wave","count":36,"odd_index":29}')
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit, payload = excluded.payload;

-- ============================================================================
-- SOCIAL — more prompts, so the room is not asking one question all night
-- ============================================================================

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit) values
('s_food',    'connect', 'social', 'Settle It',
 'Find your target. Ask: "Best thing to eat at 2am?" Then both phones tap.',
 'Answer first. It makes them answer.', 'flame', 120),
('s_song',    'connect', 'social', 'On Repeat',
 'Find your target. Ask: "What song have you played to death?" Then both phones tap.',
 'They will have one. Everybody has one.', 'headphones', 120),
('s_school',  'connect', 'social', 'Before This',
 'Find your target. Ask: "Which school did you come from, and one thing you miss?" Then both phones tap.',
 'This is the easiest one to start a real conversation with.', 'bubble', 120),
('s_super',   'connect', 'social', 'Pick A Power',
 'Find your target. Ask: "Fly, or turn invisible?" Then both phones tap.',
 'Ask them why. That is the fun part.', 'rocket', 120),
('s_worst',   'connect', 'social', 'The Worst Take',
 'Find your target. Ask: "What is your most controversial food opinion?" Then both phones tap.',
 'Pineapple is a valid answer and you know it.', 'apple', 120),
('s_pet',     'connect', 'social', 'Name The Pet',
 'Find your target. Ask: "If you got a dog tomorrow, what would you name it?" Then both phones tap.',
 'The answer is always better than you expect.', 'dog', 120)
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit;

-- ============================================================================
-- PHOTO — more to hunt for
-- ============================================================================

insert into public.challenges (id, kind, category, title, question, hint, glyph, time_limit) values
('p_shoes',  'photo', 'photo', 'Evidence: Footwear',
 'Photograph the most interesting pair of shoes in this room. Ask first.',
 'Somebody wore something good today.', 'camera', 90),
('p_group',  'photo', 'photo', 'Evidence: Three',
 'Get a photo with THREE other people in frame. All four of you.',
 'Grab the nearest group. They are doing this too.', 'camera', 120),
('p_sign',   'photo', 'photo', 'Evidence: Signage',
 'Photograph any sign, poster or notice in this building with a number on it.',
 'Corridors are full of them.', 'camera', 90),
('p_hands',  'photo', 'photo', 'Evidence: Five Hands',
 'Photograph exactly five hands stacked on top of each other.',
 'That is you plus four people. Go ask.', 'camera', 120)
on conflict (id) do update set
  kind = excluded.kind, category = excluded.category, title = excluded.title,
  question = excluded.question, hint = excluded.hint, glyph = excluded.glyph,
  time_limit = excluded.time_limit;

-- ============================================================================
-- ANSWER KEY
-- ============================================================================

insert into public.challenge_answers (challenge_id, answer) values
  ('t_sisters',   '{"option":"b"}'),
  ('t_bat',       '{"option":"b"}'),
  ('t_lilies',    '{"option":"b"}'),
  ('t_race',      '{"option":"b"}'),
  ('t_match',     '{"option":"b"}'),
  ('t_socks',     '{"text":["3","three"]}'),
  ('t_eggs',      '{"option":"a"}'),
  ('t_hole',      '{"option":"a"}'),
  ('t_word_odd',  '{"option":"c"}'),
  ('t_sequence',  '{"option":"a"}'),
  ('t_letters',   '{"option":"a"}'),
  ('t_month',     '{"text":["12","twelve","all","all of them"]}'),
  ('t_elevator',  '{"option":"a"}'),
  ('t_burning',   '{"option":"a"}'),
  ('t_hallway',   '{"text":["14","fourteen"]}'),
  ('t_handshake', '{"text":["10","ten"]}'),
  ('t_river',     '{"option":"a"}'),
  ('t_coin',      '{"option":"a"}'),
  ('t_emoji1',    '{"option":"c"}'),
  ('t_mirror',    '{"option":"a"}'),
  ('o_trap_3',    '{"option":"green","min_ms":250}'),
  ('o_imp_3',     '{"option":"6","min_ms":300}'),
  ('o_imp_4',     '{"option":"29","min_ms":350}')
on conflict (challenge_id) do update set answer = excluded.answer;

-- ============================================================================
-- MORE CHARADES WORDS
-- ============================================================================

insert into public.charade_words (id, word, decoys, level) values
  ('umbrella',  'Opening an umbrella',  array['Opening a door','Putting on a jacket','Unfolding a map'], 1),
  ('teeth',     'Brushing teeth',       array['Washing hands','Combing hair','Shaving'], 1),
  ('cat',       'A cat',                array['A dog','A rabbit','A mouse'], 1),
  ('swimming',  'Swimming',             array['Flying','Climbing','Digging'], 1),
  ('shoelace',  'Tying a shoelace',     array['Wrapping a gift','Knitting','Folding clothes'], 2),
  ('bus',       'Running for a bus',    array['Chasing a dog','Racing a friend','Escaping rain'], 2),
  ('spicy',     'Eating something too spicy', array['Eating something sour','Eating ice cream','Drinking hot tea'], 2),
  ('phone',     'Phone battery dying',  array['Losing your phone','Dropping your phone','Screen cracked'], 2),
  ('queue',     'Waiting in a long queue', array['Waiting for a lift','Standing in assembly','Watching a match'], 3),
  ('groupproj', 'Doing all the group project work', array['Presenting alone','Losing homework','Failing a test'], 3),
  ('nointernet','No internet connection', array['Low battery','Wrong password','Phone on silent'], 3),
  ('sleepy',    'Falling asleep in class', array['Daydreaming','Taking notes','Raising your hand'], 3)
on conflict (id) do update set
  word = excluded.word, decoys = excluded.decoys, level = excluded.level;

-- ============================================================================
-- MORE DICTIONARY
-- ============================================================================
-- Extends the WordBuild wordlist so the seeded letter sets have more valid
-- answers. A game where you build a real word and are told it is not a word is
-- the single most infuriating failure this app could produce.

insert into public.words (w)
select unnest(array[
  'alert','alter','later','ratel','taler','antes','nates','stane','neats',
  'lares','laser','earls','reals','seral','arles','tesla','least','setal',
  'slate','steal','stale','tales','teals','antler','learnt','rental','sterna',
  'astern','stoic','optics','topics','poetic','mopes','tempo','impost',
  'crated','carted','redact','traced','decant','cadres','sacred','scared',
  'broken','bonkers','beacon','baleen','enable','nobles','albeit',
  'purist','sprite','esprit','ripest','tripes','priest','stripe','purse',
  'hamster','thermal','harmset','master','stream','tamers','armets',
  'onwards','sandwor','wander','warden','drawns','sword','words','rowdn',
  'petals','plates','pastel','staple','pleats','palest','septal',
  'ensure','sunier','insure','urines','reigns','singer','signer','resign',
  'coiled','docile','codeil','cradle','credal','reclad','decals','scaled'
]) on conflict do nothing;
