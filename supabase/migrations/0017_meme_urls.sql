-- ============================================================================
-- OPERATION VAULT — reactions from a URL instead of an upload
-- ============================================================================
-- Run after 0016_tumbler_fix.sql.
--
-- The reaction library assumed seventeen files uploaded into a storage bucket.
-- That is a real errand, and the bucket is still empty — so the layer has been
-- doing nothing since it was built.
--
-- A hosted URL is the same thing without the errand: paste a link, it works.
-- Both routes are supported and `url` wins where it is set, so a bucket file
-- and a link can coexist while you fill the gaps.
--
-- ONE TRADE WORTH KNOWING. A bucket file is served from the same origin as the
-- app and cannot disappear. A hosted link depends on that host being reachable
-- from the venue wifi and not blocked by the college network. If a link fails
-- the client falls back to the hand-lettered shout for that reaction, so the
-- worst case is the same as today — nothing breaks, you just do not see a GIF.
-- ============================================================================

alter table public.memes
  add column if not exists url text;

comment on column public.memes.url is
  'Absolute image URL. Takes precedence over storage_path. Must be a DIRECT '
  'image link ending .gif/.webp/.mp4 — a share page (tenor.com/view/...) is '
  'HTML and will not render.';

-- ----------------------------------------------------------------------------
-- Paste your links here
-- ----------------------------------------------------------------------------
-- Fill in the ones you have and run it. Blank lines are skipped, so this is
-- safe to re-run as you collect more — leave the rest as '' and come back.
--
-- On Tenor: right-click the GIF -> "Copy Image Address".
-- On a phone: long-press -> "Copy image link".
-- You want something like https://media.tenor.com/AbCdEf12345/name.gif

update public.memes m set url = nullif(v.link, '')
from (values
  -- id            direct image URL
  ('siu',          ''),   -- Ronaldo SIUUU              fast solve
  ('mcqueen',      ''),   -- Lightning McQueen          fast solve
  ('flash',        ''),   -- The Flash running          fast solve
  ('spongebob',    ''),   -- SpongeBob 3 hours later    slow solve
  ('mrbean',       ''),   -- Mr Bean watch              slow solve
  ('ralph',        ''),   -- I'm in danger              timeout
  ('yachty',       ''),   -- Lil Yachty laptop          3 streak
  ('gatsby',       ''),   -- DiCaprio cheers            5 streak
  ('galaxy',       ''),   -- Galaxy brain               bonus won
  ('captain',      ''),   -- I'm the captain now        took the lead
  ('thanos',       ''),   -- Thanos I finally rest      all nine vaults
  ('blud',         ''),   -- Who invited my man blud    3 misses
  ('thisisfine',   ''),   -- This is fine dog           3 misses
  ('kevinhart',    ''),   -- Ain't no way               single miss
  ('egregious',    ''),   -- Stephen A Smith            dropped rank
  ('drakeclap',    ''),   -- Drake clapping             first stranger met
  ('cinema',       '')    -- Absolute cinema            photo submitted
) as v(id, link)
where m.id = v.id and nullif(v.link, '') is not null;

-- ----------------------------------------------------------------------------
-- What actually landed
-- ----------------------------------------------------------------------------
-- Run this after pasting. `source` tells you what each reaction will use.

select
  m.trigger,
  m.id,
  case
    when m.url is not null then 'link'
    when o.id is not null  then 'bucket file'
    else 'shout only'
  end as source,
  coalesce(m.url, m.storage_path) as points_at
from public.memes m
left join storage.objects o
  on o.bucket_id = 'memes' and o.name = m.storage_path
where m.active
order by source, m.trigger, m.id;
