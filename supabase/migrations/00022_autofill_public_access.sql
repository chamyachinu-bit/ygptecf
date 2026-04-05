-- Let any authenticated user check the autofill setting without exposing
-- other app_settings fields (script secrets, test emails, etc.)
create or replace function public.get_demo_autofill_enabled()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(demo_autofill_enabled, false)
  from public.app_settings
  where id = 'global'
  limit 1;
$$;

grant execute on function public.get_demo_autofill_enabled() to authenticated;
