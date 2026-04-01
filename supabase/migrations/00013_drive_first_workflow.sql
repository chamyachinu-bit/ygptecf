-- ============================================================
-- Drive-first workflow, archive workspace, and report comparison
-- ============================================================

alter table public.app_settings
  add column if not exists drive_apps_script_url text,
  add column if not exists drive_apps_script_secret text,
  add column if not exists drive_default_root_url text,
  add column if not exists drive_default_proposal_root_url text,
  add column if not exists drive_default_media_root_url text,
  add column if not exists drive_default_report_root_url text,
  add column if not exists drive_default_invoice_root_url text;

alter table public.regions
  add column if not exists drive_root_url text,
  add column if not exists proposal_root_url text,
  add column if not exists media_root_url text,
  add column if not exists report_root_url text,
  add column if not exists invoice_root_url text;

alter table public.events
  add column if not exists drive_event_url text,
  add column if not exists proposal_drive_url text,
  add column if not exists media_drive_url text,
  add column if not exists report_drive_url text,
  add column if not exists invoice_drive_url text,
  add column if not exists drive_sync_status text not null default 'pending',
  add column if not exists drive_sync_message text,
  add column if not exists drive_synced_at timestamptz;

create or replace function public.log_drive_event_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    if coalesce(old.drive_sync_status, '') is distinct from coalesce(new.drive_sync_status, '')
      or coalesce(old.drive_sync_message, '') is distinct from coalesce(new.drive_sync_message, '')
      or coalesce(old.drive_event_url, '') is distinct from coalesce(new.drive_event_url, '')
      or coalesce(old.proposal_drive_url, '') is distinct from coalesce(new.proposal_drive_url, '')
      or coalesce(old.media_drive_url, '') is distinct from coalesce(new.media_drive_url, '')
      or coalesce(old.report_drive_url, '') is distinct from coalesce(new.report_drive_url, '')
      or coalesce(old.invoice_drive_url, '') is distinct from coalesce(new.invoice_drive_url, '')
    then
      insert into public.audit_logs(event_id, user_id, action, old_value, new_value)
      values (
        new.id,
        auth.uid(),
        case
          when coalesce(old.drive_event_url, '') = '' and coalesce(new.drive_event_url, '') <> '' then 'drive_links_generated'
          else 'drive_links_refreshed'
        end,
        jsonb_build_object(
          'drive_sync_status', old.drive_sync_status,
          'drive_sync_message', old.drive_sync_message,
          'drive_event_url', old.drive_event_url,
          'proposal_drive_url', old.proposal_drive_url,
          'media_drive_url', old.media_drive_url,
          'report_drive_url', old.report_drive_url,
          'invoice_drive_url', old.invoice_drive_url
        ),
        jsonb_build_object(
          'drive_sync_status', new.drive_sync_status,
          'drive_sync_message', new.drive_sync_message,
          'drive_event_url', new.drive_event_url,
          'proposal_drive_url', new.proposal_drive_url,
          'media_drive_url', new.media_drive_url,
          'report_drive_url', new.report_drive_url,
          'invoice_drive_url', new.invoice_drive_url
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_drive_event_updates on public.events;
create trigger audit_drive_event_updates
  after update on public.events
  for each row execute function public.log_drive_event_update();
