-- ============================================================
-- Approval comment history for decision revisions
-- ============================================================

create table if not exists public.approval_comments (
  id uuid primary key default uuid_generate_v4(),
  approval_id uuid not null references public.approvals(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  stage user_role not null,
  decision approval_decision not null,
  comment text,
  is_revision boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_comments_approval_created
  on public.approval_comments(approval_id, created_at desc);

alter table public.approval_comments enable row level security;

create policy "approval_comments_select"
  on public.approval_comments for select
  using (
    public.get_my_role() = 'admin'
    or reviewer_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.created_by = auth.uid()
          or public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
        )
    )
  );

create policy "approval_comments_insert_own"
  on public.approval_comments for insert
  with check (
    reviewer_id = auth.uid()
    and (
      public.get_my_role() = 'admin'
      or public.get_my_role()::text = stage::text
    )
  );

insert into public.approval_comments (approval_id, event_id, reviewer_id, stage, decision, comment, is_revision, created_at)
select
  a.id,
  a.event_id,
  a.reviewer_id,
  a.stage,
  a.decision,
  a.comments,
  false,
  a.created_at
from public.approvals a
where not exists (
  select 1
  from public.approval_comments ac
  where ac.approval_id = a.id
);

create or replace function public.record_approval_comment()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.approval_comments (
      approval_id,
      event_id,
      reviewer_id,
      stage,
      decision,
      comment,
      is_revision,
      created_at
    ) values (
      new.id,
      new.event_id,
      new.reviewer_id,
      new.stage,
      new.decision,
      new.comments,
      false,
      coalesce(new.decided_at, now())
    );
    return new;
  end if;

  if new.decision is distinct from old.decision
     or coalesce(new.comments, '') is distinct from coalesce(old.comments, '') then
    if nullif(trim(coalesce(new.comments, '')), '') is null then
      raise exception 'A new reason is required when revising a decision.';
    end if;

    insert into public.approval_comments (
      approval_id,
      event_id,
      reviewer_id,
      stage,
      decision,
      comment,
      is_revision,
      created_at
    ) values (
      new.id,
      new.event_id,
      new.reviewer_id,
      new.stage,
      new.decision,
      new.comments,
      true,
      coalesce(new.decided_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_approval_comment_insert on public.approvals;
create trigger on_approval_comment_insert
  after insert on public.approvals
  for each row execute function public.record_approval_comment();

drop trigger if exists on_approval_comment_update on public.approvals;
create trigger on_approval_comment_update
  after update on public.approvals
  for each row execute function public.record_approval_comment();

create or replace function public.handle_approval_revision()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.decision is distinct from old.decision or coalesce(new.comments, '') is distinct from coalesce(old.comments, ''))
     and nullif(trim(coalesce(new.comments, '')), '') is null then
    raise exception 'A new reason is required when revising a decision.';
  end if;

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
