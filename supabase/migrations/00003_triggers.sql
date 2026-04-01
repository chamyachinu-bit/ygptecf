-- ============================================================
-- Auto-update updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.events
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.budgets
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, full_name, email, role, region)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'regional_coordinator'
    ),
    new.raw_user_meta_data->>'region'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Audit log on event status change
-- ============================================================
create or replace function public.log_event_status_change()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs(event_id, user_id, action, old_value, new_value)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger audit_event_status
  after update on public.events
  for each row execute function public.log_event_status_change();

-- ============================================================
-- Approval workflow automation
-- ============================================================
create or replace function public.handle_approval_workflow()
returns trigger language plpgsql security definer as $$
declare
  v_event   public.events%rowtype;
  v_next_role user_role;
  v_next_status event_status;
begin
  select * into v_event from public.events where id = new.event_id;

  -- Handle rejection
  if new.decision = 'rejected' then
    update public.events
    set status = 'rejected', current_reviewer = null
    where id = new.event_id;

    insert into public.notifications(user_id, event_id, type, title, message)
    values (
      v_event.created_by,
      new.event_id,
      'status_changed',
      'Event Proposal Rejected',
      'Your proposal "' || v_event.title || '" was rejected by ' || new.stage::text ||
      '. Comments: ' || coalesce(new.comments, 'No comments provided.')
    );
    return new;
  end if;

  -- Handle on_hold
  if new.decision = 'on_hold' then
    update public.events
    set status = 'on_hold'
    where id = new.event_id;

    insert into public.notifications(user_id, event_id, type, title, message)
    values (
      v_event.created_by,
      new.event_id,
      'status_changed',
      'Event Placed On Hold',
      'Your proposal "' || v_event.title || '" has been placed on hold by ' || new.stage::text ||
      '. Comments: ' || coalesce(new.comments, 'No comments provided.')
    );
    return new;
  end if;

  -- Handle approval — advance workflow
  case new.stage
    when 'events_team' then
      v_next_status := 'events_approved';
      v_next_role   := 'finance_team';
    when 'finance_team' then
      v_next_status := 'finance_approved';
      v_next_role   := 'accounts_team';
    when 'accounts_team' then
      v_next_status := 'funded';
      v_next_role   := null;
    else
      return new;
  end case;

  update public.events
  set status = v_next_status, current_reviewer = v_next_role
  where id = new.event_id;

  -- Notify coordinator
  insert into public.notifications(user_id, event_id, type, title, message)
  values (
    v_event.created_by,
    new.event_id,
    'status_changed',
    'Event Approval Update',
    'Your proposal "' || v_event.title || '" has been approved by ' || new.stage::text || '.'
  );

  -- Notify next reviewer team
  if v_next_role is not null then
    insert into public.notifications(user_id, event_id, type, title, message)
    select
      p.id,
      new.event_id,
      'approval_required',
      'Action Required: ' || v_event.title,
      'Event "' || v_event.title || '" from ' || v_event.region || ' requires your review.'
    from public.profiles p
    where p.role = v_next_role
      and p.is_active = true;
  end if;

  return new;
end;
$$;

create trigger on_approval_insert
  after insert on public.approvals
  for each row execute function public.handle_approval_workflow();

-- ============================================================
-- Auto-flag abnormal budgets on submission
-- ============================================================
create or replace function public.flag_abnormal_budget()
returns trigger language plpgsql security definer as $$
declare
  v_total    numeric;
  v_threshold numeric := 50000;
begin
  -- Only check when transitioning draft → submitted
  if new.status = 'submitted' and old.status = 'draft' then
    select sum(estimated_amount) into v_total
    from public.budgets
    where event_id = new.id;

    if v_total > v_threshold then
      update public.events
      set
        is_budget_flagged = true,
        flag_reason = 'Total estimated budget of INR ' || v_total ||
                      ' exceeds the standard threshold of INR ' || v_threshold ||
                      '. Please review carefully.'
      where id = new.id;

      -- Notify all admins
      insert into public.notifications(user_id, event_id, type, title, message)
      select
        p.id,
        new.id,
        'budget_flagged',
        '⚠ Budget Alert: ' || new.title,
        'Event "' || new.title || '" has a total estimated budget of INR ' || v_total ||
        ', which exceeds the INR ' || v_threshold || ' threshold.'
      from public.profiles p
      where p.role = 'admin' and p.is_active = true;
    end if;
  end if;
  return new;
end;
$$;

create trigger check_budget_on_submit
  after update on public.events
  for each row execute function public.flag_abnormal_budget();

-- ============================================================
-- Notify events team when new event is submitted
-- ============================================================
create or replace function public.notify_on_submit()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'submitted' and old.status = 'draft' then
    insert into public.notifications(user_id, event_id, type, title, message)
    select
      p.id,
      new.id,
      'approval_required',
      'New Event for Review: ' || new.title,
      'A new event proposal "' || new.title || '" from ' || new.region || ' has been submitted for your review.'
    from public.profiles p
    where p.role = 'events_team' and p.is_active = true;
  end if;
  return new;
end;
$$;

create trigger on_event_submitted
  after update on public.events
  for each row execute function public.notify_on_submit();
