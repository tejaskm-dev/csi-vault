-- ============================================================================
-- OPERATION VAULT — storage buckets
-- ============================================================================
-- Run after 0002_rpc.sql.
--
-- Two buckets, and they have opposite shapes:
--
--   photos  written by sixty phones, read by the hall display. Uploads are
--           locked to a per-phone folder so nobody can overwrite anyone.
--   memes   written once by you, read by everyone. Static assets that happen
--           to live in Supabase rather than the bundle.
-- ============================================================================

-- Public read on both. These are photos of a college corridor and reaction
-- GIFs — signing every URL would cost a round trip per image on the projector
-- and protect nothing. The write policies are where the care goes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', true, 8388608,
   array['image/jpeg','image/png','image/webp','image/heic']),
  ('memes',  'memes',  true, 5242880,
   array['image/gif','image/webp','video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- photos
-- ----------------------------------------------------------------------------
-- The first path segment must be the caller's own auth uid: `<uid>/<file>`.
-- That single rule is what stops one student from overwriting another's photo,
-- and it is why record_photo() checks the same prefix before it will accept the
-- row. An 8MB cap keeps a modern phone camera from parking the upload for a
-- minute on venue wifi — the client downscales before sending anyway.

drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_view on storage.objects;
create policy photos_view on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos');

-- Replacing your own shot is fine — the first attempt is usually a blur or a
-- thumb over the lens. Deleting is not exposed: the host hides a photo by
-- flipping `photos.visible`, which keeps the record.
drop policy if exists photos_replace on storage.objects;
create policy photos_replace on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- memes
-- ----------------------------------------------------------------------------
-- Read-only to the room. Upload these yourself from the dashboard, or with the
-- script in scripts/upload-memes.md — there is no client-side write policy,
-- because a player who can write to the meme bucket can put anything on the
-- projector.

drop policy if exists memes_view on storage.objects;
create policy memes_view on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'memes');
