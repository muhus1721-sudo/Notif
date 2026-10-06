-- CivilAid — Storage buckets and their access rules
--
--   videos               private  path: <module_id>/<file>.mp4   read via short-lived signed URLs
--   payment-screenshots  private  path: <user_id>/<file>.jpg     student uploads, admin reviews
--   note-images          public   path: <module_id>/<file>.png    images embedded in notes

insert into storage.buckets (id, name, public, allowed_mime_types)
values
  ('videos',              'videos',              false, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('payment-screenshots', 'payment-screenshots', false, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('note-images',         'note-images',         true,  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

-- Payment screenshots are capped at 5 MB.
update storage.buckets set file_size_limit = 5 * 1024 * 1024 where id = 'payment-screenshots';

-- '<uuid>/...' → uuid, or null when the first folder isn't a uuid.
create function public.path_uuid(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Admins manage every bucket.
create policy "admin all storage" on storage.objects
  for all to authenticated
  using (bucket_id in ('videos', 'payment-screenshots', 'note-images') and public.is_admin())
  with check (bucket_id in ('videos', 'payment-screenshots', 'note-images') and public.is_admin());

-- Students can create a signed URL for a video only if they may open its module.
create policy "read unlocked videos" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and public.can_access_module(public.path_uuid(name)));

-- Students upload into, and read from, their own folder only. No updates or deletes.
create policy "upload own payment screenshot" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-screenshots' and public.path_uuid(name) = (select auth.uid()));

create policy "read own payment screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-screenshots' and public.path_uuid(name) = (select auth.uid()));
