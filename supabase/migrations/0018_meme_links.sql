-- ============================================================================
-- OPERATION VAULT — reaction GIF links
-- ============================================================================
-- Run after 0017_meme_urls.sql. Re-runnable.
--
-- Resolved from the Tenor share links, then size-checked: every URL below was
-- downloaded and confirmed to serve a real image. Tenor variant suffixes were
-- swapped for the smallest version still large enough for the 190px sticker,
-- which took the set from 40MB to 3.6MB — the originals included a 7.4MB GIF,
-- which on college wifi would have arrived some time after the reaction was
-- over.
--
-- A phone only fetches reactions that actually fire, and the 12s cooldown means
-- a full run shows four or five. Real cost per player is a few hundred KB.
-- ============================================================================

update public.memes m set url = v.link
from (values
  ('siu', 'https://media.tenor.com/67iB7B7g59YAAAAe/siu-ronaldo-siu.gif'),
  ('mcqueen', 'https://media1.tenor.com/m/l6CJxGWdYAoAAAAe/speed-i-am-speed.gif'),
  ('flash', 'https://media1.tenor.com/m/OwdSpEHgiyIAAAAM/flash-run.gif'),
  ('spongebob', 'https://media1.tenor.com/m/gZbV9yKMj7wAAAAM/baylor-baste.gif'),
  ('mrbean', 'https://media1.tenor.com/m/LMz_TrIOxV8AAAAM/mr-bean-mrbean.gif'),
  ('ralph', 'https://media1.tenor.com/m/I6GFaw6IR3YAAAAe/chuckles-im-in-danger.gif'),
  ('yachty', 'https://media1.tenor.com/m/b33trNTjXjsAAAAS/lil-yachty-drake.gif'),
  ('gatsby', 'https://media1.tenor.com/m/T3XQ9NypAfwAAAAM/gatsby.gif'),
  ('galaxy', 'https://media1.tenor.com/m/BLOZw5VmYA8AAAAd/brain.gif'),
  ('captain', 'https://media1.tenor.com/m/vLZmTD9VtB0AAAAM/captain-phillips-boat-hijack.gif'),
  ('thanos', 'https://media1.tenor.com/m/PmVtBx_QTg0AAAAM/thanos-avenger.gif'),
  ('blud', 'https://media1.tenor.com/m/FDn8EXRgzDsAAAAM/meme.gif'),
  ('thisisfine', 'https://media1.tenor.com/m/fKIG2kiLVPgAAAAe/this-is-fine-its-fine.gif'),
  ('kevinhart', 'https://media1.tenor.com/m/d1R4U2dIvNoAAAAe/kevin-hart-wtf.gif'),
  ('egregious', 'https://media1.tenor.com/m/s0IsxkXYwEAAAAAe/outrageous-egregious-preposterous-jackie-chiles.gif'),
  ('drakeclap', 'https://media1.tenor.com/m/Ma-0459VEbQAAAAe/drake.gif'),
  ('cinema', 'https://media1.tenor.com/m/IE_96HNEraIAAAAM/absolute-cinema.gif')
) as v(id, link)
where m.id = v.id;

-- Confirm: every row should read 'link'.
select trigger, id,
       case when url is not null then 'link' else 'shout only' end as source
from public.memes where active order by trigger, id;
