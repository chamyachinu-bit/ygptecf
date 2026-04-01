-- ============================================================
-- Notification email templates and test-recipient override
-- ============================================================

alter table public.app_settings
  add column if not exists notification_test_email text;

create table if not exists public.notification_templates (
  id uuid primary key default uuid_generate_v4(),
  recipient_role user_role not null,
  notification_type notification_type not null,
  subject_template text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipient_role, notification_type)
);

alter table public.notification_templates enable row level security;

create policy "notification_templates_admin_read"
  on public.notification_templates for select
  using (public.get_my_role() = 'admin');

create policy "notification_templates_admin_insert"
  on public.notification_templates for insert
  with check (public.get_my_role() = 'admin');

create policy "notification_templates_admin_update"
  on public.notification_templates for update
  using (public.get_my_role() = 'admin');

drop trigger if exists set_updated_at_notification_templates on public.notification_templates;

create trigger set_updated_at_notification_templates
  before update on public.notification_templates
  for each row execute function public.handle_updated_at();

insert into public.notification_templates (recipient_role, notification_type, subject_template, body_template)
values
  (
    'regional_coordinator',
    'status_changed',
    'YGPT EVENT: {{event_title}} status updated to {{event_status}}',
    E'Hello {{recipient_name}},\n\nYour event "{{event_title}}" ({{event_code}}) is now "{{event_status}}".\n\nUpdate:\n{{notification_message}}\n\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nOpen the system here:\n{{event_link}}\n'
  ),
  (
    'regional_coordinator',
    'approval_required',
    'YGPT EVENT: action needed for {{event_title}}',
    E'Hello {{recipient_name}},\n\nYour event "{{event_title}}" ({{event_code}}) needs attention.\n\nDetails:\n{{notification_message}}\n\nOpen the system here:\n{{event_link}}\n'
  ),
  (
    'regional_coordinator',
    'budget_flagged',
    'YGPT EVENT: budget flagged for {{event_title}}',
    E'Hello {{recipient_name}},\n\nThe budget for "{{event_title}}" ({{event_code}}) has been flagged.\n\nReason:\n{{notification_message}}\n\nOpen the system here:\n{{event_link}}\n'
  ),
  (
    'events_team',
    'approval_required',
    'Events Team Review Needed: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA proposal is waiting for Events Team review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n'
  ),
  (
    'events_team',
    'status_changed',
    'Events Team Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'events_team',
    'budget_flagged',
    'Events Team Budget Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'finance_team',
    'approval_required',
    'Finance Review Needed: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA proposal is waiting for Finance review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n'
  ),
  (
    'finance_team',
    'status_changed',
    'Finance Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'finance_team',
    'budget_flagged',
    'Finance Budget Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'accounts_team',
    'approval_required',
    'Accounts Approval Needed: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA proposal is waiting for Accounts review.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nReview it here:\n{{event_link}}\n'
  ),
  (
    'accounts_team',
    'status_changed',
    'Accounts Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'accounts_team',
    'budget_flagged',
    'Accounts Budget Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'admin',
    'approval_required',
    'Admin Alert: {{event_title}} needs attention',
    E'Hello {{recipient_name}},\n\nAdministrative attention is needed for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'admin',
    'status_changed',
    'Admin Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'admin',
    'budget_flagged',
    'Admin Budget Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  )
on conflict (recipient_role, notification_type) do nothing;
