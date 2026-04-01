alter table public.notifications
  add column if not exists email_delivery_key text,
  add column if not exists email_delivery_status text not null default 'pending',
  add column if not exists email_delivery_attempts integer not null default 0,
  add column if not exists email_last_attempted_at timestamptz,
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_last_error text;

create or replace function public.generate_notification_delivery_key(
  p_user_id uuid,
  p_event_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text
)
returns text
language sql
immutable
as $$
  select md5(
    concat_ws(
      '|',
      coalesce(p_user_id::text, ''),
      coalesce(p_event_id::text, ''),
      coalesce(p_type::text, ''),
      trim(coalesce(p_title, '')),
      trim(coalesce(p_message, ''))
    )
  )
$$;

create or replace function public.set_notification_delivery_key()
returns trigger
language plpgsql
as $$
begin
  if new.email_delivery_key is null or btrim(new.email_delivery_key) = '' then
    new.email_delivery_key := public.generate_notification_delivery_key(
      new.user_id,
      new.event_id,
      new.type,
      new.title,
      new.message
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_set_delivery_key on public.notifications;

create trigger notifications_set_delivery_key
  before insert or update on public.notifications
  for each row execute function public.set_notification_delivery_key();

update public.notifications
set email_delivery_key = public.generate_notification_delivery_key(user_id, event_id, type, title, message)
where email_delivery_key is null
   or btrim(email_delivery_key) = '';

create index if not exists idx_notifications_delivery_key
  on public.notifications(email_delivery_key);

create index if not exists idx_notifications_delivery_status
  on public.notifications(email_delivery_status, created_at desc);
