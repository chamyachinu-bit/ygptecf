drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (
    public.get_my_role() = 'admin'
    or created_by = auth.uid()
    or public.get_my_role() in (
      'events_team',
      'finance_team',
      'accounts_team',
      'bot',
      'designer',
      'social_media_team'
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
            'bot',
            'designer',
            'social_media_team'
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
      'bot',
      'designer',
      'social_media_team'
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
            'bot',
            'designer',
            'social_media_team'
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
            'bot',
            'designer',
            'social_media_team'
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
            'bot',
            'designer',
            'social_media_team'
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
      'bot',
      'designer',
      'social_media_team'
    )
  );
