-- ============================================================================
-- OPERATION VAULT — reactions as video
-- ============================================================================
-- Run after 0018_meme_links.sql. Replaces the GIF links.
--
-- WHY THIS EXISTS. The links in 0018 appeared frozen, and the reason was my
-- own optimisation: I picked the smallest Tenor variant that was wide enough
-- in PIXELS and never checked FRAME COUNT. Several of those variants are
-- single-frame preview stills. I verified the wrong property and shipped it.
--
-- Checking properly (counting Graphic Control Extension blocks) found 3 of 17
-- fully static and several more at 2-5 frames, which read as static too.
--
-- The fix is mp4 rather than a bigger GIF. Tenor serves both, and the mp4 is
-- roughly fifteen times smaller for the same animation:
--
--     cinema    7459KB gif  ->  213KB mp4
--     yachty    2935KB gif  ->   67KB mp4
--     TOTAL     14.11MB     ->  0.90MB
--
-- The client renders <video autoplay loop muted playsinline> when the URL is
-- mp4, and <img> otherwise, so an uploaded GIF still works.
-- ============================================================================

update public.memes m set url = v.link
from (values
  ('siu', 'https://media.tenor.com/67iB7B7g59YAAAP2/siu-ronaldo-siu.mp4'),
  ('mcqueen', 'https://media1.tenor.com/m/l6CJxGWdYAoAAAP2/speed-i-am-speed.mp4'),
  ('flash', 'https://media1.tenor.com/m/OwdSpEHgiyIAAAP2/flash-run.mp4'),
  ('spongebob', 'https://media1.tenor.com/m/gZbV9yKMj7wAAAP2/baylor-baste.mp4'),
  ('mrbean', 'https://media1.tenor.com/m/LMz_TrIOxV8AAAP2/mr-bean-mrbean.mp4'),
  ('ralph', 'https://media1.tenor.com/m/I6GFaw6IR3YAAAP2/chuckles-im-in-danger.mp4'),
  ('yachty', 'https://media1.tenor.com/m/b33trNTjXjsAAAP2/lil-yachty-drake.mp4'),
  ('gatsby', 'https://media1.tenor.com/m/T3XQ9NypAfwAAAP2/gatsby.mp4'),
  ('galaxy', 'https://media1.tenor.com/m/BLOZw5VmYA8AAAP2/brain.mp4'),
  ('captain', 'https://media1.tenor.com/m/vLZmTD9VtB0AAAP2/captain-phillips-boat-hijack.mp4'),
  ('thanos', 'https://media1.tenor.com/m/PmVtBx_QTg0AAAP2/thanos-avenger.mp4'),
  ('blud', 'https://media1.tenor.com/m/FDn8EXRgzDsAAAP2/meme.mp4'),
  ('thisisfine', 'https://media1.tenor.com/m/fKIG2kiLVPgAAAP2/this-is-fine-its-fine.mp4'),
  ('kevinhart', 'https://media1.tenor.com/m/d1R4U2dIvNoAAAP2/kevin-hart-wtf.mp4'),
  ('egregious', 'https://media1.tenor.com/m/s0IsxkXYwEAAAAP2/outrageous-egregious-preposterous-jackie-chiles.mp4'),
  ('drakeclap', 'https://media1.tenor.com/m/Ma-0459VEbQAAAP2/drake.mp4'),
  ('cinema', 'https://media1.tenor.com/m/IE_96HNEraIAAAP2/absolute-cinema.mp4')
) as v(id, link)
where m.id = v.id;

select id, trigger, url from public.memes where active order by trigger, id;
