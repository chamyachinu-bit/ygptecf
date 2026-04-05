do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'bot'
      and enumtypid = 'user_role'::regtype
  ) then
    alter type public.user_role add value 'bot';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'designer'
      and enumtypid = 'user_role'::regtype
  ) then
    alter type public.user_role add value 'designer';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'social_media_team'
      and enumtypid = 'user_role'::regtype
  ) then
    alter type public.user_role add value 'social_media_team';
  end if;
end $$;

alter table public.app_settings
  add column if not exists bot_test_email text,
  add column if not exists designer_test_email text,
  add column if not exists social_media_team_test_email text;
