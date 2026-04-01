-- ============================================================
-- Admin-managed application settings
-- ============================================================

create table if not exists public.app_settings (
  id text primary key default 'global',
  media_drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values ('global')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings_admin_read"
  on public.app_settings for select
  using (public.get_my_role() = 'admin');

create policy "app_settings_admin_update"
  on public.app_settings for update
  using (public.get_my_role() = 'admin');

create policy "app_settings_admin_insert"
  on public.app_settings for insert
  with check (public.get_my_role() = 'admin');

drop trigger if exists set_updated_at_app_settings on public.app_settings;

create trigger set_updated_at_app_settings
  before update on public.app_settings
  for each row execute function public.handle_updated_at();
