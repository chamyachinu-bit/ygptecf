import type { AppSettings, Event, RegionOption } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'

type DriveSetupResult = {
  ok: boolean
  message: string
  links?: {
    drive_event_url?: string | null
    proposal_drive_url?: string | null
    media_drive_url?: string | null
    report_drive_url?: string | null
    invoice_drive_url?: string | null
  }
}

function normalizeUrl(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function buildRoots(region: RegionOption | null, settings: AppSettings | null) {
  return {
    drive_root_url: normalizeUrl(region?.drive_root_url) ?? normalizeUrl(settings?.drive_default_root_url),
    proposal_root_url: normalizeUrl(region?.proposal_root_url) ?? normalizeUrl(settings?.drive_default_proposal_root_url) ?? normalizeUrl(region?.drive_root_url) ?? normalizeUrl(settings?.drive_default_root_url),
    media_root_url: normalizeUrl(region?.media_root_url) ?? normalizeUrl(settings?.drive_default_media_root_url) ?? normalizeUrl(region?.drive_root_url) ?? normalizeUrl(settings?.drive_default_root_url),
    report_root_url: normalizeUrl(region?.report_root_url) ?? normalizeUrl(settings?.drive_default_report_root_url) ?? normalizeUrl(region?.drive_root_url) ?? normalizeUrl(settings?.drive_default_root_url),
    invoice_root_url: normalizeUrl(region?.invoice_root_url) ?? normalizeUrl(settings?.drive_default_invoice_root_url) ?? normalizeUrl(region?.drive_root_url) ?? normalizeUrl(settings?.drive_default_root_url),
  }
}

function hasAnyRoot(roots: ReturnType<typeof buildRoots>) {
  return Object.values(roots).some(Boolean)
}

export async function setupEventDriveLinks(eventId: string, actorUserId?: string | null) {
  const service = await createServiceClient()

  const { data: eventData, error: eventError } = await service
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (eventError || !eventData) {
    return { ok: false, message: 'Event not found.' } satisfies DriveSetupResult
  }

  const event = eventData as Event

  const [{ data: settingsData }, { data: regionData }] = await Promise.all([
    service.from('app_settings').select('*').eq('id', 'global').maybeSingle(),
    service.from('regions').select('*').eq('name', event.region).maybeSingle(),
  ])

  const settings = settingsData as AppSettings | null
  const region = regionData as RegionOption | null
  const webhookUrl = normalizeUrl(settings?.drive_apps_script_url)
  const sharedSecret = normalizeUrl(settings?.drive_apps_script_secret)
  const roots = buildRoots(region, settings)

  if (!webhookUrl || !sharedSecret || !hasAnyRoot(roots)) {
    const message = !webhookUrl || !sharedSecret
      ? 'Drive automation is not configured in admin settings.'
      : `Drive routing is not configured for region ${event.region}.`

    await service
      .from('events')
      .update({
        drive_sync_status: 'not_configured',
        drive_sync_message: message,
      })
      .eq('id', eventId)

    return { ok: false, message } satisfies DriveSetupResult
  }

  const payload = {
    secret: sharedSecret,
    action: 'setup_event_drive',
    event: {
      id: event.id,
      event_code: event.event_code,
      title: event.title,
      region: event.region,
      event_date: event.event_date,
    },
    roots,
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? JSON.parse(text) as Record<string, unknown> : {}
    } catch {
      data = { raw: text }
    }

    if (!response.ok || data.ok === false) {
      const message = String(data.error ?? data.message ?? `Drive setup failed with status ${response.status}`)
      await service
        .from('events')
        .update({
          drive_sync_status: 'error',
          drive_sync_message: message,
        })
        .eq('id', eventId)

      return { ok: false, message } satisfies DriveSetupResult
    }

    const links = {
      drive_event_url: normalizeUrl(String(data.drive_event_url ?? data.eventFolderUrl ?? '')) ?? null,
      proposal_drive_url: normalizeUrl(String(data.proposal_drive_url ?? data.proposalFolderUrl ?? '')) ?? null,
      media_drive_url: normalizeUrl(String(data.media_drive_url ?? data.mediaFolderUrl ?? '')) ?? null,
      report_drive_url: normalizeUrl(String(data.report_drive_url ?? data.reportFolderUrl ?? '')) ?? null,
      invoice_drive_url: normalizeUrl(String(data.invoice_drive_url ?? data.invoiceFolderUrl ?? '')) ?? null,
    }

    await service
      .from('events')
      .update({
        ...links,
        drive_sync_status: 'ready',
        drive_sync_message: 'Drive folders linked successfully.',
        drive_synced_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (actorUserId) {
      await service.from('audit_logs').insert({
        event_id: eventId,
        user_id: actorUserId,
        action: 'drive_links_generated',
        new_value: {
          drive_sync_status: 'ready',
          ...links,
        },
      })
    }

    return { ok: true, message: 'Drive folders linked successfully.', links } satisfies DriveSetupResult
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Drive setup failed.'
    await service
      .from('events')
      .update({
        drive_sync_status: 'error',
        drive_sync_message: message,
      })
      .eq('id', eventId)

    return { ok: false, message } satisfies DriveSetupResult
  }
}
