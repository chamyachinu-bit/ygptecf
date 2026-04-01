-- ============================================================
-- Workflow access, onboarding, event codes, and logging upgrade
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'profile_approval_status'
  ) then
    create type public.profile_approval_status as enum (
      'pending_admin_approval',
      'approved',
      'rejected'
    );
  end if;
end
$$;

alter table public.profiles
  add column if not exists approval_status public.profile_approval_status not null default 'pending_admin_approval',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null;

update public.profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at)
where approval_status is null or approval_status = 'pending_admin_approval';

create table if not exists public.regions (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.regions (name)
select distinct region
from (
  select nullif(trim(region), '') as region from public.profiles
  union
  select nullif(trim(region), '') as region from public.events
  union
  select unnest(array['Pune', 'Mumbai', 'Nashik', 'Nagpur'])
) seeded
where region is not null
on conflict (name) do nothing;

alter table public.regions enable row level security;

drop policy if exists "regions_public_read" on public.regions;
create policy "regions_public_read"
  on public.regions for select
  using (is_active = true);

drop policy if exists "regions_admin_all" on public.regions;
create policy "regions_admin_all"
  on public.regions for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop trigger if exists set_updated_at_regions on public.regions;
create trigger set_updated_at_regions
  before update on public.regions
  for each row execute function public.handle_updated_at();

alter table public.app_settings
  add column if not exists regions_note text;

alter table public.events
  add column if not exists venue_gmaps_link text;

create or replace function public.normalize_region_code(p_region text)
returns text
language plpgsql
as $$
declare
  v_clean text;
begin
  v_clean := upper(regexp_replace(coalesce(p_region, ''), '[^A-Za-z]', '', 'g'));
  if v_clean = '' then
    return 'GEN';
  end if;
  return substr(v_clean || 'XXX', 1, 3);
end;
$$;

create or replace function public.generate_event_code(p_region text, p_event_date date, p_exclude_event uuid default null)
returns text
language plpgsql
security definer
as $$
declare
  v_region_code text;
  v_month_code text;
  v_next_number integer;
begin
  v_region_code := public.normalize_region_code(p_region);
  v_month_code := upper(to_char(coalesce(p_event_date, current_date), 'MON'));

  select coalesce(
    max(
      case
        when substring(event_code from 7 for 2) ~ '^[0-9]{2}$'
          then substring(event_code from 7 for 2)::integer
        else 0
      end
    ),
    0
  ) + 1
  into v_next_number
  from public.events
  where event_code like v_region_code || v_month_code || '%'
    and (p_exclude_event is null or id <> p_exclude_event);

  return v_region_code || v_month_code || lpad(v_next_number::text, 2, '0');
end;
$$;

create or replace function public.handle_event_code()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role public.user_role;
begin
  v_role := public.get_my_role();

  if tg_op = 'INSERT' then
    if v_role = 'admin' and nullif(trim(coalesce(new.event_code, '')), '') is not null then
      new.event_code := upper(trim(new.event_code));
    else
      new.event_code := public.generate_event_code(new.region, new.event_date, null);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if v_role = 'admin' then
      if nullif(trim(coalesce(new.event_code, '')), '') is null then
        new.event_code := old.event_code;
      else
        new.event_code := upper(trim(new.event_code));
      end if;
    else
      new.event_code := old.event_code;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists set_event_code on public.events;
create trigger set_event_code
  before insert or update on public.events
  for each row execute function public.handle_event_code();

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (
    created_by = auth.uid()
    and public.get_my_role() in ('regional_coordinator', 'events_team', 'admin')
  );

drop policy if exists "approvals_update_own" on public.approvals;
create policy "approvals_update_own"
  on public.approvals for update
  using (
    public.get_my_role() = 'admin'
    or (
      reviewer_id = auth.uid()
      and public.get_my_role()::text = stage::text
    )
  );

create or replace function public.log_event_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into public.audit_logs(event_id, user_id, action, old_value, new_value)
    values (
      new.id,
      auth.uid(),
      'proposal_updated',
      to_jsonb(old) - 'updated_at',
      to_jsonb(new) - 'updated_at'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_event_updates on public.events;
create trigger audit_event_updates
  after update on public.events
  for each row execute function public.log_event_update();

create or replace function public.log_budget_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(event_id, user_id, action, new_value)
    values (
      new.event_id,
      auth.uid(),
      'budget_created',
      to_jsonb(new)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into public.audit_logs(event_id, user_id, action, old_value, new_value)
    values (
      new.event_id,
      auth.uid(),
      'budget_updated',
      to_jsonb(old) - 'updated_at',
      to_jsonb(new) - 'updated_at'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_budget_insert on public.budgets;
create trigger audit_budget_insert
  after insert on public.budgets
  for each row execute function public.log_budget_update();

drop trigger if exists audit_budget_updates on public.budgets;
create trigger audit_budget_updates
  after update on public.budgets
  for each row execute function public.log_budget_update();

create or replace function public.log_file_upload()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs(event_id, user_id, action, new_value)
  values (
    new.event_id,
    new.uploaded_by,
    case
      when new.file_type = 'invoice_document' then 'invoice_uploaded'
      else 'file_uploaded'
    end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists audit_file_upload on public.files;
create trigger audit_file_upload
  after insert on public.files
  for each row execute function public.log_file_upload();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, email, role, region, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when coalesce(new.raw_user_meta_data->>'role', '') in (
        'regional_coordinator',
        'events_team',
        'finance_team',
        'accounts_team',
        'admin'
      ) then (new.raw_user_meta_data->>'role')::public.user_role
      else 'regional_coordinator'::public.user_role
    end,
    nullif(new.raw_user_meta_data->>'region', ''),
    'pending_admin_approval'::public.profile_approval_status
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    region = excluded.region;

  return new;
end;
$$;
