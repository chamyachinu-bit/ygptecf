-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.events          enable row level security;
alter table public.budgets         enable row level security;
alter table public.approvals       enable row level security;
alter table public.files           enable row level security;
alter table public.notifications   enable row level security;
alter table public.event_reports   enable row level security;
alter table public.audit_logs      enable row level security;

-- ============================================================
-- Helper: get current user's role
-- ============================================================
create or replace function public.get_my_role()
returns user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- EVENTS
-- ============================================================
create policy "events_select" on public.events
  for select using (
    public.get_my_role() = 'admin'
    or created_by = auth.uid()
    or (
      public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
      and status != 'draft'
    )
  );

create policy "events_insert" on public.events
  for insert with check (
    created_by = auth.uid()
    and public.get_my_role() in ('regional_coordinator', 'admin')
  );

create policy "events_update" on public.events
  for update using (
    public.get_my_role() = 'admin'
    or created_by = auth.uid()
    or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
  );

-- ============================================================
-- BUDGETS
-- ============================================================
create policy "budgets_select" on public.budgets
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team', 'admin')
        )
    )
  );

create policy "budgets_insert_own_event" on public.budgets
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );

create policy "budgets_update_own_event" on public.budgets
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.created_by = auth.uid() or public.get_my_role() = 'admin')
    )
  );

-- ============================================================
-- APPROVALS
-- ============================================================
create policy "approvals_select" on public.approvals
  for select using (
    public.get_my_role() = 'admin'
    or reviewer_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
    or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
  );

create policy "approvals_insert" on public.approvals
  for insert with check (
    reviewer_id = auth.uid()
    and (
      public.get_my_role() = 'admin'
      or public.get_my_role()::text = stage::text
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create policy "notifications_own_all" on public.notifications
  for all using (user_id = auth.uid());

create policy "notifications_admin_all" on public.notifications
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- FILES
-- ============================================================
create policy "files_select" on public.files
  for select using (
    public.get_my_role() = 'admin'
    or uploaded_by = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
        )
    )
  );

create policy "files_insert" on public.files
  for insert with check (uploaded_by = auth.uid());

-- ============================================================
-- EVENT REPORTS
-- ============================================================
create policy "event_reports_select" on public.event_reports
  for select using (
    public.get_my_role() = 'admin'
    or submitted_by = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
        )
    )
  );

create policy "event_reports_insert" on public.event_reports
  for insert with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.created_by = auth.uid()
        and e.status = 'completed'
    )
  );

create policy "event_reports_update" on public.event_reports
  for update using (
    submitted_by = auth.uid() or public.get_my_role() = 'admin'
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create policy "audit_logs_admin" on public.audit_logs
  for all using (public.get_my_role() = 'admin');

create policy "audit_logs_select_own_events" on public.audit_logs
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );
