alter table public.notifications
  add column if not exists link_path text;

create table if not exists public.flyer_requests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  assigned_designer uuid references public.profiles(id) on delete set null,
  approver_id uuid references public.profiles(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'submitted', 'approved', 'rejected', 'released')),
  drive_link text,
  notes text,
  approval_notes text,
  approved_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_workflow_items (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  assigned_social_owner uuid references public.profiles(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'submitted', 'approved', 'rejected', 'completed')),
  drive_link text,
  content_notes text,
  caption_text text,
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_flyer_requests_status on public.flyer_requests(status);
create index if not exists idx_flyer_requests_designer on public.flyer_requests(assigned_designer);
create index if not exists idx_social_workflow_status on public.social_workflow_items(status);
create index if not exists idx_social_workflow_owner on public.social_workflow_items(assigned_social_owner);

alter table public.flyer_requests enable row level security;
alter table public.social_workflow_items enable row level security;

drop policy if exists "flyer_requests_select" on public.flyer_requests;
create policy "flyer_requests_select" on public.flyer_requests
  for select using (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'designer'
    or requested_by = auth.uid()
  );

drop policy if exists "flyer_requests_upsert" on public.flyer_requests;
create policy "flyer_requests_upsert" on public.flyer_requests
  for all using (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'designer'
  )
  with check (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'designer'
  );

drop policy if exists "social_workflow_select" on public.social_workflow_items;
create policy "social_workflow_select" on public.social_workflow_items
  for select using (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'social_media_team'
    or requested_by = auth.uid()
  );

drop policy if exists "social_workflow_upsert" on public.social_workflow_items;
create policy "social_workflow_upsert" on public.social_workflow_items
  for all using (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'social_media_team'
  )
  with check (
    public.get_my_role() = 'admin'
    or public.get_my_role() = 'social_media_team'
  );

drop trigger if exists set_updated_at_flyer_requests on public.flyer_requests;
create trigger set_updated_at_flyer_requests
  before update on public.flyer_requests
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_social_workflow_items on public.social_workflow_items;
create trigger set_updated_at_social_workflow_items
  before update on public.social_workflow_items
  for each row execute function public.handle_updated_at();

insert into public.flyer_requests (event_id, requested_by, status)
select e.id, e.created_by, 'requested'
from public.events e
where e.social_media_required = true
  and e.status in ('submitted', 'events_approved', 'finance_approved', 'funded', 'completed', 'report_submitted')
on conflict (event_id) do nothing;

insert into public.social_workflow_items (event_id, requested_by, status)
select e.id, e.created_by, 'requested'
from public.events e
join public.event_reports er on er.event_id = e.id
where e.status in ('completed', 'report_submitted', 'archived')
on conflict (event_id) do nothing;

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (
    public.get_my_role() = 'admin'
    or created_by = auth.uid()
    or public.get_my_role() in (
      'events_team',
      'finance_team',
      'accounts_team',
      'bot'
    )
  );

drop policy if exists "budgets_select" on public.budgets;
create policy "budgets_select" on public.budgets
  for select using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          public.get_my_role() = 'admin'
          or e.created_by = auth.uid()
          or public.get_my_role() in (
            'events_team',
            'finance_team',
            'accounts_team',
            'bot'
          )
        )
    )
  );

drop policy if exists "approvals_select" on public.approvals;
create policy "approvals_select" on public.approvals
  for select using (
    public.get_my_role() = 'admin'
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.created_by = auth.uid()
    )
    or public.get_my_role() in (
      'events_team',
      'finance_team',
      'accounts_team',
      'bot'
    )
  );

drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files
  for select using (
    public.get_my_role() = 'admin'
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in (
            'events_team',
            'finance_team',
            'accounts_team',
            'bot'
          )
        )
    )
  );

drop policy if exists "event_reports_select" on public.event_reports;
create policy "event_reports_select" on public.event_reports
  for select using (
    public.get_my_role() = 'admin'
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in (
            'events_team',
            'finance_team',
            'accounts_team',
            'bot'
          )
        )
    )
  );

drop policy if exists "approval_comments_select" on public.approval_comments;
create policy "approval_comments_select"
  on public.approval_comments for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in (
            'events_team',
            'finance_team',
            'accounts_team',
            'bot'
          )
        )
    )
  );

drop policy if exists "audit_logs_high_level_read" on public.audit_logs;
create policy "audit_logs_high_level_read"
  on public.audit_logs for select
  using (
    public.get_my_role() in (
      'events_team',
      'finance_team',
      'accounts_team',
      'bot'
    )
  );
