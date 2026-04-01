-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum (
  'regional_coordinator',
  'events_team',
  'finance_team',
  'accounts_team',
  'admin'
);

create type event_status as enum (
  'draft',
  'submitted',
  'events_approved',
  'finance_approved',
  'funded',
  'rejected',
  'on_hold',
  'completed',
  'archived'
);

create type approval_decision as enum ('approved', 'rejected', 'on_hold');

create type notification_type as enum (
  'approval_required',
  'status_changed',
  'budget_flagged',
  'event_reminder',
  'report_due'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null unique,
  role         user_role not null default 'regional_coordinator',
  region       text,
  phone        text,
  avatar_url   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  description       text,
  region            text not null,
  event_date        date not null,
  event_end_date    date,
  location          text not null,
  expected_attendees integer not null default 0,
  status            event_status not null default 'draft',
  created_by        uuid not null references public.profiles(id),
  current_reviewer  user_role,
  submitted_at      timestamptz,
  completed_at      timestamptz,
  is_budget_flagged boolean not null default false,
  flag_reason       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint valid_dates check (event_end_date is null or event_end_date >= event_date)
);

-- ============================================================
-- BUDGETS
-- ============================================================
create table public.budgets (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references public.events(id) on delete cascade,
  category        text not null,
  description     text,
  estimated_amount numeric(12,2) not null check (estimated_amount >= 0),
  actual_amount   numeric(12,2) check (actual_amount >= 0),
  currency        char(3) not null default 'INR',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Aggregated budget view
create view public.event_budget_summary as
select
  event_id,
  sum(estimated_amount) as total_estimated,
  sum(coalesce(actual_amount, 0)) as total_actual,
  count(*) as line_items,
  currency
from public.budgets
group by event_id, currency;

-- ============================================================
-- APPROVALS
-- ============================================================
create table public.approvals (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references public.events(id) on delete cascade,
  reviewer_id  uuid not null references public.profiles(id),
  stage        user_role not null,
  decision     approval_decision not null,
  comments     text,
  decided_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- FILES
-- ============================================================
create table public.files (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references public.events(id) on delete cascade,
  uploaded_by  uuid not null references public.profiles(id),
  file_name    text not null,
  file_type    text not null,
  storage_path text not null unique,
  file_size    integer,
  mime_type    text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  event_id     uuid references public.events(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  message      text not null,
  is_read      boolean not null default false,
  email_sent   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_notifications_user_unread
  on public.notifications(user_id, is_read)
  where is_read = false;

-- ============================================================
-- EVENT REPORTS
-- ============================================================
create table public.event_reports (
  id                  uuid primary key default uuid_generate_v4(),
  event_id            uuid not null unique references public.events(id) on delete cascade,
  submitted_by        uuid not null references public.profiles(id),
  actual_attendees    integer,
  outcome_summary     text,
  challenges          text,
  lessons_learned     text,
  budget_notes        text,
  auto_summary        text,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table public.audit_logs (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid references public.events(id) on delete set null,
  user_id      uuid references public.profiles(id) on delete set null,
  action       text not null,
  old_value    jsonb,
  new_value    jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

create index idx_audit_logs_event on public.audit_logs(event_id);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
create index idx_events_status on public.events(status);
create index idx_events_created_by on public.events(created_by);
