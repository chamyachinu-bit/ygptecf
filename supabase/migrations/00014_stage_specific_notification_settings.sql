alter table public.app_settings
  add column if not exists notification_test_mode text not null default 'all_stages'
    check (notification_test_mode in ('off', 'all_stages', 'stage_specific')),
  add column if not exists regional_coordinator_test_email text,
  add column if not exists events_team_test_email text,
  add column if not exists finance_team_test_email text,
  add column if not exists accounts_team_test_email text,
  add column if not exists admin_test_email text;
