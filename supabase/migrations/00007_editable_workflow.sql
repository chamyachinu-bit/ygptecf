-- ============================================================
-- Editable workflow support
-- ============================================================

create unique index if not exists idx_approvals_event_stage
  on public.approvals(event_id, stage);

create or replace function public.recalculate_event_workflow(p_event_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_event public.events%rowtype;
  v_events_decision public.approval_decision;
  v_finance_decision public.approval_decision;
  v_accounts_decision public.approval_decision;
  v_status public.event_status;
  v_reviewer public.user_role;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    return;
  end if;

  select decision into v_events_decision
  from public.approvals
  where event_id = p_event_id and stage = 'events_team';

  select decision into v_finance_decision
  from public.approvals
  where event_id = p_event_id and stage = 'finance_team';

  select decision into v_accounts_decision
  from public.approvals
  where event_id = p_event_id and stage = 'accounts_team';

  if v_accounts_decision = 'rejected' or v_finance_decision = 'rejected' or v_events_decision = 'rejected' then
    v_status := 'rejected';
    v_reviewer := null;
  elsif v_accounts_decision = 'on_hold' or v_finance_decision = 'on_hold' or v_events_decision = 'on_hold' then
    v_status := 'on_hold';
    v_reviewer := null;
  elsif v_accounts_decision = 'approved' then
    v_status := 'funded';
    v_reviewer := null;
  elsif v_finance_decision = 'approved' then
    v_status := 'finance_approved';
    v_reviewer := 'accounts_team';
  elsif v_events_decision = 'approved' then
    v_status := 'events_approved';
    v_reviewer := 'finance_team';
  elsif v_event.submitted_at is not null or v_event.status = 'submitted' then
    v_status := 'submitted';
    v_reviewer := 'events_team';
  else
    v_status := 'draft';
    v_reviewer := null;
  end if;

  update public.events
  set status = v_status,
      current_reviewer = v_reviewer
  where id = p_event_id;
end;
$$;

create or replace function public.handle_approval_revision()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recalculate_event_workflow(new.event_id);

  insert into public.audit_logs(event_id, user_id, action, old_value, new_value)
  values (
    new.event_id,
    new.reviewer_id,
    'approval_revised',
    jsonb_build_object(
      'decision', old.decision,
      'comments', old.comments
    ),
    jsonb_build_object(
      'decision', new.decision,
      'comments', new.comments
    )
  );

  return new;
end;
$$;

drop trigger if exists on_approval_update on public.approvals;

create trigger on_approval_update
  after update on public.approvals
  for each row execute function public.handle_approval_revision();

create policy "approvals_update_own"
  on public.approvals for update
  using (
    reviewer_id = auth.uid()
    and (
      public.get_my_role() = 'admin'
      or public.get_my_role()::text = stage::text
    )
  );
