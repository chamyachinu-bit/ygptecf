-- ============================================================
-- Enable pg_cron extension (must be done in Dashboard first)
-- Dashboard → Database → Extensions → pg_cron → Enable
-- Then run this file
-- ============================================================

-- Flag overdue post-event reports (daily at 9 AM UTC)
select cron.schedule(
  'flag-overdue-reports',
  '0 9 * * *',
  $$
    insert into public.notifications(user_id, event_id, type, title, message)
    select
      e.created_by,
      e.id,
      'report_due',
      'Post-Event Report Overdue',
      'Please submit your post-event report for "' || e.title ||
      '". The event ended more than 24 hours ago.'
    from public.events e
    left join public.event_reports r on r.event_id = e.id
    where e.status = 'completed'
      and r.id is null
      and e.completed_at < now() - interval '24 hours'
      and not exists (
        select 1 from public.notifications n
        where n.event_id = e.id
          and n.type = 'report_due'
          and n.created_at > now() - interval '24 hours'
      );
  $$
);

-- Daily digest to admins on weekdays at 8 AM UTC
select cron.schedule(
  'daily-admin-digest',
  '0 8 * * 1-5',
  $$
    with pending_count as (
      select count(*) as cnt
      from public.events
      where status in ('submitted', 'events_approved', 'finance_approved')
    )
    insert into public.notifications(user_id, event_id, type, title, message)
    select
      p.id,
      null,
      'approval_required',
      'Daily Digest: ' || pc.cnt || ' Events Pending',
      'There are currently ' || pc.cnt || ' event proposals awaiting approval in the system.'
    from public.profiles p, pending_count pc
    where p.role = 'admin'
      and p.is_active = true
      and pc.cnt > 0;
  $$
);

-- Auto-archive completed events older than 90 days (every Sunday at 2 AM)
select cron.schedule(
  'auto-archive-events',
  '0 2 * * 0',
  $$
    update public.events
    set status = 'archived'
    where status = 'completed'
      and completed_at < now() - interval '90 days';
  $$
);

-- Clean up old read notifications older than 30 days (Sunday at 3 AM)
select cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * 0',
  $$
    delete from public.notifications
    where is_read = true
      and created_at < now() - interval '30 days';
  $$
);

-- Remind coordinator 48hrs before event date (daily at 7 AM)
select cron.schedule(
  'event-day-reminders',
  '0 7 * * *',
  $$
    insert into public.notifications(user_id, event_id, type, title, message)
    select
      e.created_by,
      e.id,
      'event_reminder',
      'Upcoming Event in 48 Hours: ' || e.title,
      'Your funded event "' || e.title || '" is taking place on ' || e.event_date ||
      ' at ' || e.location || '. Make sure all preparations are in order.'
    from public.events e
    where e.status = 'funded'
      and e.event_date = current_date + interval '2 days'
      and not exists (
        select 1 from public.notifications n
        where n.event_id = e.id
          and n.type = 'event_reminder'
          and n.created_at > now() - interval '24 hours'
      );
  $$
);
