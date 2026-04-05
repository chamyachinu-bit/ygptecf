alter table public.app_settings
  add column if not exists demo_autofill_enabled boolean not null default false;
