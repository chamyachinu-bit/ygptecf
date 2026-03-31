-- ============================================================
-- Storage bucket setup
-- Run this in Supabase SQL editor after enabling Storage
-- ============================================================

-- Create the event-files bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-files',
  'event-files',
  false,
  10485760,  -- 10MB max
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- ============================================================
-- Storage RLS policies
-- ============================================================

-- Users upload to their own folder: {user_id}/{event_id}/filename
create policy "users_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'event-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read files for events they have access to
create policy "users_read_event_files"
  on storage.objects for select
  using (
    bucket_id = 'event-files'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('events_team', 'finance_team', 'accounts_team', 'admin')
      )
    )
  );

-- Users can delete their own files
create policy "users_delete_own_files"
  on storage.objects for delete
  using (
    bucket_id = 'event-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
