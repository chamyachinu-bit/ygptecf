-- ============================================================
-- EPF / ECR workflow extensions
-- ============================================================

alter type public.event_status add value if not exists 'report_submitted';

alter table public.events
  add column if not exists event_code text,
  add column if not exists goal text,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists participant_profile text,
  add column if not exists coordinator_name text,
  add column if not exists coordinator_phone text,
  add column if not exists coordinator_email text,
  add column if not exists requires_budget boolean not null default true,
  add column if not exists budget_justification text,
  add column if not exists social_media_required boolean not null default false,
  add column if not exists social_media_channels text[] not null default '{}',
  add column if not exists social_media_requirements text,
  add column if not exists social_media_caption text;

update public.events
set
  event_code = coalesce(event_code, upper(left(region, 3) || to_char(event_date, 'MON') || lpad(extract(day from event_date)::text, 2, '0'))),
  coordinator_name = coalesce(coordinator_name, (select full_name from public.profiles where profiles.id = events.created_by)),
  coordinator_email = coalesce(coordinator_email, (select email from public.profiles where profiles.id = events.created_by)),
  coordinator_phone = coalesce(coordinator_phone, (select phone from public.profiles where profiles.id = events.created_by))
where event_code is null
   or coordinator_name is null
   or coordinator_email is null;

alter table public.events
  alter column event_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_event_code_format'
  ) then
    alter table public.events
      add constraint events_event_code_format
      check (event_code ~ '^[A-Z]{3}[A-Z]{3}[0-9]{2}$');
  end if;
end $$;

create unique index if not exists idx_events_event_code
  on public.events(event_code);

alter table public.budgets
  add column if not exists justification text;

alter table public.event_reports
  add column if not exists execution_details text,
  add column if not exists social_media_writeup text,
  add column if not exists donations_received numeric(12,2) not null default 0,
  add column if not exists donation_notes text,
  add column if not exists actual_start_time time,
  add column if not exists actual_end_time time,
  add column if not exists actual_location text,
  add column if not exists follow_up_actions text;

create or replace function public.handle_event_report_submission()
returns trigger language plpgsql security definer as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = new.event_id;

  update public.events
  set status = 'report_submitted',
      current_reviewer = null,
      updated_at = now()
  where id = new.event_id
    and status in ('completed', 'funded', 'report_submitted');

  insert into public.audit_logs(event_id, user_id, action, new_value)
  values (
    new.event_id,
    new.submitted_by,
    'report_submitted',
    jsonb_build_object(
      'actual_attendees', new.actual_attendees,
      'donations_received', new.donations_received
    )
  );

  insert into public.notifications(user_id, event_id, type, title, message)
  select
    p.id,
    new.event_id,
    'status_changed',
    'Post-Event Report Submitted',
    'The post-event report for "' || v_event.title || '" has been submitted and is ready for review.'
  from public.profiles p
  where p.role = 'admin'
    and p.is_active = true
    and p.id <> new.submitted_by;

  return new;
end;
$$;

drop trigger if exists on_event_report_insert on public.event_reports;

create trigger on_event_report_insert
  after insert on public.event_reports
  for each row execute function public.handle_event_report_submission();
